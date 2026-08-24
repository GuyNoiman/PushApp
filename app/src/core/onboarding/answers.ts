/**
 * Onboarding answer logic (PRD §6/§9) — the pure, framework-free operations the flow container calls
 * to build {@link OnboardingAnswers} and the deriver the Coach-handoff seam uses. All functions are
 * immutable (return a new object; never mutate the input) so React state updates stay predictable and
 * every path is trivially unit-testable. No React, no persistence, no vendor imports.
 *
 * Select limits (PRD §6): single-select holds exactly one id; multi-select holds up to the question's
 * `maxSelect`. Answering a question clears any earlier "skipped" mark for it; skipping clears its
 * answers. Free text is trimmed and stored verbatim (never translated — PRD §3); empty clears it.
 */
import type { CoachOnboardingSummary, OnboardingAnswers, OnboardingQuestionId } from './model';
import { ONBOARDING_VERSION, type OnboardingQuestion } from './questions';

/** A fresh, empty answer set stamped with the current question-set version. */
export function emptyOnboardingAnswers(): OnboardingAnswers {
  return { version: ONBOARDING_VERSION, selections: {}, freeText: {}, skipped: [] };
}

/** The selected option ids for a question (never undefined). */
export function selectedIds(answers: OnboardingAnswers, id: OnboardingQuestionId): string[] {
  return answers.selections[id] ?? [];
}

/** Whether a multi-select question is at its selection limit (so further options are inert). */
export function atSelectLimit(answers: OnboardingAnswers, question: OnboardingQuestion): boolean {
  return selectedIds(answers, question.id).length >= question.maxSelect;
}

/** Remove `id` from the skipped list (answering un-skips). */
function unskip(skipped: OnboardingQuestionId[], id: OnboardingQuestionId): OnboardingQuestionId[] {
  return skipped.filter((s) => s !== id);
}

/**
 * Toggle an option for a question, honouring its select behaviour + limit (PRD §6):
 *  - single  → selecting sets exactly that id; selecting the same id again clears it;
 *  - multi   → toggles the id, but a NEW selection beyond `maxSelect` is ignored (returns unchanged).
 * Any selection change un-skips the question.
 */
export function toggleSelection(
  answers: OnboardingAnswers,
  question: OnboardingQuestion,
  optionId: string,
): OnboardingAnswers {
  const current = selectedIds(answers, question.id);
  let next: string[];
  if (question.select === 'single') {
    next = current[0] === optionId ? [] : [optionId];
  } else {
    if (current.includes(optionId)) {
      next = current.filter((x) => x !== optionId);
    } else if (current.length >= question.maxSelect) {
      return answers; // at the limit — ignore the extra pick (PRD "select up to two")
    } else {
      next = [...current, optionId];
    }
  }
  return {
    ...answers,
    selections: { ...answers.selections, [question.id]: next },
    skipped: unskip(answers.skipped, question.id),
  };
}

/**
 * Set (or clear) a question's free text. Blank removes the key; any non-blank text un-skips the
 * question (the user engaged with it). Free text is stored VERBATIM (PRD §3).
 *
 * ── WHY THIS DOES NOT TRIM (founder, 2026-08-25) ───────────────────────────────────────────────
 *
 * It used to, and it broke the space bar. This is called on EVERY KEYSTROKE, so trimming here meant
 * that the moment somebody typed a space at the end of a word it was cut off — and the next letter
 * landed against the previous word. Typing "I want to run" produced "Iwanttorun", and it looked like
 * the keyboard was broken rather than like the app was deleting the character.
 *
 * A trailing space is not something to clean up while somebody is still typing; it is the middle of
 * a word they have not finished. The trim belongs at the BOUNDARY instead, where the text is read
 * into something durable — {@link toCoachSummary} does it, once, on the way out.
 */
export function setFreeText(
  answers: OnboardingAnswers,
  id: OnboardingQuestionId,
  text: string,
): OnboardingAnswers {
  const freeText = { ...answers.freeText };
  if (text.trim().length === 0) {
    // Blank is blank whether it is empty or three spaces — the key goes, and nothing is stored.
    delete freeText[id];
    return { ...answers, freeText };
  }
  freeText[id] = text;
  return { ...answers, freeText, skipped: unskip(answers.skipped, id) };
}

