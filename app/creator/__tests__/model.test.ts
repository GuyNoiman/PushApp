/**
 * The Journey Studio's model.
 *
 * The tests that matter here are about the difference between "zero" and
 * "not allowed to know", and about suppression — the two places where a
 * plausible-looking simplification would quietly turn aggregate analytics into
 * something a creator could point at a person with.
 */
import {
  STATUSES, statusLabel, isAdoptable,
  FIELD_GROUPS, fieldValue, missingBeforePublish,
  withStats, normaliseStats, suppressionNote, MIN_COHORT, NEVER_SHOWN,
} from '../src/model.js';

// The model is plain JS and its exports are frozen literals, so TypeScript
// infers the shapes here without a declaration file. Naming the lookup once
// beats repeating the flatMap in four tests.
const allFields = FIELD_GROUPS.flatMap((g) => g.fields);
const field = (key: string) => allFields.find((f) => f.key === key)!;

describe('lifecycle', () => {
  it('covers PRD §13 and lets only a published Journey be adopted', () => {
    expect(STATUSES).toHaveLength(8);
    expect(STATUSES.filter((s) => s.adoptable).map((s) => s.value)).toEqual(['published']);
    expect(isAdoptable('published')).toBe(true);
    expect(isAdoptable('paused')).toBe(false);
    expect(statusLabel('private_test')).toBe('Private test');
  });

  it('shows an unknown status rather than hiding it behind a label', () => {
    expect(statusLabel('something_new')).toBe('something_new');
  });
});

describe('the fields a creator fills in', () => {
  const full = {
    name: 'Coming back to running',
    short_description: 'Eight weeks back to a habit that stuck once.',
    long_description: 'For somebody who used to run and stopped.',
    audience: 'Adults returning after a break',
    outcome: 'Run 30 minutes without stopping',
    success_policy: 'Finish all four mandatory Steps and 12 of the remaining 16.',
  };

  it('names nothing as missing when every required field is filled', () => {
    expect(missingBeforePublish(full)).toEqual([]);
  });

  it('lists what a participant would be adopting blind', () => {
    const missing = missingBeforePublish({ name: 'Untitled' });
    expect(missing).toContain('Short description');
    expect(missing).toContain('What counts as completing it');
    expect(missing).not.toContain('Prerequisites'); // optional stays optional
  });

  it('treats an empty string and an empty tag list as not filled in', () => {
    expect(missingBeforePublish({ ...full, outcome: '' })).toEqual(['What they should be able to do by the end']);
    expect(fieldValue({ tags: [] }, field('tags'))).toBeNull();
    expect(fieldValue({ tags: ['running', 'restart'] }, field('tags'))).toBe('running, restart');
  });

  it('formats a duration as a duration rather than as a bare number', () => {
    expect(fieldValue({ estimated_days: 56 }, field('estimated_days'))).toBe('56 days');
    expect(fieldValue({ estimated_days: null }, field('estimated_days'))).toBeNull();
  });

  it('keeps every required field inside a group the page renders', () => {
    const keys = allFields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length); // no field declared twice
  });
});

describe('stats', () => {
  it('distinguishes "no stats row" from "zero participants"', () => {
    // No row means the database declined to answer. Zero means it answered.
    expect(withStats({ id: 't1' }, undefined).stats).toBeNull();
    expect(withStats({ id: 't1' }, { enrolled: 0, suppressed: true }).stats!.enrolled).toBe(0);
  });

  it('keeps a suppressed breakdown null rather than collapsing it to zero', () => {
    const s = normaliseStats({ enrolled: 3, suppressed: true, active: null, completed: null, abandoned: null, average_rating: null });
    expect(s.enrolled).toBe(3);
    expect(s.suppressed).toBe(true);
    expect(s.completed).toBeNull();
    expect(s.averageRating).toBeNull();
  });

  it('converts the numerics PostgREST returns as strings', () => {
    const s = normaliseStats({ enrolled: '12', suppressed: false, completed: '7', completion_rate: '58.3', average_rating: '4.25' });
    expect(s.enrolled).toBe(12);
    expect(s.completed).toBe(7);
    expect(s.completionRate).toBeCloseTo(58.3);
    expect(s.averageRating).toBeCloseTo(4.25);
  });
});

describe('suppressionNote', () => {
  it('says how many more are needed rather than "insufficient data"', () => {
    expect(suppressionNote(3)).toBe('3 people have started it. The breakdown appears at 5 — 2 more.');
    expect(suppressionNote(1)).toBe('1 person has started it. The breakdown appears at 5 — 4 more.');
  });

  it('says plainly when nobody has started', () => {
    expect(suppressionNote(0)).toBe('Nobody has started this Journey yet.');
  });

  it('matches the threshold the database enforces', () => {
    expect(MIN_COHORT).toBe(5);
  });
});

describe('the boundary', () => {
  it('is a written list, so removing an item has to be deliberate', () => {
    expect(NEVER_SHOWN).toContain('who the participants are');
    expect(NEVER_SHOWN).toContain('coach conversations');
    expect(NEVER_SHOWN).toContain('free-text answers and photos from Steps');
  });
});
