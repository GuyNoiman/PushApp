/**
 * StreakEngine — owns the prominent day-count streak (founder decision D26.4). It subscribes
 * to the bus and persists to AppState, mirroring RewardEngine/BuddyEngine.
 *
 * STREAK SEMANTICS (current, ADJUSTABLE definition — tunable numbers live in config/streak):
 *   • `streak` counts up by 1 the FIRST time the user checks in a Step on a NEW calendar day
 *     (a day later than `lastActiveDay`). Further check-ins the same day don't move it. The
 *     first-ever check-in makes it 1.
 *   • An ORDINARY missed Step does NOT reset the streak.
 *   • Missing an URGENT Step — one whose Journey has "no slack left this week" (see util/urgency,
 *     via config/streak) — RESETS the streak to 0 and clears `lastActiveDay`, so the next check-in
 *     starts a fresh streak at 1.
 *
 * The miss signal is StepMissed (emitted by the BehaviorModelEngine's slip detector, gated behind
 * the adaptive-coach flag); when that flag is off no miss fires and the streak simply never resets.
 * Emits StreakChanged on any change so AppCore persists it through the same save path. Constructor
 * mirrors the other engines: injected bus + getState + injected clock + injected config, so it is
 * deterministic and unit-testable. Pure TS — no React/vendor imports.
 */
import { STREAK_CONFIG, type StreakConfig } from '../config/streak';
import type { EventBus } from '../events/EventBus';
import type { StepCheckedIn, StepMissed } from '../events/events';
import type { AppState } from '../types/domain';
import { dateKey } from '../util/date';
import { isUrgentMiss } from '../util/urgency';

export class StreakEngine {
  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
    /** Injected clock (epoch ms; defaults to the real one) — overridden in tests. */
    private readonly now: () => number = () => Date.now(),
    private readonly config: StreakConfig = STREAK_CONFIG,
  ) {}

  start(): void {
    this.bus.on('StepCheckedIn', this.onStepCheckedIn);
    this.bus.on('StepMissed', this.onStepMissed);
  }

  stop(): void {
    this.bus.off('StepCheckedIn', this.onStepCheckedIn);
    this.bus.off('StepMissed', this.onStepMissed);
  }

  /** First check-in of a NEW calendar day increments the streak; same-day repeats don't. */
  private readonly onStepCheckedIn = (_event: StepCheckedIn): void => {
    const state = this.getState();
    const today = dateKey(new Date(this.now()));
    if (state.lastActiveDay != null && today <= state.lastActiveDay) return;
    state.streak = (state.streak ?? 0) + 1;
    state.lastActiveDay = today;
    this.bus.emit({ type: 'StreakChanged', streak: state.streak });
  };

  /** An URGENT miss resets the streak; an ordinary miss leaves it untouched. */
  private readonly onStepMissed = (event: StepMissed): void => {
    const state = this.getState();
    const journey = state.journeys.find((j) => j.id === event.journeyId);
    if (!journey) return;
    if (!isUrgentMiss(journey, this.now(), this.config)) return; // ordinary miss — no reset
    if ((state.streak ?? 0) === 0 && state.lastActiveDay == null) return; // already cleared
    state.streak = 0;
    state.lastActiveDay = null;
    this.bus.emit({ type: 'StreakChanged', streak: 0 });
  };
}
