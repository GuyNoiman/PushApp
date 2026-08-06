/**
 * RecoveryFlow — the presentational ORCHESTRATOR for the user-triggered Miss-Recovery
 * loop (PRD §2). It sequences the three sheets and calls the AppCore facade; all the
 * lever/mapping logic lives in the engine (Bible §19), so this only routes:
 *
 *   Postpone (Screen 1) → What happened? (Screen 2) → [propose times, if Retime] → done
 *
 * The reason decides whether we ask for a time: `core.reasonNeedsReschedule` (a thin
 * read over the config rules) — the screen never computes levers itself. Cancel is
 * FREE; no Grace-Token/streak language. The "Forgot" bundle offers a zero-permission
 * add-to-calendar link (built in core, opened via expo-linking here — the vendor
 * import stays in the component, not core).
 */
import { useState } from 'react';
import { Linking } from 'react-native';

import { PostponeSheet } from '@/components/journey/PostponeSheet';
import { ReasonSheet } from '@/components/journey/ReasonSheet';
import { RescheduleModal } from '@/components/journey/RescheduleModal';
import type { AppCore } from '@/core/AppCore';
import { buildCalendarLink } from '@/core/calendar/calendarLink';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import type { PostponeAction, ReasonId } from '@/core/types/domain';
import type { Candidate } from '@/core/util/reschedule';

type Stage = 'postpone' | 'reason' | 'times';

export function RecoveryFlow({
  step,
  core,
  onClose,
}: {
  step: TodayStep;
  core: AppCore;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>('postpone');
  const [action, setAction] = useState<PostponeAction>('postpone');
  const [reasonId, setReasonId] = useState<ReasonId | null>(null);
  const [note, setNote] = useState<string | undefined>(undefined);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const { journeyId, step: s } = step;

  // Screen 1 → Screen 2. Postpone keeps the Step; "Not this time" lets it go (free).
  const choose = (a: PostponeAction) => {
    setAction(a);
    setStage('reason');
  };

  // Screen 2 → either the propose-times step (Retime reasons) or straight to submit.
  const onReason = (chosen: ReasonId, chosenNote?: string) => {
    setReasonId(chosen);
    setNote(chosenNote);
    if (core.reasonNeedsReschedule(chosen)) {
      setCandidates(core.proposeStepTimes(journeyId, s.id));
      setStage('times');
    } else {
      void core.submitReason({ journeyId, stepId: s.id, action, reasonId: chosen, note: chosenNote });
      onClose();
    }
  };

  const onConfirmTime = (chosenAt: number) => {
    if (!reasonId) return;
    void core.submitReason({ journeyId, stepId: s.id, action, reasonId, note, chosenTime: chosenAt });
    onClose();
  };

  const onAddToCalendar = (chosenAt: number) => {
    const { googleUrl } = buildCalendarLink(s, chosenAt);
    void Linking.openURL(googleUrl).catch(() => {
      // Opening the calendar link is best-effort — a failure never breaks the loop.
    });
  };

  return (
    <>
      <PostponeSheet
        visible={stage === 'postpone'}
        stepTitle={s.title}
        onPostpone={() => choose('postpone')}
        onLetGo={() => choose('cancel')}
        onClose={onClose}
      />
      <ReasonSheet visible={stage === 'reason'} onSubmit={onReason} onBack={onClose} />
      <RescheduleModal
        visible={stage === 'times'}
        stepTitle={s.title}
        candidates={candidates}
        onConfirm={onConfirmTime}
        onCancel={onClose}
        onAddToCalendar={onAddToCalendar}
      />
    </>
  );
}
