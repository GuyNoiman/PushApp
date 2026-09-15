/**
 * THE INTRODUCTION RUNS FROM THE PORTRAIT (דיוקן).
 *
 * The conversation used to end when a list of questions ran out. It now ends when the picture of the
 * person is good enough — and, more importantly, it never asks for something they have already said.
 * These tests hold the behaviours that only exist once the two are joined up:
 *
 *   1. A RICH OPENING ENDS IT ALMOST AT ONCE. Somebody who writes a paragraph about themselves has
 *      answered four questions before any were asked, and asking them anyway is the questionnaire
 *      the founder felt on 2026-09-15.
 *   2. THE CHECK IS COMPOSED FROM THE PORTRAIT. What the engine believes is exactly what the person
 *      reads back, which is what makes a mis-extraction visible and correctable instead of a silent
 *      belief that shapes everything after it. This is the most valuable safety property here.
 *   3. A CORRECTION REBUILDS IT. "I want to clarify" drops the picture and reads the whole
 *      conversation again — the same promise the planning interview already keeps.
 *   4. THE ENGINE KEEPS THE VETO over what the reader suggests asking next.
 *   5. THE BUDGET CHANGES NOTHING about what is understood (D103).
 */
import { MeteringLlmClient } from '../../llm/MeteringLlmClient';
import { MockLlmClient, type LlmRequest } from '../../llm/LlmClient';
import { DEFAULT_BUDGET, EMPTY_BUDGET, spend, zoneOf, type BudgetState } from '../../llm/conversationBudget';
import { CoachOrchestrator, CONFIRM_QUESTION_ID } from '../CoachOrchestrator';

const NAME_CALL = 'the name a person wants to be called';
const PORTRAIT_CALL = 'a conversation whose only purpose is to understand';

/** Which of the coach's steps a request belongs to. */
function stepOf(req: LlmRequest): 'name' | 'portrait' | 'understanding' | 'compose' {
  const system = req.system ?? '';
  if (system.includes(NAME_CALL)) return 'name';
  if (system.includes(PORTRAIT_CALL)) return 'portrait';
  return req.json ? 'understanding' : 'compose';
}

/** Everything §22 calls enough, as one reading — the shape a rich opening message produces. */
const A_WHOLE_PERSON = {
  fields: {
    primaryWant: { value: 'leave marketing for something else', confidence: 'high', source: 'stated' },
    domain: { value: 'career', confidence: 'high', source: 'inferred' },
    currentState: {
      value: 'eight years in marketing and burned out',
      confidence: 'high',
      source: 'stated',
    },
    desiredOutcome: { value: 'a direction I actually want', confidence: 'medium', source: 'inferred' },
    stage: { value: 'explore', confidence: 'high', source: 'inferred' },
    bottleneck: { value: 'lack_of_clarity', confidence: 'high', source: 'inferred' },
  },
};

/**
 * A model that answers each step with whatever the test scripts. The Portrait reader returns `{}` by
 * default — understanding nothing — so a test that does not care about the reading gets the
 * offline-shaped conversation rather than an invented person.
 */
function coachMock(script: Partial<Record<ReturnType<typeof stepOf>, () => string>> = {}) {
  const defaults: Record<ReturnType<typeof stepOf>, () => string> = {
    name: () => JSON.stringify({ name: 'Guy' }),
    portrait: () => '{}',
    understanding: () =>
      JSON.stringify({ goals: [{ title: 'leave marketing', kind: 'process', domain: 'career' }] }),
    compose: () => '',
  };
  return new MockLlmClient((req) => (script[stepOf(req)] ?? defaults[stepOf(req)])());
}

/** Open the introduction: the name, then the message that says what they came for. */
async function open(orchestrator: CoachOrchestrator, opening = 'I have had enough of marketing') {
  orchestrator.start();
  await orchestrator.triage('Guy');
  return orchestrator.triage(opening);
}

