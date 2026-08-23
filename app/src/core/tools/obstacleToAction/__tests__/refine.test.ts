/**
 * The refinement: exactly two fields travel, every failure is silent, and a proposal is never a
 * replacement.
 */
import type { LlmClient } from '../../../llm/LlmClient';
import { confirmResult, setField, startResult, type ObstacleActionResult } from '../model';
import {
  buildRefineRequest,
  isDifferent,
  parseRefinement,
  refinementInput,
  requestRefinement,
} from '../refine';

const NOW = 1_700_000_000_000;

function full(): ObstacleActionResult {
  let r = startResult('o1', 'journey', NOW, 'journey-42');
  r = setField(r, 'wish', 'to run three times a week', NOW);
  r = setField(r, 'outcome', 'I would feel like myself again', NOW);
  r = setField(r, 'obstacle', 'by the evening I am wiped out', NOW);
  r = setField(r, 'trigger', 'later', NOW);
  r = setField(r, 'response', 'they will remind me and I will go', NOW);
  return confirmResult(r, NOW);
}

const client = (text: string): LlmClient => ({ complete: async () => ({ text }) });

describe('what travels', () => {
  it('is the sentence, the obstacle and the flag names — and nothing else', () => {
    const input = refinementInput(full(), ['triggerVague'], 'English');
    const body = JSON.stringify(buildRefineRequest(input));

    expect(body).toContain('later');
    expect(body).toContain('wiped out');
    expect(body).toContain('triggerVague');

    // The things the tool knows and the model must not: the linked Journey, the wish, the outcome.
    expect(body).not.toContain('journey-42');
    expect(body).not.toContain('run three times a week');
    expect(body).not.toContain('feel like myself again');
  });

  it('asks for strict JSON, in the person’s language', () => {
    const request = buildRefineRequest(refinementInput(full(), [], 'Hebrew'));
    expect(request.json).toBe(true);
    expect(request.messages[0].content).toContain('Hebrew');
  });

  it('tells the model when the local check found nothing', () => {
    const request = buildRefineRequest(refinementInput(full(), [], 'English'));
    expect(request.messages[0].content).toContain('noticed nothing');
  });
});

describe('parsing the answer', () => {
  it('reads the two fields', () => {
    expect(parseRefinement('{"trigger":"when I sit down","response":"put my shoes on"}')).toEqual({
      trigger: 'when I sit down',
      response: 'put my shoes on',
    });
  });

  it('survives a fenced block', () => {
    expect(parseRefinement('```json\n{"trigger":"a","response":"b"}\n```')).toEqual({
      trigger: 'a',
      response: 'b',
    });
  });

  it('returns null for anything that is not a proposal', () => {
    for (const answer of [
      'I cannot help with that.',
      '{"trigger":"only one field"}',
      '{"trigger":"","response":"b"}',
      '{}',
      'null',
      '',
    ]) {
      expect(parseRefinement(answer)).toBeNull();
    }
  });
});

describe('requestRefinement', () => {
  it('returns a proposal when the model gives one', async () => {
    const proposal = await requestRefinement(
      client('{"trigger":"when I put my bag down","response":"change into my shoes"}'),
      refinementInput(full(), ['triggerVague'], 'English'),
    );
    expect(proposal).toEqual({ trigger: 'when I put my bag down', response: 'change into my shoes' });
  });

  it('returns null rather than throwing when the call fails', async () => {
    const broken: LlmClient = {
      complete: async () => {
        throw new Error('no network');
      },
    };
    await expect(requestRefinement(broken, refinementInput(full(), [], 'English'))).resolves.toBeNull();
  });

  it('returns null when the model just echoes the original back', async () => {
    const same = await requestRefinement(
      client('{"trigger":"later","response":"they will remind me and I will go"}'),
      refinementInput(full(), [], 'English'),
    );
    expect(same).toBeNull();
  });

  it('never mutates the original result', async () => {
    const original = full();
    const snapshot = JSON.stringify(original);
    await requestRefinement(client('{"trigger":"a","response":"b"}'), refinementInput(original, [], 'English'));
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('isDifferent', () => {
  it('ignores surrounding whitespace', () => {
    expect(isDifferent({ trigger: ' a ', response: ' b ' }, { trigger: 'a', response: 'b' })).toBe(false);
    expect(isDifferent({ trigger: 'a', response: 'b' }, { trigger: 'a', response: 'c' })).toBe(true);
  });
});
