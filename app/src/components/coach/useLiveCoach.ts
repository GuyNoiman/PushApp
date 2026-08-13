/**
 * useLiveCoach — the React adapter that drives the LIVE conversational coach on the Coach tab. It
 * holds ONE {@link CoachOrchestrator} per conversation (in a ref) over the composed cloud LlmClient
 * ({@link makeCoachLlm}, with the redaction seam baked in) and the {@link SafetyLayer} outbound
 * guard, and turns the orchestrator's turns into a flat, render-ready view-model the screen maps 1:1
 * onto the existing presentational coach components (bubbles, option cards, insight / Journey card).
 *
 * Only the opening free-text triage makes an LLM call (→ a `thinking` status); every closed pick /
 * "Other" answer is recorded on-device with no model call. All orchestrator calls are wrapped so a
 * transport failure surfaces a calm retry line and NEVER crashes the screen.
 *
 * SENSITIVE-DOMAIN STOP (safety): if the coach routes the goal to the `addiction` or `relationships`
 * expert, this hook does NOT run that specialised interview or build a Journey — it shows a calm
 * hand-off and offers manual creation instead. The coach shapes a Journey; it never plays clinician.
 *
 * SECURITY-PRIVACY G1: the interview answers and the resulting GoalSpec are ON-DEVICE-ONLY raw
 * signal; this hook keeps them in local React state, never logs them, and never syncs them.
 *
 * Business logic lives here, not in the screen (Engineering Bible §19).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { CoachOption } from '@/components/coach/coachScript';
import { CoachOrchestrator, type CoachTurn } from '@/core/coach/CoachOrchestrator';
import type { GoalSpec } from '@/core/coach/interviewPlaybook';
import { SafetyLayer } from '@/core/coach/SafetyLayer';
import type { DomainQuestion } from '@/core/learning/DomainExpert';
import { SENSITIVE_DOMAINS } from '@/core/coach/sensitiveDomains';
import { makeCoachLlm } from '@/core/llm/makeCoachLlm';

/**
 * The calm, always-safe hand-off shown when the goal routes to a sensitive domain, and the soft retry
 * line if the one LLM call hiccups, both come from the `coach` namespace (`sensitiveHandoff` / `retry`)
 * so they follow the active language — they are never model output.
 */

/** Where the coach is in the one LLM round-trip: idle, waiting on triage, or a soft error. */
export type LiveCoachStatus = 'idle' | 'thinking' | 'error';

/** One render-ready transcript item — maps 1:1 onto the presentational coach components. */
export type LiveCoachItem =
  | { kind: 'coach'; text: string; strong?: boolean }
  | { kind: 'user'; text: string }
  | { kind: 'insight'; text: string }
  | { kind: 'journey'; eyebrow: string; title: string; description: string; meta: string };

/** The current question awaiting an answer, shaped for {@link CoachOptions}. */
export interface LiveCoachQuestionView {
  /** A short label above the option cards (the full question is already a coach bubble). */
  label: string;
  /** Option cards; each `id` is the stringified 0-based option index (parsed back on select). */
  options: CoachOption[];
  multiSelect: boolean;
  allowOther: boolean;
}

/** The whole view-model + handlers the Coach screen renders. */
export interface UseLiveCoach {
  items: LiveCoachItem[];
  question: LiveCoachQuestionView | null;
  status: LiveCoachStatus;
  /** The completed GoalSpec once the interview is done — drives the "Build my Journey" CTA. */
  goalSpec: GoalSpec | null;
  /** True once a sensitive-domain hand-off was shown (no Journey to build here). */
  handoff: boolean;
  /** True while the coach awaits the opening free-text (the only free-text moment). */
  awaitingOpening: boolean;
  /** Send the opening free-text — the only LLM call (triage). */
  sendOpening: (text: string) => void;
  /** Pick a single closed option by its id (index). */
  selectSingle: (id: string) => void;
  /** Submit several chosen ids (index) on a multi-select question. */
  selectMulti: (ids: string[]) => void;
  /** Submit a free-text "Other" answer. */
  answerOther: (text: string) => void;
}

/** Construction options — a test seam to inject an orchestrator over a MockLlmClient. */
export interface UseLiveCoachOptions {
  /** Inject a pre-built orchestrator (tests). Production omits it and builds the live one. */
  orchestrator?: CoachOrchestrator;
}

/** Map an expert {@link DomainQuestion} onto the option-card view (index → id). */
function toQuestionView(question: DomainQuestion, t: TFunction<'coach'>): LiveCoachQuestionView {
  return {
    label: question.multiSelect ? t('chooseAny') : t('chooseOne'),
    options: question.options.map((title, index) => ({ id: String(index), title })),
    multiSelect: Boolean(question.multiSelect),
    allowOther: question.allowOther,
  };
}

/** A NEW JOURNEY card summarising the completed goal (no build needed for the summary line). */
function journeyCardItem(spec: GoalSpec, t: TFunction<'coach'>): LiveCoachItem {
  const shape = spec.isHabit ? t('journeyCard.habit') : t('journeyCard.plan');
  const meta = spec.activeExpertDisplayName
    ? t('journeyCard.metaWithExpert', { shape, expert: spec.activeExpertDisplayName })
    : shape;
  return {
    kind: 'journey',
    eyebrow: t('journeyCard.eyebrow'),
    title: spec.title,
    description: spec.description ?? t('journeyCard.defaultDescription'),
    meta,
  };
}

