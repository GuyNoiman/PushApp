/**
 * A MESSAGE THAT IS NOT A GOAL GETS AN ANSWER, NOT A CARD (founder's device test, 2026-09-17).
 *
 *   COACH:  What would you like to be a little different in your life right now?
 *   PERSON: Can I answer in Hebrew?
 *   COACH:  … What would you like to work on?  [habit] [process] [Other]
 *
 * "Can I answer in Hebrew?" is a question, so understanding read no goal from it, and the engine went
 * straight to the closed process-type card on turn one. That is the "closed questions too early" the
 * founder has raised again and again.
 *
 * What holds now, in both modes:
 *   1. the FIRST message with no goal is answered and the goal is invited again in free text: the
 *      composer stays open and there are no cards;
 *   2. only a SECOND message in a row with no goal gets the process-type card, which is what keeps
 *      the conversation reachable when understanding keeps failing, and it needs no model;
 *   3. a goal on the second message proceeds exactly as a goal on the first would have;
 *   4. the introduction still never touches an expert or the catalogue on that path.
 */
import i18n from '@/i18n';

import { MockLlmClient, type LlmRequest } from '../../llm/LlmClient';
import { CoachOrchestrator } from '../CoachOrchestrator';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

const NAME_CALL = 'the name a person wants to be called';
const PORTRAIT_CALL = 'a conversation whose only purpose is to understand';
const READING_CALL = 'You are the reading step';
const UNDERSTANDING_CALL = "coach's understanding step";

/**
 * A model whose understanding step reads the goals in `readings`, one per call, in order (the last
 * one repeats). Every other step answers nothing, and the composer answers with `compose`.
 */
function mock(
  readings: { title: string; kind: string; domain: string }[][],
  compose: (req: LlmRequest) => string = () => '',
): MockLlmClient {
  let understood = 0;
  return new MockLlmClient((req) => {
    const system = req.system ?? '';
    if (!req.json) return compose(req);
    if (system.includes(NAME_CALL)) return JSON.stringify({ name: 'Guy' });
    if (system.includes(PORTRAIT_CALL) || system.includes(READING_CALL)) return '{}';
    if (system.includes(UNDERSTANDING_CALL)) {
      const goals = readings[Math.min(understood, readings.length - 1)];
      understood += 1;
      return JSON.stringify({ goals });
    }
    return '{}';
  });
}

const NO_GOAL: { title: string; kind: string; domain: string }[] = [];
const A_GOAL = [{ title: 'sleep better', kind: 'process', domain: 'general' }];

describe('planning: the first message with no goal', () => {
  it('re-invites the goal in free text, with no cards', async () => {
    const orchestrator = new CoachOrchestrator({ llm: mock([NO_GOAL]) });
    orchestrator.start();

    const turn = await orchestrator.triage('Can I answer in Hebrew?');

    expect(turn.awaitingGoalText).toBe(true);
    expect(turn.question).toBeUndefined();
    expect(turn.done).toBe(false);
    expect(turn.state.phase).toBe('goal');
    expect(turn.coachMessage).toBe(i18n.t('goalReinvite', { ns: 'coachContent' }));
    // Nothing about a goal was set, because none was read.
    expect(turn.state.spec.title).toBe('');
    expect(turn.activeExpert).toBeUndefined();
  });

  it('hands the composer their words, so it can answer what they asked first', async () => {
    const llm = mock([NO_GOAL]);
    const orchestrator = new CoachOrchestrator({ llm });
    orchestrator.start();

    await orchestrator.triage('Can I answer in Hebrew?');

    const composed = llm.calls.filter((c) => !c.json);
    expect(composed).toHaveLength(1);
    expect(composed[0].messages[0].content).toContain('WHAT THEY JUST WROTE, word for word: Can I answer in Hebrew?');
    expect(composed[0].system).toContain('ANSWER IT FIRST');
  });

  it('shows the process-type card only when the SECOND message in a row holds no goal', async () => {
    const orchestrator = new CoachOrchestrator({ llm: mock([NO_GOAL, NO_GOAL]) });
    orchestrator.start();

    await orchestrator.triage('Can I answer in Hebrew?');
    const second = await orchestrator.triage('hmm');

    expect(second.awaitingGoalText).toBeFalsy();
    expect(second.question?.id).toBe('meta.processType');
    expect(second.state.phase).toBe('processType');
    expect(second.state.spec.title).toBe('hmm');
  });

  it('proceeds normally when the second message is a goal', async () => {
    const orchestrator = new CoachOrchestrator({ llm: mock([NO_GOAL, A_GOAL]) });
    orchestrator.start();

    await orchestrator.triage('Can I answer in Hebrew?');
    const second = await orchestrator.triage('I want to sleep better');

    expect(second.awaitingGoalText).toBeFalsy();
    expect(second.state.spec.title).toBe('sleep better');
    expect(second.state.phase).toBe('questions');
    expect(second.question?.id).not.toBe('meta.processType');
    expect(second.activeExpert?.id).toBe('general');
    // Both messages are in the history once each, with the re-invite between them.
    const users = second.state.history.filter((m) => m.role === 'user').map((m) => m.content);
    expect(users).toEqual(['Can I answer in Hebrew?', 'I want to sleep better']);
  });

  it('stays reachable with the composer down: the canned re-invite, then the card', async () => {
    const llm = mock([NO_GOAL, NO_GOAL], () => {
      throw new Error('transport down');
    });
    const orchestrator = new CoachOrchestrator({ llm });
    orchestrator.start();

    const first = await orchestrator.triage('Can I answer in Hebrew?');
    // Nothing it says claims a limitation. The canned line only invites the goal.
    expect(first.coachMessage).toBe(i18n.t('goalReinvite', { ns: 'coachContent' }));
    expect(first.coachMessage).not.toMatch(/only|cannot|can't|english/i);
    expect(first.awaitingGoalText).toBe(true);

    const second = await orchestrator.triage('still not sure');
    expect(second.question?.id).toBe('meta.processType');
    expect(second.coachMessage).not.toMatch(/only|cannot|can't|english/i);
  });
});

describe('introduction: the first message with no goal', () => {
  async function named(llm: MockLlmClient) {
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });
    orchestrator.start();
    await orchestrator.triage('Guy');
    return orchestrator;
  }

  it('re-invites in free text too, with no cards', async () => {
    const orchestrator = await named(mock([NO_GOAL]));

    const turn = await orchestrator.triage('Can I answer in Hebrew?');

    expect(turn.awaitingGoalText).toBe(true);
    expect(turn.question).toBeUndefined();
    expect(turn.state.phase).toBe('goal');
    expect(turn.activeExpert).toBeUndefined();
  });

  it('falls back to the card on the second miss, and the card leads to the Portrait, never the catalogue', async () => {
    const orchestrator = await named(mock([NO_GOAL, NO_GOAL]));

    await orchestrator.triage('Can I answer in Hebrew?');
    const card = await orchestrator.triage('hmm');
    expect(card.question?.id).toBe('meta.processType');

    const next = await orchestrator.selectOption(0);
    expect(next.state.phase).toBe('portrait');
    expect(next.state.spec.selectedJourneyDefinitionId).toBeUndefined();
    // No expert was loaded: the id is the triage classification, and the display name is the id.
    expect(next.activeExpert).toEqual({ id: 'general', displayName: 'general' });
    expect(next.question?.id ?? '').not.toMatch(/^(library|career)\./);
  });
});
