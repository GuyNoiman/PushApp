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
  ONBOARDING_PAGER_STEPS,
  ONBOARDING_STEP_ORDER,
  ONBOARDING_VERSION,
  isQuestionStep,
  nextStep,
  prevStep,
  questionById,
  questionNumber,
  resolveResumeStep,
  stepPosition,
} from '../questions';

const q = (id: string) => questionById(id)!;

describe('onboarding config (PRD §6)', () => {
  it('exposes exactly nine questions with the documented select limits', () => {
    // Nine since 2026-08-18: Q7–Q9 (starting mode, structure, challenge) were added alongside D62,
    // because the matching layer had no way to separate two people who want the same thing and need
    // opposite plans.
    expect(ONBOARDING_QUESTION_COUNT).toBe(9);
    expect(ONBOARDING_QUESTION_IDS).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9']);
    expect(q('q1').maxSelect).toBe(2); // up to two
    expect(q('q3').select).toBe('single');
    expect(q('q4').maxSelect).toBe(2);
    expect(q('q5').maxSelect).toBe(2);
    expect(q('q6').select).toBe('single');
    expect(q('q2').select).toBe('text');
    // Q7–Q9 are single-select with no free text: they are ranking signals that must stay coarse
    // ids (G1), and a sentence typed here could not reach a plan anyway.
    for (const id of ['q7', 'q8', 'q9']) {
      expect(q(id).select).toBe('single');
      expect(q(id).freeText).toBeUndefined();
      expect(q(id).options.some((o) => o.isOther)).toBe(false);
    }
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
    // The third section: how this person likes to WORK, as opposed to what they want or what has
    // broken them before.
    expect(q('q7').section).toBe('approach');
    expect(q('q9').section).toBe('approach');
  });

  it('numbers questions for progress and recognises question steps', () => {
    expect(isQuestionStep('q1')).toBe(true);
    expect(isQuestionStep('intro')).toBe(false);
    expect(questionNumber('q1')).toBe(1);
    expect(questionNumber('q6')).toBe(6);
    expect(questionNumber('q9')).toBe(9);
    expect(questionNumber('completion')).toBe(0);
  });

  it("walks the founder's seven approved screens, behind the language choice", () => {
    // The approved design pack (2026-09-14) is the sequence now. It is pinned here rather than left
    // to whoever next edits the list, because the order is not decoration: the account sits between
    // the preparation and the conversation on purpose (D104), and the two screens after the
    // conversation exist so nobody is dropped at Home without being introduced to what was built.
    expect([...ONBOARDING_STEP_ORDER]).toEqual([
      'language',
      'welcome',
      'purpose',
      'prepare',
      'account',
      'conversation',
      'handoff',
      'firstJourney',
    ]);
    // The three-promise introduction, the acknowledgement (D98) and the profile page are gone from
    // the SEQUENCE. Their pages still exist; nothing walks into them from either direction.
    for (const retired of ['acknowledge', 'promise', 'personalization', 'supportIntro', 'intro', 'personalInfo'] as const) {
      expect(ONBOARDING_STEP_ORDER).not.toContain(retired);
    }
    expect(nextStep('welcome')).toBe('purpose');
    expect(nextStep('prepare')).toBe('account');
    expect(prevStep('account')).toBe('prepare');
    expect(nextStep('firstJourney')).toBe('firstJourney'); // terminal — the next screen is the app
    expect(prevStep('language')).toBe('language'); // the first screen; there is nothing behind it
  });

  it('puts the LANGUAGE before everything, and keeps it out of the seven dots', () => {
    // Founder, 2026-09-15, and the reasoning is what makes it non-negotiable: a person may not read
    // English at all, so an English welcome screen leaves them unable to understand the onboarding
    // well enough to go and find a language setting. The approved pack has no language screen; that
    // is a gap in the pack, not a decision to drop the feature.
    expect(ONBOARDING_STEP_ORDER[0]).toBe('language');
    // ...and the pager still reads as the seven approved screens. The language choice is the door,
    // not the first room.
    expect(ONBOARDING_PAGER_STEPS).toHaveLength(7);
    expect(ONBOARDING_PAGER_STEPS).not.toContain('language');
    expect(stepPosition('language')).toBe(0);
    expect(stepPosition('welcome')).toBe(1);
    expect(stepPosition('firstJourney')).toBe(7);
    // A retired page has no dot either — it is not one of the seven.
    expect(stepPosition('q4')).toBe(0);
  });

  it('puts the ACCOUNT before the conversation, with no way around it (D104)', () => {
    const order = [...ONBOARDING_STEP_ORDER];
    expect(order.indexOf('account')).toBeLessThan(order.indexOf('conversation'));
    // Back is the screen's one documented affordance; there is no third branch out of it.
    expect(prevStep('conversation')).toBe('account');
    // And nobody stranded by an older build is carried PAST it — they have no session, and D104
    // says the conversation does not start without one.
    for (const retired of ['q1', 'q9', 'intro', 'completion', 'personalInfo'] as const) {
      expect(order.indexOf(resolveResumeStep(retired))).toBeLessThanOrEqual(order.indexOf('account'));
    }
  });

  it('did not DELETE the nine questions — they are still configured and still reachable', () => {
    // Removing them from the first-run order removes them from the fixed sequence and nothing else.
    // They stay in the config so the few that matter can be asked contextually, when a chosen Journey
    // actually needs the axis, and they are still openable from the Tools tab.
    expect(ONBOARDING_QUESTION_IDS).toHaveLength(9);
    expect(isQuestionStep('q5')).toBe(true);
    expect(questionById('q5')).toBeDefined();
  });

  it('never strands a device on a screen the flow no longer has', () => {
    // People are mid-flow on the shipped build right now. A resume point the order no longer
    // contains would make `nextStep` return that same step forever — stuck on a page with no way
    // out. Each retired step lands on the screen that does its JOB now, not on a matching index.
    //
    // The three product-promise screens were folded into one screen about what the product is for.
    for (const promise of ['promise', 'personalization', 'supportIntro'] as const) {
      expect(resolveResumeStep(promise)).toBe('purpose');
    }
    // "The problem was never that you did not care enough" — the screen that named the difficulty
    // before anything was promised (D98). Its job is the welcome's kicker now.
    expect(resolveResumeStep('acknowledge')).toBe('welcome');
    // The old conversation-preparation screen IS the new one.
    expect(resolveResumeStep('intro')).toBe('prepare');
    // Everything that was a form or an ask lands on the preparation too: the next thing that should
    // happen to them is the conversation, and `prepare` is the last screen before the account gate
    // that now guards it. Their answers are kept either way — nothing is discarded.
    for (const retired of ['q1', 'q5', 'q9', 'completion', 'coachMemory', 'notifications', 'personalInfo'] as const) {
      expect(resolveResumeStep(retired)).toBe('prepare');
    }
    // A live step resumes exactly where it was — including the three that render elsewhere.
    for (const live of ['welcome', 'account', 'conversation', 'handoff', 'firstJourney'] as const) {
      expect(resolveResumeStep(live)).toBe(live);
    }
    // And a device with nothing persisted starts at the language, not at the welcome.
    expect(resolveResumeStep(undefined)).toBe('language');
    expect(resolveResumeStep('language')).toBe('language');
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
  it('stores exactly what was typed, and clears when it is blank', () => {
    let a = emptyOnboardingAnswers();
    a = setFreeText(a, 'q2', '  אני רוצה יותר אנרגיה  ');
    // VERBATIM, spaces included. This used to trim, and because it is called on every keystroke the
    // space bar stopped working: the trailing space was cut the moment it was typed and the next
    // letter landed against the previous word (founder, 2026-08-25 — "one long word").
    expect(a.freeText.q2).toBe('  אני רוצה יותר אנרגיה  ');
    a = setFreeText(a, 'q2', '   ');
    expect(a.freeText.q2).toBeUndefined();
  });

  it('lets somebody type a space at the end of a word without losing it', () => {
    // The bug, as a person actually meets it: type a word, a space, then the next word.
    let a = emptyOnboardingAnswers();
    for (const keystroke of ['I', 'I ', 'I w', 'I wa', 'I want']) {
      a = setFreeText(a, 'q2', keystroke);
    }
    expect(a.freeText.q2).toBe('I want');
  });

  it('hands the coach the tidied version — the trim happens at the boundary, once', () => {
    let a = emptyOnboardingAnswers();
    a = setFreeText(a, 'q2', '  more energy  ');
    expect(toCoachSummary(a).outcome).toBe('more energy');
  });

  it('drops a whitespace-only answer on the way to the coach', () => {
    const a = { ...emptyOnboardingAnswers(), freeText: { q2: '   ' } };
    expect(toCoachSummary(a).outcome).toBeUndefined();
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
    expect(s.skipped).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9']);
    expect(s.startingMode).toBeUndefined();
    expect(s.structure).toBeUndefined();
    expect(s.challenge).toBeUndefined();
  });
});