describe('somebody who tells us everything is not then interviewed', () => {
  it('goes straight from a rich opening message to the check, with no question in between', async () => {
    const llm = coachMock({ portrait: () => JSON.stringify(A_WHOLE_PERSON) });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    const turn = await open(
      orchestrator,
      'I have been in marketing eight years, I am burned out, and I have no idea what else',
    );

    expect(turn.question?.id).toBe(CONFIRM_QUESTION_ID);
    expect(turn.state.phase).toBe('confirm');
    expect(orchestrator.getPortrait().primaryWant?.value).toBe('leave marketing for something else');
    expect(orchestrator.getPortrait().bottleneck?.value).toBe('lack_of_clarity');
  });

  it('asks for what is still missing, and never for what it already has', async () => {
    // Everything except the bottleneck, which is therefore the one thing worth asking about.
    const partial = {
      fields: { ...A_WHOLE_PERSON.fields, bottleneck: undefined },
    };
    const llm = coachMock({ portrait: () => JSON.stringify(partial) });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    const turn = await open(orchestrator);

    expect(turn.question?.id).toBe('portrait.bottleneck');
    // Free text, because the Portrait is built by talking rather than by picking from cards.
    expect(turn.question?.options).toEqual([]);
    expect(turn.question?.allowOther).toBe(true);
  });

  it('keeps the veto over what the reader suggests opening next', async () => {
    const llm = coachMock({
      // `readiness` is weight zero: listened for, never asked. The engine overrules the suggestion.
      portrait: () => JSON.stringify({ fields: {}, next: 'readiness' }),
    });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    const turn = await open(orchestrator);

    expect(turn.question?.id).toBe('portrait.primaryWant');
  });
});

describe('the understanding check says what the engine actually believes', () => {
  /** What the composer was handed on the turn that asked the check. */
  async function composerContextAtCheck(llm: MockLlmClient, orchestrator: CoachOrchestrator) {
    const turn = await open(
      orchestrator,
      'I have been in marketing eight years, I am burned out, and I have no idea what else',
    );
    expect(turn.question?.id).toBe(CONFIRM_QUESTION_ID);
    const composed = llm.calls.filter((req) => stepOf(req) === 'compose');
    return composed[composed.length - 1].messages[0].content;
  }

  it('hands the composer the Portrait, in the person’s own words', async () => {
    const llm = coachMock({ portrait: () => JSON.stringify(A_WHOLE_PERSON) });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    const context = await composerContextAtCheck(llm, orchestrator);

    expect(context).toContain('eight years in marketing and burned out');
    expect(context).toContain('leave marketing for something else');
  });

  it('describes a coarse field by its MEANING, never by its token', async () => {
    const llm = coachMock({ portrait: () => JSON.stringify(A_WHOLE_PERSON) });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    const context = await composerContextAtCheck(llm, orchestrator);

    // `lack_of_clarity` is a database value; this is the sentence a person can recognise or reject.
    expect(context).toContain('they do not know what they want or where to aim');
    expect(context).not.toContain('lack_of_clarity');
  });

  it('marks what was inferred, so the coach offers it instead of asserting it', async () => {
    const llm = coachMock({ portrait: () => JSON.stringify(A_WHOLE_PERSON) });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    const context = await composerContextAtCheck(llm, orchestrator);

    expect(context).toContain('they told you this'); // the stated current state
    expect(context).toContain('YOUR READING'); // the inferred bottleneck
  });

  it('says nothing about a field held only at low confidence', async () => {
    const llm = coachMock({
      portrait: () =>
        JSON.stringify({
          fields: {
            ...A_WHOLE_PERSON.fields,
            previousAttempts: {
              value: 'applied to two jobs last year',
              confidence: 'low',
              source: 'inferred',
            },
          },
        }),
    });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    const context = await composerContextAtCheck(llm, orchestrator);

    expect(context).not.toContain('applied to two jobs last year');
  });
});

