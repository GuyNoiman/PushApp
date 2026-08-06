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

/** An empty, to-be-defined tone: named only, content added in a later pass. */
const DIRECT: CommunicationStyle = {
  id: 'direct',
  displayName: 'Direct',
};

/** An empty, to-be-defined tone: named only, content added in a later pass. */
const GENTLE: CommunicationStyle = {
  id: 'gentle',
  displayName: 'Gentle',
};

/** An empty, to-be-defined tone: named only, content added in a later pass. */
const SPARK: CommunicationStyle = {
  id: 'spark',
  displayName: 'Spark',
};

/**
 * The editable style registry, keyed by id. Only {@link STEADY} is populated; direct, gentle and
 * spark are named stubs to fill in later. Edit these entries to reshape the meta-agent's voices.
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
