/**
 * A HEBREW CONVERSATION IN AN ENGLISH APP IS HEBREW, WHOLE TURNS AT A TIME (partner's device test,
 * 2026-09-17).
 *
 *   PERSON: הייתי יותר אחראי לניהול הזמן שלי ואחראי לסכום ההכנסה שלי
 *   COACH:  ליעם, you mentioned that if this changed, you'd be more responsible for your time and
 *           income. What do you feel is actually stopping you from making that career shift right now?
 *
 * He picked English on the first-run language step and talked to the coach in Hebrew. Two things
 * made that turn:
 *   1. the question handed to the composer was resolved in the APP language, so the model was given
 *      an English sentence to rephrase for a Hebrew conversation, and half-translated it;
 *   2. nothing checked the language of what came back.
 * What holds now: every line that feeds a coach turn is resolved in the CONVERSATION's language (the
 * cards stay in the app language, because a tap is matched against them), a composed turn that is
 * not wholly in that language is replaced by the canned line, the deliberate switch still works, and
 * the understanding call is told the conversation's language.
 */
import i18n from '@/i18n';

import { MockLlmClient, type LlmRequest } from '../../llm/LlmClient';
import {
  CoachOrchestrator,
  CONFIRM_QUESTION_ID,
  dominantLocale,
  turnIsWrittenIn,
} from '../CoachOrchestrator';
import { buildLocaleDirective } from '../coachPrompts';
import { drivePlanning, planningMock } from './planningConversation';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

const NAME_CALL = 'the name a person wants to be called';
const UNDERSTANDING_CALL = "coach's understanding step";

/** The partner's turn, word for word. */
const PARTNERS_MIXED_TURN =
  "ליעם, you mentioned that if this changed, you'd be more responsible for your time and income. What do you feel is actually stopping you from making that career shift right now?";
/** Mostly Hebrew by letter count, and still a whole English sentence inside it. */
const HEBREW_WITH_AN_ENGLISH_SENTENCE =
  'ליעם, שמעתי שאם זה היה משתנה היית לוקח יותר אחריות על הזמן ועל ההכנסה שלך, וזה נשמע לי חשוב מאוד. What is stopping you now?';
const ENGLISH_TURN = 'What do you feel is actually stopping you right now?';
/** A Hebrew turn with a Hebrew name and one English product word, which is ordinary. */
const HEBREW_WITH_A_NAME_AND_A_WORD = 'ליעם, ראיתי שכבר עדכנת את הפרופיל ב-LinkedIn. מה עוצר אותך עכשיו?';

/** A `coachContent` line as a Hebrew reader sees it. */
const he = (key: string): string => i18n.t(key, { ns: 'coachContent', lng: 'he' });

/** The canned Hebrew line for the question a turn carries: a Portrait gap, or the check. */
function cannedHebrew(question: { id: string } | undefined): string {
  if (question?.id === CONFIRM_QUESTION_ID) return he('understandingCheck.prompt');
  return he(`${question?.id}.prompt`);
}

/** THE QUESTION TO ASK, as each composer call was handed it. */
function questionsHanded(llm: MockLlmClient): string[] {
  return llm.calls
    .filter((c) => !c.json)
    .map((c) => c.messages[0]?.content.match(/THE QUESTION TO ASK: ([\s\S]*)$/)?.[1] ?? '')
    .filter((q) => q.length > 0);
}

/** An introduction whose reader understands nothing, and whose composer writes `compose`. */
function introductionMock(compose: (req: LlmRequest) => string = () => ''): MockLlmClient {
  return new MockLlmClient((req) => {
    const system = req.system ?? '';
    if (!req.json) return compose(req);
    if (system.includes(NAME_CALL)) return JSON.stringify({ name: 'ליעם' });
    if (system.includes(UNDERSTANDING_CALL)) {
      return JSON.stringify({ goals: [{ title: 'לעבור קריירה', kind: 'process', domain: 'career' }] });
    }
    return '{}';
  });
}

/** Name, opening, one answer — the partner's first three messages, in an ENGLISH app. */
async function partnersIntroduction(llm: MockLlmClient) {
  const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction', locale: 'en' });
  orchestrator.start();
  const named = await orchestrator.triage('ליעם');
  const opened = await orchestrator.triage('אני רוצה לעבור קריירה');
  const answered = await orchestrator.answerOther('הייתי יותר אחראי לניהול הזמן שלי ואחראי לסכום ההכנסה שלי');
  return { orchestrator, named, opened, answered };
}

