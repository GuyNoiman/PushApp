/**
 * CoachOrchestrator tests — the UNDERSTANDING-based coach: the opening asks for the goal in free
 * text; ONE LLM "understanding" call distils the DISTINCT goals it contains (each with a domain and
 * a KIND — a simple `recurring` habit vs a staged `process`). When several goals are detected the
 * coach runs a FOCUS turn (the user picks ONE to build first; the rest are deferred); a single goal
 * goes straight to its expert's questions; no usable goal falls back to the demoted process-type
 * question. The chosen goal's type shapes the flow — a recurring habit skips the staging/milestones
 * question. Driven by a DETERMINISTIC {@link MockLlmClient} (no network). Coverage:
 *   • start() greets and asks for the goal (no mandatory process-type question up front).
 *   • a single-goal understanding routes to the right expert, sets processType from its kind, and
 *     surfaces the expert's first question — the understanding call is the ONLY LLM call.
 *   • a multi-goal understanding surfaces a numbered focus choice; picking one activates it (title,
 *     domain, processType) and defers the rest onto GoalSpec.deferredGoals.
 *   • a recurring goal skips the milestones/staging question; a process goal keeps it.
 *   • domain / kind validation falls back safely; no usable goal falls back to the process-type ask.
 *   • a closed pick records a string / string[] VALUE, an "Other" answer stores raw text — no LLM.
 *   • the interview closes with a feasibility note + Support-Circle recommendation.
 *   • every outbound coach message runs through the optional safety guard.
 */
import i18n from '@/i18n';

import { MockLlmClient } from '../../llm/LlmClient';
import {
  CoachOrchestrator,
  CoachUnavailableError,
  extractDomain,
  extractGoals,
} from '../CoachOrchestrator';
import { SafetyLayer } from '../SafetyLayer';

/** A mock understanding response carrying a SINGLE goal of the given domain + kind. */
function singleGoalMock(
  domain: string,
  kind: 'recurring' | 'process' = 'process',
  title = 'get fit',
): MockLlmClient {
  return new MockLlmClient((req) =>
    req.json ? JSON.stringify({ goals: [{ title, kind, domain }] }) : 'UNUSED',
  );
}

/** A mock understanding response carrying SEVERAL goals, verbatim. */
function multiGoalMock(
  goals: Array<{ title: string; kind: string; domain: string }>,
): MockLlmClient {
  return new MockLlmClient((req) => (req.json ? JSON.stringify({ goals }) : 'UNUSED'));
}

/**
 * Drive the FULL flow to completion: describe the goal (triage), then answer every remaining question
 * (expert + closing scheduling) by picking its first option.
 */
async function runToDone(orchestrator: CoachOrchestrator, goalText: string) {
  orchestrator.start();
  let turn = await orchestrator.triage(goalText);
  while (!turn.done) {
    turn = await orchestrator.selectOption(0);
  }
  return turn;
}

/** Describe the goal, then advance until the closing scheduling question. */
async function driveToScheduling(orchestrator: CoachOrchestrator, goalText = 'get fit') {
  orchestrator.start();
  let turn = await orchestrator.triage(goalText);
  while (turn.question && turn.question.id !== 'meta.scheduling') {
    turn = await orchestrator.selectOption(0);
  }
  return turn;
}

/** Collect the ids of the questions the coach asks, from `turn` up to (not incl.) scheduling. */
async function collectQuestionIds(orchestrator: CoachOrchestrator, goalText: string) {
  orchestrator.start();
  let turn = await orchestrator.triage(goalText);
  const ids: string[] = [];
  while (turn.question && turn.question.id !== 'meta.scheduling') {
    ids.push(turn.question.id);
    turn = await orchestrator.selectOption(0);
  }
  return ids;
}

