/**
 * The rung that was missing: a career conversation now reaches the DIAGNOSIS, and the diagnosis
 * reaches the library.
 *
 * Until 2026-08-24 the Career expert asked four fixed questions and everybody got the same generic
 * arc, while twenty-seven authored Career Journeys sat in the library correct and unreachable.
 * "I apply and nobody answers" is a symptom with five different causes, and treating the wrong one
 * is how a job search stays busy and stays stuck.
 *
 * Three things are worth holding still:
 *   • the diagnosis runs BEFORE the expert's own questions, because it decides which Journey the
 *     person gets while those only shape one;
 *   • a signal the OPENING MESSAGE already established is never asked about again (the partner's
 *     first principle) — and when it establishes everything, nothing is asked at all;
 *   • an unresolved diagnosis is recorded rather than smoothed over, because the coach must not
 *     motivate past one.
 */
import { MockLlmClient } from '../../llm/LlmClient';
import { CoachOrchestrator } from '../CoachOrchestrator';

/** An understanding response for ONE career goal, optionally carrying signals read from the message. */
function careerMock(signals?: Record<string, string>): MockLlmClient {
  return new MockLlmClient((req) =>
    req.json
      ? JSON.stringify({
          goals: [
            {
              title: 'find a new job',
              kind: 'process',
              domain: 'career',
              ...(signals ? { careerSignals: signals } : {}),
            },
          ],
        })
      : '',
  );
}

describe('the diagnosis runs first', () => {
  it('asks the target question before any of the career expert’s own', async () => {
    const orchestrator = new CoachOrchestrator({ llm: careerMock() });
    orchestrator.start();

    const turn = await orchestrator.triage('I apply and nobody answers');

    expect(turn.state.phase).toBe('diagnosis');
    expect(turn.question?.id).toContain('career.diagnosis.applyNoResponse.target');
    // The cards are an offer, not the only way through (founder, 2026-08-21).
    expect(turn.question?.allowOther).toBe(true);
  });

  it('routes a broad target straight to the target-clarity family, asking nothing more', async () => {
    const orchestrator = new CoachOrchestrator({ llm: careerMock() });
    orchestrator.start();
    const first = await orchestrator.triage('I apply and nobody answers');

    // "Several different kinds of role" — the first option, which settles the diagnosis by itself.
    const next = await orchestrator.selectOption(0);

    expect(next.state.spec.diagnosis).toEqual({ subtype: 'LAND_ROLE', bottleneck: 'DIRECTION_GAP' });
    // And the conversation moved ON — the diagnosis is over, not repeated.
    expect(next.question?.id).not.toBe(first.question?.id);
    expect(next.state.phase).not.toBe('diagnosis');
    expect(next.state.phase).toBe('journeyFit');
    expect(next.question?.id).toContain('library.family.career.jobTarget.targetNarrowing');
  });

  it('uses the family-fit answer to select one authored Journey without a second menu', async () => {
    const orchestrator = new CoachOrchestrator({ llm: careerMock() });
    orchestrator.start();
    await orchestrator.triage('I apply and nobody answers');
    await orchestrator.selectOption(0);

    const turn = await orchestrator.selectOption(1);

    expect(turn.state.phase).toBe('questions');
    expect(turn.state.spec.selectedJourneyDefinitionId).toBe('career.jobTarget.postingsFirst');
    expect(turn.coachMessage).toContain('I found one Journey');
    expect(turn.question?.id).not.toBe('career.journeyChoice');
  });

  it('never asks what the opening message already said', async () => {
    // They told us the target is clear and the proof is there; only access is still open.
    const orchestrator = new CoachOrchestrator({
      llm: careerMock({ targetClarity: 'clear', visibleProofMissing: 'no' }),
    });
    orchestrator.start();

    const turn = await orchestrator.triage(
      'I know exactly what I am going for and my CV shows it, but nothing comes back',
    );

    expect(turn.question?.id).toContain('access');
  });

  it('skips the diagnosis entirely for somebody who is not searching', async () => {
    const orchestrator = new CoachOrchestrator({ llm: careerMock({ activeJobSearch: 'no' }) });
    orchestrator.start();

    const turn = await orchestrator.triage('I want to be ready for a bigger role one day');

    expect(turn.state.phase).toBe('questions');
    expect(turn.state.spec.diagnosis).toBeUndefined();
  });

  it('records an unresolved diagnosis instead of routing to the nearest family', async () => {
    const orchestrator = new CoachOrchestrator({ llm: careerMock({ targetClarity: 'clear' }) });
    orchestrator.start();
    await orchestrator.triage('I apply and nobody answers');

    // The proof question's FIRST option is "honestly, I cannot do that work yet" — a capability gap,
    // which is a different section of the library and not a job-search bottleneck at all.
    const turn = await orchestrator.selectOption(0);

    expect(turn.state.spec.diagnosis).toBeUndefined();
    // The reason is consultation state, not persisted as a diagnosis field after refinement opens.
    expect(turn.state.spec.diagnosisUnresolved).toBeUndefined();
    expect(turn.done).toBe(false);
    expect(turn.goalSpec).toBeUndefined();
    expect(turn.coachMessage).toContain('I don’t have a Journey');
    expect(turn.awaitingGoalText).toBe(true);
    expect(turn.state.phase).toBe('goal');
  });

  it('lets the user refine a no-match goal in the same conversation', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: new MockLlmClient((req) => {
        const last = req.messages[req.messages.length - 1]?.content ?? '';
        if (last.includes('second attempt')) {
          return JSON.stringify({
            goals: [{
              title: 'find a focused role', kind: 'process', domain: 'career',
              careerSignals: { targetClarity: 'broad' },
            }],
          });
        }
        return JSON.stringify({
          goals: [{
            title: 'find a job', kind: 'process', domain: 'career',
            careerSignals: { targetClarity: 'clear' },
          }],
        });
      }),
    });
    orchestrator.start();
    await orchestrator.triage('first attempt');
    const noMatch = await orchestrator.selectOption(0);
    expect(noMatch.awaitingGoalText).toBe(true);

    const retried = await orchestrator.triage('second attempt');
    expect(retried.state.phase).toBe('journeyFit');
    expect(retried.question?.id).toContain('career.jobTarget');
  });

  it('leaves every other domain exactly as it was', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: new MockLlmClient((req) =>
        req.json
          ? JSON.stringify({ goals: [{ title: 'run more', kind: 'recurring', domain: 'body_image' }] })
          : '',
      ),
    });
    orchestrator.start();

    const turn = await orchestrator.triage('I want to run more');

    expect(turn.state.phase).toBe('questions');
    expect(turn.state.spec.diagnosis).toBeUndefined();
  });
});

