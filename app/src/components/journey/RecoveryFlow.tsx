/**
 * RecoveryFlow — the presentational ORCHESTRATOR for a Step postponement (Step Postponement, D37).
 * It sequences the fast sheet and the optional follow-ups and calls the AppCore facade; all the
 * date/constraint + scheduling logic lives in the helper + AppCore (Bible §19, D37 §11.6d):
 *
 *   Postpone (fast sheet)
 *     • Remind me in 2 hours  → core.postponeStepReminder()             (per-occurrence one-shot)
 *     • Pick a time           → RescheduleModal → postponeStepReminder({ chosenTime })
 *     • Add a reason (opt.)    → ReasonSheet     → postponeStepReminder({ reasonId, note })
 *     • Not this time          → ReasonSheet     → core.submitReason(cancel)   (free let-go)
 *
 * A postpone NEVER requires a reason (§11.2). The fast sheet stays open to surface an honest notice
 * (no-slot-today, a day-crossing warning, or reminders-off) instead of silently closing.
 */
import { useState } from 'react';
import { Linking } from 'react-native';

import { PostponeSheet } from '@/components/journey/PostponeSheet';
import { interpretPostponeResult } from '@/components/journey/postponeResult';
import { ReasonHistorySheet } from '@/components/journey/ReasonHistorySheet';
import { ReasonSheet } from '@/components/journey/ReasonSheet';
import { RescheduleModal } from '@/components/journey/RescheduleModal';
import type { AppCore, PostponeReminderResult } from '@/core/AppCore';
import { buildCalendarLink } from '@/core/calendar/calendarLink';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import type { ReasonId } from '@/core/types/domain';
import type { Candidate } from '@/core/util/reschedule';
import { useTranslation } from 'react-i18next';

type Stage = 'postpone' | 'reason' | 'times' | 'history';

export function RecoveryFlow({
  step,
  core,
  onClose,
}: {
  step: TodayStep;
  core: AppCore;
  onClose: () => void;
}) {
  const { t } = useTranslation('journey');
  const [stage, setStage] = useState<Stage>('postpone');
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const { journeyId, step: s } = step;

  // This Step's on-device reason history (G1 — it never leaves the device). Read here so the
  // sheet below and the link that opens it agree on whether there is anything to look back at.
  const pastReasons = core.getReasonHistory(s.id);

  // Interpret a postpone result through the SHARED reading (identical to Home's StepReportFlow):
  // close on a clean success, else keep the fast sheet open with an honest notice the user can read
  // (no-slot-today, a day-crossing warning, or reminders-off).
  const handleResult = (result: PostponeReminderResult) => {
    const { close, notice: n } = interpretPostponeResult(result, t);
    if (close) {
      onClose();
      return;
    }
    setStage('postpone');
    setNotice(n);
  };

  const remindDefault = async () => {
    handleResult(await core.postponeStepReminder(journeyId, s.id));
  };

  const confirmTime = async (chosenAt: number) => {
    handleResult(await core.postponeStepReminder(journeyId, s.id, { chosenTime: chosenAt }));
  };

  // Zero-permission "add to my calendar" (the user creates the event, so the app needs no
  // calendar-write permission). Best-effort — a failure never breaks the loop.
  const onAddToCalendar = (chosenAt: number) => {
    const { googleUrl } = buildCalendarLink(s, chosenAt);
    void Linking.openURL(googleUrl).catch(() => {});
  };

  // "Add a reason" and "Not this time" both go through the reason sheet, but with different intent.
  const [intent, setIntent] = useState<'postpone' | 'cancel'>('postpone');
  const onReason = (chosen: ReasonId, note?: string) => {
    if (intent === 'cancel') {
      void core.submitReason({ journeyId, stepId: s.id, action: 'cancel', reasonId: chosen, note });
      onClose();
      return;
    }
    // §11.6a: "Did it partially" is a FINAL report even when reached via "Add a reason" — record it
    // as a Partial (its StepPartial cancels any pending one-shot), NEVER as another postpone.
    if (chosen === 'did_partially') {
      void core.submitReason({
        journeyId,
        stepId: s.id,
        action: 'postpone',
        reasonId: 'did_partially',
        note,
      });
      onClose();
      return;
    }
    void core.postponeStepReminder(journeyId, s.id, { reasonId: chosen, note }).then(handleResult);
  };

  return (
    <>
      <PostponeSheet
        visible={stage === 'postpone'}
        stepTitle={s.title}
        notice={notice}
        onRemindDefault={() => void remindDefault()}
        onPickTime={() => {
          setCandidates(core.proposeStepTimes(journeyId, s.id));
          setStage('times');
        }}
        onAddReason={() => {
          setIntent('postpone');
          setStage('reason');
        }}
        onLetGo={() => {
          setIntent('cancel');
          setStage('reason');
        }}
        onClose={onClose}
      />
      <ReasonSheet
        visible={stage === 'reason'}
        onSubmit={onReason}
        onBack={onClose}
        // Offered ONLY when this Step already has history — see the prop's contract. Read fresh on
        // each render so a reason recorded in this very flow is there the next time round.
        onSeePastReasons={pastReasons.length > 0 ? () => setStage('history') : undefined}
      />
      <ReasonHistorySheet
        visible={stage === 'history'}
        stepTitle={s.title}
        entries={pastReasons}
        // Back to the reason chips, not out of the flow: the user came here to remember something
        // before answering, so closing must return them to the question they were answering.
        onClose={() => setStage('reason')}
      />
      <RescheduleModal
        visible={stage === 'times'}
        stepTitle={s.title}
        candidates={candidates}
        onConfirm={(chosenAt) => void confirmTime(chosenAt)}
        onCancel={onClose}
        onAddToCalendar={onAddToCalendar}
      />
    </>
  );
}
