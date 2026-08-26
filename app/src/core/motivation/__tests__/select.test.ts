/**
 * The motivation selector — the four gates of `Motivation_First_Slice_PRD.md` §3, and the two
 * promises that matter most: **nothing is ever said that the app cannot back with a number it
 * counted**, and **the default answer is silence**.
 *
 * Pure: an injected clock, hand-built facts, and a hand-built log. No OS, no i18n, no React.
 */
import { MOTIVATION_CATALOG } from '../catalog';
import {
  activeTriggers,
  appendMotivationLog,
  hasRequiredFacts,
  ITEM_COOLDOWN_DAYS,
  MOTIVATION_LOG_LIMIT,
  motivationDayKey,
  selectMotivation,
  THEME_COOLDOWN_DAYS,
} from '../select';
import type { MotivationFacts, MotivationLogEntry } from '../types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 6, 14, 10, 0, 0).getTime();

/** Facts where nothing is happening: no streak, no week, no Journey, no miss. */
function quietFacts(over: Partial<MotivationFacts> = {}): MotivationFacts {
  return {
    stepsDoneTotal: 0,
    stepsDoneThisWeek: 0,
    streakDays: 0,
    runningJourneys: 0,
    returnedAfterMiss: false,
    ...over,
  };
}

/** Somebody in the middle of a good week. */
function sustainedFacts(over: Partial<MotivationFacts> = {}): MotivationFacts {
  return quietFacts({
    stepsDoneTotal: 12,
    stepsDoneThisWeek: 4,
    streakDays: 5,
    runningJourneys: 1,
    journeyId: 'j1',
    journeyTitle: 'Run 5km',
    daysMoving: 20,
    journeyProgressPct: 40,
    daysSinceLastDone: 0,
    ...over,
  });
}

const entry = (over: Partial<MotivationLogEntry> = {}): MotivationLogEntry => ({
  itemId: 'weekPace',
  theme: 'progress',
  version: 1,
  at: NOW - 40 * DAY,
  ...over,
});

describe('activeTriggers', () => {
  it('opens nothing at all when nothing is happening', () => {
    expect(activeTriggers(quietFacts())).toEqual([]);
  });

  it('opens `quiet` only while a Journey is actually running', () => {
    const stalled = { daysSinceLastDone: 4, runningJourneys: 0 };
    expect(activeTriggers(quietFacts(stalled))).not.toContain('quiet');
    expect(activeTriggers(quietFacts({ ...stalled, runningJourneys: 1 }))).toContain('quiet');
  });

  it('opens `milestone` only when the Milestone is genuinely close', () => {
    expect(activeTriggers(sustainedFacts({ stepsToMilestone: 7 }))).not.toContain('milestone');
    expect(activeTriggers(sustainedFacts({ stepsToMilestone: 2 }))).toContain('milestone');
  });
});

describe('hasRequiredFacts — the truth gate', () => {
  it('rejects an item whose number the app does not have', () => {
    const item = MOTIVATION_CATALOG.find((i) => i.id === 'streakDays')!;
    expect(hasRequiredFacts(item, sustainedFacts())).toBe(true);
    expect(hasRequiredFacts(item, sustainedFacts({ streakDays: 0 }))).toBe(false);
  });

  it('rejects a zero count — "you have done 0 Steps" is a scoreboard, not motivation', () => {
    const item = MOTIVATION_CATALOG.find((i) => i.id === 'stepsTotal')!;
    expect(hasRequiredFacts(item, sustainedFacts({ stepsDoneTotal: 0 }))).toBe(false);
  });

  it('rejects a blank Journey title rather than naming an empty Journey', () => {
    const item = MOTIVATION_CATALOG.find((i) => i.id === 'journeyShare')!;
    expect(hasRequiredFacts(item, sustainedFacts({ journeyTitle: '   ' }))).toBe(false);
  });

  it('every catalog item can actually be satisfied — no item is dead on arrival', () => {
    const everything: MotivationFacts = sustainedFacts({ stepsToMilestone: 2, returnedAfterMiss: true });
    for (const item of MOTIVATION_CATALOG) {
      expect(hasRequiredFacts(item, everything)).toBe(true);
    }
  });
});

