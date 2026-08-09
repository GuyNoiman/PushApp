/**
 * coachPrompts — the EDITABLE voice of the conversational coach (adaptive coach, S2.3). Every
 * string here is CONFIG the founder can tune to reshape the coach's conversational style WITHOUT
 * touching the {@link ./CoachOrchestrator} control flow (configuration-before-code, Engineering
 * Bible §E1). The orchestrator owns WHAT to ask (the deterministic {@link ./interviewPlaybook}
 * order); these prompts own HOW it sounds and how a free-text answer is parsed into a
 * {@link ./interviewPlaybook GoalSpec}.
 *
 * Two system prompts, two jobs on the SAME {@link ../llm/LlmClient} seam:
 *   • {@link COACH_SYSTEM_PROMPT}      → phrases the next leading question, warmly, one at a time.
 *   • {@link EXTRACTION_SYSTEM_PROMPT} → parses the user's answer into strict JSON goal fields.
 *
 * Terminology is canonical: the mid-layer object is a Milestone (never "Phase").
 *
 * SECURITY-PRIVACY G1: nothing here holds user data — only static coaching copy. The user's answers
 * it helps process are ON-DEVICE-ONLY raw signal (same invariant as learning/GoalInput) and are
 * never logged or synced.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import { findLanguage } from '../../i18n/languages';
import { DOMAIN_IDS } from '../learning/experts/registry';
import type { ExtractionField } from './interviewPlaybook';

/** The domain ids the extractor may classify a goal into, as a JSON-union string for the prompt. */
const DOMAIN_UNION = DOMAIN_IDS.map((id) => `"${id}"`).join(' | ');

/**
 * The coach persona used when the model PHRASES the next question. Warm, concise, non-clinical,
 * one question at a time. Tune freely — the orchestrator never inspects this text.
 */
export const COACH_SYSTEM_PROMPT = [
  'You are the PushApp coach. You help the user become who they choose to be by closing the gap',
  'between intention and action. You are warm, concise, and human — never clinical, never a',
  'scoreboard, never a scold.',
  '',
  'You are interviewing the user to shape one Journey. Rules for every reply:',
  '• Ask exactly ONE question, in one or two short sentences.',
  '• Follow the directive you are given about WHAT to ask next — do not wander to other topics.',
  '• Sound like a supportive friend who listens, not a form to fill in.',
  '• Use the user\'s own words back to them when it helps them feel heard.',
  '• Use the official terms: Journey, Milestone, Buddy, Support Circle. Never say "phase",',
  '  "program", or "challenge".',
  '• Do not summarise the whole plan and do not offer choices unless asked to.',
].join('\n');

/**
 * The system prompt used when the model PARSES a free-text answer into structured goal fields. It
 * must return STRICT JSON (the seam sets `json: true`). This is the contract the S2.4 parser will
 * harden; the shape it emits is {@link ../coach/CoachOrchestrator ExtractionPayload}.
 */
export const EXTRACTION_SYSTEM_PROMPT = [
  'You extract structured goal fields from a user\'s message for a coaching interview.',
  'Return ONLY a JSON object — no prose, no markdown fences. Include a key ONLY when the message',
  'clearly supports it; omit everything you are unsure about. Never invent values.',
  '',
  'Allowed keys (all optional):',
  '  "title": string            — a short name for what the user wants to do',
  '  "description": string       — any extra detail about the goal',
  `  "domain": ${DOMAIN_UNION}`,
  '                               — classify the goal into ONE of these domains: addiction (quitting',
  '                               a substance or breaking a harmful pattern — drugs, drinking,',
  '                               smoking, gambling, casual flings, etc.), relationships (connection,',
  '                               dating, sustaining relationships, easing loneliness), body_image',
  '                               (eating, movement/fitness, and feeling at home in your body — one',
  '                               combined domain), career (direction, skills, job search, growth at',
  '                               work). Use "general" for anything else or when you are not sure.',
  '                               NEVER invent a domain outside this list.',
  '  "processType": "fixed" | "progressive"  — fixed = one recurring habit; progressive = builds',
  '                               through ordered Milestones',
  '  "motivation": string        — why this matters to the user',
  '  "failureRisks": string[]    — what has derailed them before',
  '  "milestones": string[]      — ordered Milestone titles (progressive goals only)',
  '  "timing": { "daypart": "morning" | "evening" | "either", "sessionMinutes": number,',
  '              "sessionsPerWeek": number, "preferredDays": number[] (0=Sun..6=Sat),',
  '              "targetDate": number (epoch ms) }',
  '  "locationRelevant": boolean — did a specific place seem to matter?',
  '  "calendarRelevant": boolean — did their calendar seem to matter?',
  '  "cadence": "once" | "daily" | "weekly"',
  '  "wantsSupportCircle": boolean — did they accept inviting a Buddy / Support Circle?',
  '',
  'If the message contains none of these, return {}.',
].join('\n');