describe('CoachOrchestrator — start / understanding', () => {
  it('greets and asks for the goal in free text (no mandatory process-type question)', () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('general') });

    const opening = orchestrator.start();

    // Nameless on purpose (2026-08-20): the opening used to greet the founder by name, which is
    // what every user then saw. A real name reaches the screen from the user's own profile.
    expect(opening.coachMessage).toBe('Hi, how can I help you today?');
    expect(opening.state.phase).toBe('goal');
    // The legacy A/B/C choices are still exposed for back-compat, but ignored by the flow.
    expect(opening.choices.map((c) => c.id)).toEqual(['A', 'B', 'C']);
    expect(opening.state.activeExpert).toBeUndefined();
  });

  it('requires start() before triage()', async () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('general') });
    await expect(orchestrator.triage('a goal')).rejects.toThrow();
  });

  it('throws if an answer arrives before start()', async () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('general') });
    await expect(orchestrator.selectOption(0)).rejects.toThrow();
  });
});

describe('CoachOrchestrator — single goal', () => {
  it('routes to the right expert, sets processType from kind, and surfaces the first question', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: singleGoalMock('body_image', 'process', 'run a 5K'),
    });
    orchestrator.start();

    const turn = await orchestrator.triage('I want to train for a 5K');

    expect(turn.state.spec.domain).toBe('body_image');
    expect(turn.activeExpert).toEqual({ id: 'body_image', displayName: 'Body Image' });
    expect(turn.state.spec.activeExpertDisplayName).toBe('Body Image');
    expect(turn.state.spec.processType).toBe('process');
    // The chosen goal's understood title becomes the spec title.
    expect(turn.state.spec.title).toBe('run a 5K');
    // The expert supplies the question's STRUCTURE (id/intent) but never speaks to the user: the
    // META-AGENT re-voices it in its own words (the `interview.<intent>` coachContent template),
    // so the surfaced prompt is the meta-agent's, not the expert's internal prose.
    expect(turn.question?.id).toBe('body_image.foundation');
    expect(turn.coachMessage).toBe(i18n.t('interview.foundation', { ns: 'coachContent' }));
    expect(turn.coachMessage).toBe(turn.question?.prompt);
    expect(turn.state.spec.deferredGoals).toBeUndefined();
  });

  it('understands exactly once — the understanding call is the only LLM call', async () => {
    const llm = singleGoalMock('career', 'process');
    const orchestrator = new CoachOrchestrator({ llm });
    orchestrator.start();

    await orchestrator.triage('I want a promotion');
    expect(llm.calls).toHaveLength(1);

    await orchestrator.selectOption(0);
    await orchestrator.selectOption(1);
    // Closed picks need no interpretation — still just the one understanding call.
    expect(llm.calls).toHaveLength(1);
  });

  it('degrades an unknown / hallucinated domain to the general expert', async () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('astrophysics', 'process') });
    orchestrator.start();

    const turn = await orchestrator.triage('help me with something odd');

    expect(turn.state.spec.domain).toBe('general');
    expect(turn.activeExpert?.displayName).toBe('General');
  });
});

