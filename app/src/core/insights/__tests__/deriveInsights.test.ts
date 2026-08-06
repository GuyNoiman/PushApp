/**
 * Projection-boundary tests (S0.6). Two duties:
 *
 *  1. GUARD (mirrors the ProgressSummary whitelist rule): deriveOutreachInsight — the single
 *     server-eligibility chokepoint — may emit ONLY enums/buckets/booleans/opt-in prefs, a
 *     pseudonymous uid, and scalar timestamps. Structurally: no free text, no raw timestamp
 *     arrays. If a future change tries to smuggle a string or an array through, these fail.
 *  2. Lock the on-device deriveInsights derivations (reliability, slipRate, paceRatio,
 *     preferredDaypart, atRisk, recency) against fixtures with a fixed `now`.
 *
 * `at` timestamps are built with the local Date constructor so `getHours()`-based
 * derivations (preferredDaypart) are timezone-stable.
 */
import type { InsightModel, RawBehaviorRecord } from '../../types/domain';
import {
  deriveInsights,
  deriveOutreachInsight,
  NullInsightGateway,
  type OutreachPrefs,
} from '../index';

/** Local wall-clock epoch ms, so hour-of-day derivations are deterministic under any TZ. */
const at = (day: number, hour: number) => new Date(2026, 0, day, hour, 0, 0, 0).getTime();
const NOW = new Date(2026, 0, 10, 12, 0, 0, 0).getTime();

const rec = (r: Partial<RawBehaviorRecord> & Pick<RawBehaviorRecord, 'kind' | 'at'>): RawBehaviorRecord => ({
  id: `r_${Math.random()}`,
  stepId: 's1',
  journeyId: 'j1',
  ...r,
});

// A representative fixture: 5 planned occurrences across two Milestones.
const FIXTURE: RawBehaviorRecord[] = [
  rec({ milestoneId: 'm1', kind: 'done', at: at(1, 9), plannedFor: at(1, 9), actualMinutes: 30 }),
  rec({ milestoneId: 'm1', kind: 'done', at: at(2, 10), plannedFor: at(2, 10), actualMinutes: 20 }),
  rec({ milestoneId: 'm1', kind: 'slipped', at: at(3, 9), plannedFor: at(3, 9) }),
  rec({ milestoneId: 'm2', kind: 'done', at: at(4, 19), plannedFor: at(4, 19), actualMinutes: 40 }),
  rec({ kind: 'postponed', at: at(5, 12), plannedFor: at(5, 12) }),
];

const PREFS: OutreachPrefs = {
  contactWindow: 'morning',
  channelPrefs: { push: true, social: false },
  targetDate: new Date(2026, 0, 15, 9, 0, 0, 0).getTime(), // 5 days out → 'days'
  lastNudgeAt: at(6, 8),
};

describe('deriveInsights — on-device derivations', () => {
  it('computes reliability per Milestone (done / total occurrences)', () => {
    const insight = deriveInsights(FIXTURE, NOW);
    expect(insight.reliabilityByMilestone.m1).toBeCloseTo(2 / 3);
    expect(insight.reliabilityByMilestone.m2).toBe(1);
  });

  it('computes slipRate, paceRatio, day-part, session length and recency', () => {
    const insight = deriveInsights(FIXTURE, NOW);
    expect(insight.slipRate).toBeCloseTo(1 / 5); // 1 slipped of 5
    expect(insight.paceRatio).toBeCloseTo(3 / 5); // 3 planned done of 5 planned
    expect(insight.preferredDaypart).toBe('morning'); // 2 morning done vs 1 evening
    expect(insight.typicalSessionMinutes).toBe(30); // mean of 30,20,40
    expect(insight.lastActivityAt).toBe(at(5, 12));
    expect(insight.daysSinceLastActivity).toBe(5);
  });

  it('is not at-risk on a healthy fixture', () => {
    expect(deriveInsights(FIXTURE, NOW).atRisk).toBe(false);
  });

  it('flags atRisk when pace collapses', () => {
    const poor: RawBehaviorRecord[] = [
      rec({ milestoneId: 'm1', kind: 'done', at: at(9, 9), plannedFor: at(9, 9) }),
      rec({ milestoneId: 'm1', kind: 'slipped', at: at(9, 9), plannedFor: at(9, 9) }),
      rec({ milestoneId: 'm1', kind: 'slipped', at: at(9, 9), plannedFor: at(9, 9) }),
      rec({ milestoneId: 'm1', kind: 'couldnt', at: at(9, 9), plannedFor: at(9, 9) }),
    ];
    const insight = deriveInsights(poor, NOW);
    expect(insight.paceRatio).toBeCloseTo(1 / 4);
    expect(insight.atRisk).toBe(true);
  });

  it('returns a neutral, non-at-risk model for empty input', () => {
    const insight = deriveInsights([], NOW);
    expect(insight).toEqual({
      reliabilityByMilestone: {},
      slipRate: 0,
      preferredDaypart: 'either',
      typicalSessionMinutes: 0,
      paceRatio: 0,
      atRisk: false,
      lastActivityAt: null,
      daysSinceLastActivity: 0,
    });
  });
});

