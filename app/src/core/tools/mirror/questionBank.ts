/**
 * Mirror Feedback — the approved question bank, and the rules a custom question has to pass.
 *
 * Built to `04_Product/PRD/Tools_Documentation/Mirror_Feedback_PRD.md` §6 and §7.
 *
 * **WHAT THE BANK IS FOR.** Every question here asks about BEHAVIOUR somebody witnessed, or about
 * the effect the person had. None of them asks a contributor to judge, diagnose, rank, or list
 * weaknesses — and that is the difference between a reflection and a performance review. A bank
 * exists at all because the alternative is a blank box, and a blank box in a tool where you are
 * asking your friends a question is how somebody accidentally asks something they cannot take back.
 *
 * **THE CUSTOM-QUESTION CHECK IS A GATE, NOT A SUGGESTION** (§7). It runs before a question can be
 * added, it explains what it found, and it NEVER rewrites silently — a question sent in somebody's
 * name has to be the question they wrote. The rule-based half is here and works offline; the PRD also
 * calls for an AI-assisted pass, which belongs on the server with the rest of the sensitive path.
 *
 * Pure TypeScript — no React, no i18n, no network. Copy lives under `mirror.bank.<id>`.
 */

export const QUESTION_CATEGORIES = ['moments', 'strengths', 'impact', 'growth'] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export interface BankQuestion {
  id: string;
  category: QuestionCategory;
  /** In the one-tap balanced set (§6): two behaviour, one strength, one impact, one growth. */
  recommended?: true;
}

/** The fifteen, in the PRD's order. Text is i18n; this file holds only the structure. */
export const QUESTION_BANK: readonly BankQuestion[] = [
  { id: 'atMyBest', category: 'moments', recommended: true },
  { id: 'handledDifficulty', category: 'moments' },
  { id: 'leftImpression', category: 'moments' },
  { id: 'helpedSomeone', category: 'moments', recommended: true },
  { id: 'mostNatural', category: 'moments' },
  { id: 'strengthStandsOut', category: 'strengths' },
  { id: 'qualityTrust', category: 'strengths' },
  { id: 'peopleAskFor', category: 'strengths' },
  { id: 'underestimate', category: 'strengths', recommended: true },
  { id: 'bringToGroup', category: 'strengths' },
  { id: 'positiveImpact', category: 'impact', recommended: true },
  { id: 'howIMakePeopleFeel', category: 'impact' },
  { id: 'whatPeopleGain', category: 'impact' },
  { id: 'useMoreOften', category: 'growth', recommended: true },
  { id: 'smallChange', category: 'growth' },
];

/** Exactly this many go out in a round. Not "up to" — the same five reach every contributor. */
export const QUESTIONS_PER_ROUND = 5;
/** A custom question, counted in what a person sees. */
export const CUSTOM_QUESTION_MAX_CHARS = 120;

export function questionsInCategory(category: QuestionCategory): BankQuestion[] {
  return QUESTION_BANK.filter((q) => q.category === category);
}

/** The balanced one-tap set. Exactly five, and it is a starting point they may replace. */
export function recommendedSet(): string[] {
  return QUESTION_BANK.filter((q) => q.recommended).map((q) => q.id);
}

// ── The custom-question gate ──────────────────────────────────────────────────────────────────

/** Why a custom question cannot be sent as written. Each one gets its own explanation on screen. */
export type QuestionProblem =
  /** Nothing, or only whitespace. */
  | 'empty'
  | 'tooLong'
  /** More than one question in the field. A contributor answers the first and drops the rest. */
  | 'multipleQuestions'
  /** It names somebody. In confidential mode that is an identity; in either it is a third party. */
  | 'namesSomeone'
  /** It asks for a judgement of a person rather than an account of something they did. */
  | 'asksForJudgement'
  /** It asks about a body, a diagnosis, or something intimate. Hard stop. */
  | 'sensitive';

export interface QuestionReview {
  ok: boolean;
  problems: QuestionProblem[];
  /** Problems that can never be sent, whatever the person does with the rest. */
  blocking: boolean;
}

/**
 * Words that turn a question into a verdict. Deliberately narrow and deliberately in both languages:
 * a list that tries to catch everything catches ordinary questions instead, and a gate people learn
 * to fight is a gate they route around.
 */
const JUDGEMENT = [
  'weakness', 'weaknesses', 'flaw', 'flaws', 'worst', 'fault', 'faults', 'annoying', 'dislike',
  'חולשה', 'חולשות', 'פגם', 'הכי גרוע', 'מעצבן', 'לא אוהב',
];

const SENSITIVE = [
  'diagnos', 'depress', 'anxiety', 'therapy', 'medication', 'weight', 'body', 'attractive', 'ugly',
  'salary', 'sex',
  'אבחנ', 'דיכאון', 'חרדה', 'טיפול פסיכולוגי', 'תרופ', 'משקל', 'הגוף', 'מכוער', 'משכורת',
];

/**
 * Review a custom question. Rule-based, offline, and conservative in what it BLOCKS: judgement and
 * sensitive content are hard stops, and everything else is something the person is told about and
 * can decide on.
 *
 * `namesSomeone` is a heuristic — a capitalised word that is not the first word — and it is
 * deliberately a WARNING rather than a block. A name in a question is usually a mistake and
 * occasionally the point ("what do I bring to a group"), and blocking on a guess would make the tool
 * argue with people about their own sentences.
 */
export function reviewCustomQuestion(text: string): QuestionReview {
  const clean = text.trim();
  const problems: QuestionProblem[] = [];

  if (clean.length === 0) return { ok: false, problems: ['empty'], blocking: true };
  if ([...clean].length > CUSTOM_QUESTION_MAX_CHARS) problems.push('tooLong');

  // Two question marks, or one that is not at the end, means two questions in one field.
  const marks = (clean.match(/[?？]/g) ?? []).length;
  if (marks > 1 || (marks === 1 && !clean.endsWith('?') && !clean.endsWith('？'))) {
    problems.push('multipleQuestions');
  }

  const lower = clean.toLocaleLowerCase();
  if (JUDGEMENT.some((w) => lower.includes(w))) problems.push('asksForJudgement');
  if (SENSITIVE.some((w) => lower.includes(w))) problems.push('sensitive');

  const words = clean.split(/\s+/);
  if (words.slice(1).some((w) => /^[A-Z][a-z]{2,}$/.test(w))) problems.push('namesSomeone');

  const blocking = problems.some((p) => p === 'asksForJudgement' || p === 'sensitive' || p === 'tooLong');
  return { ok: problems.length === 0, problems, blocking };
}
