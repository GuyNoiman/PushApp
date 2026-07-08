/**
 * MissionEngine unit tests — pure TS. Verify the return loop: progress advances
 * on the mapped domain events, completes at the target, a claim grants Coins via
 * RewardGranted exactly once (a second claim is a no-op), the Login reward is
 * claimable once per day, and daily/weekly Missions reset on rollover. Time is
 * driven by an INJECTED clock so nothing depends on real time (Engineering Bible
 * §18 + §3 configuration-before-code).
 */
import type { LoginRewardConfig } from '../../config/loginReward';
import type { MissionDef } from '../../config/missions';
import { EventBus } from '../../events/EventBus';
import type {
  LoginRewardClaimed,
  MissionClaimed,
  MissionCompleted,
  RewardGranted,
} from '../../events/events';
import type { AppState, Buddy, CheckIn, Step } from '../../types/domain';
import { MissionEngine } from '../MissionEngine';

const MISSIONS: MissionDef[] = [
  { id: 'daily_checkin_1', title: 'Check in on a Step', cadence: 'daily', trigger: 'StepCheckedIn', target: 1, rewardCoins: 5 },
  { id: 'daily_checkin_3', title: 'Check in on 3 Steps', cadence: 'daily', trigger: 'StepCheckedIn', target: 3, rewardCoins: 10 },
  { id: 'weekly_complete', title: 'Complete a Journey', cadence: 'weekly', trigger: 'JourneyCompleted', target: 1, rewardCoins: 40 },
  { id: 'daily_equip', title: 'Dress up your Buddy', cadence: 'daily', trigger: 'ItemEquipped', target: 1, rewardCoins: 5 },
];

const LOGIN: LoginRewardConfig = { cycleCoins: [5, 10, 20] };

function makeBuddy(): Buddy {
  return { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null };
}

function emptyState(): AppState {
  return {
    dreams: [],
    journeys: [],
    buddy: makeBuddy(),
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
  };
}

/** A mutable clock the tests advance by hand — no reliance on real time. */
function clock(initial: Date) {
  let current = initial;
  return {
    now: () => current,
    set: (d: Date) => {
      current = d;
    },
  };
}

function setup(initial = new Date(2026, 6, 8)) {
  const bus = new EventBus();
  const state = emptyState();
  const time = clock(initial);
  const engine = new MissionEngine(bus, () => state, MISSIONS, LOGIN, time.now);

  const rewards: RewardGranted[] = [];
  const completed: MissionCompleted[] = [];
  const claimed: MissionClaimed[] = [];
  const logins: LoginRewardClaimed[] = [];
  bus.on('RewardGranted', (e) => rewards.push(e));
  bus.on('MissionCompleted', (e) => completed.push(e));
  bus.on('MissionClaimed', (e) => claimed.push(e));
  bus.on('LoginRewardClaimed', (e) => logins.push(e));

  engine.start();
  return { bus, state, engine, time, rewards, completed, claimed, logins };
}

function makeStep(): Step {
  return { id: 'step_1', title: 'Walk', isStarterStep: false, cadence: 'once', done: true };
}
function makeCheckIn(): CheckIn {
  return { id: 'checkin_1', journeyId: 'journey_1', stepId: 'step_1', at: 0 };
}
function emitCheckIn(bus: EventBus) {
  bus.emit({ type: 'StepCheckedIn', journeyId: 'journey_1', step: makeStep(), checkIn: makeCheckIn() });
}

describe('MissionEngine — progress', () => {
  it('advances mapped Missions on a check-in and completes at the target', () => {
    const { bus, engine, completed } = setup();

    emitCheckIn(bus); // both check-in Missions +1; the 1-target one completes

    const oneStep = engine.getMissions().find((m) => m.id === 'daily_checkin_1')!;
    const threeStep = engine.getMissions().find((m) => m.id === 'daily_checkin_3')!;
    expect(oneStep.progress).toBe(1);
    expect(oneStep.done).toBe(true);
    expect(threeStep.progress).toBe(1);
    expect(threeStep.done).toBe(false);
    expect(completed.map((c) => c.missionId)).toEqual(['daily_checkin_1']);

    emitCheckIn(bus);
    emitCheckIn(bus); // 3-target Mission now completes; 1-target caps, no re-complete

    const threeAfter = engine.getMissions().find((m) => m.id === 'daily_checkin_3')!;
    expect(threeAfter.progress).toBe(3);
    expect(threeAfter.done).toBe(true);
    expect(completed.map((c) => c.missionId)).toEqual(['daily_checkin_1', 'daily_checkin_3']);
  });

  it('does not advance Missions whose trigger did not fire', () => {
    const { bus, engine } = setup();
    emitCheckIn(bus);
    expect(engine.getMissions().find((m) => m.id === 'weekly_complete')!.progress).toBe(0);
  });

  it('only counts an actual equip, not an unequip', () => {
    const { bus, engine } = setup();
    bus.emit({ type: 'ItemEquipped', itemId: null });
    expect(engine.getMissions().find((m) => m.id === 'daily_equip')!.progress).toBe(0);
    bus.emit({ type: 'ItemEquipped', itemId: 'hat' });
    expect(engine.getMissions().find((m) => m.id === 'daily_equip')!.progress).toBe(1);
  });
});

