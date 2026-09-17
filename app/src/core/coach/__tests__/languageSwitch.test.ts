/**
 * THE COACH SPEAKS BOTH LANGUAGES, AND SAYS SO (founder's device test, 2026-09-17).
 *
 *   PERSON: Can I answer in Hebrew?
 *   COACH:  I can only communicate in English.
 *
 * False, and invented: nothing the model was told said what it can do, so it made up a limit. Two
 * things hold now:
 *   1. every prompt that writes words the person reads states the real capability, and forbids an
 *      invented "cannot";
 *   2. D101 decides the conversation's language from the opening, and the person can still change it:
 *      by writing in the other language, or by asking for it. A request is read by the call that
 *      already writes the turn (no new model call); the engine follows only when the turn came back
 *      in the language they asked for. Tapped cards never switch anything.
 */
import { MockLlmClient, type LlmRequest } from '../../llm/LlmClient';
import {
  CoachOrchestrator,
  dominantLocale,
  namedLocales,
  plainlyWrittenLocale,
} from '../CoachOrchestrator';
import { coachCharacter, languageCapability } from '../coachCharacter';
import { DREAM_SYSTEM_PROMPT } from '../coachPrompts';
import { composeCoachTurn } from '../composeTurn';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

const UNDERSTANDING_CALL = "coach's understanding step";
const HEBREW_TURN = 'כן, בטח. אפשר לכתוב לי בעברית. על מה היית רוצה לעבוד?';
const ENGLISH_TURN = 'Sure. What would you like to work on?';

/** The language the composer was told to write in, read from its system prompt. */
function toldToWriteIn(req: LlmRequest): string | undefined {
  return (req.system ?? '').match(/Write in this language and no other: (\w+)\./)?.[1];
}

/**
 * A composer that behaves as the prompt asks: it writes in the language it was told, EXCEPT when the
 * person's words (handed to it) ask for Hebrew — then it writes Hebrew. `obeys: false` is a composer
 * that ignores the request.
 */
function composer(obeys = true) {
  return (req: LlmRequest): string => {
    const context = req.messages[0]?.content ?? '';
    const asked = /WHAT THEY JUST WROTE, word for word: .*Hebrew/.test(context);
    if (obeys && asked) return HEBREW_TURN;
    return toldToWriteIn(req) === 'he' ? HEBREW_TURN : ENGLISH_TURN;
  };
}

function mock(
  readings: { title: string; kind: string; domain: string }[][],
  compose: (req: LlmRequest) => string = composer(),
): MockLlmClient {
  let understood = 0;
  return new MockLlmClient((req) => {
    if (!req.json) return compose(req);
    if ((req.system ?? '').includes(UNDERSTANDING_CALL)) {
      const goals = readings[Math.min(understood, readings.length - 1)];
      understood += 1;
      return JSON.stringify({ goals });
    }
    return '{}';
  });
}

const NO_GOAL: { title: string; kind: string; domain: string }[] = [];
const A_GOAL = [{ title: 'לישון טוב יותר', kind: 'process', domain: 'general' }];
const AN_ENGLISH_GOAL = [{ title: 'sleep better', kind: 'process', domain: 'general' }];

/** The locale each composer call was told to write in, in order. */
function composedLocales(llm: MockLlmClient): (string | undefined)[] {
  return llm.calls.filter((c) => !c.json).map(toldToWriteIn);
}

/** Answer the question on the table in words when it allows it, otherwise tap the first card. */
async function answer(orchestrator: CoachOrchestrator, turn: { question?: { allowOther?: boolean } }, words: string) {
  return turn.question?.allowOther ? orchestrator.answerOther(words) : orchestrator.selectOption(0);
}

describe('the capability is stated wherever the coach writes words the person reads', () => {
  it('the character says both languages, and forbids an invented limitation', () => {
    const character = coachCharacter();
    expect(character).toContain(languageCapability());
    expect(languageCapability()).toContain('English or Hebrew');
    expect(languageCapability()).toContain('say that you do not know');
    expect(languageCapability()).toContain('Never invent a "cannot"');
  });

  it('the composer prompt states it, and says yes to a request to switch', async () => {
    const llm = new MockLlmClient(() => 'ok');
    await composeCoachTurn(llm, { known: [], prompt: 'What would you like to work on?', reflectionsSoFar: 0, locale: 'en' });

    const system = llm.calls[0].system ?? '';
    expect(system).toContain('Hebrew');
    expect(system).toContain('English');
    expect(system).toContain(languageCapability());
    expect(system).toContain('asks to talk in another language you can hold this');
    expect(system).toContain('the answer is yes');
  });

  it('the Dream reply, which is read by the person, is told it too', () => {
    expect(DREAM_SYSTEM_PROMPT).toContain(languageCapability());
  });
});