describe('selectMotivation', () => {
  it('says nothing when no moment is open — silence is the normal answer', () => {
    expect(selectMotivation(quietFacts(), [], NOW)).toBeNull();
  });

  it('picks an item whose moment is open and whose facts are all known', () => {
    const chosen = selectMotivation(sustainedFacts(), [], NOW);
    expect(chosen).not.toBeNull();
    expect(chosen!.item.trigger).toBe('sustained');
    expect(chosen!.alreadyShownToday).toBe(false);
  });

  it('shows ONE card a day, and shows the SAME one for the rest of it', () => {
    const first = selectMotivation(sustainedFacts(), [], NOW)!;
    const log = [entry({ itemId: first.item.id, theme: first.item.theme, at: NOW })];
    const again = selectMotivation(sustainedFacts(), log, NOW + 3 * 60 * 60 * 1000);
    expect(again!.item.id).toBe(first.item.id);
    expect(again!.alreadyShownToday).toBe(true);
  });

  it('goes quiet for the rest of the day once the person has answered', () => {
    const first = selectMotivation(sustainedFacts(), [], NOW)!;
    const log = [entry({ itemId: first.item.id, theme: first.item.theme, at: NOW, verdict: 'helpful' })];
    expect(selectMotivation(sustainedFacts(), log, NOW + 60_000)).toBeNull();
  });

  it('treats a dismissal as "not now" for today — never as an opinion about the item', () => {
    const first = selectMotivation(sustainedFacts(), [], NOW)!;
    const dismissed = [
      entry({ itemId: first.item.id, theme: first.item.theme, at: NOW, verdict: 'dismissed' }),
    ];
    expect(selectMotivation(sustainedFacts(), dismissed, NOW + 60_000)).toBeNull();
    // Tomorrow it is a candidate again — only its own cooldown holds it back, not a verdict.
    const tomorrow = selectMotivation(sustainedFacts(), dismissed, NOW + DAY);
    expect(tomorrow).not.toBeNull();
    expect(tomorrow!.item.id).not.toBe(first.item.id); // the 21-day item cooldown still applies
  });

  it('never brings back an item the person said was not helpful', () => {
    const disliked = MOTIVATION_CATALOG.find((i) => i.id === 'streakDays')!;
    const log = [
      entry({
        itemId: disliked.id,
        theme: disliked.theme,
        at: NOW - 300 * DAY,
        verdict: 'notHelpful',
      }),
    ];
    for (let day = 1; day < 400; day += 7) {
      const chosen = selectMotivation(sustainedFacts(), log, NOW + day * DAY);
      expect(chosen?.item.id).not.toBe(disliked.id);
    }
  });

  it('gives a REWRITTEN meaning a fresh hearing — the verdict was about the old sentence', () => {
    const item = MOTIVATION_CATALOG.find((i) => i.id === 'streakDays')!;
    const log = [entry({ itemId: item.id, theme: item.theme, version: 0, at: NOW - 300 * DAY, verdict: 'notHelpful' })];
    // The catalog carries version 1; the dislike was recorded against version 0.
    const chosen = selectMotivation(sustainedFacts({ stepsDoneThisWeek: 0, stepsDoneTotal: 0, journeyTitle: undefined, journeyProgressPct: undefined, daysMoving: undefined }), log, NOW + 400 * DAY);
    expect(chosen!.item.id).toBe(item.id);
  });

  it('does not repeat an item within its cooldown, nor its theme within the shorter one', () => {
    const item = MOTIVATION_CATALOG.find((i) => i.id === 'streakDays')!;
    const log = [entry({ itemId: item.id, theme: item.theme, at: NOW - 3 * DAY })];

    const soon = selectMotivation(sustainedFacts(), log, NOW + DAY);
    expect(soon?.item.id).not.toBe(item.id);
    expect(soon?.item.theme).not.toBe(item.theme); // the theme is inside its 7-day window too

    // Past the cooldown it is a candidate again. Starve every other `sustained` item of its facts
    // so the assertion is about the cooldown lifting and not about which candidate ranks first.
    const onlyStreak = sustainedFacts({
      stepsDoneThisWeek: 0,
      stepsDoneTotal: 0,
      journeyTitle: undefined,
      journeyProgressPct: undefined,
      daysMoving: undefined,
    });
    const later = selectMotivation(onlyStreak, log, NOW + (ITEM_COOLDOWN_DAYS + 1) * DAY);
    expect(later?.item.id).toBe(item.id);
    expect(THEME_COOLDOWN_DAYS).toBeLessThan(ITEM_COOLDOWN_DAYS);
  });

  it('prefers an item nobody has answered about yet over one already shown', () => {
    const shownLongAgo = MOTIVATION_CATALOG.find((i) => i.id === 'streakDays')!;
    const log = [entry({ itemId: shownLongAgo.id, theme: shownLongAgo.theme, at: NOW - 200 * DAY })];
    const chosen = selectMotivation(sustainedFacts(), log, NOW)!;
    expect(chosen.item.id).not.toBe(shownLongAgo.id);
  });

  it('is deterministic — the same inputs choose the same card', () => {
    const a = selectMotivation(sustainedFacts(), [], NOW);
    const b = selectMotivation(sustainedFacts(), [], NOW);
    expect(a!.item.id).toBe(b!.item.id);
  });
});

describe('the log', () => {
  it('keys a day by the LOCAL calendar, not by 24 hours', () => {
    const lateNight = new Date(2026, 6, 14, 23, 30).getTime();
    const nextMorning = new Date(2026, 6, 15, 7, 0).getTime();
    expect(motivationDayKey(lateNight)).not.toBe(motivationDayKey(nextMorning));
  });

  it('stays bounded', () => {
    let log: MotivationLogEntry[] = [];
    for (let i = 0; i < MOTIVATION_LOG_LIMIT + 25; i++) {
      log = appendMotivationLog(log, entry({ at: NOW + i * DAY }));
    }
    expect(log).toHaveLength(MOTIVATION_LOG_LIMIT);
    expect(log[log.length - 1].at).toBe(NOW + (MOTIVATION_LOG_LIMIT + 24) * DAY);
  });

  it('holds no user-authored text — only ids, a theme, a version and a verdict', () => {
    const keys = Object.keys(entry({ verdict: 'helpful' }));
    expect(keys.sort()).toEqual(['at', 'itemId', 'theme', 'verdict', 'version']);
  });
});
