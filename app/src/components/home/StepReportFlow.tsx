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
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { FinalStepConfirmSheet } from '@/components/celebration/FinalStepConfirmSheet';
import { RecoveryFlow } from '@/components/journey/RecoveryFlow';
import { RescheduleModal } from '@/components/journey/RescheduleModal';
import { interpretPostponeResult } from '@/components/journey/postponeResult';
import { PartialNoteSheet } from '@/components/home/PartialNoteSheet';
import { StepReportSheet, type ReportChoice } from '@/components/home/StepReportSheet';
import type { AppCore, WeekReviewOutcome } from '@/core/AppCore';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import { isInClosedWeek } from '@/core/util/week';
import { useFinalStepConfirm } from '@/hooks/useFinalStepConfirm';

type Stage = 'menu' | 'partialNote' | 'recovery' | 'reschedule';

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
  const { t } = useTranslation('journey');
  // Completion Celebration I1 (Slice 5): the SAME shared gate the swipe path uses — a Done that would
  // complete the Journey (final, D41) first asks a gentle confirmation.
  const { confirmVisible, requestDone, confirm, cancel } = useFinalStepConfirm(core);

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
  const { journeyId, step: s, status } = step;

  // Report actions are disabled when the Step is read-only: a past (closed) week (D35.3), OR a Step
  // LOCKED by an unmet dependency (Step Dependencies) — a locked dependent must never independently
  // record a report/miss; it becomes actionable only once its predecessor unlocks it.
  const locked = isInClosedWeek(s.plannedFor) || step.locked;

  // Moving OUT of `completed` first clears the completion via reverseReport (D36), so the target
  // report (partial / couldn't / postpone / reschedule) can actually take — checkInStep/markPartial
  // are one-way and no-op on a done Step. No XP is clawed back (the engine keeps the reward latched).
  const reverseIfCompleted = () => {
    if (status === 'completed') core.reverseReport(journeyId, s.id);
  };

  // Report the reason, THEN run the adaptive week-review and surface its outcome. Awaiting
  // submitReason first ensures the on-device signal is recorded before the model re-reads it.
  // reviewWeek is synchronous and inert when the adaptive loop is off, so this is a no-op there.
  const reportAndReview = async (
    action: 'postpone' | 'cancel',
    reasonId: 'did_partially' | 'couldnt' | 'forgot',
    chosenTime?: number,
    note?: string,
  ) => {
    await core.submitReason({ journeyId, stepId: s.id, action, reasonId, chosenTime, note });
    onReviewed?.(core.reviewWeek(journeyId));
    onClose();
  };

  const choose = (choice: ReportChoice) => {
    switch (choice) {
      case 'done': {
        // Done wins regardless of the prior status (checkInStep is a no-op if already done). Route
        // through the shared gate: a Done that would complete the whole Journey first asks a gentle
        // confirmation (Slice 5); a non-final Step proceeds at once. On completion we SUPPRESS the
        // small confetti (skip onDone) — the big ceremony auto-opens from Home (PRD §2.2). The confirm
        // sheet closes the whole flow itself, so we do NOT call onClose here for the prompted path.
        requestDone(journeyId, s.id, () => {
          const completesJourney = core.willCompleteJourney(journeyId, s.id);
          core.checkInStep(journeyId, s.id);
          if (!completesJourney) onDone();
          onClose();
        });
        break;
      }
      case 'partial':
        // Reveal the OPTIONAL on-device note first; the actual report fires on save (D36).
        setStage('partialNote');
        break;
      case 'couldnt':
        // Let this occurrence go — free, no penalty (couldnt → grace lever). If OTHER Steps depend on
        // this one (Step Dependencies), first confirm the consequence: the dependents keep waiting until
        // this Step is done, and it (with any scheduled chain) comes back next week. Confirm → record the
        // not-done AND defer the chain forward; decline → nothing happens (no report, no reschedule). A
        // Step with no dependents behaves exactly as before.
        if (core.hasDependentSteps(journeyId, s.id)) {
          Alert.alert(t('dependents.deferConfirm.title'), t('dependents.deferConfirm.message'), [
            { text: t('dependents.deferConfirm.cancel'), style: 'cancel' },
            {
              text: t('dependents.deferConfirm.confirm'),
              onPress: () => {
                reverseIfCompleted();
                core.deferDependents(journeyId, s.id);
                void reportAndReview('cancel', 'couldnt');
              },
            },
          ]);
        } else {
          reverseIfCompleted();
          void reportAndReview('cancel', 'couldnt');
        }
        break;
      case 'postpone':
        reverseIfCompleted();
        setStage('recovery');
        break;
      case 'reschedule':
        reverseIfCompleted();
        setStage('reschedule');
        break;
      case 'notReportedYet':
        // Reverse only — clear the report back to unreported, keeping history (D36).
        core.reverseReport(journeyId, s.id);
        onClose();
        break;
    }
  };

  return (
    <>
      <StepReportSheet
        visible={stage === 'menu' && !confirmVisible}
        stepTitle={s.title}
        status={status}
        locked={locked}
        onChoose={choose}
        onClose={onClose}
      />

      {/* Gentle final-step confirmation — only when a Done would complete the Journey (D41). Cancel
          closes the whole flow with no side effect; confirm runs the deferred check-in + closes. */}
      <FinalStepConfirmSheet
        visible={confirmVisible}
        onConfirm={confirm}
        onCancel={() => {
          cancel();
          onClose();
        }}
      />

      {/* Partial — an OPTIONAL, non-blocking on-device note, then record the partial progress. */}
      <PartialNoteSheet
        visible={stage === 'partialNote'}
        stepTitle={s.title}
        onSave={(note) => {
          reverseIfCompleted();
          void reportAndReview('postpone', 'did_partially', undefined, note);
        }}
        onBack={onClose}
      />

      {/* Reused Miss-Recovery loop (postpone → what happened → propose times). */}
      {stage === 'recovery' && <RecoveryFlow step={step} core={core} onClose={onClose} />}

      {/* Reused reschedule sheet — confirm a proposed time as a PER-OCCURRENCE one-shot postpone
          (Step Postponement, D37 §11.4), NOT a Journey-level retime. The adaptive week-review still
          runs off the recorded signal. */}
      <RescheduleModal
        visible={stage === 'reschedule'}
        stepTitle={s.title}
        candidates={candidates}
        onConfirm={(chosenAt) => {
          void (async () => {
            const result = await core.postponeStepReminder(journeyId, s.id, { chosenTime: chosenAt });
            // Same shared reading as RecoveryFlow — never silently swallow a failure / false success.
            const { close, notice } = interpretPostponeResult(result, t);
            if (result.ok) onReviewed?.(core.reviewWeek(journeyId));
            if (notice) Alert.alert(notice);
            if (close) onClose();
          })();
        }}
        onCancel={onClose}
      />
    </>
  );
}
