/**
 * JourneyEditOrchestrator tests (task J1) — the edit-mode dialogue manager over a DETERMINISTIC
 * MockLlmClient (no network). Coverage:
 *   • start() returns a scoped greeting naming the Journey, with NO model call.
 *   • propose() makes EXACTLY ONE understanding call and returns the validated edit + its summary.
 *   • a transport/LLM failure DEGRADES to an empty proposal (never throws).
 */
import { MockLlmClient } from '../../llm/LlmClient';
import { JourneyEditOrchestrator } from '../JourneyEditOrchestrator';
import type { JourneyEditContext } from '../journeyEdit';

function context(): JourneyEditContext {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['Feel stronger'],
    rhythm: 'few-times-week',
    durationDays: 30,
    steps: [
      { id: 'step_a', title: 'Lace up and walk', cadence: 'once', done: false, dropped: false },
      { id: 'step_b', title: 'Jog 15 minutes', cadence: 'weekly', done: false, dropped: false },
    ],
  };
}

describe('JourneyEditOrchestrator', () => {
  it('start() greets naming the Journey without any model call', () => {
    const llm = new MockLlmClient('{}');
    const orchestrator = new JourneyEditOrchestrator({ context: context(), llm });

    const greeting = orchestrator.start();

    expect(greeting).toContain('Run 5km');
    expect(llm.calls).toHaveLength(0);
  });

  it('propose() makes exactly ONE understanding call and returns the validated edit + summary', async () => {
    const llm = new MockLlmClient((req) =>
      req.json ? JSON.stringify({ title: 'Run 10km', removeStepIds: ['step_b'] }) : 'UNUSED',
    );
    const orchestrator = new JourneyEditOrchestrator({ context: context(), llm });
    orchestrator.start();

    const proposal = await orchestrator.propose('rename it and drop the jog step');

    expect(llm.calls).toHaveLength(1);
    expect(proposal.edit).toEqual({ title: 'Run 10km', removeStepIds: ['step_b'] });
    expect(proposal.changes).toEqual([
      { kind: 'rename', title: 'Run 10km' },
      { kind: 'removeStep', title: 'Jog 15 minutes' },
    ]);
  });

  it('degrades to an empty proposal when the model call throws', async () => {
    const llm: { complete: () => Promise<never> } = {
      complete: () => Promise.reject(new Error('network')),
    };
    const orchestrator = new JourneyEditOrchestrator({ context: context(), llm });
    orchestrator.start();

    const proposal = await orchestrator.propose('change everything');

    expect(proposal.edit).toEqual({});
    expect(proposal.changes).toEqual([]);
  });
});
