/**
 * The aggregate — one send that speaks for several Journeys (D80–D83).
 *
 * The rule worth holding still is the one that makes the feature worth having: an aggregate REPLACES
 * the smart reminders it covers. Beside them it would be a fourth interruption for somebody with
 * three Journeys, and the thing built to make the app quieter would have made it louder.
 */
import {
  MAX_AGGREGATES_PER_DAY,
  SEPARATE_WINDOW_GAP_MINUTES,
  planAggregatesForDay,
  type AggregateInput,
} from '../aggregatePlan';

const at = (hour: number, minute = 0, i = hour): AggregateInput => ({
  ruleId: `r${i}`,
  journeyId: `j${i}`,
  journeyTitle: `Journey ${i}`,
  hour,
  minute,
});

describe('grouping a day', () => {
  it('makes one send out of three Journeys in the same part of the day', () => {
    const slots = planAggregatesForDay([at(8), at(9), at(10)]);

    expect(slots).toHaveLength(1);
    expect(slots[0].journeys).toHaveLength(3);
    // And it names every rule it speaks for, because those are the ones that must NOT also fire.
    expect(slots[0].ruleIds).toEqual(['r8', 'r9', 'r10']);
  });

  it('fires at the earliest time in the group, not the latest', () => {
    // Holding somebody's 08:00 Journey until their 10:00 one is due would be the app deciding their
    // morning matters less than its own tidiness.
    expect(planAggregatesForDay([at(10), at(8), at(9)])[0]).toMatchObject({ hour: 8, minute: 0 });
  });

  it('opens a second send when three hours separate the two groups', () => {
    const slots = planAggregatesForDay([at(8), at(9), at(20), at(21)]);

    expect(slots).toHaveLength(2);
    expect(slots[0].hour).toBe(8);
    expect(slots[1].hour).toBe(20);
    expect(SEPARATE_WINDOW_GAP_MINUTES).toBe(180);
  });

  it('keeps them together at less than three hours', () => {
    const slots = planAggregatesForDay([at(8), at(10, 59)]);
    expect(slots).toHaveLength(1);
  });

  it('never opens a third, however spread out the day is', () => {
    const slots = planAggregatesForDay([at(6), at(12), at(18), at(22)]);

    expect(slots).toHaveLength(MAX_AGGREGATES_PER_DAY);
    // Everything after the second group joins it rather than becoming its own send.
    expect(slots[1].journeys.length).toBeGreaterThan(1);
  });
});

describe('what one send says it covers', () => {
  it('names a Journey once even when it has two rules', () => {
    const slots = planAggregatesForDay([
      { ...at(8), ruleId: 'r1', journeyId: 'j1', journeyTitle: 'Run' },
      { ...at(9), ruleId: 'r2', journeyId: 'j1', journeyTitle: 'Run' },
    ]);

    expect(slots[0].ruleIds).toEqual(['r1', 'r2']);
    expect(slots[0].journeys).toEqual([{ journeyId: 'j1', journeyTitle: 'Run' }]);
  });

  it('plans nothing out of nothing', () => {
    expect(planAggregatesForDay([])).toEqual([]);
  });

  it('carries the weekday when the reminders are weekly', () => {
    expect(planAggregatesForDay([{ ...at(8), weekday: 2 }])[0].weekday).toBe(2);
  });
});