describe('answering in your own words', () => {
  /** Understanding first, then the signal-reading call — one per message, in order. */
  function speakingMock(signals: Record<string, string>): MockLlmClient {
    let call = 0;
    return new MockLlmClient(() => {
      call += 1;
      return call === 1
        ? JSON.stringify({ goals: [{ title: 'find a new job', kind: 'process', domain: 'career' }] })
        : JSON.stringify({ signals });
    });
  }

  it('reads every signal the sentence supports, not just the one asked about', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: speakingMock({ targetClarity: 'clear', visibleProofMissing: 'no' }),
    });
    orchestrator.start();
    await orchestrator.triage('I apply and nobody answers');

    // They were asked about the target and answered that AND the proof question in one breath.
    const turn = await orchestrator.answerOther(
      'I only go for backend roles and my CV has real projects on it',
    );

    // So the tree skipped both and is on access — one call, two questions saved.
    expect(turn.question?.id).toContain('access');
  });

  it('settles the diagnosis when a sentence answers everything left', async () => {
    const orchestrator = new CoachOrchestrator({ llm: speakingMock({ targetClarity: 'broad' }) });
    orchestrator.start();
    await orchestrator.triage('I apply and nobody answers');

    const turn = await orchestrator.answerOther('honestly I apply to anything that looks close');

    expect(turn.state.spec.diagnosis).toEqual({ subtype: 'LAND_ROLE', bottleneck: 'DIRECTION_GAP' });
  });

  it('asks again rather than guessing when the sentence supported nothing', async () => {
    const orchestrator = new CoachOrchestrator({ llm: speakingMock({}) });
    orchestrator.start();
    const first = await orchestrator.triage('I apply and nobody answers');

    const turn = await orchestrator.answerOther('it is complicated');

    expect(turn.question?.id).toBe(first.question?.id);
    expect(turn.state.spec.diagnosis).toBeUndefined();
  });
});

describe('signals read from the opening message', () => {
  it('keeps only the values the vocabulary declares', async () => {
    const orchestrator = new CoachOrchestrator({
      // `sometimes` is not a value targetClarity may take, and `unknown` is his "we could not tell".
      llm: careerMock({ targetClarity: 'sometimes', peopleAccess: 'unknown' }),
    });
    orchestrator.start();

    const turn = await orchestrator.triage('I apply and nobody answers');

    // Neither was believed, so the tree starts from the top and asks the target question.
    expect(turn.question?.id).toContain('target');
  });
});