describe('every line handed to the composer is in the conversation language', () => {
  it('the introduction, in an English app, hands the composer Hebrew', async () => {
    expect(i18n.language).toBe('en');
    const llm = introductionMock();
    const { named, opened, answered } = await partnersIntroduction(llm);

    const handed = questionsHanded(llm);
    expect(handed.length).toBeGreaterThanOrEqual(3);
    for (const question of handed) expect(turnIsWrittenIn(question, 'he')).toBe(true);

    // With the composer silent, the canned lines ARE the turns, and they are Hebrew too.
    expect(named.coachMessage).toBe(i18n.t('introduction.openingNamed', { ns: 'coachContent', lng: 'he', name: 'ליעם' }));
    expect(opened.coachMessage).toBe(cannedHebrew(opened.question));
    expect(answered.coachMessage).toBe(cannedHebrew(answered.question));
    for (const turn of [named, opened, answered]) expect(dominantLocale(turn.coachMessage)).toBe('he');
  });

  it('the understanding check and the introduction closing are Hebrew', async () => {
    const llm = introductionMock();
    const { orchestrator, answered } = await partnersIntroduction(llm);

    // The reader understands nothing, so the quiet-turn clause brings the check within a turn or two.
    let turn = answered;
    for (let i = 0; i < 4 && turn.question?.id !== CONFIRM_QUESTION_ID; i += 1) {
      turn = await orchestrator.answerOther('לא יודע');
    }
    expect(turn.question?.id).toBe(CONFIRM_QUESTION_ID);
    expect(turn.coachMessage).toBe(he('understandingCheck.prompt'));
    // The CARDS stay in the app language: a tap is matched against exactly these strings.
    expect(turn.question?.options).toEqual(i18n.t('understandingCheck.options', { ns: 'coachContent', returnObjects: true }));

    const landed = await orchestrator.selectOption(0);
    expect(landed.done).toBe(true);
    expect(landed.coachMessage).toBe(he('introduction.closing'));
  });

  it('the no-goal re-invite in planning is Hebrew', async () => {
    const llm = new MockLlmClient((req) => (req.json ? JSON.stringify({ goals: [] }) : ''));
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    const turn = await orchestrator.triage('אפשר שאלה קודם?');

    expect(turn.coachMessage).toBe(he('goalReinvite'));
    expect(questionsHanded(llm)).toEqual([he('goalReinvite')]);
  });

  it('a whole planning conversation, in Hebrew in an English app, hands the composer only Hebrew', async () => {
    const llm = planningMock({ compose: () => '' });
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    const { asked, last } = await drivePlanning(orchestrator, 'אני שולח קורות חיים כבר חודשים ואף אחד לא עונה');

    expect(asked[asked.length - 1]).toBe(CONFIRM_QUESTION_ID);
    expect(last.done).toBe(true);
    // Every turn up to and including the check. The LANDING turn is left out on purpose: it is the
    // expert's feasibility note, which is still resolved in the app language (a known gap).
    const handed = questionsHanded(llm).slice(0, -1);
    expect(handed.length).toBe(asked.length);
    for (const question of handed) expect(dominantLocale(question)).toBe('he');
  });
});

describe('a composed turn that is not wholly in the conversation language is not shown', () => {
  it('an English turn in a Hebrew conversation is replaced by the Hebrew canned line', async () => {
    const llm = introductionMock(() => ENGLISH_TURN);
    const { answered } = await partnersIntroduction(llm);

    expect(answered.coachMessage).not.toBe(ENGLISH_TURN);
    expect(answered.coachMessage).toBe(cannedHebrew(answered.question));
    // The history holds what was shown, so the next composer never reads the English turn back.
    expect(answered.state.history.some((m) => m.content === ENGLISH_TURN)).toBe(false);
  });

  it("the partner's half-and-half turn is replaced", async () => {
    const llm = introductionMock(() => PARTNERS_MIXED_TURN);
    const { named, opened, answered } = await partnersIntroduction(llm);

    for (const turn of [named, opened, answered]) {
      expect(turn.coachMessage).not.toBe(PARTNERS_MIXED_TURN);
      expect(dominantLocale(turn.coachMessage)).toBe('he');
    }
  });

  it('a mostly Hebrew turn with a whole English sentence inside it is replaced', async () => {
    expect(dominantLocale(HEBREW_WITH_AN_ENGLISH_SENTENCE)).toBe('he');
    const llm = introductionMock(() => HEBREW_WITH_AN_ENGLISH_SENTENCE);
    const { answered } = await partnersIntroduction(llm);

    expect(answered.coachMessage).not.toBe(HEBREW_WITH_AN_ENGLISH_SENTENCE);
  });

  it('a Hebrew turn with a Hebrew name and one English word is shown as written', async () => {
    const llm = introductionMock(() => HEBREW_WITH_A_NAME_AND_A_WORD);
    const { answered } = await partnersIntroduction(llm);

    expect(answered.coachMessage).toBe(HEBREW_WITH_A_NAME_AND_A_WORD);
  });

  it('adds no model call', async () => {
    const rejected = introductionMock(() => PARTNERS_MIXED_TURN);
    const accepted = introductionMock(() => HEBREW_WITH_A_NAME_AND_A_WORD);
    await partnersIntroduction(rejected);
    await partnersIntroduction(accepted);

    expect(rejected.calls).toHaveLength(accepted.calls.length);
  });
});