describe('a correction rebuilds the Portrait rather than being acknowledged', () => {
  it('drops what it believed and keeps only what the new reading finds', async () => {
    let reading = JSON.stringify(A_WHOLE_PERSON);
    const llm = coachMock({ portrait: () => reading });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    await open(orchestrator, 'I have been in marketing eight years and I am burned out');
    expect(orchestrator.getPortrait().primaryWant?.value).toBe('leave marketing for something else');

    // What they meant was something else entirely, and the re-read now sees the correction.
    reading = JSON.stringify({
      fields: {
        primaryWant: {
          value: 'stay in marketing and lead a team',
          confidence: 'high',
          source: 'stated',
        },
      },
    });
    const after = await orchestrator.answerOther('no, I do not want to leave, I want to lead a team');

    expect(after.done).toBe(false);
    expect(orchestrator.getPortrait().primaryWant?.value).toBe('stay in marketing and lead a team');
    // Everything the old picture held is gone rather than sitting underneath the correction.
    expect(orchestrator.getPortrait().bottleneck).toBeUndefined();
  });

  it('puts the picture back when the re-read cannot run, instead of starting over', async () => {
    let up = true;
    const llm = coachMock({
      portrait: () => {
        if (!up) throw new Error('no network');
        return JSON.stringify(A_WHOLE_PERSON);
      },
    });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    await open(orchestrator, 'I have been in marketing eight years and I am burned out');
    up = false;
    const after = await orchestrator.answerOther('the burned-out part is not really it');

    // Re-meeting somebody who has already told us everything is a worse failure than one stale
    // picture they can fail a second time.
    expect(after.question?.id).toBe(CONFIRM_QUESTION_ID);
    expect(orchestrator.getPortrait().primaryWant?.value).toBe('leave marketing for something else');
  });
});

/**
 * D103. The budget decides how the coach ASKS — open text or closed cards — and never how much it
 * needs to understand. A conversation that ends sooner because tokens were expensive would produce a
 * thinner picture of a person for no reason they could ever see.
 */
describe('the budget changes nothing about what is understood', () => {
  async function walk(startingAt: BudgetState) {
    let budget = startingAt;
    const inner = coachMock({ portrait: () => JSON.stringify({ fields: {} }) });
    const llm = new MeteringLlmClient(inner, (tokens) => {
      budget = spend(budget, { tokens });
    });
    const orchestrator = new CoachOrchestrator({ llm, mode: 'introduction' });

    let turn = await open(orchestrator);
    const asked: string[] = [];
    while (turn.question && turn.question.id !== CONFIRM_QUESTION_ID) {
      asked.push(turn.question.id);
      turn = await orchestrator.answerOther('I am not sure, really');
    }
    // The zone the conversation was HELD IN throughout — it can only get worse as the walk spends,
    // and what matters is that it started (and stayed) past the threshold being tested.
    return {
      asked,
      endedAt: turn.question?.id,
      zone: zoneOf(startingAt, DEFAULT_BUDGET),
      endedInZone: zoneOf(budget, DEFAULT_BUDGET),
    };
  }

  it('asks the same things and stops at the same point in every zone', async () => {
    const open_ = await walk(EMPTY_BUDGET);
    const narrowing = await walk(spend(EMPTY_BUDGET, { tokens: DEFAULT_BUDGET.maxTokens * 0.8 }));
    const closing = await walk(spend(EMPTY_BUDGET, { tokens: DEFAULT_BUDGET.maxTokens * 2 }));

    expect(open_.zone).toBe('open');
    expect(narrowing.zone).toBe('narrowing');
    expect(closing.zone).toBe('closing');
    // And the "open" walk really did spend as it went, so this is three different budgets rather
    // than three runs of the same one.
    expect(open_.endedInZone).not.toBe('open');

    expect(narrowing.asked).toEqual(open_.asked);
    expect(closing.asked).toEqual(open_.asked);
    expect(new Set([open_.endedAt, narrowing.endedAt, closing.endedAt])).toEqual(
      new Set([CONFIRM_QUESTION_ID]),
    );
  });
});
