/**
 * useDreamCoach — the conversation that shapes the Dream layer, as a view-model.
 *
 * The sibling of {@link ./useJourneyEditCoach}, with one deliberate difference that comes straight
 * from D40: there is no approval step. The coach applies what it understood and the screen reports
 * what actually landed — so the honest thing to show is not what the model proposed but what the
 * engine accepted, which is what {@link AppCore.applyDreamEdit} returns.
 *
 * That distinction is the whole reason the summary is built from the APPLIED list against the
 * context as it was BEFORE the change: a removal the engine refused (because it would have left a
 * running Journey with no Dream at all) must not appear on screen as something that happened.
 *
 * SECURITY-PRIVACY G1: Dream wording is private on-device data. It lives in React state here, is
 * never logged, and never syncs.
 *
 * Business logic lives here, not in the screen (Engineering Bible §19).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DreamCoachOrchestrator } from '@/core/coach/DreamCoachOrchestrator';
import { SafetyLayer } from '@/core/coach/SafetyLayer';
import { makeCoachLlm } from '@/core/llm/makeCoachLlm';
import { useApp } from '@/state/AppProvider';

/** One render-ready item: a line somebody said, or the list of changes that landed. */
export type DreamCoachItem =
  | { kind: 'coach'; text: string }
  | { kind: 'user'; text: string }
  | { kind: 'changes'; lines: string[] };

export type DreamCoachStatus = 'idle' | 'thinking' | 'error';

export interface UseDreamCoach {
  items: DreamCoachItem[];
  status: DreamCoachStatus;
  send: (text: string) => void;
}

export interface UseDreamCoachOptions {
  /** Injected in tests; production builds its own over the composed cloud client. */
  orchestrator?: DreamCoachOrchestrator;
}

export function useDreamCoach(options: UseDreamCoachOptions = {}): UseDreamCoach {
  const { core } = useApp();
  const { t } = useTranslation('dreams');

  const orchestratorRef = useRef<DreamCoachOrchestrator | null>(null);
  const [items, setItems] = useState<DreamCoachItem[]>([]);
  const [status, setStatus] = useState<DreamCoachStatus>('idle');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    orchestratorRef.current =
      options.orchestrator ??
      new DreamCoachOrchestrator({
        llm: makeCoachLlm(),
        context: core.getDreamEditContext(),
        guard: new SafetyLayer().messageGuard(),
      });
    orchestratorRef.current.start(); // advances the orchestrator's history; the UI shows its own copy
    setItems([{ kind: 'coach', text: t('coach.greeting') }]);
  }, [core, options.orchestrator, t]);

  const send = useCallback(
    (text: string) => {
      const orchestrator = orchestratorRef.current;
      const typed = text.trim();
      if (!orchestrator || typed.length === 0) return;

      setItems((prev) => [...prev, { kind: 'user', text: typed }]);
      setStatus('thinking');

      void (async () => {
        // The context as the model saw it — titles resolve against this, including for a Dream the
        // change is about to reword out of existence.
        const before = core.getDreamEditContext();
        const turn = await orchestrator.say(typed);

        if (turn.unavailable) {
          setStatus('error');
          setItems((prev) => [...prev, { kind: 'coach', text: t('coach.unavailable') }]);
          return;
        }

        const applied = core.applyDreamEdit(turn.edit);
        const lines = core.describeDreamChanges(applied, before);

        setItems((prev) => [
          ...prev,
          ...(turn.reply ? [{ kind: 'coach' as const, text: turn.reply }] : []),
          ...(lines.length > 0 ? [{ kind: 'changes' as const, lines }] : []),
          ...(turn.reply || lines.length > 0 ? [] : [{ kind: 'coach' as const, text: t('coach.nothingChanged') }]),
        ]);
        setStatus('idle');

        // What just changed is what the next message is likely to be about.
        orchestrator.setContext(core.getDreamEditContext());
      })();
    },
    [core, t],
  );

  return { items, status, send };
}
