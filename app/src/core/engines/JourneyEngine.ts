/**
 * JourneyEngine — owns Journey + Step state and the check-in flow.
 * It emits events only; it performs NO reward or Buddy math (that belongs to
 * RewardEngine / BuddyEngine reacting to these events). Pure TS.
 */
import type { EventBus } from '../events/EventBus';
import type { AppState, Cadence, Journey, Rhythm, Step } from '../types/domain';
import { createId } from '../util/id';

export interface NewStepInput {
  title: string;
  description?: string;
  isStarterStep?: boolean;
  cadence?: Cadence;
}

export interface NewJourneyInput {
  title: string;
  why: string[];
  durationDays: number;
  rhythm: Rhythm;
  steps: NewStepInput[];
  dreamId?: string;
}

/** A Step surfaced for action, paired with its Journey for display/context. */
export interface TodayStep {
  journeyId: string;
  journeyTitle: string;
  step: Step;
}

export class JourneyEngine {
  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
  ) {}

  createJourney(input: NewJourneyInput): Journey {
    const now = Date.now();
    const steps: Step[] = input.steps.map((s) => ({
      id: createId('step'),
      title: s.title,
      description: s.description,
      isStarterStep: s.isStarterStep ?? false,
      cadence: s.cadence ?? 'once',
      done: false,
    }));

    const journey: Journey = {
      id: createId('journey'),
      title: input.title,
      why: input.why,
      durationDays: input.durationDays,
      rhythm: input.rhythm,
      steps,
      createdAt: now,
      dreamId: input.dreamId,
    };

    this.getState().journeys.push(journey);
    this.bus.emit({ type: 'JourneyCreated', journey });
    return journey;
  }

  /**
   * Check in on a Step. Marks it done, records a CheckIn, and emits StepCheckedIn.
   * If every Step in the Journey is now done, marks the Journey complete and emits
   * JourneyCompleted. No-op if the Journey/Step is missing or already done.
   */
  checkInStep(journeyId: string, stepId: string): void {
    const state = this.getState();
    const journey = state.journeys.find((j) => j.id === journeyId);
    if (!journey) return;
    const step = journey.steps.find((s) => s.id === stepId);
    if (!step || step.done) return;

    const now = Date.now();
    step.done = true;
    step.lastCheckInAt = now;

    const checkIn = { id: createId('checkin'), journeyId, stepId, at: now };
    state.checkIns.push(checkIn);
    this.bus.emit({ type: 'StepCheckedIn', journeyId, step, checkIn });

    if (!journey.completedAt && journey.steps.every((s) => s.done)) {
      journey.completedAt = now;
      this.bus.emit({ type: 'JourneyCompleted', journey });
    }
  }

  /** Steps the user can act on now: not-yet-done Steps of active Journeys. */
  getTodaySteps(): TodayStep[] {
    const today: TodayStep[] = [];
    for (const journey of this.getState().journeys) {
      if (journey.completedAt) continue;
      for (const step of journey.steps) {
        if (!step.done) {
          today.push({ journeyId: journey.id, journeyTitle: journey.title, step });
        }
      }
    }
    return today;
  }
}
