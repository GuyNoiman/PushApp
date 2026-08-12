/**
 * Onboarding answer model + config (K2, Onboarding_Questionnaire_PRD §6/§9). Covers the select limits,
 * single vs multi vs "Other" free-text behaviour, skip semantics, and the Coach-handoff deriver — the
 * pure logic the presentational flow relies on.
 */
import {
  allQuestionsSkipped,
  atSelectLimit,
  emptyOnboardingAnswers,
  markSkipped,
  selectedIds,
  setFreeText,
  toCoachSummary,
  toggleSelection,
} from '../answers';
import {
  ONBOARDING_QUESTION_COUNT,
  ONBOARDING_QUESTION_IDS,
  ONBOARDING_VERSION,
  isQuestionStep,
  questionById,
  questionNumber,
} from '../questions';

const q = (id: string) => questionById(id)!;

describe('onboarding config (PRD §6)', () => {
  it('exposes exactly six questions with the documented select limits', () => {
    expect(ONBOARDING_QUESTION_COUNT).toBe(6);
    expect(ONBOARDING_QUESTION_IDS).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6']);
    expect(q('q1').maxSelect).toBe(2); // up to two
    expect(q('q3').select).toBe('single');
    expect(q('q4').maxSelect).toBe(2);
    expect(q('q5').maxSelect).toBe(2);
    expect(q('q6').select).toBe('single');
    expect(q('q2').select).toBe('text');
  });

  it('marks the correct sections and the terminal "Other" option', () => {
    expect(q('q1').section).toBe('help');
    expect(q('q5').section).toBe('friction');
    expect(q('q6').section).toBe('friction');
    expect(q('q1').options.find((o) => o.isOther)?.id).toBe('other');
    expect(q('q3').options.find((o) => o.isOther)?.id).toBe('noneFits');
    // Q6 has no "Other" but an optional free-text add-on.
    expect(q('q6').options.some((o) => o.isOther)).toBe(false);
    expect(q('q6').freeText).toBe('optional');
  });

  it('numbers questions for progress and recognises question steps', () => {
    expect(isQuestionStep('q1')).toBe(true);
    expect(isQuestionStep('intro')).toBe(false);
    expect(questionNumber('q1')).toBe(1);
    expect(questionNumber('q6')).toBe(6);
    expect(questionNumber('completion')).toBe(0);
  });
});

describe('single-select (Q3/Q6)', () => {
  it('holds exactly one id and toggles off on re-tap', () => {
    let a = emptyOnboardingAnswers();
    a = toggleSelection(a, q('q3'), 'notStarted');
    expect(selectedIds(a, 'q3')).toEqual(['notStarted']);
    a = toggleSelection(a, q('q3'), 'noHowToBegin');
    expect(selectedIds(a, 'q3')).toEqual(['noHowToBegin']); // replaces, never accumulates
    a = toggleSelection(a, q('q3'), 'noHowToBegin');
    expect(selectedIds(a, 'q3')).toEqual([]); // re-tap clears
  });
});

describe('multi-select limit (PRD "select up to two")', () => {
  it('accepts up to two and ignores a third', () => {
    let a = emptyOnboardingAnswers();
    a = toggleSelection(a, q('q1'), 'health');
    a = toggleSelection(a, q('q1'), 'calm');
    expect(atSelectLimit(a, q('q1'))).toBe(true);
    const before = a;
    a = toggleSelection(a, q('q1'), 'work'); // third pick — ignored
    expect(a).toBe(before);
    expect(selectedIds(a, 'q1')).toEqual(['health', 'calm']);
  });

  it('deselecting frees a slot', () => {
    let a = emptyOnboardingAnswers();
    a = toggleSelection(a, q('q1'), 'health');
    a = toggleSelection(a, q('q1'), 'calm');
    a = toggleSelection(a, q('q1'), 'health'); // remove
    expect(selectedIds(a, 'q1')).toEqual(['calm']);
    a = toggleSelection(a, q('q1'), 'work'); // now allowed
    expect(selectedIds(a, 'q1')).toEqual(['calm', 'work']);
  });
});

