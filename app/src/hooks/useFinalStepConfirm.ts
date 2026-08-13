/**
 * useFinalStepConfirm — the ONE shared gate in front of every "mark Step Done" path (Completion
 * Celebration PRD §2.2). A Journey completion is final (D41), so before a check-in that would
 * complete the whole Journey we ask a gentle confirmation; a NON-final Step is never interrupted.
 *
 * Contract: call `requestDone(journeyId, stepId, onConfirm)` from a Done action. If
 * {@link AppCore.willCompleteJourney} is true the confirmation opens and `onConfirm` runs only on
 * confirm; otherwise `onConfirm` runs immediately (no prompt). The decision lives here once so the
 * three completion paths (Home swipe, ⋯ menu, Journey-detail CTA) never duplicate it — each just
 * renders {@link FinalStepConfirmSheet} with `confirmVisible` and wires `confirm` / `cancel`.
 *
 * Framework-light: holds only the pending action + visibility; no business logic (the willComplete
 * truth lives in the engine, behind the AppCore facade).
 */
import { useCallback, useState } from 'react';

import type { AppCore } from '@/core/AppCore';

export function useFinalStepConfirm(core: AppCore) {
  // The Done action awaiting confirmation while the sheet is open; null = no prompt pending.
  const [pendingConfirm, setPendingConfirm] = useState<(() => void) | null>(null);

  const requestDone = useCallback(
    (journeyId: string, stepId: string, onConfirm: () => void) => {
      if (core.willCompleteJourney(journeyId, stepId)) {
        // Store the action as a value (the updater form avoids React treating it as a state updater).
        setPendingConfirm(() => onConfirm);
      } else {
        onConfirm();
      }
    },
    [core],
  );

  const confirm = useCallback(() => {
    pendingConfirm?.();
    setPendingConfirm(null);
  }, [pendingConfirm]);

  // Cancel leaves the Journey fully active — no side effect (D41: completion is irreversible).
  const cancel = useCallback(() => setPendingConfirm(null), []);

  return { confirmVisible: pendingConfirm != null, requestDone, confirm, cancel };
}
