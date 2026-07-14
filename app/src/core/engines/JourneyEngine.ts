/**
 * JourneyEngine — owns Journey + Step state and the check-in flow.
 * It emits events only; it performs NO reward or Buddy math (that belongs to
 * RewardEngine / BuddyEngine reacting to these events). Pure TS.
 *
 * Model (confirmed with founder 2026-07-14): a Journey holds a FINITE set of Steps
 * (a Journey lasts up to ~2 months, so the Steps are bounded). Each Step is completed
 * ONCE; every completion fires a small celebration (via `StepCheckedIn` → reward/Buddy
 * engines). The Journey completes when the LAST Step is done — i.e. every Step is done.
 * There is no per-Step auto-recurrence; recurring practice is expressed as multiple
 * planned Steps (future: the weekly-planning flow generates them).
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
  description?: string;
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
      description: input.description,
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
   * Check in on a Step: mark it done (one-shot), record a CheckIn, and emit
   * StepCheckedIn — the reward/Buddy engines turn that into the small per-Step
   * celebration. When every Step in the Journey is done, mark the Journey complete
   * and emit JourneyCompleted. No-op if the Journey/Step is missing or already done.
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

    // Finite Steps: the Journey completes when the last Step is done.
    if (!journey.completedAt && journey.steps.every((s) => s.done)) {
      journey.completedAt = now;
      this.bus.emit({ type: 'JourneyCompleted', journey });
    }
  }

  /**
   * A Journey's completion ratio in [0,1] — done Steps over total Steps, or 0 when
   * the Journey is missing or has no Steps. The single source of this math (was
   * inlined in SocialProvider's progress publish): keeps engine logic out of the UI
   * (Engineering Bible §19).
   */
  journeyProgress(journeyId: string): number {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey) return 0;
    const total = journey.steps.length;
    if (total === 0) return 0;
    const done = journey.steps.filter((s) => s.done).length;
    return done / total;
  }

  /** Steps the user can act on now: the not-yet-done Steps of active (incomplete) Journeys. */
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

  /**
   * Every Step of active (incomplete) Journeys — INCLUDING already-done ones —
   * for Home's "Week's steps" list. This is the display SUPERSET of getTodaySteps:
   * a checked-in Step stays in the list (the UI sinks it to the bottom, dimmed, with
   * a done indicator) instead of vanishing (Home_Screen.md: "Completed Steps move to
   * the bottom of the feed, shown disabled"). getTodaySteps() stays the "actionable"
   * subset that drives counts. No filtering by date yet — the domain Step has no
   * scheduled window (TODO: data model), so "week" mirrors getTodaySteps' scope.
   */
  getWeekSteps(): TodayStep[] {
    const week: TodayStep[] = [];
    for (const journey of this.getState().journeys) {
      if (journey.completedAt) continue;
      for (const step of journey.steps) {
        week.push({ journeyId: journey.id, journeyTitle: journey.title, step });
      }
    }
    return week;
  }
}