describe('the deliberate switch still switches', () => {
  /** Planning, in an ENGLISH app, opened in Hebrew; the composer writes whatever `compose` says. */
  async function hebrewConversationAsking(compose: (req: LlmRequest) => string) {
    const llm = new MockLlmClient((req) =>
      req.json
        ? JSON.stringify({ goals: [{ title: 'לישון טוב יותר', kind: 'process', domain: 'general' }] })
        : compose(req),
    );
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();
    const opened = await orchestrator.triage('אני רוצה לישון טוב יותר');
    const asked = await orchestrator.answerOther('אפשר להמשיך באנגלית?');
    const next = await orchestrator.selectOption(0).catch(() => orchestrator.answerOther('ok'));
    return { llm, opened, asked, next };
  }

  /** The language each composer call was told to write in, in order. */
  const toldToWriteIn = (llm: MockLlmClient) =>
    llm.calls.filter((c) => !c.json).map((c) => (c.system ?? '').match(/Write in this language and no other: (\w+)\./)?.[1]);

  it('asked for English in words, and answered in English, the conversation follows', async () => {
    const { llm, asked } = await hebrewConversationAsking((req) => {
      if (/WHAT THEY JUST WROTE, word for word: .*אנגלית/.test(req.messages[0]?.content ?? '')) return ENGLISH_TURN;
      return (req.system ?? '').includes('no other: he.') ? HEBREW_WITH_A_NAME_AND_A_WORD : ENGLISH_TURN;
    });

    expect(asked.coachMessage).toBe(ENGLISH_TURN);
    expect(toldToWriteIn(llm)).toEqual(['he', 'he', 'en']);
  });

  it('asked for English, but answered half and half, nothing switches and the Hebrew line is shown', async () => {
    // English by count, with a whole Hebrew sentence in it: not wholly English, and not Hebrew.
    const halfAndHalf = 'Sure, we can switch to English from here. אבל קודם ספר לי מה עוצר אותך?';
    const { llm, asked } = await hebrewConversationAsking((req) =>
      /WHAT THEY JUST WROTE, word for word: .*אנגלית/.test(req.messages[0]?.content ?? '')
        ? halfAndHalf
        : HEBREW_WITH_A_NAME_AND_A_WORD,
    );

    expect(asked.coachMessage).not.toBe(halfAndHalf);
    expect(dominantLocale(asked.coachMessage)).toBe('he');
    expect(toldToWriteIn(llm)).toEqual(['he', 'he', 'he']);
  });
});

describe('reading whether a turn is written in a language', () => {
  it('holds Hebrew with a name, a product, or a short title in it', () => {
    expect(turnIsWrittenIn(HEBREW_WITH_A_NAME_AND_A_WORD, 'he')).toBe(true);
    expect(turnIsWrittenIn('אתה עובד כ-Senior product manager כבר שנתיים?', 'he')).toBe(true);
    expect(turnIsWrittenIn('ספר לי עוד על Google Cloud.', 'he')).toBe(true);
  });

  it('rejects the wrong language, and a whole sentence of the other one', () => {
    expect(turnIsWrittenIn(ENGLISH_TURN, 'he')).toBe(false);
    expect(turnIsWrittenIn(PARTNERS_MIXED_TURN, 'he')).toBe(false);
    expect(turnIsWrittenIn(HEBREW_WITH_AN_ENGLISH_SENTENCE, 'he')).toBe(false);
    expect(turnIsWrittenIn('...', 'he')).toBe(false);
  });

  it('an English turn that only NAMES somebody in Hebrew is English', () => {
    expect(turnIsWrittenIn(PARTNERS_MIXED_TURN, 'en')).toBe(true);
  });

  it('is symmetric for English', () => {
    expect(turnIsWrittenIn(ENGLISH_TURN, 'en')).toBe(true);
    expect(turnIsWrittenIn('Liam — or ליעם — what is stopping you right now?', 'en')).toBe(true);
    expect(turnIsWrittenIn('What is stopping you? אני לא בטוח שהבנתי אותך נכון', 'en')).toBe(false);
  });

  it('does not judge a language the product does not ship', () => {
    expect(turnIsWrittenIn(ENGLISH_TURN, 'fr')).toBe(true);
  });
});

describe('the understanding call is told the conversation language', () => {
  it('a Hebrew opening in an English app is read as Hebrew', async () => {
    const llm = new MockLlmClient((req) =>
      req.json ? JSON.stringify({ goals: [{ title: 'לישון טוב יותר', kind: 'process', domain: 'general' }] }) : '',
    );
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    await orchestrator.triage('אני רוצה לישון טוב יותר');

    const understanding = llm.calls.find((c) => (c.system ?? '').includes(UNDERSTANDING_CALL));
    expect(understanding?.system).toContain(buildLocaleDirective('he'));
  });

  it('an English opening in a Hebrew app is read as English', async () => {
    const llm = new MockLlmClient((req) =>
      req.json ? JSON.stringify({ goals: [{ title: 'sleep better', kind: 'process', domain: 'general' }] }) : '',
    );
    const orchestrator = new CoachOrchestrator({ llm, locale: 'he' });
    orchestrator.start();

    await orchestrator.triage('I want to sleep better');

    const understanding = llm.calls.find((c) => (c.system ?? '').includes(UNDERSTANDING_CALL));
    expect(understanding?.system).not.toContain(buildLocaleDirective('he'));
  });
});