describe('deriveOutreachInsight — bucketing', () => {
  const base: InsightModel = deriveInsights(FIXTURE, NOW);

  it('projects buckets and copies only whitelisted prefs', () => {
    const out = deriveOutreachInsight(base, PREFS, 'uid_123', NOW);
    expect(out).toEqual({
      uid: 'uid_123',
      engagementState: 'cooling', // 5 days since activity
      slippageFlag: false,
      streakBucket: 'building', // paceRatio 0.6
      contactWindow: 'morning',
      channelPrefs: { push: true, social: false },
      targetProximity: 'days', // deadline 5 days out
      lastNudgeAt: at(6, 8),
      updatedAt: NOW,
    });
  });

  it('maps engagementState from recency', () => {
    const mk = (days: number, last: number | null): InsightModel => ({
      ...base,
      lastActivityAt: last,
      daysSinceLastActivity: days,
    });
    expect(deriveOutreachInsight(mk(1, at(9, 9)), PREFS, 'u', NOW).engagementState).toBe('active');
    expect(deriveOutreachInsight(mk(5, at(5, 9)), PREFS, 'u', NOW).engagementState).toBe('cooling');
    expect(deriveOutreachInsight(mk(20, at(1, 9)), PREFS, 'u', NOW).engagementState).toBe('dormant');
    expect(deriveOutreachInsight(mk(0, null), PREFS, 'u', NOW).engagementState).toBe('dormant');
  });

  it('buckets targetProximity, defaulting to none with no deadline', () => {
    const px = (targetDate?: number) =>
      deriveOutreachInsight(base, { ...PREFS, targetDate }, 'u', NOW).targetProximity;
    expect(px(undefined)).toBe('none');
    expect(px(NOW - 1)).toBe('past');
    expect(px(NOW + 3 * 24 * 3600 * 1000)).toBe('days');
    expect(px(NOW + 20 * 24 * 3600 * 1000)).toBe('weeks');
    expect(px(NOW + 200 * 24 * 3600 * 1000)).toBe('far');
  });
});

describe('deriveOutreachInsight — privacy GUARD (whitelist, mirrors ProgressSummary)', () => {
  // The complete set of string values the projection is allowed to contain, besides the uid.
  const ALLOWED_ENUM_VALUES = new Set<string>([
    'active', 'cooling', 'dormant', // EngagementState
    'none', 'building', 'strong', // StreakBucket
    'morning', 'evening', 'either', // ContactWindow (DayPart)
    'far', 'weeks', 'days', 'past', // TargetProximity (+ 'none' above)
  ]);
  const ALLOWED_KEYS = new Set<string>([
    'uid', 'engagementState', 'slippageFlag', 'streakBucket',
    'contactWindow', 'channelPrefs', 'targetProximity', 'lastNudgeAt', 'updatedAt',
  ]);

  const UID = 'uid_pseudonymous_abc';
  const out = deriveOutreachInsight(deriveInsights(FIXTURE, NOW), PREFS, UID, NOW);

  it('exposes only whitelisted top-level keys', () => {
    for (const k of Object.keys(out)) expect(ALLOWED_KEYS.has(k)).toBe(true);
  });

  it('contains NO arrays anywhere (no raw timestamp series)', () => {
    const walk = (v: unknown): void => {
      expect(Array.isArray(v)).toBe(false);
      if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(out);
  });

  it('every string value is the uid or a known enum — structurally no free text', () => {
    const strings: string[] = [];
    const collect = (v: unknown): void => {
      if (typeof v === 'string') strings.push(v);
      else if (v && typeof v === 'object') Object.values(v).forEach(collect);
    };
    collect(out);
    for (const s of strings) {
      expect(s === UID || ALLOWED_ENUM_VALUES.has(s)).toBe(true);
    }
  });

  it('drops any non-whitelisted pref field the caller might pass', () => {
    const leaky = { ...PREFS, secretNote: 'private context' } as OutreachPrefs;
    const projected = deriveOutreachInsight(deriveInsights(FIXTURE, NOW), leaky, UID, NOW);
    expect(JSON.stringify(projected)).not.toContain('private context');
    expect(projected.channelPrefs).toEqual({ push: true, social: false });
  });
});

describe('NullInsightGateway', () => {
  it('is inert and disabled (Phase 1 — no network)', async () => {
    expect(NullInsightGateway.enabled).toBe(false);
    await expect(
      NullInsightGateway.publishInsight(deriveOutreachInsight(deriveInsights(FIXTURE, NOW), PREFS, 'u', NOW)),
    ).resolves.toBeUndefined();
    await expect(NullInsightGateway.clearInsight()).resolves.toBeUndefined();
  });
});