describe('CoachOrchestrator — multi-goal focus', () => {
  const twoGoals = [
    { title: 'Drink protein every day', kind: 'recurring', domain: 'body_image' },
    { title: 'Pushups 100→500 per week', kind: 'process', domain: 'body_image' },
  ];

  it('surfaces a numbered focus choice that reflects each goal and its kind', async () => {
    const orchestrator = new CoachOrchestrator({ llm: multiGoalMock(twoGoals) });
    orchestrator.start();

    const focus = await orchestrator.triage(
      'i want to do 2 things: drink protein everyday and do pushups 100 to 500 per week',
    );

    expect(focus.state.phase).toBe('focus');
    expect(focus.done).toBe(false);
    expect(focus.question?.id).toBe('meta.focus');
    expect(focus.question?.options).toHaveLength(2);
    // Each option names the goal AND its kind in plain language.
    expect(focus.question?.options[0]).toContain('Drink protein every day');
    expect(focus.question?.options[0]).toContain('habit');
    expect(focus.question?.options[1]).toContain('Pushups 100→500 per week');
    expect(focus.question?.options[1]).toContain('step-by-step');
    // No expert is active yet — the user hasn't chosen.
    expect(focus.activeExpert).toBeUndefined();
  });

  it('activates the picked goal, defers the rest, and enters its expert questions', async () => {
    const llm = multiGoalMock(twoGoals);
    const orchestrator = new CoachOrchestrator({ llm });
    orchestrator.start();
    await orchestrator.triage('two things');

    // Pick the SECOND goal (the step-by-step pushups process).
    const afterPick = await orchestrator.selectOption(1);

    expect(afterPick.state.spec.title).toBe('Pushups 100→500 per week');
    expect(afterPick.state.spec.processType).toBe('process');
    expect(afterPick.state.spec.domain).toBe('body_image');
    // The other goal is kept on-device to build next, with its kind + domain understood.
    expect(afterPick.state.spec.deferredGoals).toEqual([
      { title: 'Drink protein every day', processType: 'recurring', domain: 'body_image' },
    ]);
    // We are now in the chosen goal's expert interview.
    expect(afterPick.state.phase).toBe('questions');
    expect(afterPick.activeExpert?.displayName).toBe('Body Image');
    expect(afterPick.question?.id).toBe('body_image.foundation');
    // Still only the one understanding call — the focus pick made none.
    expect(llm.calls).toHaveLength(1);
  });

  it('picking the recurring goal defers the process one and uses the lighter flow', async () => {
    const orchestrator = new CoachOrchestrator({ llm: multiGoalMock(twoGoals) });
    orchestrator.start();
    await orchestrator.triage('two things');

    const afterPick = await orchestrator.selectOption(0); // the recurring protein habit

    expect(afterPick.state.spec.title).toBe('Drink protein every day');
    expect(afterPick.state.spec.processType).toBe('recurring');
    expect(afterPick.state.spec.deferredGoals).toEqual([
      { title: 'Pushups 100→500 per week', processType: 'process', domain: 'body_image' },
    ]);
  });
});

describe('CoachOrchestrator — type drives the flow', () => {
  it('skips the milestones/staging question for a recurring habit', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: singleGoalMock('body_image', 'recurring', 'protein daily'),
    });

    const ids = await collectQuestionIds(orchestrator, 'drink protein every day');

    expect(ids).not.toContain('body_image.milestones');
    // The lighter flow still asks the foundational questions.
    expect(ids).toContain('body_image.foundation');
  });

  it('keeps the milestones/staging question for a staged process', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: singleGoalMock('body_image', 'process', 'run a 5K'),
    });

    const ids = await collectQuestionIds(orchestrator, 'train for a 5K');

    expect(ids).toContain('body_image.milestones');
  });
});