/**
 * Mark a question skipped (PRD §6/§8): add it to `skipped` (deduped) and clear the selections it
 * held, so a skip is unambiguous in the Coach summary. Idempotent.
 *
 * `keepFreeText` preserves the question's free text (used for Q6, whose free text is an OPTIONAL
 * add-on disclosure — "anything the Coach should take into account": skipping the capacity CHOICE
 * must not discard a constraint the user typed, so it still reaches `capacityConstraints` — PRD §6/§9).
 */
export function markSkipped(
  answers: OnboardingAnswers,
  id: OnboardingQuestionId,
  opts?: { keepFreeText?: boolean },
): OnboardingAnswers {
  const selections = { ...answers.selections };
  const freeText = { ...answers.freeText };
  delete selections[id];
  if (!opts?.keepFreeText) delete freeText[id];
  const skipped = answers.skipped.includes(id) ? answers.skipped : [...answers.skipped, id];
  return { ...answers, selections, freeText, skipped };
}

/** Every stored free-text answer, edge-trimmed. Blank-after-trim entries are dropped entirely. */
function trimmedFreeText(
  freeText: OnboardingAnswers['freeText'],
): OnboardingAnswers['freeText'] {
  const out: OnboardingAnswers['freeText'] = {};
  for (const [id, value] of Object.entries(freeText)) {
    const trimmed = value?.trim();
    if (trimmed) out[id as OnboardingQuestionId] = trimmed;
  }
  return out;
}

/**
 * The minimal, named Coach-handoff summary (PRD §9). Maps the generic answer store onto the named
 * fields the first Coach conversation reads. Absent fields = skipped/unanswered; `skipped` + `version`
 * carry provenance. Nothing here is a conclusion or personality label — it seeds a grounded opening
 * question only. Pure: safe to rebuild any time an answer changes (PRD §10 "rebuild the summary").
 */
export function toCoachSummary(answers: OnboardingAnswers): CoachOnboardingSummary {
  const { selections } = answers;
  // THE TRIM LIVES HERE, at the boundary, and not on every keystroke — see {@link setFreeText} for
  // the space bar this broke. Whatever a person typed is stored exactly; what the coach reads is the
  // tidied version, and the tidying happens once, on the way out.
  const freeText = trimmedFreeText(answers.freeText);
  return {
    version: answers.version,
    areas: selections.q1 ?? [],
    ...(freeText.q1 ? { areasOther: freeText.q1 } : {}),
    ...(freeText.q2 ? { outcome: freeText.q2 } : {}),
    ...(selections.q3?.[0] ? { startingPoint: selections.q3[0] } : {}),
    ...(freeText.q3 ? { startingPointOther: freeText.q3 } : {}),
    help: selections.q4 ?? [],
    ...(freeText.q4 ? { helpOther: freeText.q4 } : {}),
    friction: selections.q5 ?? [],
    ...(freeText.q5 ? { frictionOther: freeText.q5 } : {}),
    ...(selections.q6?.[0] ? { capacity: selections.q6[0] } : {}),
    ...(freeText.q6 ? { capacityConstraints: freeText.q6 } : {}),
    // Q7–Q9 (D62): how this person likes to work. Single-select, so the one chosen id maps across;
    // "I'm not sure" maps across too, as an id that argues for nothing rather than as an absence.
    ...(selections.q7?.[0] ? { startingMode: selections.q7[0] } : {}),
    ...(selections.q8?.[0] ? { structure: selections.q8[0] } : {}),
    ...(selections.q9?.[0] ? { challenge: selections.q9[0] } : {}),
    skipped: [...answers.skipped],
  };
}

/** Whether every question was skipped (drives the "we can start here" completion copy — PRD §7). */
export function allQuestionsSkipped(
  answers: OnboardingAnswers,
  questionIds: readonly OnboardingQuestionId[],
): boolean {
  return questionIds.every((id) => answers.skipped.includes(id));
}