describe('MissionEngine — claim', () => {
  it('grants Coins (via RewardGranted, xp: 0) exactly once; a second claim is a no-op', () => {
    const { bus, engine, rewards, claimed } = setup();
    emitCheckIn(bus); // completes daily_checkin_1

    expect(engine.claimMission('daily_checkin_1')).toBe(true);
    expect(rewards).toHaveLength(1);
    expect(rewards[0].coins).toBe(5);
    expect(rewards[0].xp).toBe(0); // Missions never grant XP
    expect(rewards[0].reason).toBe('MissionClaimed');
    expect(claimed).toHaveLength(1);
    expect(engine.getMissions().find((m) => m.id === 'daily_checkin_1')!.claimed).toBe(true);

    // Second claim: blocked, no extra reward.
    expect(engine.claimMission('daily_checkin_1')).toBe(false);
    expect(rewards).toHaveLength(1);
  });

  it('will not claim a Mission that is not yet complete', () => {
    const { engine, rewards } = setup();
    expect(engine.claimMission('daily_checkin_3')).toBe(false);
    expect(rewards).toHaveLength(0);
  });

  it('ignores an unknown Mission id', () => {
    const { engine } = setup();
    expect(engine.claimMission('nope')).toBe(false);
  });
});

describe('MissionEngine — Login reward', () => {
  it('is claimable once per day and blocks a re-claim the same day', () => {
    const { engine, rewards, logins } = setup();

    const before = engine.getLoginReward();
    expect(before.claimableToday).toBe(true);
    expect(before.todayCoins).toBe(5);

    expect(engine.claimLoginReward()).toBe(true);
    expect(rewards).toHaveLength(1);
    expect(rewards[0].coins).toBe(5);
    expect(rewards[0].xp).toBe(0);
    expect(rewards[0].reason).toBe('LoginRewardClaimed');
    expect(logins).toEqual([{ type: 'LoginRewardClaimed', day: 1, coins: 5 }]);

    const after = engine.getLoginReward();
    expect(after.claimableToday).toBe(false);
    expect(after.todayCoins).toBe(0);

    // Same day: blocked.
    expect(engine.claimLoginReward()).toBe(false);
    expect(rewards).toHaveLength(1);
  });

  it('advances the cycle across days and wraps at the end', () => {
    const { engine, time } = setup(new Date(2026, 6, 8));

    expect(engine.claimLoginReward()).toBe(true); // day 1 → 5

    time.set(new Date(2026, 6, 9));
    expect(engine.getLoginReward().todayCoins).toBe(10); // day 2
    expect(engine.claimLoginReward()).toBe(true);

    time.set(new Date(2026, 6, 10));
    expect(engine.getLoginReward().todayCoins).toBe(20); // day 3
    expect(engine.claimLoginReward()).toBe(true);

    time.set(new Date(2026, 6, 11));
    expect(engine.getLoginReward().todayCoins).toBe(5); // wrapped back to day 1
  });
});

describe('MissionEngine — rollover', () => {
  it('resets daily Missions on a new day but keeps weekly progress', () => {
    const { bus, engine, time } = setup(new Date(2026, 6, 8)); // Wed

    emitCheckIn(bus); // daily +1
    bus.emit({ type: 'JourneyCompleted', journey: { id: 'j', title: 'x', why: [], durationDays: 1, rhythm: 'daily', steps: [], createdAt: 0 } }); // weekly +1
    expect(engine.getMissions().find((m) => m.id === 'daily_checkin_1')!.progress).toBe(1);
    expect(engine.getMissions().find((m) => m.id === 'weekly_complete')!.progress).toBe(1);

    // Next day, same week: daily resets, weekly stays.
    time.set(new Date(2026, 6, 9)); // Thu
    const next = engine.getMissions();
    expect(next.find((m) => m.id === 'daily_checkin_1')!.progress).toBe(0);
    expect(next.find((m) => m.id === 'weekly_complete')!.progress).toBe(1);
  });

  it('resets weekly Missions on a new week', () => {
    const { bus, engine, time } = setup(new Date(2026, 6, 8)); // Wed
    bus.emit({ type: 'JourneyCompleted', journey: { id: 'j', title: 'x', why: [], durationDays: 1, rhythm: 'daily', steps: [], createdAt: 0 } });
    expect(engine.getMissions().find((m) => m.id === 'weekly_complete')!.progress).toBe(1);

    // Following Monday — a new week.
    time.set(new Date(2026, 6, 13));
    expect(engine.getMissions().find((m) => m.id === 'weekly_complete')!.progress).toBe(0);
  });

  it('counts claimable rewards (done-unclaimed Missions + today’s Login)', () => {
    const { bus, engine } = setup();
    expect(engine.getClaimableCount()).toBe(1); // just the Login reward at first

    emitCheckIn(bus); // completes daily_checkin_1
    expect(engine.getClaimableCount()).toBe(2);

    engine.claimMission('daily_checkin_1');
    engine.claimLoginReward();
    expect(engine.getClaimableCount()).toBe(0);
  });
});
