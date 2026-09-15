/**
 * THE INTRODUCTION — the first conversation meets the person, and builds nothing (D105).
 *
 * ── WHAT WAS WRONG, IN TWO ROUNDS ──────────────────────────────────────────────────────────────
 *
 * ROUND ONE (founder, 2026-09-15, morning): the first run routed straight into the Journey-building
 * interview, so the introduction inherited the planner's slate. Three of those questions — `time`,
 * `horizon`, `scheduling` — are the D102 EXACT intents {@link ../readConversation} deliberately
 * refuses to strike off from ordinary language, so they were precisely the ones that survived every
 * reading and had to be asked. The last third of every first run was "how many minutes a week / how
 * long / which days". That is the questionnaire the founder felt when he tested the app.
 *
 * ROUND TWO (founder, same day, and it corrects the first fix):
 *
 *   > מומחה התחום רלוונטי רק לשלב בניית המסעות — לא לשלב שיחת ההיכרות ולא לאונבורדינג.
 *
 * Dropping the planning questions left the introduction still taking its four questions from
 * `expert.interviewQuestions()`. Those are a PLAN's questions, and they are a dependency on which
 * experts exist. The introduction now runs from the {@link ../portrait Portrait}: what a person is
 * worth knowing, asked in the order that is worth the most, ended when the picture is good enough.
 *
 * These tests hold what must be true of that conversation, and one thing that must not move:
 *
 *   1. it asks OPEN questions built from the Portrait's gaps, never a domain expert's list, and
 *      never the time / horizon / scheduling / milestones / variant axes;
 *   2. it BUILDS NOTHING: no `selectedJourneyDefinitionId`, and no `goalSpec` on the landing turn.
 *      That is load-bearing rather than tidy — dropping the planning questions while still building
 *      would hand the Planner its silent eight-week default with no capacity, which is the exact
 *      failure `horizonQuestion.ts` exists to end;
 *   3. it learns the person's NAME first, and only ever a name they actually typed;
 *   4. PLANNING MODE IS UNCHANGED. The Coach tab still asks the time, the horizon and the
 *      scheduling question, still runs the career diagnosis, and still ends with a GoalSpec.
 */
import { MockLlmClient } from '../../llm/LlmClient';
import { CoachOrchestrator, CONFIRM_QUESTION_ID } from '../CoachOrchestrator';
import { HORIZON_QUESTION_ID } from '../horizonQuestion';

/** The name reader's system prompt, recognised by a phrase no other prompt uses. */
const NAME_CALL = 'the name a person wants to be called';
/** The PORTRAIT reader — the introduction's own reading step. */
const PORTRAIT_CALL = 'a conversation whose only purpose is to understand';
/** The slate reader, which belongs to the planning interview. */
const READING_CALL = 'You are the reading step';

/**
 * A model that answers each of the coach's steps deterministically: a name, one goal, and nothing at
 * all from either reading step or the composer — so what is asserted is the engine's own decisions.
 */
function coachMock(
  overrides?: (system: string, json: boolean) => string | undefined,
): MockLlmClient {
  return new MockLlmClient((req) => {
    const system = req.system ?? '';
    const custom = overrides?.(system, Boolean(req.json));
    if (custom !== undefined) return custom;
    if (system.includes(NAME_CALL)) return JSON.stringify({ name: 'Guy' });
    if (system.includes(PORTRAIT_CALL)) return '{}';
    if (system.includes(READING_CALL)) return '{}';
    if (req.json) {
      return JSON.stringify({
        goals: [{ title: 'sleep better', kind: 'process', domain: 'general' }],
      });
    }
    return ''; // composeTurn treats an empty completion as "use the canned line"
  });
}

/** Walk the introduction from the greeting to the message that describes the goal. */
async function openIntroduction(orchestrator: CoachOrchestrator, name = 'Guy') {
  orchestrator.start();
  const named = await orchestrator.triage(name);
  return { named, first: await orchestrator.triage('I want to sleep better') };
}

