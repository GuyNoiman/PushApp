/**
 * The Journey Studio's vocabulary and arithmetic — pure, so the parts that are
 * easy to get quietly wrong are testable without a browser or a database.
 *
 * TERMINOLOGY, exactly (Product_Terminology). A **Journey Template** is the
 * reusable definition a Creator authors. A **Journey Instance** is the
 * participant's personal copy of it. This product authors templates. It is not a
 * Course, a Program, a Plan, a Workshop or a Module — a creator may describe
 * their offering that way to their own audience, and inside PushApp it is a
 * Journey with Milestones and Steps.
 */

/** PRD §13's lifecycle. `published` is the only state that may be adopted. */
export const STATUSES = Object.freeze([
  { value: 'draft', label: 'Draft', adoptable: false },
  { value: 'private_test', label: 'Private test', adoptable: false },
  { value: 'in_review', label: 'In review', adoptable: false },
  { value: 'changes_requested', label: 'Changes requested', adoptable: false },
  { value: 'published', label: 'Published', adoptable: true },
  { value: 'paused', label: 'Paused', adoptable: false },
  { value: 'retired', label: 'Retired', adoptable: false },
  { value: 'archived', label: 'Archived', adoptable: false },
]);

const STATUS_LABELS = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));
export const statusLabel = (v) => STATUS_LABELS[v] ?? v ?? '—';
export const isAdoptable = (v) => STATUSES.some((s) => s.value === v && s.adoptable);

export const DIFFICULTY = Object.freeze({ gentle: 'Gentle', moderate: 'Moderate', demanding: 'Demanding' });
export const START_MODE = Object.freeze({ fixed: 'Fixed start date', flexible: 'Starts whenever the participant does' });
export const EDIT_POLICY = Object.freeze({
  editable: 'The participant may adapt it',
  partially_editable: 'The participant may adapt parts of it',
  locked: 'Fixed as authored',
});
export const RESTART_POLICY = Object.freeze({ allowed: 'May be repeated', once: 'Once only', never: 'No restart' });

/**
 * "What fields did I fill in on this Journey" — §5.1 (identity and fit) and the
 * field-shaped subset of §5.2 (rules), grouped the way the PRD groups them so
 * that the studio's page and the PRD stay legible against each other.
 *
 * `required` marks what a template cannot be published without. It is the first
 * slice of §11.1's Journey Health Check: not a quality judgement, just the
 * question of whether a participant would know what they are adopting.
 */
export const FIELD_GROUPS = Object.freeze([
  {
    id: 'identity',
    title: 'Identity and fit',
    fields: [
      { key: 'name', label: 'Journey name', required: true },
      { key: 'short_description', label: 'Short description', required: true },
      { key: 'long_description', label: 'What change this supports', required: true },
      { key: 'dream_fit', label: 'Which Dreams it may fit' },
      { key: 'audience', label: 'Who it is for', required: true },
      { key: 'prerequisites', label: 'Prerequisites' },
      { key: 'outcome', label: 'What they should be able to do by the end', required: true },
      { key: 'language', label: 'Language' },
      { key: 'cover_url', label: 'Cover image' },
    ],
  },
  {
    id: 'effort',
    title: 'Shape and effort',
    fields: [
      { key: 'estimated_days', label: 'Estimated duration', format: (v) => (v ? `${v} days` : null) },
      { key: 'weekly_minutes', label: 'Expected weekly effort', format: (v) => (v ? `${v} minutes a week` : null) },
      { key: 'difficulty', label: 'Difficulty', format: (v) => DIFFICULTY[v] ?? v },
      { key: 'tags', label: 'Discovery tags', format: (v) => (v && v.length ? v.join(', ') : null) },
    ],
  },
  {
    id: 'rules',
    title: 'Rules',
    fields: [
      { key: 'start_mode', label: 'Start', format: (v) => START_MODE[v] ?? v },
      { key: 'completion_window_days', label: 'Completion window', format: (v) => (v ? `${v} days` : null) },
      { key: 'edit_policy', label: 'Editing', format: (v) => EDIT_POLICY[v] ?? v },
      { key: 'restart_policy', label: 'Restart', format: (v) => RESTART_POLICY[v] ?? v },
      { key: 'success_policy', label: 'What counts as completing it', required: true },
    ],
  },
]);