export function useLiveCoach(options?: UseLiveCoachOptions): UseLiveCoach {
  const { t, i18n } = useTranslation('coach');
  const orchestratorRef = useRef<CoachOrchestrator | null>(null);
  if (orchestratorRef.current === null) {
    orchestratorRef.current =
      options?.orchestrator ??
      // Thread the user's ACTIVE language into the one understanding call so the coach reads a
      // non-English opening in it (the visible dialogue is already localized via i18n).
      new CoachOrchestrator({
        llm: makeCoachLlm(),
        guard: new SafetyLayer().messageGuard(),
        locale: i18n.language,
      });
  }

  const [items, setItems] = useState<LiveCoachItem[]>([]);
  const [questionView, setQuestionView] = useState<LiveCoachQuestionView | null>(null);
  const [status, setStatus] = useState<LiveCoachStatus>('idle');
  const [goalSpec, setGoalSpec] = useState<GoalSpec | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [awaitingOpening, setAwaitingOpening] = useState(true);

  // The raw current question, kept in a ref so handlers always read the latest without re-binding.
  const rawQuestionRef = useRef<DomainQuestion | null>(null);
  const startedRef = useRef(false);

  const applyQuestion = useCallback(
    (question: DomainQuestion | null) => {
      rawQuestionRef.current = question;
      setQuestionView(question ? toQuestionView(question, t) : null);
    },
    [t],
  );

  // Greet once, on mount — start() is a no-op-safe local call (no LLM).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const opening = orchestratorRef.current!.start();
    setItems([{ kind: 'coach', text: opening.coachMessage }]);
  }, []);

  /** Apply an orchestrator turn to the view-model (hand-off / question / done). */
  const applyTurn = useCallback(
    (turn: CoachTurn) => {
      // SENSITIVE-DOMAIN STOP: never interview or build a Journey for a sensitive domain.
      if (turn.activeExpert && SENSITIVE_DOMAINS.has(turn.activeExpert.id)) {
        applyQuestion(null);
        setGoalSpec(null);
        setHandoff(true);
        setItems((prev) => [...prev, { kind: 'coach', text: t('sensitiveHandoff') }]);
        return;
      }

      const appended: LiveCoachItem[] = [{ kind: 'coach', text: turn.coachMessage }];
      if (turn.done) {
        const spec = turn.goalSpec ?? null;
        if (spec) appended.push(journeyCardItem(spec, t));
        applyQuestion(null);
        setGoalSpec(spec);
        setItems((prev) => [...prev, ...appended]);
        return;
      }

      applyQuestion(turn.question ?? null);
      setItems((prev) => [...prev, ...appended]);
    },
    [applyQuestion, t],
  );

  /**
   * Echo the user's answer, advance the orchestrator, and apply the returned turn. `thinking` flags
   * the one LLM call (triage). Any throw surfaces a calm retry line — the screen never crashes.
   */
  const advance = useCallback(
    async (userEcho: string | null, call: () => Promise<CoachTurn>, thinking: boolean) => {
      setAwaitingOpening(false);
      applyQuestion(null); // hide the options while we advance
      if (userEcho) setItems((prev) => [...prev, { kind: 'user', text: userEcho }]);
      if (thinking) setStatus('thinking');
      try {
        const turn = await call();
        setStatus('idle');
        applyTurn(turn);
      } catch {
        // triage already degrades internally; this guards anything that still throws (e.g. a
        // transport error surfaced as LlmError) so the surface stays alive and retryable.
        setStatus('error');
        setItems((prev) => [...prev, { kind: 'coach', text: t('retry') }]);
        if (thinking) setAwaitingOpening(true);
      }
    },
    [applyTurn, applyQuestion, t],
  );

  const sendOpening = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      void advance(trimmed, () => orchestratorRef.current!.triage(trimmed), true);
    },
    [advance],
  );

  const selectSingle = useCallback(
    (id: string) => {
      const question = rawQuestionRef.current;
      if (!question) return;
      const index = Number(id);
      if (!Number.isInteger(index) || index < 0 || index >= question.options.length) return;
      void advance(question.options[index], () => orchestratorRef.current!.selectOption(index), false);
    },
    [advance],
  );

  const selectMulti = useCallback(
    (ids: string[]) => {
      const question = rawQuestionRef.current;
      if (!question || ids.length === 0) return;
      const indices = ids.map(Number);
      if (!indices.every((i) => Number.isInteger(i) && i >= 0 && i < question.options.length)) return;
      const echo = indices.map((i) => question.options[i]).join(' · ');
      void advance(echo, () => orchestratorRef.current!.selectOptions(indices), false);
    },
    [advance],
  );

  const answerOther = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || !rawQuestionRef.current) return;
      void advance(trimmed, () => orchestratorRef.current!.answerOther(trimmed), false);
    },
    [advance],
  );

  return {
    items,
    question: questionView,
    status,
    goalSpec,
    handoff,
    awaitingOpening,
    sendOpening,
    selectSingle,
    selectMulti,
    answerOther,
  };
}