describe('"Can I answer in Hebrew?" as the opening, in an English app', () => {
  it('shows no card, answers in Hebrew, and stays Hebrew after a Hebrew reply', async () => {
    const llm = mock([NO_GOAL, A_GOAL]);
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    const first = await orchestrator.triage('Can I answer in Hebrew?');
    expect(first.question).toBeUndefined();
    expect(first.awaitingGoalText).toBe(true);
    expect(first.coachMessage).toBe(HEBREW_TURN);
    expect(dominantLocale(first.coachMessage)).toBe('he');

    const second = await orchestrator.triage('אני רוצה לישון טוב יותר');
    expect(dominantLocale(second.coachMessage)).toBe('he');

    const third = await answer(orchestrator, second, 'בערך חמש שעות בלילה');
    expect(dominantLocale(third.coachMessage)).toBe('he');

    // The request was the English turn; everything the composer wrote after it was told Hebrew.
    expect(composedLocales(llm)).toEqual(['en', 'he', 'he']);

    // And no call was added to read the request: the same three messages, with an opening that asks
    // for nothing, make exactly as many model calls.
    const plain = mock([NO_GOAL, A_GOAL]);
    const baseline = new CoachOrchestrator({ llm: plain, locale: 'en' });
    baseline.start();
    await baseline.triage('I have a question first');
    const goal = await baseline.triage('אני רוצה לישון טוב יותר');
    await answer(baseline, goal, 'בערך חמש שעות בלילה');
    expect(llm.calls).toHaveLength(plain.calls.length);
  });

  it('a tapped card after the switch keeps the conversation Hebrew', async () => {
    const llm = mock([NO_GOAL, AN_ENGLISH_GOAL]);
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    await orchestrator.triage('Can I answer in Hebrew?');
    const goal = await orchestrator.triage('אני רוצה לישון טוב יותר');
    expect(goal.question).toBeDefined();
    // The card labels are English (the app language). Tapping one says nothing about how they write.
    const tapped = await orchestrator.selectOption(0);

    expect(dominantLocale(tapped.coachMessage)).toBe('he');
    expect(composedLocales(llm).slice(-1)).toEqual(['he']);
  });

  it('does not switch when the composer did not honour the request', async () => {
    const llm = mock([NO_GOAL, AN_ENGLISH_GOAL], composer(false));
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    const first = await orchestrator.triage('Can I answer in Hebrew?');
    expect(first.coachMessage).toBe(ENGLISH_TURN);
    await orchestrator.triage('I want to sleep better');

    expect(composedLocales(llm)).toEqual(['en', 'en']);
  });

  it('with the composer down after understanding, nothing claims English only and the card is still reachable', async () => {
    const llm = mock([NO_GOAL, NO_GOAL], () => {
      throw new Error('transport down');
    });
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    const first = await orchestrator.triage('Can I answer in Hebrew?');
    const second = await orchestrator.triage('Can I answer in Hebrew?');

    for (const turn of [first, second]) expect(turn.coachMessage).not.toMatch(/only|english/i);
    expect(second.question?.id).toBe('meta.processType');
  });
});

describe('writing in the other language mid-conversation', () => {
  it('switches an English conversation to Hebrew', async () => {
    const llm = mock([AN_ENGLISH_GOAL]);
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    const opening = await orchestrator.triage('I want to sleep better');
    expect(dominantLocale(opening.coachMessage)).toBe('en');
    expect(opening.question?.allowOther).toBe(true);

    const switched = await orchestrator.answerOther('אני ישן בערך חמש שעות בלילה');
    expect(dominantLocale(switched.coachMessage)).toBe('he');
    expect(composedLocales(llm)).toEqual(['en', 'he']);
  });

  it('does not swing a Hebrew conversation on English words inside an answer', async () => {
    const llm = mock([A_GOAL]);
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    let turn = await orchestrator.triage('אני רוצה לישון טוב יותר');
    turn = await answer(orchestrator, turn, 'Senior product manager');
    await answer(orchestrator, turn, 'Python');

    expect(composedLocales(llm).every((locale) => locale === 'he')).toBe(true);
  });

  it('a Hebrew conversation about learning English stays Hebrew', async () => {
    // Names English, but it is a goal and not a request: the composer writes Hebrew, so nothing moves.
    const llm = mock([[{ title: 'לשפר את האנגלית שלי', kind: 'process', domain: 'general' }]]);
    const orchestrator = new CoachOrchestrator({ llm, locale: 'en' });
    orchestrator.start();

    const turn = await orchestrator.triage('אני רוצה לשפר את האנגלית שלי');
    await answer(orchestrator, turn, 'אני מדבר אנגלית בעבודה כל יום');

    expect(composedLocales(llm)).toEqual(['he', 'he']);
  });
});

describe('reading the language of a message', () => {
  it('plainly Hebrew when Hebrew letters outnumber Latin ones', () => {
    expect(plainlyWrittenLocale('כן')).toBe('he');
    expect(plainlyWrittenLocale('אני עובד ב-Google כבר שנתיים')).toBe('he');
    expect(plainlyWrittenLocale('I work at בנק')).toBeUndefined();
  });

  it('plainly English only with no Hebrew and enough words to be a sentence', () => {
    expect(plainlyWrittenLocale('I sleep about five hours')).toBe('en');
    expect(plainlyWrittenLocale('Python')).toBeUndefined();
    expect(plainlyWrittenLocale('Senior product manager')).toBeUndefined();
    expect(plainlyWrittenLocale('123 :)')).toBeUndefined();
  });

  it('names a language in either language', () => {
    expect(namedLocales('Can I answer in Hebrew?')).toEqual(['he']);
    expect(namedLocales('אפשר באנגלית?')).toEqual(['en']);
    expect(namedLocales('אפשר לדבר עברית?')).toEqual(['he']);
    expect(namedLocales('I want to sleep better')).toEqual([]);
  });

  it('reads which script a composed turn is written in', () => {
    expect(dominantLocale(HEBREW_TURN)).toBe('he');
    expect(dominantLocale(ENGLISH_TURN)).toBe('en');
    expect(dominantLocale('...')).toBeUndefined();
  });
});