const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/** The value as the studio shows it, or null when the creator has not filled it in. */
export function fieldValue(template, field) {
  const raw = template?.[field.key];
  if (isEmpty(raw)) return null;
  return field.format ? field.format(raw) : String(raw);
}

/**
 * §11.1's health check, first slice: what is missing before this could be
 * published. Deliberately not a score — a number out of ten invites optimising
 * the number.
 */
export function missingBeforePublish(template) {
  return ALL_FIELDS.filter((f) => f.required && isEmpty(template?.[f.key])).map((f) => f.label);
}

/**
 * Merge a template row with its stats row.
 *
 * A template with NO stats row is not a template with zero participants — the
 * function returns no row when the caller may not ask. The distinction survives
 * into the UI as "unknown" rather than "0", the same discipline the operations
 * console applies to a check that never ran.
 */
export function withStats(template, statsRow) {
  if (!statsRow) return { ...template, stats: null };
  return { ...template, stats: normaliseStats(statsRow) };
}

export function normaliseStats(row) {
  const num = (v) => (v === null || v === undefined ? null : Number(v));
  return {
    enrolled: num(row.enrolled) ?? 0,
    suppressed: Boolean(row.suppressed),
    active: num(row.active),
    paused: num(row.paused),
    completed: num(row.completed),
    abandoned: num(row.abandoned),
    completionRate: num(row.completion_rate),
    reviews: num(row.reviews),
    averageRating: num(row.average_rating),
  };
}

/**
 * The language a Journey is written in, by name.
 *
 * The card used to show the stored code (`he`, `en`). A Creator does not think in
 * ISO codes, and the approved design shows the name — so the code stays the value
 * and the name is what is rendered.
 */
export const LANGUAGES = Object.freeze({ he: 'Hebrew', en: 'English' });
export const languageLabel = (v) => LANGUAGES[v] ?? v ?? '—';

/**
 * "Updated 2 days ago" rather than a timestamp to the second.
 *
 * A Creator is asking "is this the one I was working on yesterday", not "at which
 * instant". The absolute time is kept in the `title` attribute by the caller, so
 * precision is one hover away rather than gone.
 */
