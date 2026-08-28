/**
 * The status model (PRD §6.4). The tests worth having here are the ones about
 * GRAY: every dashboard gets green and red right, and the failure mode this
 * product cares about is a service that is unmeasured being drawn as healthy.
 */
import {
  STATE,
  capacityState,
  freshnessState,
  worst,
  severityState,
  overallState,
  DEFAULT_THRESHOLDS,
} from '../src/status.js';

describe('capacityState', () => {
  it('is gray when there is no measurement, never green', () => {
    expect(capacityState(null, null)).toBe(STATE.GRAY);
    expect(capacityState(undefined, 400)).toBe(STATE.GRAY);
    expect(capacityState(Number.NaN, 400)).toBe(STATE.GRAY);
  });

  it('follows the PRD defaults on usage', () => {
    expect(capacityState(69, null)).toBe(STATE.GREEN);
    expect(capacityState(70, null)).toBe(STATE.YELLOW);
    expect(capacityState(85, null)).toBe(STATE.YELLOW);
    expect(capacityState(85.1, null)).toBe(STATE.RED);
  });

  it('lets the forecast override a comfortable-looking bar', () => {
    // 40% used is green by usage; nine days of headroom is not.
    expect(capacityState(40, 9)).toBe(STATE.RED);
    expect(capacityState(40, 25)).toBe(STATE.YELLOW);
    expect(capacityState(40, 60)).toBe(STATE.GREEN);
  });
});

describe('freshnessState', () => {
  const now = Date.UTC(2026, 7, 28, 12, 0, 0);
  const interval = 5 * 60 * 1000;

  it('is gray when the check has never run', () => {
    expect(freshnessState(null, interval, now)).toBe(STATE.GRAY);
    expect(freshnessState('not a date', interval, now)).toBe(STATE.GRAY);
  });

  it('is gray past twice the interval, and green inside it', () => {
    expect(freshnessState(new Date(now - interval).toISOString(), interval, now)).toBe(STATE.GREEN);
    expect(freshnessState(new Date(now - interval * 2).toISOString(), interval, now)).toBe(STATE.GREEN);
    expect(freshnessState(new Date(now - interval * 2 - 1).toISOString(), interval, now)).toBe(STATE.GRAY);
  });

  it('is gray when no interval is configured — an unknowable freshness is unknown', () => {
    expect(freshnessState(new Date(now).toISOString(), 0, now)).toBe(STATE.GRAY);
  });
});

describe('worst', () => {
  it('ranks gray above green and below yellow', () => {
    expect(worst([STATE.GREEN, STATE.GRAY])).toBe(STATE.GRAY);
    expect(worst([STATE.GRAY, STATE.YELLOW])).toBe(STATE.YELLOW);
    expect(worst([STATE.YELLOW, STATE.RED])).toBe(STATE.RED);
    expect(worst([])).toBe(STATE.GREEN);
  });
});

describe('severityState', () => {
  it('treats critical and high as red, the rest as yellow', () => {
    expect(severityState([])).toBe(STATE.GREEN);
    expect(severityState([{ severity: 'low' }])).toBe(STATE.YELLOW);
    expect(severityState([{ severity: 'medium' }])).toBe(STATE.YELLOW);
    expect(severityState([{ severity: 'high' }])).toBe(STATE.RED);
    expect(severityState([{ severity: 'low' }, { severity: 'critical' }])).toBe(STATE.RED);
  });
});

describe('overallState', () => {
  it('reports how much it could not see, so the banner cannot claim health it has not measured', () => {
    const out = overallState([STATE.GREEN, STATE.GRAY, STATE.GRAY]);
    expect(out).toEqual({ state: 'healthy', known: 1, unknown: 2, total: 3 });
  });

  it('does not let a gray service raise or lower the verdict on the known ones', () => {
    expect(overallState([STATE.GREEN, STATE.GRAY]).state).toBe('healthy');
    expect(overallState([STATE.YELLOW, STATE.GRAY]).state).toBe('attention');
    expect(overallState([STATE.RED, STATE.YELLOW, STATE.GRAY]).state).toBe('incident');
  });

  it('is healthy-with-nothing-known when every service is gray, and says so in the counts', () => {
    const out = overallState([STATE.GRAY, STATE.GRAY]);
    expect(out.state).toBe('healthy');
    expect(out.known).toBe(0);
    expect(out.unknown).toBe(2);
  });

  it('uses the documented PRD defaults', () => {
    expect(DEFAULT_THRESHOLDS.capacityYellowPct).toBe(70);
    expect(DEFAULT_THRESHOLDS.capacityRedPct).toBe(85);
    expect(DEFAULT_THRESHOLDS.stalenessMultiplier).toBe(2);
  });
});
