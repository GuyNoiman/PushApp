/**
 * Reschedule heuristic tests (Miss-Recovery slice). The pure proposer is exercised
 * with an injected `now`, a hand-built Step, and a fake env — no clock, no gateways.
 * Locks: the three heuristic candidates, permissive-by-default gating, and the two
 * drops (a home-only Step while away, a slot the calendar mock says is busy).
 */
import type { SchedulingPrefs, Step } from '../../types/domain';
import { proposeCandidateTimes, type RescheduleEnv } from '../reschedule';

// A fixed clock: 2026-07-14 10:00 local (a Tuesday), so fire maths is deterministic.
const NOW = new Date(2026, 6, 14, 10, 0, 0).getTime();

function step(over: Partial<Step> = {}): Step {
  return {
    id: 'step_1',
    title: 'Run 5km',
    isStarterStep: false,
    cadence: 'once',
    done: false,
    ...over,
  };
}

const permissivePrefs = (): SchedulingPrefs => ({
  window: undefined,
  dayPart: 'either',
  preferredDays: [],
});

/** A permissive env — real Null gateways behave like this (everything 'unknown'). */
const permissiveEnv = (): RescheduleEnv => ({ place: 'unknown', isBusy: () => 'unknown' });

describe('proposeCandidateTimes — heuristic', () => {
  it('proposes the three heuristic slots when nothing gates them', () => {
    const out = proposeCandidateTimes(NOW, step(), permissivePrefs(), permissiveEnv());
    expect(out.map((c) => c.kind).sort()).toEqual(['evening', 'plus2h', 'tomorrow']);
  });

  it('all proposed times are in the future', () => {
    const out = proposeCandidateTimes(NOW, step(), permissivePrefs(), permissiveEnv());
    for (const c of out) expect(c.at).toBeGreaterThan(NOW);
  });

  it('clamps candidates into an evening day-part band', () => {
    const prefs: SchedulingPrefs = { ...permissivePrefs(), dayPart: 'evening' };
    const out = proposeCandidateTimes(NOW, step(), prefs, permissiveEnv());
    // Evening band is 17:00–22:00; every candidate's hour lands inside it.
    for (const c of out) expect(c.hour).toBeGreaterThanOrEqual(17);
    for (const c of out) expect(c.hour).toBeLessThan(22);
  });
});

describe('proposeCandidateTimes — gate (permissive by default)', () => {
  it('keeps everything when the env is unknown, even for a home-only Step', () => {
    const homeStep = step({ constraints: [{ kind: 'location', place: 'home' }] });
    const out = proposeCandidateTimes(NOW, homeStep, permissivePrefs(), permissiveEnv());
    expect(out).toHaveLength(3);
  });

  it('drops all times for a home-only Step while the user is away', () => {
    const homeStep = step({ constraints: [{ kind: 'location', place: 'home' }] });
    const env: RescheduleEnv = { place: 'away', isBusy: () => 'unknown' };
    const out = proposeCandidateTimes(NOW, homeStep, permissivePrefs(), env);
    expect(out).toHaveLength(0);
  });

  it('keeps a home-only Step while the user is home', () => {
    const homeStep = step({ constraints: [{ kind: 'location', place: 'home' }] });
    const env: RescheduleEnv = { place: 'home', isBusy: () => 'unknown' };
    expect(proposeCandidateTimes(NOW, homeStep, permissivePrefs(), env)).toHaveLength(3);
  });

  it('drops a slot the calendar reports busy for the Step duration (duration-unfit)', () => {
    const longStep = step({ estimatedDuration: 90 });
    // The mock is "busy" for any window longer than 60 minutes.
    const env: RescheduleEnv = {
      place: 'unknown',
      isBusy: ({ start, end }) => end - start > 60 * 60 * 1000,
    };
    expect(proposeCandidateTimes(NOW, longStep, permissivePrefs(), env)).toHaveLength(0);
  });

  it('keeps a short Step even when the calendar mock only blocks long ones', () => {
    const shortStep = step({ estimatedDuration: 20 });
    const env: RescheduleEnv = {
      place: 'unknown',
      isBusy: ({ start, end }) => end - start > 60 * 60 * 1000,
    };
    expect(proposeCandidateTimes(NOW, shortStep, permissivePrefs(), env)).toHaveLength(3);
  });
});

describe('proposeCandidateTimes — Active Hours never fully suppress a Retime (D40)', () => {
  const allDay = { start: { hour: 0, minute: 0 }, end: { hour: 0, minute: 0 } };
  /** 7 days all-day-enabled, then a mutator to disable specific weekdays. */
  const hoursWithDisabled = (disabled: number[]): SchedulingPrefs => ({
    ...permissivePrefs(),
    activeHours: {
      mode: 'perDay',
      days: Array.from({ length: 7 }, (_, d) => ({ enabled: !disabled.includes(d), window: allDay })),
    },
  });

  // A Saturday so all three heuristics (plus2h/evening today, tomorrow=Sun) land on the weekend.
  const SAT = new Date(2026, 6, 18, 10, 0, 0).getTime();

  it('with the weekend disabled, a Saturday Retime still yields suggestions on the next enabled day', () => {
    const prefs = hoursWithDisabled([6, 0]); // Sat + Sun off
    const out = proposeCandidateTimes(SAT, step(), prefs, permissiveEnv());
    expect(out.length).toBeGreaterThanOrEqual(1);
    // Every surviving suggestion lands on an enabled weekday (Mon..Fri), never Sat/Sun.
    for (const c of out) {
      const wd = new Date(c.at).getDay();
      expect(wd).not.toBe(6);
      expect(wd).not.toBe(0);
    }
  });

  it('falls back to a same-day band-only slot when EVERY day is disabled (still non-empty)', () => {
    const prefs = hoursWithDisabled([0, 1, 2, 3, 4, 5, 6]);
    const out = proposeCandidateTimes(SAT, step(), prefs, permissiveEnv());
    expect(out.length).toBeGreaterThanOrEqual(1);
  });
});