export function relativeTime(iso, now = Date.now()) {
  if (!iso) return '—';
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return '—';
  const seconds = Math.round((now - at) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * The four numbers above the library (the approved design's hero).
 *
 * `completionRate` is deliberately computed only from templates whose breakdown
 * is NOT suppressed. Counting a suppressed template as zero completions would
 * quietly punish a new Journey for being new, and the whole point of suppression
 * is that those numbers are not knowable yet. When nothing is measurable the rate
 * is null and the card says so rather than showing 0%.
 */
export function workspaceOverview(rows) {
  let started = 0;
  let completed = 0;
  let measurable = 0;
  for (const row of rows) {
    const s = row.stats;
    if (!s) continue;
    started += s.enrolled ?? 0;
    if (!s.suppressed && s.completed !== null && s.enrolled) {
      completed += s.completed;
      measurable += s.enrolled;
    }
  }
  return {
    templates: rows.length,
    published: rows.filter((r) => isAdoptable(r.status)).length,
    started,
    completionRate: measurable > 0 ? Math.round((completed / measurable) * 100) : null,
  };
}

/** How the library may be ordered. The default is what a Creator was last doing. */
export const SORTS = Object.freeze([
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Recently created' },
  { value: 'name', label: 'Name' },
  { value: 'reach', label: 'Most people started' },
]);

/**
 * Search, filter and sort the library — pure, and deliberately narrow.
 *
 * The search covers the NAME and the short description, which are the two things
 * the Creator wrote to identify the Journey. It does not reach into participant
 * data of any kind; there is nothing here to search that a participant produced.
 */
export function filterTemplates(rows, { query = '', status = '', sort = 'updated' } = {}) {
  const needle = query.trim().toLowerCase();
  const matched = rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (!needle) return true;
    return `${row.name ?? ''} ${row.short_description ?? ''}`.toLowerCase().includes(needle);
  });
  const at = (v) => new Date(v ?? 0).getTime() || 0;
  const sorted = [...matched];
  if (sort === 'name') sorted.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
  else if (sort === 'created') sorted.sort((a, b) => at(b.created_at) - at(a.created_at));
  else if (sort === 'reach') sorted.sort((a, b) => (b.stats?.enrolled ?? 0) - (a.stats?.enrolled ?? 0));
  else sorted.sort((a, b) => at(b.updated_at) - at(a.updated_at));
  return sorted;
}

/**
 * How ready a draft is to be published, for the Create screen's side panel.
 *
 * It counts the fields §5 requires and NOTHING else — not a quality score. A
 * number out of ten invites optimising the number, and a Journey that scores
 * well on filled fields can still be a bad Journey. What this can honestly say
 * is "a participant would not know what they were agreeing to without these".
 */
export const READINESS_STAGES = Object.freeze([
  { atLeast: 1, title: 'Ready to review' },
  { atLeast: 0.75, title: 'Nearly there' },
  { atLeast: 0.4, title: 'Good beginning' },
  { atLeast: 0, title: 'Just started' },
]);

export function draftReadiness(template) {
  const required = ALL_FIELDS.filter((f) => f.required);
  const missing = missingBeforePublish(template);
  const done = required.length - missing.length;
  const ratio = required.length === 0 ? 1 : done / required.length;
  const stage = READINESS_STAGES.find((s) => ratio >= s.atLeast) ?? READINESS_STAGES[READINESS_STAGES.length - 1];
  return { done, total: required.length, ratio, missing, title: stage.title };
}

/** The threshold the database enforces, repeated here only to explain it. */
export const MIN_COHORT = 5;

/**
 * The sentence shown instead of a breakdown. It says the number that is missing
 * rather than "insufficient data", because a creator with three participants
 * should know they need two more, not that something is wrong.
 */
export function suppressionNote(enrolled, min = MIN_COHORT) {
  const short = Math.max(0, min - enrolled);
  if (enrolled === 0) return 'Nobody has started this Journey yet.';
  return `${enrolled} ${enrolled === 1 ? 'person has' : 'people have'} started it. The breakdown appears at ${min} — ${short} more.`;
}

/**
 * What the creator is never shown, kept as a list rather than as an absence, so
 * that adding one of these later has to be a deliberate act against a written
 * line (§10, §14).
 */
export const NEVER_SHOWN = Object.freeze([
  'who the participants are',
  'an individual participant’s progress',
  'private Dreams',
  'reasons a Step was missed',
  'coach conversations',
  'free-text answers and photos from Steps',
  'Ally activity',
]);

/**
 * The database-ready first draft. This is metadata only: no Milestones, Steps or
 * structure placeholder is invented before the structure-builder contract exists.
 */
export function createDraftPayload(input, creatorId) {
  const text = (value) => {
    const trimmed = String(value ?? '').trim();
    return trimmed || null;
  };
  const positiveInt = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const tags = Array.isArray(input.tags)
    ? input.tags
    : String(input.tags ?? '').split(',');
  return {
    creator_id: creatorId,
    status: 'draft',
    name: text(input.name),
    short_description: text(input.short_description),
    long_description: text(input.long_description),
    dream_fit: text(input.dream_fit),
    audience: text(input.audience),
    prerequisites: text(input.prerequisites),
    outcome: text(input.outcome),
    language: text(input.language) ?? 'he',
    cover_url: text(input.cover_url),
    estimated_days: positiveInt(input.estimated_days),
    weekly_minutes: positiveInt(input.weekly_minutes),
    difficulty: text(input.difficulty),
    tags: [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))],
    start_mode: text(input.start_mode) ?? 'flexible',
    completion_window_days: positiveInt(input.completion_window_days),
    edit_policy: text(input.edit_policy) ?? 'editable',
    restart_policy: text(input.restart_policy) ?? 'allowed',
    success_policy: text(input.success_policy),
  };
}

export function validateDraft(payload) {
  const errors = [];
  if (!payload.creator_id) errors.push('Your creator account could not be verified.');
  if (!payload.name) errors.push('Give this Journey a working name before saving.');
  if (payload.cover_url && !/^https:\/\/\S+$/i.test(payload.cover_url)) {
    errors.push('Use an HTTPS address for the cover image.');
  }
  return errors;
}

/** The creator id is deliberately omitted: the server derives it from auth.uid(). */
export function draftRpcArgs(payload) {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => key !== 'creator_id' && key !== 'status')
      .map(([key, value]) => [`p_${key}`, value]),
  );
}
