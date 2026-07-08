/**
 * AppCore — the composition root. It builds the EventBus, the Repository, and
 * every engine, wires their subscriptions, loads persisted state on start and
 * saves on change, and exposes a small facade to the UI. This is the only place
 * that knows how the pieces fit together; the UI talks only to this facade.
 *
 * Business logic lives in the engines (Engineering Bible §19). AppCore just wires
 * and owns state — it performs no reward/Buddy/Journey math itself.
 */
import { resolveBuddy } from './config/buddyStages';
import { REWARDS } from './config/rewards';
import { BuddyEngine } from './engines/BuddyEngine';
import { JourneyEngine, type NewJourneyInput, type TodayStep } from './engines/JourneyEngine';
import { ReminderEngine, type DailyReminderInput } from './engines/ReminderEngine';
import { RewardEngine } from './engines/RewardEngine';
import { EventBus } from './events/EventBus';
import { LocalRepository } from './persistence/LocalRepository';
import type { Repository } from './persistence/Repository';
import type { AppState, Buddy, Journey } from './types/domain';

/** A Buddy enriched with derived progression for display. */
export interface BuddyView extends Buddy {
  stageDisplayName: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

/** An immutable read-model the UI renders. Recomputed on every change. */
export interface Snapshot {
  buddy: BuddyView;
  journeys: Journey[];
  todaySteps: TodayStep[];
  activeJourneyCount: number;
}

function initialBuddy(): Buddy {
  return { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0 };
}

function emptyState(): AppState {
  return { dreams: [], journeys: [], buddy: initialBuddy(), checkIns: [] };
}

export class AppCore {
  /** Exposed so the UI can react to one-off moments (e.g. a Buddy celebration). */
  readonly bus = new EventBus();

  private state: AppState = emptyState();
  private readonly repo: Repository;

  private readonly journeyEngine: JourneyEngine;
  private readonly rewardEngine: RewardEngine;
  private readonly buddyEngine: BuddyEngine;
  private readonly reminderEngine: ReminderEngine;

  private readonly listeners = new Set<() => void>();
  private started = false;

  constructor(repo: Repository = new LocalRepository()) {
    this.repo = repo;
    const getState = () => this.state;
    this.journeyEngine = new JourneyEngine(this.bus, getState);
    this.rewardEngine = new RewardEngine(this.bus, REWARDS);
    this.buddyEngine = new BuddyEngine(this.bus, getState);
    this.reminderEngine = new ReminderEngine();
  }

  /** Load persisted state (seeding a demo Journey on first run) and start engines. */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const loaded = await this.repo.load();
    if (loaded) {
      this.state = loaded;
    } else {
      this.state = emptyState();
    }

    this.rewardEngine.start();
    this.buddyEngine.start();

    // Persist + notify after any state-changing domain event.
    this.bus.on('JourneyCreated', this.onChanged);
    this.bus.on('StepCheckedIn', this.onChanged);
    this.bus.on('JourneyCompleted', this.onChanged);
    this.bus.on('BuddyReacted', this.onChanged);

    if (!loaded) {
      this.seedDemoJourney();
    }
  }

  private readonly onChanged = (): void => {
    void this.repo.save(this.state);
    this.notify();
  };

  /** Seed ONE demo Journey (Starter Step + 2 ordinary Steps) so Home isn't empty. */
  private seedDemoJourney(): void {
    this.journeyEngine.createJourney({
      title: 'Run 5km',
      why: ['Feel stronger and clear-headed', 'Prove to myself I follow through'],
      durationDays: 30,
      rhythm: 'few-times-week',
      steps: [
        {
          title: 'Lace up and walk for 10 minutes',
          description: 'The Starter Step — just get out the door.',
          isStarterStep: true,
          cadence: 'once',
        },
        { title: 'Jog for 15 minutes', cadence: 'weekly' },
        { title: 'Run a full 2km without stopping', cadence: 'weekly' },
      ],
    });
  }

  // ── Facade ────────────────────────────────────────────────────────────────

  createJourney(input: NewJourneyInput): Journey {
    return this.journeyEngine.createJourney(input);
  }

  checkInStep(journeyId: string, stepId: string): void {
    this.journeyEngine.checkInStep(journeyId, stepId);
  }

  /** Request notification permission for on-device reminders. Returns whether granted. */
  initReminders(): Promise<boolean> {
    return this.reminderEngine.init();
  }

  /** Schedule a simple time/day reminder. Returns the reminder id, or null if unavailable. */
  scheduleDailyReminder(input: DailyReminderInput): Promise<string | null> {
    return this.reminderEngine.scheduleDailyReminder(input);
  }

  getSnapshot(): Snapshot {
    const p = resolveBuddy(this.state.buddy.xp);
    const buddy: BuddyView = {
      ...this.state.buddy,
      level: p.level,
      stage: p.stage,
      stageDisplayName: p.stageDisplayName,
      xpIntoLevel: p.xpIntoLevel,
      xpForNextLevel: p.xpForNextLevel,
    };
    return {
      buddy,
      journeys: this.state.journeys,
      todaySteps: this.journeyEngine.getTodaySteps(),
      activeJourneyCount: this.state.journeys.filter((j) => !j.completedAt).length,
    };
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}