/**
 * Answer in the person's own words until the understanding check is on the table, collecting what
 * was asked. Typing rather than tapping, because the Portrait has no cards to tap: it is built by
 * TALKING, which is the whole reason the first run's personal-details screen became a conversation.
 */
async function collectUntilCheck(
  orchestrator: CoachOrchestrator,
  from: { question?: { id: string; intent: string } },
  said = 'here is a bit more about it',
) {
  let turn = from as Awaited<ReturnType<CoachOrchestrator['answerOther']>>;
  const asked: { id: string; intent: string }[] = [];
  const phases: string[] = [turn.state.phase];
  while (turn.question && turn.question.id !== CONFIRM_QUESTION_ID) {
    asked.push({ id: turn.question.id, intent: turn.question.intent });
    turn = await orchestrator.answerOther(said);
    phases.push(turn.state.phase);
  }
  return { asked, phases, turn };
}

/** A mock whose understanding step returns whatever goal the test names. */
function goalMock(goal: Record<string, unknown>): MockLlmClient {
  return coachMock((system, json) =>
    json && !system.includes(NAME_CALL) && !system.includes(READING_CALL)
      ? JSON.stringify({ goals: [goal] })
      : undefined,
  );
}

/** Every question an introduction asks for one goal, in order. */
async function askedFor(goal: Record<string, unknown>) {
  const orchestrator = new CoachOrchestrator({ llm: goalMock(goal), mode: 'introduction' });
  const { first } = await openIntroduction(orchestrator);
  const { asked, phases, turn } = await collectUntilCheck(orchestrator, first);
  return { ids: asked.map((q) => q.id), phases, turn };
}

describe('the introduction asks what a PORTRAIT is missing, not what a plan needs', () => {
  it('asks open questions built from the Portrait, with no options to pick from', async () => {
    const orchestrator = new CoachOrchestrator({ llm: coachMock(), mode: 'introduction' });

    const { first } = await openIntroduction(orchestrator);
    const { asked } = await collectUntilCheck(orchestrator, first);

    expect(asked.length).toBeGreaterThan(0);
    for (const question of asked) {
      expect(question.id.startsWith('portrait.')).toBe(true);
    }
    const ids = asked.map((q) => q.id);
    expect(ids).not.toContain(HORIZON_QUESTION_ID);
    expect(ids).not.toContain('meta.scheduling');
    expect(ids).not.toContain('general.time');
    expect(ids).not.toContain('general.milestones');
  });

  /**
   * THE CORRECTION OF 2026-09-15, in one assertion. The expert is the thing the introduction may
   * not consult, so the strongest form of the test is that no expert question id can appear —
   * every expert's ids are domain-scoped (`general.baseline`, `career.foundation`), and every
   * Portrait question's id is not.
   */
  it('never asks a domain expert anything: every question it asks is a Portrait gap', async () => {
    const orchestrator = new CoachOrchestrator({ llm: coachMock(), mode: 'introduction' });

    const { first } = await openIntroduction(orchestrator);
    const { asked } = await collectUntilCheck(orchestrator, first);

    for (const question of asked) {
      expect(question.id).toMatch(/^portrait\./);
    }
  });

  it('goes from the last question to the understanding check, with no scheduling ask in between', async () => {
    const orchestrator = new CoachOrchestrator({ llm: coachMock(), mode: 'introduction' });

    const { first } = await openIntroduction(orchestrator);
    const { turn } = await collectUntilCheck(orchestrator, first);

    expect(turn.question?.id).toBe(CONFIRM_QUESTION_ID);
    expect(turn.state.phase).toBe('confirm');
  });

  it('builds nothing: no GoalSpec on the landing turn and no Journey selected', async () => {
    const orchestrator = new CoachOrchestrator({ llm: coachMock(), mode: 'introduction' });

    const { first } = await openIntroduction(orchestrator);
    const { turn } = await collectUntilCheck(orchestrator, first);
    const landed = await orchestrator.selectOption(0); // "Yes, exactly"

    expect(turn.question?.id).toBe(CONFIRM_QUESTION_ID);
    expect(landed.done).toBe(true);
    expect(landed.goalSpec).toBeUndefined();
    expect(landed.state.spec.selectedJourneyDefinitionId).toBeUndefined();
    expect(landed.coachMessage.length).toBeGreaterThan(0);
  });

  /**
   * THE FOUNDER'S OWN WORDS, 2026-09-15: the introduction gets to know the user INDEPENDENTLY of
   * which Journeys exist in the app.
   *
   * Career is the test case because it is the one domain with a full diagnosis tree and a shelf of
   * authored Journeys — so if the introduction is going to start matching anywhere, it is here. The
   * three phases that do the matching (`diagnosis`, `journeyFit`, `journeyChoice`) belong to the
   * SECOND conversation, and a person whose goal has no authored Journey at all must have an
   * introduction indistinguishable from anyone else's. Three of our four domains have almost none.
   */
  it('never enters diagnosis, journeyFit or journeyChoice — even for a career goal', async () => {
    const { phases, turn } = await askedFor({
      title: 'find a new job',
      kind: 'process',
      domain: 'career',
      careerSignals: { activeJobSearch: 'yes' },
    });

    expect(phases).not.toContain('diagnosis');
    expect(phases).not.toContain('journeyFit');
    expect(phases).not.toContain('journeyChoice');
    expect(turn.state.spec.selectedJourneyDefinitionId).toBeUndefined();
  });

  it('asks a catalogue-rich goal exactly what it asks a goal with no Journeys behind it', async () => {
    const career = await askedFor({
      title: 'find a new job',
      kind: 'process',
      domain: 'career',
      careerSignals: { activeJobSearch: 'yes' },
    });
    const general = await askedFor({ title: 'sleep better', kind: 'process', domain: 'general' });

    expect(career.ids).toEqual(general.ids);
    expect(career.ids.length).toBeGreaterThan(0);
  });
});