/**
 * The TRIAGE / UNDERSTANDING (meta-agent) prompt. The coach flow runs the LLM here for its ONE
 * structural job: read the user's free-text opening — which may name MORE THAN ONE distinct goal —
 * and break it into a structured list of goals, classifying EACH by domain and by KIND (a simple
 * `recurring` habit vs a staged `process`). The orchestrator uses that understanding to focus the
 * user on one goal first (deferring the rest) and to route the chosen goal to the matching
 * {@link ../learning/experts/registry DomainExpert} with the right question flow. Deliberately
 * NON-conversational — it must NOT coach, ask, or chat; it only labels.
 *
 * The orchestrator composes this with the STEADY {@link ./communicationStyles} voice so the
 * meta-agent stays in-persona; the understanding itself returns strict JSON. Editable config.
 */
export const TRIAGE_SYSTEM_PROMPT = [
  "You are the PushApp coach's understanding step. The user has just told you, in their own words,",
  'what they want to work on. Their message may describe MORE THAN ONE distinct goal at once. Your',
  'ONLY job is to read it and break it into the SEPARATE goals it contains, and for each goal decide',
  'two things: which DOMAIN it belongs to, and what KIND of goal it is. Do NOT ask questions, coach,',
  'or reply conversationally.',
  '',
  'Return ONLY a JSON object of the form',
  `  {"goals": [{"title": string, "kind": "recurring" | "process", "domain": ${DOMAIN_UNION}}]}`,
  '— no prose, no fences. List ONE entry per distinct goal, in the order the user mentioned them. If',
  'the user described only one goal, return a single-entry list. Never merge two clearly different',
  'goals into one entry, and never invent a goal the user did not mention. Keep each "title" short and',
  "in the user's own framing.",
  '',
  'kind — how the goal is shaped:',
  '  recurring — a simple, fixed action repeated on a routine (e.g. "drink a protein shake every day").',
  '              It does not change or build over time; it just needs to become a habit.',
  '  process   — a step-by-step build-up whose steps CHANGE over time toward a target (e.g. "work up',
  '              from 100 to 500 pushups a week"). It progresses through stages / Milestones.',
  '',
  'domain — pick ONE per goal:',
  '  addiction      — quitting a substance or breaking a harmful pattern (drugs, drinking, smoking,',
  '                   gambling, compulsive habits).',
  '  relationships  — connection, dating, sustaining relationships, easing loneliness.',
  '  body_image     — eating, movement/fitness, and feeling at home in your body (one combined domain).',
  '  career         — direction, skills, job search, growth at work.',
  '  general        — anything else, or when you are not sure.',
  'NEVER invent a domain outside this list.',
].join('\n');

/**
 * The EDIT understanding prompt (task J1). The coach-led edit path runs the LLM here for ONE
 * structural job: read the user's free-text change request for an EXISTING Journey and turn it into a
 * strict JSON DIFF — never conversational prose. The app validates every field against the real
 * Journey ({@link ./journeyEdit extractJourneyEdit}) before anything mutates, so the model is trusted
 * only to UNDERSTAND the request, never to act on it. Deliberately non-conversational. Editable config.
 */
export const EDIT_SYSTEM_PROMPT = [
  "You are the PushApp coach's Journey-EDIT understanding step. The user is looking at ONE existing",
  'Journey and has just told you, in their own words, what they want to change about it. Your ONLY job',
  'is to translate that into a structured DIFF. Do NOT ask questions, coach, or reply conversationally.',
  '',
  'Return ONLY a JSON object with any of these OPTIONAL keys — include a key ONLY when the user clearly',
  'asked to change it, and omit everything else. Never invent a change the user did not ask for.',
  '  "title": string            — a new name for the Journey',
  '  "why": string[]            — the user\'s reasons this Journey matters (replaces the list)',
  '  "rhythm": "daily" | "few-times-week" | "weekly"   — how often overall',
  '  "durationDays": number     — a new length in days',
  '  "addSteps": [{ "title": string, "description"?: string, "cadence"?: "once" | "daily" | "weekly" }]',
  '  "editSteps": [{ "stepId": string, "title"?: string, "description"?: string,',
  '                  "cadence"?: "once" | "daily" | "weekly" }]',
  '  "removeStepIds": string[]  — ids of Steps to remove',
  '',
  'For "editSteps" and "removeStepIds" you MUST use a Step id from the Journey given to you — never a',
  'title, never an invented id. If the user is vague about which Step, prefer the closest match by',
  'title. If the message asks for nothing that maps to these keys, return {}.',
].join('\n');

/** Prefix marking the hidden Journey-edit directive turn. */
export const EDIT_DIRECTIVE_PREFIX = '[edit]';

/**
 * Build the hidden directive that hands the edit understanding step the CURRENT Journey (so it can
 * address Steps by their real ids) plus the user's change request. The Journey snapshot carries only
 * on-device titles/ids — no reason notes, no history. `changeText` is the user's verbatim request.
 */