describe('CoachOrchestrator — fallback when nothing is understood', () => {
  it('falls back to the process-type question when no goal is detected', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: new MockLlmClient((req) => (req.json ? '{"goals":[]}' : 'x')),
    });
    orchestrator.start();

    const turn = await orchestrator.triage('uhh not sure');

    expect(turn.state.phase).toBe('processType');
    expect(turn.question?.id).toBe('meta.processType');
    expect(turn.state.spec.title).toBe('uhh not sure');
    expect(turn.state.spec.domain).toBe('general');

    // Answering it captures the shape and proceeds to the general expert's questions.
    const next = await orchestrator.selectOption(0); // "recurring"
    expect(next.state.spec.processType).toBe('recurring');
    expect(next.state.phase).toBe('questions');
    expect(next.activeExpert?.displayName).toBe('General');
  });

  /**
   * REPLACES an earlier test that asserted the OPPOSITE — that a throwing understanding call also
   * took the process-type fallback. That behaviour was the bug: an unreachable model and a model
   * that answered with nothing usable are different situations, and treating them the same is how a
   * person's own sentence became the title of a Journey they never asked for (partner, 2026-08-20).
   * The fallback above is still correct for its own case, which is why it is untouched.
   */
  it('REFUSES to fall back when the understanding call never reached a model', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: new MockLlmClient(() => {
        throw new Error('transport down');
      }),
    });
    orchestrator.start();

    // It rejects rather than answering with a Journey shaped out of the raw text. That the spec was
    // left untouched is asserted by the retry test below, where the SAME instance still starts a
    // clean interview afterwards.
    await expect(orchestrator.triage('something')).rejects.toBeInstanceOf(CoachUnavailableError);
  });

  it('stays retryable after an unreachable understanding call', async () => {
    let reachable = false;
    const orchestrator = new CoachOrchestrator({
      llm: new MockLlmClient(() => {
        if (!reachable) throw new Error('transport down');
        return JSON.stringify({ goals: [{ title: 'run a 5k', kind: 'process', domain: 'general' }] });
      }),
    });
    orchestrator.start();

    await expect(orchestrator.triage('I want to run a 5k')).rejects.toBeInstanceOf(
      CoachUnavailableError,
    );

    // The connection comes back and the SAME instance runs the same opening — the interview starts
    // properly, and the unanswered line was not left behind to be counted twice.
    reachable = true;
    const turn = await orchestrator.triage('I want to run a 5k');

    expect(turn.state.spec.title).toBe('run a 5k');
    expect(turn.state.history.filter((m) => m.role === 'user' && m.content === 'I want to run a 5k'))
      .toHaveLength(1);
  });
});

describe('CoachOrchestrator — expert interview', () => {
  it('records a multi-select question as a string[] of option VALUES (not indices)', async () => {
    const llm = singleGoalMock('body_image', 'process');
    const orchestrator = new CoachOrchestrator({ llm });
    orchestrator.start();
    const first = await orchestrator.triage('get fit');
    // body_image.foundation is the first question and is multi-select.
    expect(first.question?.id).toBe('body_image.foundation');
    expect(first.question?.multiSelect).toBe(true);

    const next = await orchestrator.selectOptions([0, 2]);

    const recorded = next.state.spec.answers?.['body_image.foundation'];
    expect(Array.isArray(recorded)).toBe(true);
    expect(recorded).toEqual([first.question!.options[0], first.question!.options[2]]);
    expect(llm.calls).toHaveLength(1); // no LLM for a closed pick
  });

  it('records a single-select question as a string VALUE', async () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('body_image', 'process') });
    orchestrator.start();
    await orchestrator.triage('get fit');
    // Advance past the multi-select foundation to the single-select baseline.
    const second = await orchestrator.selectOptions([0]);
    expect(second.question?.id).toBe('body_image.baseline');
    expect(second.question?.multiSelect).toBeFalsy();

    const third = await orchestrator.selectOption(1);

    const recorded = third.state.spec.answers?.['body_image.baseline'];
    expect(typeof recorded).toBe('string');
    expect(recorded).toBe(second.question!.options[1]);
  });

  it('stores an "Other" free-text answer as raw on-device signal (a string)', async () => {
    const llm = singleGoalMock('body_image', 'process');
    const orchestrator = new CoachOrchestrator({ llm });
    orchestrator.start();
    const first = await orchestrator.triage('get fit');

    const next = await orchestrator.answerOther('a very personal reason of my own');

    expect(llm.calls).toHaveLength(1); // "Other" is stored raw — no required LLM call
    expect(next.state.spec.answers?.[first.question!.id]).toBe('a very personal reason of my own');
  });

  it('closes with a feasibility note + Support-Circle recommendation and a completed GoalSpec', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: singleGoalMock('body_image', 'recurring', 'feel better'),
    });

    const done = await runToDone(orchestrator, 'I want to feel better in my body');

    expect(done.done).toBe(true);
    expect(done.state.phase).toBe('done');
    // Feasibility is an honest reality-check note produced by the expert.
    expect(done.goalSpec?.feasibility?.note.length ?? 0).toBeGreaterThan(0);
    expect(done.coachMessage).toContain(done.goalSpec!.feasibility!.note);
    // The closing recommends a Support Circle.
    expect(done.coachMessage).toContain('Support Circle');
    // The completed spec carries the understanding-derived fields.
    expect(done.goalSpec).toMatchObject({
      domain: 'body_image',
      activeExpertDisplayName: 'Body Image',
      processType: 'recurring',
    });
    expect(Object.keys(done.goalSpec!.answers ?? {})).toContain('body_image.baseline');
  });
});

