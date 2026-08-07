/**
 * StepReportFlow — the presentational ORCHESTRATOR behind a Step row's ⋯ menu on
 * Home (2026-08-07 redesign). It shows the compact {@link StepReportSheet} and routes
 * each choice to the AppCore facade, REUSING the old Miss-Recovery sheets so no report
 * logic is duplicated (Engineering Bible §19 — the engines own the logic):
 *
 *   Done       → core.checkInStep  (+ a celebratory confetti burst via onDone)
 *   Partial    → core.submitReason(did_partially)   — records partial progress
 *   Couldn't   → core.submitReason(couldnt, cancel) — free let-go (grace lever)
 *   Postpone   → RecoveryFlow      — the full "what happened?" loop (reused)
 *   Reschedule → RescheduleModal   — pick a proposed time (reused), retime lever
 *
 * Purely wiring: it holds no business logic, only sequences sheets and calls the
 * facade. Rendered once by Home; `step` being null keeps everything closed.
 */
import { useEffect, useMemo, useState } from 'react';

import { RecoveryFlow } from '@/components/journey/RecoveryFlow';
import { RescheduleModal } from '@/components/journey/RescheduleModal';
import { StepReportSheet, type ReportChoice } from '@/components/home/StepReportSheet';
import type { AppCore, WeekReviewOutcome } from '@/core/AppCore';
import type { TodayStep } from '@/core/engines/JourneyEngine';

type Stage = 'menu' | 'recovery' | 'reschedule';

export function StepReportFlow({
  step,
  core,
  onDone,
  onReviewed,
  onClose,
}: {
  /** The Step being reported on, or null when the flow is closed. */
  step: TodayStep | null;
  core: AppCore;
  /** Fired the moment a Step is marked done, so Home can celebrate (confetti). */
  onDone: () => void;
  /**
   * Fired after a report ran the adaptive week-review, so Home can surface the outcome (the
   * "I adjusted your week" card). Inert `{ changed: false }` when the adaptive loop is off.
   */
  onReviewed?: (outcome: WeekReviewOutcome) => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>('menu');

  // Every time a new Step opens the flow, start at the compact menu.
  useEffect(() => {
    if (step) setStage('menu');
  }, [step]);

  // Reschedule candidates are proposed by the engine (gated by the device env); only
  // computed once we actually enter the reschedule stage for the current Step.
  const candidates = useMemo(
    () => (step && stage === 'reschedule' ? core.proposeStepTimes(step.journeyId, step.step.id) : []),
    [step, stage, core],
  );

  if (!step) return null;
  const { journeyId, step: s } = step;

  // Report the reason, THEN run the adaptive week-review and surface its outcome. Awaiting
  // submitReason first ensures the on-device signal is recorded before the model re-reads it.
  // reviewWeek is synchronous and inert when the adaptive loop is off, so this is a no-op there.
  const reportAndReview = async (
    action: 'postpone' | 'cancel',
    reasonId: 'did_partially' | 'couldnt' | 'forgot',
    chosenTime?: number,
  ) => {
    await core.submitReason({ journeyId, stepId: s.id, action, reasonId, chosenTime });
    onReviewed?.(core.reviewWeek(journeyId));
    onClose();
  };

  const choose = (choice: ReportChoice) => {
    switch (choice) {
      case 'done':
        core.checkInStep(journeyId, s.id);
        onDone();
        onClose();
        break;
      case 'partial':
        // Keep the Step, record the partial progress (did_partially → reshape + partial).
        void reportAndReview('postpone', 'did_partially');
        break;
      case 'couldnt':
        // Let this occurrence go — free, no penalty (couldnt → grace lever).
        void reportAndReview('cancel', 'couldnt');
        break;
      case 'postpone':
        setStage('recovery');
        break;
      case 'reschedule':
        setStage('reschedule');
        break;
    }
  };

  return (
    <>
      <StepReportSheet
        visible={stage === 'menu'}
        stepTitle={s.title}
        onChoose={choose}
        onClose={onClose}
      />

      {/* Reused Miss-Recovery loop (postpone → what happened → propose times). */}
      {stage === 'recovery' && <RecoveryFlow step={step} core={core} onClose={onClose} />}

      {/* Reused reschedule sheet — confirm a proposed time (retime lever). */}
      <RescheduleModal
        visible={stage === 'reschedule'}
        stepTitle={s.title}
        candidates={candidates}
        onConfirm={(chosenAt) => {
          void reportAndReview('postpone', 'forgot', chosenAt);
        }}
        onCancel={onClose}
      />
    </>
  );
}
