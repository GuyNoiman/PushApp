/**
 * timingModel — identity, minting, and PRD §7's bounded retention. The retention rules are the
 * privacy promise ("raw operational events have bounded retention"), so they are tested as rules,
 * not as an implementation detail.
 */
import {
  confidenceFor,
  emptyModel,
  findTimingModel,
  modelKey,
  pruneTrials,
  trialsForModel,
} from '../timingModel';
import { TIMING_MODEL_VERSION } from '../../config/timingPolicy';
import type { TimingTrial } from '../../types/domain';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 2, 10, 12, 0, 0, 0).getTime();

function trial(over: Partial<TimingTrial> & { scheduledAt: number }): TimingTrial {
  return {
    modelKey: 'journey_1|*',
    outcome: 'positive',
    journeyIds: ['journey_1'],
    ...over,
  };
}

describe('model identity', () => {
  it('keys a per-day model and a shared all-days model apart', () => {
    expect(modelKey('journey_1', 3)).toBe('journey_1|3');
    expect(modelKey('journey_1', '*')).toBe('journey_1|*');
    expect(modelKey('journey_1', 3)).not.toBe(modelKey('journey_1', '*'));
  });

  it('finds a model by Journey and day', () => {
    const models = [
      emptyModel({ journeyId: 'journey_1', dayKey: 1, anchor: { hour: 9, minute: 0 }, now: NOW }),
      emptyModel({ journeyId: 'journey_1', dayKey: 4, anchor: { hour: 9, minute: 0 }, now: NOW }),
    ];
    expect(findTimingModel(models, 'journey_1', 4)?.dayKey).toBe(4);
    expect(findTimingModel(models, 'journey_1', 5)).toBeUndefined();
    expect(findTimingModel(models, 'journey_2', 1)).toBeUndefined();
  });
});

describe('a freshly minted model', () => {
  const model = emptyModel({
    journeyId: 'journey_1',
    dayKey: '*',
    anchor: { hour: 8, minute: 15 },
    now: NOW,
    tzName: 'Europe/Berlin',
  });

  it('starts at the user OWN time, so day one is byte-identical to Fixed', () => {
    expect(model.anchor).toEqual({ hour: 8, minute: 15 });
    expect(model.currentCandidate).toEqual({ hour: 8, minute: 15 });
  });

  it('starts with no evidence, no confidence and nothing rejected', () => {
    expect(model.eligibleCount).toBe(0);
    expect(model.positive).toBe(0);
    expect(model.negative).toBe(0);
    expect(model.confidence).toBe(0);
    expect(model.rejectedCandidates).toEqual([]);
    expect(model.previousCandidate).toBeUndefined();
  });

  it('records the zone it is learned in and stamps the schema version', () => {
    expect(model.tzName).toBe('Europe/Berlin');
    expect(model.modelVersion).toBe(TIMING_MODEL_VERSION);
    expect(model.lastUpdatedAt).toBe(NOW);
  });

  it('omits the zone entirely when the device could not report one', () => {
    const noZone = emptyModel({
      journeyId: 'journey_1',
      dayKey: '*',
      anchor: { hour: 8, minute: 15 },
      now: NOW,
    });
    expect('tzName' in noZone).toBe(false);
  });

  it('copies the anchor rather than aliasing it', () => {
    const anchor = { hour: 7, minute: 0 };
    const minted = emptyModel({ journeyId: 'j', dayKey: '*', anchor, now: NOW });
    anchor.hour = 22;
    expect(minted.anchor.hour).toBe(7);
    expect(minted.currentCandidate).not.toBe(minted.anchor);
  });
});

describe('confidence (display only)', () => {
  it('grows towards a full six samples and never past 1', () => {
    expect(confidenceFor(0)).toBe(0);
    expect(confidenceFor(3)).toBe(0.5);
    expect(confidenceFor(6)).toBe(1);
    expect(confidenceFor(60)).toBe(1);
  });

  it('is defensive about junk', () => {
    expect(confidenceFor(-4)).toBe(0);
    expect(confidenceFor(NaN)).toBe(0);
  });
});

describe('retention (PRD §7)', () => {
  it('hard-drops anything older than four weeks, whatever model it belongs to', () => {
    const kept = trial({ scheduledAt: NOW - 27 * DAY });
    const dropped = trial({ scheduledAt: NOW - 29 * DAY, modelKey: 'journey_2|*' });
    expect(pruneTrials([kept, dropped], NOW)).toEqual([kept]);
  });

  it('keeps only the newest six per model', () => {
    const trials = Array.from({ length: 9 }, (_, i) => trial({ scheduledAt: NOW - i * DAY }));
    const pruned = pruneTrials(trials, NOW);
    expect(pruned).toHaveLength(6);
    expect(pruned.map((t) => t.scheduledAt)).toEqual(trials.slice(0, 6).map((t) => t.scheduledAt));
  });

  it('counts the six PER MODEL, so one busy Journey cannot evict another', () => {
    const a = Array.from({ length: 6 }, (_, i) => trial({ scheduledAt: NOW - i * DAY }));
    const b = trial({ scheduledAt: NOW - 10 * DAY, modelKey: 'journey_2|1' });
    const pruned = pruneTrials([...a, b], NOW);
    expect(trialsForModel(pruned, 'journey_1|*')).toHaveLength(6);
    expect(trialsForModel(pruned, 'journey_2|1')).toEqual([b]);
  });

  it('preserves input order among the survivors, so re-pruning is a stable no-op', () => {
    const trials = Array.from({ length: 8 }, (_, i) => trial({ scheduledAt: NOW - i * DAY }));
    const once = pruneTrials(trials, NOW);
    expect(pruneTrials(once, NOW)).toEqual(once);
  });

  it('never mutates the store it prunes', () => {
    const trials = [trial({ scheduledAt: NOW - 40 * DAY })];
    pruneTrials(trials, NOW);
    expect(trials).toHaveLength(1);
  });
});