describe('the introduction learns the name, and only one the person typed', () => {
  it('asks what to call them first, and surfaces the name it read', async () => {
    const orchestrator = new CoachOrchestrator({ llm: coachMock(), mode: 'introduction' });

    const opening = orchestrator.start();
    const named = await orchestrator.triage('Guy');

    expect(opening.state.phase).toBe('name');
    expect(opening.coachMessage.length).toBeGreaterThan(0);
    expect(named.personalName).toBe('Guy');
    // The composer reopens: what follows is the broad opening, answered in their own words.
    expect(named.awaitingGoalText).toBe(true);
    expect(named.state.phase).toBe('goal');
  });

  it('reports nothing when the model returns a name they never wrote', async () => {
    const llm = coachMock((system) =>
      system.includes(NAME_CALL) ? JSON.stringify({ name: 'Alexandra' }) : undefined,
    );
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    orchestrator.start();
    const named = await orchestrator.triage('I would rather not say, thanks');

    expect(named.personalName).toBeUndefined();
    expect(named.awaitingGoalText).toBe(true);
  });

  it('still reads a one-word answer when the name call fails, and never re-asks', async () => {
    const llm = coachMock((system) => {
      if (system.includes(NAME_CALL)) throw new Error('no network');
      return undefined;
    });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    orchestrator.start();
    const named = await orchestrator.triage('Guy');

    // Not a guess: it is literally what they typed, and it is the only thing that could be.
    expect(named.personalName).toBe('Guy');
    expect(named.state.phase).toBe('goal');
  });

  it('moves on without a name when the call fails and the answer is a sentence', async () => {
    const llm = coachMock((system) => {
      if (system.includes(NAME_CALL)) throw new Error('no network');
      return undefined;
    });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    orchestrator.start();
    const named = await orchestrator.triage('you can call me whatever you like');

    expect(named.personalName).toBeUndefined();
    expect(named.state.phase).toBe('goal');
  });
});