export function buildEditDirective(
  context: { title: string; rhythm: string; durationDays: number; steps: { id: string; title: string }[] },
  changeText: string,
): string {
  const steps = context.steps.map((s) => `    - id "${s.id}": ${s.title}`).join('\n');
  return [
    `${EDIT_DIRECTIVE_PREFIX} The user is editing this Journey:`,
    `  title: ${context.title}`,
    `  rhythm: ${context.rhythm}`,
    `  durationDays: ${context.durationDays}`,
    `  steps:`,
    steps.length > 0 ? steps : '    (none)',
    '',
    `The user asked: "${changeText}". Return the JSON diff per your instructions, addressing any Step`,
    'by its id above.',
  ].join('\n');
}

/**
 * The coach's opening line when it enters EDIT mode for a Journey — scoped and calm, naming the
 * Journey and inviting the change. EDITABLE copy (the i18n UI localizes its own greeting; this is the
 * core/non-UI default and keeps the create-coach pattern where greetings live in config).
 */
export function editGreeting(journeyTitle: string): string {
  return (
    `Let's tune "${journeyTitle}". Tell me what you'd like to change and I'll show you the exact ` +
    'update before anything happens.'
  );
}

/**
 * Build the LOCALE directive appended to the understanding step's system prompt (C-Lang-1). It tells
 * the model the user may write in their selected language and to READ their message in it and keep each
 * goal `title` in that language — but to STILL classify `domain` and `kind` into the FIXED ENGLISH enum
 * tokens (addiction / relationships / body_image / career / general; recurring / process), never a
 * translation. Returns '' for an absent/unknown/English locale, so the model simply defaults to English
 * (tunable config — the wording is editable without touching the orchestrator).
 */
export function buildLocaleDirective(locale?: string): string {
  const language = locale ? findLanguage(locale)?.englishName : undefined;
  // English (or an unknown code) needs no directive — English is the default understanding language.
  if (!language || language === 'English') return '';
  return [
    `The user may write to you in ${language}. Read and understand their message in ${language}, and`,
    `keep each goal "title" you return in the user's own language (${language}) — do NOT translate the`,
    'title into English.',
    'CRITICAL: you MUST still classify each goal\'s "domain" and "kind" using the FIXED English enum',
    'tokens exactly as specified (domain: addiction | relationships | body_image | career | general;',
    'kind: recurring | process). Never translate or localize those enum tokens, and never invent new',
    'ones — only the free-text "title" stays in the user\'s language.',
  ].join('\n');
}

/** Prefix marking the hidden understanding directive turn. */
export const TRIAGE_DIRECTIVE_PREFIX = '[triage]';

/** Build the hidden directive that asks the understanding step to distil the user's free text. */
export function buildTriageDirective(goalText: string): string {
  return (
    `${TRIAGE_DIRECTIVE_PREFIX} The user wants to work on: "${goalText}". ` +
    'Break it into its distinct goals and classify each per your instructions.'
  );
}

/**
 * Per-target directives the orchestrator hands the coach model to steer the NEXT question. These
 * map 1:1 onto {@link ExtractionField}; edit them to change what each interview beat asks about.
 * They are internal steering (never shown verbatim to the user) — the model rephrases them in the
 * {@link COACH_SYSTEM_PROMPT} voice.
 */
export const QUESTION_CUES: Record<ExtractionField, string> = {
  processType:
    'Ask whether this is a single recurring habit they want to keep, or a step-by-step process to build up over time.',
  milestones:
    'Ask what the main stages or Milestones along the way look like — the checkpoints between here and the goal.',
  motivation: 'Ask, warmly, why this matters to them right now — what changes if they pull it off.',
  failureRisks:
    'Ask what has tripped them up before with things like this, so you can plan around it together.',
  timing:
    'Ask when they can realistically do this — roughly how many minutes per session, how many times a week, and which part of the day suits them.',
  locationCalendar:
    'Ask whether a specific place, or fitting it around their calendar, matters for making this happen.',
  supportCircle:
    'Invite them to bring in a Buddy or a small Support Circle to back them on this Journey.',
};

/** Prefix marking a hidden coach steering-directive turn (not part of the visible dialogue). */
export const COACH_DIRECTIVE_PREFIX = '[coach-directive]';

/** Prefix marking a hidden extraction-directive turn appended after the user's real answer. */
export const EXTRACT_DIRECTIVE_PREFIX = '[extract]';

/** Build the hidden directive that focuses one extraction pass on a given target field. */
export function buildExtractDirective(focus: ExtractionField): string {
  return (
    `${EXTRACT_DIRECTIVE_PREFIX} From the user's latest message, extract any known goal fields as ` +
    `JSON per your instructions. Focus especially on: ${focus}. Include only fields the message ` +
    'clearly supports.'
  );
}

/** Build the hidden directive that steers the coach's next question toward a given target field. */
export function buildQuestionDirective(cue: string): string {
  return `${COACH_DIRECTIVE_PREFIX} ${cue}`;
}
