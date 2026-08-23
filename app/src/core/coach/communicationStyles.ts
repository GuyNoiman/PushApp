/**
 * communicationStyles — the EDITABLE registry of communication TONES the meta-agent (סוכן-על) can
 * speak in. The meta-agent owns HOW the coach sounds to the user and will eventually PICK a style
 * (and adapt it as the app learns the user); this file is the config layer it chooses from. Adding
 * or reshaping a voice is a config edit here, never a control-flow change (configuration-before-
 * code, Engineering Bible §E1).
 *
 * Four NAMED styles ship, but only {@link STEADY} carries content today. The other three are empty
 * STUBS — named placeholders to be written later — so the content fields are OPTIONAL and a stub is
 * a valid style. {@link getStyle} treats a contentless stub as "not yet usable" and falls back to
 * {@link DEFAULT_STYLE_ID steady}, so a caller always gets a usable voice.
 *
 * The populated `steady` voice aligns with {@link ./coachPrompts COACH_SYSTEM_PROMPT}: its
 * `systemPromptFragment` is meant to compose alongside that persona, not replace it.
 *
 * SECURITY-PRIVACY G1: nothing here holds user data — only static tone copy.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */

/** The named communication tones the meta-agent may speak in. */
export type CommunicationStyleId = 'steady' | 'direct' | 'gentle' | 'spark';

/** All communication-style ids, in registry order (steady first — it is the default). */
export const STYLE_IDS: readonly CommunicationStyleId[] = ['steady', 'direct', 'gentle', 'spark'];

/**
 * One communication tone the meta-agent can adopt. `displayName` is always present so every style
 * is selectable in UI; `description` and `systemPromptFragment` are OPTIONAL so an unwritten stub
 * is still a valid entry. A style with no `systemPromptFragment` is a placeholder — see
 * {@link getStyle}, which falls back to steady when a contentless style is requested.
 */
export interface CommunicationStyle {
  id: CommunicationStyleId;
  displayName: string;
  /** Short human-readable summary of the tone. Omitted on unwritten stubs. */
  description?: string;
  /** Tone instructions composed alongside COACH_SYSTEM_PROMPT. Omitted on unwritten stubs. */
  systemPromptFragment?: string;
}

/**
 * The one POPULATED voice: the founder's meta-agent tone. Professional and accepting, non-
 * judgmental, pleasant but to-the-point, and always oriented to BUILDING A WORK PLAN — explicitly
 * NOT a psychologist or therapist. Aligns with {@link ./coachPrompts COACH_SYSTEM_PROMPT}.
 */
const STEADY: CommunicationStyle = {
  id: 'steady',
  displayName: 'Steady',
  description:
    'Professional, accepting, and non-judgmental. Pleasant but to-the-point, always working ' +
    'toward a concrete plan — a steady guide, not a therapist.',
  systemPromptFragment: [
    'Speak in a STEADY voice: professional, calm, and accepting. Meet the user without judgement —',
    'never praise, scold, or moralise about their choices. Be pleasant but to-the-point: warm in a',
    'sentence, not a paragraph.',
    'Your job is to help them BUILD A WORKABLE PLAN and take the next real step — not to explore',
    'feelings for their own sake. You are NOT a psychologist or therapist; do not analyse, diagnose,',
    'or counsel. When emotion comes up, acknowledge it briefly and turn it into something actionable.',
    'Stay concrete and forward-moving: what they want, what gets in the way, and the next step toward it.',
  ].join('\n'),
};

/**
 * The three voices that were stubs until 2026-08-24.
 *
 * They are written from the four style definitions in `Communication_Style_Profile_PRD.md` §4 —
 * including each one's stated LIMIT, which is the half that keeps a tone from turning into a
 * caricature. Without content here every style resolved back to `steady` (see {@link getStyle}), so
 * answering the questionnaire changed a confirmation screen and nothing a person could hear.
 *
 * Each fragment composes ALONGSIDE `COACH_SYSTEM_PROMPT`; none of them replaces the persona, and none
 * changes what the coach may do — only how it sounds.
 */
const DIRECT: CommunicationStyle = {
  id: 'direct',
  displayName: 'Direct',
  description:
    'Short, concrete and action-first. States what is and what can be done next, without extra ' +
    'explanation — and never becomes commanding, cold or judgmental.',
  systemPromptFragment: [
    'Speak in a DIRECT voice: short sentences, concrete words, the next action first.',
    'Say what is and what can be done about it. Leave out the preamble and the reassurance the',
    'person did not ask for.',
    'NEVER become commanding, cold or judgmental — direct is brief, not blunt about the person.',
    'Ask one question at a time and keep it answerable in a sentence.',
  ].join('\n'),
};

const GENTLE: CommunicationStyle = {
  id: 'gentle',
  displayName: 'Gentle',
  description:
    'Human, caring and relational. Emphasises support and being alongside the person — without ' +
    'pretending the app has feelings, forming dependency or making therapeutic claims.',
  systemPromptFragment: [
    'Speak in a WARM voice: human, unhurried, alongside the person rather than above them.',
    'Acknowledge what is hard before moving to what is next, and let a difficult answer be a',
    'difficult answer without hurrying past it.',
    'NEVER claim to feel things yourself, never encourage dependence on this conversation, and',
    'never make a therapeutic or clinical claim. Warmth is in the pacing and the wording, not in',
    'declarations of care.',
  ].join('\n'),
};

const SPARK: CommunicationStyle = {
  id: 'spark',
  displayName: 'Spark',
  description:
    'Upbeat, concise and momentum-oriented. Highlights capability and the next positive action — ' +
    'without hype, exclamation marks, streak panic or forced positivity.',
  systemPromptFragment: [
    'Speak in an ENERGIZING voice: brisk, forward-leaning, naming what the person is capable of and',
    'what the next good move is.',
    'Keep it short. Momentum comes from the next concrete step, not from adjectives.',
    'NEVER use hype, exclamation marks, urgency about streaks, or positivity that argues with what',
    'the person actually said. If something is hard, say so and then point forward.',
  ].join('\n'),
};

/**
 * The editable style registry, keyed by id. All four are populated since 2026-08-24 — the three that
 * were stubs are what made the whole Communication Style feature inaudible. Edit these entries to
 * reshape the meta-agent's voices.
 */
export const COMMUNICATION_STYLES: Record<CommunicationStyleId, CommunicationStyle> = {
  steady: STEADY,
  direct: DIRECT,
  gentle: GENTLE,
  spark: SPARK,
};

/** The tone the meta-agent uses until it learns enough to choose another. */
export const DEFAULT_STYLE_ID: CommunicationStyleId = 'steady';

/** A style is USABLE once it carries tone content; a contentless stub is not yet usable. */
function isUsable(style: CommunicationStyle): boolean {
  return typeof style.systemPromptFragment === 'string' && style.systemPromptFragment.length > 0;
}

/**
 * Resolve a communication style to one a caller can actually speak in. Returns the requested style
 * when it exists AND has content; otherwise falls back to the {@link DEFAULT_STYLE_ID steady} voice
 * — covering an unknown id, an undefined id, or a not-yet-written stub. Callers always get a usable
 * voice.
 */
export function getStyle(id?: CommunicationStyleId): CommunicationStyle {
  const requested = id ? COMMUNICATION_STYLES[id] : undefined;
  if (requested && isUsable(requested)) return requested;
  return COMMUNICATION_STYLES[DEFAULT_STYLE_ID];
}
