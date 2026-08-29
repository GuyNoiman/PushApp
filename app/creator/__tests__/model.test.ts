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
  createDraftPayload, draftRpcArgs, validateDraft,
  workspaceOverview, filterTemplates, draftReadiness, relativeTime, languageLabel,
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

describe('creator draft', () => {
  it('creates metadata-only draft payload with stable defaults', () => {
    expect(createDraftPayload({ name: '  Return to running  ', tags: ' Running, restart, running ' }, 'u1')).toMatchObject({
      creator_id: 'u1', status: 'draft', name: 'Return to running', language: 'he',
      tags: ['running', 'restart'], start_mode: 'flexible', edit_policy: 'editable', restart_policy: 'allowed',
    });
  });

  it('does not turn empty or invalid numeric fields into zero', () => {
    const payload = createDraftPayload({ name: 'A', estimated_days: '', weekly_minutes: '-2' }, 'u1');
    expect(payload.estimated_days).toBeNull();
    expect(payload.weekly_minutes).toBeNull();
  });

  it('requires only identity and a name to save a private draft', () => {
    expect(validateDraft(createDraftPayload({ name: '' }, 'u1'))).toContain('Give this Journey a working name before saving.');
    expect(validateDraft(createDraftPayload({ name: 'A Journey' }, 'u1'))).toEqual([]);
  });

  it('rejects a non-HTTPS cover before the request reaches the server', () => {
    const draft = createDraftPayload({ name: 'A Journey', cover_url: 'http://example.com/cover.jpg' }, 'creator-1');
    expect(validateDraft(draft)).toContain('Use an HTTPS address for the cover image.');
  });

  it('never lets the browser choose the creator or lifecycle through the write RPC', () => {
    const args = draftRpcArgs(createDraftPayload({ name: 'A Journey' }, 'u1'));
    expect(args).not.toHaveProperty('p_creator_id');
    expect(args).not.toHaveProperty('p_status');
    expect(args).toMatchObject({ p_name: 'A Journey', p_language: 'he' });
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

describe('the workspace overview', () => {
  const row = (status: string, stats: unknown) => ({ status, stats }) as never;

  it('counts only what it can measure into the completion rate', () => {
    // The suppressed template contributes its enrolment total — a total identifies
    // nobody — but NOT a zero to the completion rate. Counting it as zero
    // completions would punish a Journey for being new, and "not enough
    // participants to say" is the whole reason the breakdown is withheld.
    const out = workspaceOverview([
      row('published', { enrolled: 100, suppressed: false, completed: 60 }),
      row('draft', { enrolled: 3, suppressed: true, completed: null }),
    ]);
    expect(out).toEqual({ templates: 2, published: 1, started: 103, completionRate: 60 });
  });

  it('says nothing rather than 0% when no template is measurable yet', () => {
    const out = workspaceOverview([row('draft', { enrolled: 2, suppressed: true, completed: null })]);
    expect(out.completionRate).toBeNull();
    expect(out.started).toBe(2);
  });

  it('counts only adoptable statuses as published', () => {
    const out = workspaceOverview([row('published', null), row('paused', null), row('draft', null)]);
    expect(out.published).toBe(1);
    expect(out.templates).toBe(3);
  });

  it('survives a template with no stats row at all', () => {
    expect(workspaceOverview([row('draft', null)])).toEqual({
      templates: 1, published: 0, started: 0, completionRate: null,
    });
  });
});

describe('filtering the library', () => {
  const rows = [
    { name: 'Return to running', short_description: 'Back to a habit', status: 'published', updated_at: '2026-08-01', created_at: '2026-07-01', stats: { enrolled: 10 } },
    { name: 'Sleeping earlier', short_description: 'Wind down', status: 'draft', updated_at: '2026-08-05', created_at: '2026-07-20', stats: { enrolled: 40 } },
    { name: 'Hard conversations', short_description: 'Rehearse the running order', status: 'draft', updated_at: '2026-07-30', created_at: '2026-07-25', stats: null },
  ] as never[];

  it('searches the name and the short description, and nothing else', () => {
    expect(filterTemplates(rows, { query: 'running' }).map((r) => r.name))
      .toEqual(['Return to running', 'Hard conversations']);
  });

  it('is case-insensitive and ignores surrounding space', () => {
    expect(filterTemplates(rows, { query: '  SLEEPING ' })).toHaveLength(1);
  });

  it('filters by status', () => {
    expect(filterTemplates(rows, { status: 'draft' })).toHaveLength(2);
  });

  it('defaults to most recently updated', () => {
    expect(filterTemplates(rows).map((r) => r.name))
      .toEqual(['Sleeping earlier', 'Return to running', 'Hard conversations']);
  });

  it('sorts by reach, treating an unmeasurable template as zero rather than dropping it', () => {
    expect(filterTemplates(rows, { sort: 'reach' }).map((r) => r.name))
      .toEqual(['Sleeping earlier', 'Return to running', 'Hard conversations']);
  });

  it('returns everything when nothing is asked for', () => {
    expect(filterTemplates(rows, {})).toHaveLength(3);
  });
});

describe('draft readiness', () => {
  const full = {
    name: 'Coming back to running',
    short_description: 'Eight weeks back.',
    long_description: 'For somebody who stopped.',
    audience: 'Adults returning',
    outcome: 'Run 30 minutes',
    success_policy: 'Finish the mandatory Steps.',
  };

  it('is complete when every required field is filled', () => {
    const out = draftReadiness(full);
    expect(out.ratio).toBe(1);
    expect(out.missing).toEqual([]);
    expect(out.title).toBe('Ready to review');
  });

  it('counts only the required fields, so optional ones cannot pad the bar', () => {
    const out = draftReadiness({ ...full, prerequisites: '', dream_fit: '' });
    expect(out.done).toBe(out.total);
  });

  it('names the stage from how much is done', () => {
    expect(draftReadiness({}).title).toBe('Just started');
    expect(draftReadiness({ name: 'x', short_description: 'y', long_description: 'z' }).title).toBe('Good beginning');
  });

  it('lists what is missing rather than only counting it', () => {
    expect(draftReadiness({ name: 'x' }).missing).toContain('What counts as completing it');
  });
});

describe('relative time', () => {
  const now = Date.UTC(2026, 7, 29, 12, 0, 0);
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('reads the way somebody would say it out loud', () => {
    expect(relativeTime(ago(30 * 1000), now)).toBe('just now');
    expect(relativeTime(ago(5 * 60 * 1000), now)).toBe('5 minutes ago');
    expect(relativeTime(ago(3 * 3600 * 1000), now)).toBe('3 hours ago');
    expect(relativeTime(ago(24 * 3600 * 1000), now)).toBe('yesterday');
    expect(relativeTime(ago(3 * 24 * 3600 * 1000), now)).toBe('3 days ago');
    expect(relativeTime(ago(60 * 24 * 3600 * 1000), now)).toBe('2 months ago');
  });

  it('does not guess at a missing or unreadable date', () => {
    expect(relativeTime(null, now)).toBe('—');
    expect(relativeTime('not a date', now)).toBe('—');
  });
});

describe('language', () => {
  it('shows the name a Creator would use, not the stored code', () => {
    expect(languageLabel('he')).toBe('Hebrew');
    expect(languageLabel('en')).toBe('English');
  });

  it('shows an unknown code rather than hiding it', () => {
    expect(languageLabel('ar')).toBe('ar');
  });
});