describe('the introduction survives a model that is down', () => {
  /**
   * EVERY call fails except the one understanding call, which is the deliberate exception: a coach
   * that cannot reach a model does not start an interview it could only finish by guessing, and
   * raises {@link CoachUnavailableError} with a retry instead (2026-08-20). Everything else — the
   * name reader, the Portrait reader, the composer — must degrade to silence and let the
   * conversation walk, reach the check and land.
   *
   * It lands SOON, and that is the design rather than a shortfall: with nothing being understood,
   * two turns in a row add nothing and the conversation stops instead of asking a third question it
   * cannot read the answer to.
   */
  it('walks, reaches the check and lands with the model otherwise unreachable', async () => {
    const llm = new MockLlmClient((req) => {
      const system = req.system ?? '';
      const understanding =
        Boolean(req.json) &&
        !system.includes(NAME_CALL) &&
        !system.includes(PORTRAIT_CALL) &&
        !system.includes(READING_CALL);
      if (!understanding) throw new Error('the model is down');
      return JSON.stringify({ goals: [{ title: 'sleep better', kind: 'process', domain: 'general' }] });
    });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    const { first } = await openIntroduction(orchestrator);
    const { asked, turn } = await collectUntilCheck(orchestrator, first);
    const landed = await orchestrator.selectOption(0);

    // The authored fallback question was still a real question, asked in the person's language.
    expect(asked.length).toBeGreaterThan(0);
    expect(turn.question?.id).toBe(CONFIRM_QUESTION_ID);
    expect(landed.done).toBe(true);
    expect(landed.goalSpec).toBeUndefined();
    // The canned closing line, which is exactly what shipped before the composer existed.
    expect(landed.coachMessage.length).toBeGreaterThan(0);
    // NOTHING WAS UNDERSTOOD, so nothing is claimed. A Portrait invented by an unreachable model is
    // the one outcome worse than an empty one.
    expect(orchestrator.getPortrait()).toEqual({});
  });
});

describe('planning mode is exactly what it was', () => {
  it('still asks the time, horizon and scheduling questions and ends with a GoalSpec', async () => {
    // No `mode` at all — the default is what every caller had before the option existed.
    const orchestrator = new CoachOrchestrator({ llm: coachMock() });

    orchestrator.start();
    let turn = await orchestrator.triage('I want to sleep better');
    const asked: string[] = [];
    while (turn.question && turn.question.id !== CONFIRM_QUESTION_ID) {
      asked.push(turn.question.id);
      turn = await orchestrator.selectOption(0);
    }
    const built = await orchestrator.selectOption(0); // "Yes, exactly"

    expect(asked).toContain('general.time');
    expect(asked).toContain(HORIZON_QUESTION_ID);
    expect(asked).toContain('meta.scheduling');
    expect(built.done).toBe(true);
    expect(built.goalSpec).toBeDefined();
    expect(built.goalSpec?.title).toBe('sleep better');
  });

  it('never asks a Portrait question, and holds no Portrait at all', async () => {
    const orchestrator = new CoachOrchestrator({ llm: coachMock() });

    orchestrator.start();
    let turn = await orchestrator.triage('I want to sleep better');
    const asked: string[] = [];
    while (turn.question && turn.question.id !== CONFIRM_QUESTION_ID) {
      asked.push(turn.question.id);
      turn = await orchestrator.selectOption(0);
    }

    for (const id of asked) expect(id).not.toMatch(/^portrait\./);
    expect(orchestrator.getPortrait()).toEqual({});
    expect(turn.portrait).toBeUndefined();
  });

  it('still runs the career diagnosis, which the introduction skips', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: goalMock({
        title: 'find a new job',
        kind: 'process',
        domain: 'career',
        careerSignals: { activeJobSearch: 'yes' },
      }),
    });

    orchestrator.start();
    const turn = await orchestrator.triage('I apply and nobody answers');

    // The mirror image of the introduction's rule: matching is exactly where it always was.
    expect(turn.state.phase).toBe('diagnosis');
  });

  it('opens on the goal, not on a name', async () => {
    const orchestrator = new CoachOrchestrator({ llm: coachMock() });

    const opening = orchestrator.start();

    expect(opening.state.phase).toBe('goal');
    expect(orchestrator.isIntroduction()).toBe(false);
  });
});
