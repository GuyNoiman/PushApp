/**
 * useJourneyEditCoach — the React adapter for the coach-led Journey EDIT flow (task J1). It mirrors
 * {@link ./useLiveCoach}: it holds ONE {@link JourneyEditOrchestrator} per edit (in a ref) over the
 * composed cloud LlmClient ({@link makeCoachLlm}, redaction baked in) and the {@link SafetyLayer}
 * outbound guard, and turns the orchestrator's turns into a flat, render-ready view-model the edit
 * screen maps 1:1 onto the shared presentational coach components.
 *
 * The context the orchestrator validates against is built from the SNAPSHOT Journey (ids/titles), so a
 * proposed edit can only touch Steps that actually exist. Nothing mutates until the user approves:
 * {@link UseJourneyEditCoach.apply} calls `core.updateJourney` and navigates back to the Journey.
 *
 * SECURITY-PRIVACY G1: the change text and the resulting edit are ON-DEVICE-ONLY raw signal; this hook
 * keeps them in local React state, never logs them, and never syncs them.
 *
 * Business logic lives here, not in the screen (Engineering Bible §19).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import {
  JourneyEditOrchestrator,
  type JourneyEditProposal,
} from '@/core/coach/JourneyEditOrchestrator';
import type { JourneyEditContext } from '@/core/coach/journeyEdit';
import { renderBrief } from '@/core/coach/context';
import { SafetyLayer } from '@/core/coach/SafetyLayer';
import type { Journey } from '@/core/types/domain';
import { makeCoachLlm } from '@/core/llm/makeCoachLlm';
import { useApp } from '@/state/AppProvider';

/** Where the edit coach is in the one LLM round-trip: idle, waiting on a proposal, or a soft error. */
export type EditCoachStatus = 'idle' | 'thinking' | 'error';

/** One render-ready transcript item — maps 1:1 onto the shared {@link ./CoachBubble}. */
export type EditCoachItem = { kind: 'coach'; text: string } | { kind: 'user'; text: string };

/** The whole view-model + handlers the edit screen renders. */
export interface UseJourneyEditCoach {
  items: EditCoachItem[];
  /** The current proposal awaiting approval (its `changes` drive the approval card), or null. */
  proposal: JourneyEditProposal | null;
  status: EditCoachStatus;
  /** True while the coach awaits the next free-text change request (the input bar is shown). */
  awaitingInput: boolean;
  /** False when the id is unknown or the Journey is already completed (the screen shows a fallback). */
  found: boolean;
  /** Send a free-text change request — the one LLM understanding call. */
  sendChange: (text: string) => void;
  /** Approve the current proposal: enact it via core.updateJourney and return to the Journey. */
  apply: () => void;
  /** Discard the current proposal and reopen the input to refine the request. */
  adjust: () => void;
}

/** Construction options — a test seam to inject an orchestrator over a MockLlmClient. */
export interface UseJourneyEditCoachOptions {
  journeyId: string;
  /** Inject a pre-built orchestrator (tests). Production omits it and builds the live one. */
  orchestrator?: JourneyEditOrchestrator;
}

/** Build the on-device edit context from a snapshot Journey (ids/titles only — no history, no notes). */
function buildContext(journey: Journey): JourneyEditContext {
  return {
    id: journey.id,
    title: journey.title,
    why: [...journey.why],
    rhythm: journey.rhythm,
    durationDays: journey.durationDays,
    steps: journey.steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      cadence: s.cadence,
      done: s.done,
      dropped: s.dropped ?? false,
      // Carry the dependency graph (Step Dependencies) so the parser can validate a coach-authored
      // dependency against the real Steps (Milestone-aware, cycle/≤3 checks).
      ...(s.milestoneId !== undefined ? { milestoneId: s.milestoneId } : {}),
      ...(s.dependsOnStepId !== undefined ? { dependsOnStepId: s.dependsOnStepId } : {}),
    })),
  };
}

export function useJourneyEditCoach(options: UseJourneyEditCoachOptions): UseJourneyEditCoach {
  const { journeyId } = options;
  const { core, snapshot } = useApp();
  const { t } = useTranslation('coach');
  const router = useRouter();

  const journey = snapshot?.journeys.find((j) => j.id === journeyId);
  // A completed Journey is not editable (the pencil is hidden; this is the belt-and-braces guard).
  const found = Boolean(journey && !journey.completedAt);

  const orchestratorRef = useRef<JourneyEditOrchestrator | null>(null);
  const startedRef = useRef(false);

  const [items, setItems] = useState<EditCoachItem[]>([]);
  const [proposal, setProposal] = useState<JourneyEditProposal | null>(null);
  const [status, setStatus] = useState<EditCoachStatus>('idle');
  const [awaitingInput, setAwaitingInput] = useState(true);

  // Build the orchestrator + greet once, as soon as the Journey is available in the snapshot.
  useEffect(() => {
    if (startedRef.current || !journey || journey.completedAt) return;
    startedRef.current = true;
    const context = buildContext(journey);
    orchestratorRef.current =
      options.orchestrator ??
      new JourneyEditOrchestrator({
        context,
        llm: makeCoachLlm(),
        guard: new SafetyLayer().messageGuard(),
        // What the coach was told about this Journey before, so it does not ask again (Coach Context
        // Summaries). Empty unless the person granted consent AND something was actually kept.
        memoryBrief: renderBrief(core.getCoachContextBrief({ journeyId: journey.id })),
      });
    orchestratorRef.current.start(); // advances the orchestrator's history; the UI shows a localized line
    setItems([{ kind: 'coach', text: t('edit.greeting', { title: journey.title }) }]);
  }, [core, journey, options.orchestrator, t]);

  const sendChange = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const orchestrator = orchestratorRef.current;
      if (trimmed.length === 0 || !orchestrator) return;
      setItems((prev) => [...prev, { kind: 'user', text: trimmed }]);
      setProposal(null);
      setAwaitingInput(false);
      setStatus('thinking');
      void (async () => {
        try {
          const result = await orchestrator.propose(trimmed);
          setStatus('idle');
          if (result.changes.length === 0) {
            // Nothing understood — invite the user to try again (the input stays open).
            setItems((prev) => [...prev, { kind: 'coach', text: t('edit.noChange') }]);
            setAwaitingInput(true);
            return;
          }
          setProposal(result);
        } catch {
          // The orchestrator degrades internally; this guards anything that still throws.
          setStatus('error');
          setItems((prev) => [...prev, { kind: 'coach', text: t('edit.error') }]);
          setAwaitingInput(true);
        }
      })();
    },
    [t],
  );

  const apply = useCallback(() => {
    if (!proposal) return;
    core.updateJourney(journeyId, proposal.edit);
    router.replace(`/journey/${journeyId}`);
  }, [proposal, core, journeyId, router]);

  const adjust = useCallback(() => {
    setProposal(null);
    setAwaitingInput(true);
  }, []);

  return { items, proposal, status, awaitingInput, found, sendChange, apply, adjust };
}