describe('free text (Other + Q2 + Q6 add-on)', () => {
  it('trims and clears on empty; never translated (stored verbatim)', () => {
    let a = emptyOnboardingAnswers();
    a = setFreeText(a, 'q2', '  אני רוצה יותר אנרגיה  ');
    expect(a.freeText.q2).toBe('אני רוצה יותר אנרגיה');
    a = setFreeText(a, 'q2', '   ');
    expect(a.freeText.q2).toBeUndefined();
  });
});

describe('skip semantics (PRD §6/§8)', () => {
  it('skipping clears answers and is idempotent; answering un-skips', () => {
    let a = emptyOnboardingAnswers();
    a = toggleSelection(a, q('q1'), 'health');
    a = markSkipped(a, 'q1');
    expect(selectedIds(a, 'q1')).toEqual([]);
    expect(a.skipped).toEqual(['q1']);
    a = markSkipped(a, 'q1'); // idempotent
    expect(a.skipped).toEqual(['q1']);
    a = toggleSelection(a, q('q1'), 'calm'); // answering un-skips
    expect(a.skipped).toEqual([]);
  });

  it('keepFreeText preserves an optional disclosure on skip (Q6 constraints reach the Coach)', () => {
    let a = emptyOnboardingAnswers();
    a = setFreeText(a, 'q6', 'busy work weeks');
    a = markSkipped(a, 'q6', { keepFreeText: true });
    expect(a.skipped).toEqual(['q6']);
    expect(selectedIds(a, 'q6')).toEqual([]);
    expect(a.freeText.q6).toBe('busy work weeks');
    expect(toCoachSummary(a).capacityConstraints).toBe('busy work weeks');
  });

  it('allQuestionsSkipped detects a fully-skipped questionnaire (PRD §7)', () => {
    let a = emptyOnboardingAnswers();
    expect(allQuestionsSkipped(a, ONBOARDING_QUESTION_IDS)).toBe(false);
    for (const id of ONBOARDING_QUESTION_IDS) a = markSkipped(a, id);
    expect(allQuestionsSkipped(a, ONBOARDING_QUESTION_IDS)).toBe(true);
  });
});

describe('toCoachSummary (PRD §9 handoff)', () => {
  it('maps answers to the named, hypothesis-shaped summary with provenance', () => {
    let a = emptyOnboardingAnswers();
    a = toggleSelection(a, q('q1'), 'health');
    a = toggleSelection(a, q('q1'), 'calm');
    a = setFreeText(a, 'q2', 'more energy in the mornings');
    a = toggleSelection(a, q('q3'), 'triedInconsistent');
    a = toggleSelection(a, q('q4'), 'smallSteps');
    a = toggleSelection(a, q('q6'), 'fewMinutes');
    a = setFreeText(a, 'q6', 'busy work weeks');
    a = markSkipped(a, 'q5');

    const s = toCoachSummary(a);
    expect(s).toEqual({
      version: ONBOARDING_VERSION,
      areas: ['health', 'calm'],
      outcome: 'more energy in the mornings',
      startingPoint: 'triedInconsistent',
      help: ['smallSteps'],
      friction: [],
      capacity: 'fewMinutes',
      capacityConstraints: 'busy work weeks',
      skipped: ['q5'],
    });
  });

  it('produces an empty-but-valid summary when everything is skipped', () => {
    let a = emptyOnboardingAnswers();
    for (const id of ONBOARDING_QUESTION_IDS) a = markSkipped(a, id);
    const s = toCoachSummary(a);
    expect(s.areas).toEqual([]);
    expect(s.help).toEqual([]);
    expect(s.friction).toEqual([]);
    expect(s.outcome).toBeUndefined();
    expect(s.skipped).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6']);
  });
});
