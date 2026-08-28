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