describe('CoachOrchestrator — closing scheduling meta question', () => {
  it('leaves schedulingPreference empty when the user is flexible', async () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('body_image', 'process') });
    const scheduling = await driveToScheduling(orchestrator);
    expect(scheduling.question?.id).toBe('meta.scheduling');

    const done = await orchestrator.selectOption(0); // "No — I'm flexible"

    expect(done.done).toBe(true);
    expect(done.goalSpec?.schedulingPreference).toBeUndefined();
  });

  it('records a specific-days preference from an "Other" answer', async () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('body_image', 'process') });
    await driveToScheduling(orchestrator);

    const done = await orchestrator.answerOther('Tue/Thu evenings');

    expect(done.done).toBe(true);
    expect(done.goalSpec?.schedulingPreference).toBe('Tue/Thu evenings');
  });
});

describe('CoachOrchestrator — safety guard', () => {
  it('runs every outbound coach message through the guard', () => {
    const orchestrator = new CoachOrchestrator({
      llm: singleGoalMock('general'),
      guard: (text) => text.toUpperCase(),
    });

    const opening = orchestrator.start();

    expect(opening.coachMessage).toBe('HI, HOW CAN I HELP YOU TODAY?');
  });

  it('drives the whole flow cleanly with the SafetyLayer guard installed', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: singleGoalMock('body_image', 'process'),
      guard: new SafetyLayer().messageGuard(),
    });

    const done = await runToDone(orchestrator, 'I want to get fit');

    expect(done.done).toBe(true);
    expect(done.coachMessage.length).toBeGreaterThan(0);
  });
});

describe('extractGoals', () => {
  it('parses a multi-goal list with validated domain + kind', () => {
    const goals = extractGoals(
      JSON.stringify({
        goals: [
          { title: 'Protein daily', kind: 'recurring', domain: 'body_image' },
          { title: 'Land a new job', kind: 'process', domain: 'career' },
        ],
      }),
    );
    expect(goals).toEqual([
      { title: 'Protein daily', kind: 'recurring', domain: 'body_image' },
      { title: 'Land a new job', kind: 'process', domain: 'career' },
    ]);
  });

  it('degrades an unknown domain to general and an unknown kind to process', () => {
    const goals = extractGoals(
      '{"goals":[{"title":"Do a thing","kind":"weird","domain":"astrophysics"}]}',
    );
    expect(goals).toEqual([{ title: 'Do a thing', kind: 'process', domain: 'general' }]);
  });

  it('drops an entry with no usable title', () => {
    const goals = extractGoals('{"goals":[{"kind":"process","domain":"career"},{"title":"Keep"}]}');
    expect(goals).toEqual([{ title: 'Keep', kind: 'process', domain: 'general' }]);
  });

  it('returns an empty list for an unparseable answer or a missing goals array', () => {
    expect(extractGoals('no json here')).toEqual([]);
    expect(extractGoals('{"nope":1}')).toEqual([]);
    expect(extractGoals('{"goals": "not an array"}')).toEqual([]);
  });
});

describe('extractDomain', () => {
  it('reads a validated domain from a {"domain": …} object', () => {
    expect(extractDomain('{"domain":"career"}')).toBe('career');
  });

  it('tolerates a bare domain token in prose', () => {
    expect(extractDomain('This looks like relationships to me.')).toBe('relationships');
  });

  it('degrades an unrecognized domain to general', () => {
    expect(extractDomain('{"domain":"astrophysics"}')).toBe('general');
    expect(extractDomain('no idea')).toBe('general');
  });
});
