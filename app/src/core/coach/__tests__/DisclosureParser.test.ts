/**
 * Disclosure parser tests (S2.4) — the hardened front-load path where one rich message fills many
 * {@link GoalSpec} fields at once. Drives the {@link LlmAnswerParser} and its pure helpers with a
 * DETERMINISTIC {@link MockLlmClient} (no network). Coverage:
 *   • a rich message fills many fields; a vague one fills none (gaps left, never invented);
 *   • fenced / prose-wrapped JSON still parses;
 *   • hallucinated / mistyped values are dropped by validation;
 *   • malformed output → bounded retry → safe empty, no throw; an LLM failure degrades the same way;
 *   • every pass is observable via the diagnostics sink.
 */
import { MockLlmClient, type LlmRequest } from '../../llm/LlmClient';
import {
  LlmAnswerParser,
  parseExtractionPayload,
  satisfiedTargets,
  validateExtractionPayload,
  type AnswerParseInput,
  type ExtractionDiagnostics,
} from '../CoachOrchestrator';

/** A minimal parse input; the parser only needs the seam + a focus field + history for context. */
function input(overrides: Partial<AnswerParseInput> = {}): AnswerParseInput {
  return {
    userText: 'anything',
    focusField: 'motivation',
    spec: { title: '', domain: 'general', processType: 'unknown', isHabit: false, milestones: [], failureRisks: [], timing: {} },
    history: [{ role: 'user', content: 'anything' }],
    ...overrides,
  };
}

describe('parseExtractionPayload (tolerant JSON + validation)', () => {
  it('parses a plain JSON object', () => {
    const payload = parseExtractionPayload('{"motivation":"to feel healthier"}');
    expect(payload).toEqual({ motivation: 'to feel healthier' });
  });

  it('tolerates a ```json code fence around the object', () => {
    const payload = parseExtractionPayload('```json\n{"motivation":"to feel healthier"}\n```');
    expect(payload).toEqual({ motivation: 'to feel healthier' });
  });

  it('tolerates surrounding prose before and after the object', () => {
    const text = 'Sure! Here are the fields I found:\n{"title":"Run regularly"}\nHope that helps.';
    expect(parseExtractionPayload(text)).toEqual({ title: 'Run regularly' });
  });

  it('handles braces inside string values without miscounting', () => {
    const payload = parseExtractionPayload('{"motivation":"the plan {phase 1} matters"}');
    expect(payload).toEqual({ motivation: 'the plan {phase 1} matters' });
  });

  it('returns null for output with no JSON object', () => {
    expect(parseExtractionPayload('I could not find any fields.')).toBeNull();
  });

  it('returns null for a malformed / unterminated object', () => {
    expect(parseExtractionPayload('{"motivation": "to feel')).toBeNull();
  });

  it('parses an empty object to an empty payload (a valid "no fields")', () => {
    expect(parseExtractionPayload('{}')).toEqual({});
  });
});

describe('validateExtractionPayload (anti-hallucination gate)', () => {
  it('keeps well-typed fields and trims strings', () => {
    const payload = validateExtractionPayload({
      title: '  Run regularly  ',
      domain: 'body_image',
      processType: 'fixed',
      failureRisks: ['rain', '  ', 42, 'travel'],
      milestones: ['5k', '10k'],
      timing: { sessionMinutes: 30, sessionsPerWeek: 3, daypart: 'morning', bogus: 'x' },
      locationRelevant: true,
    });
    expect(payload).toEqual({
      title: 'Run regularly',
      domain: 'body_image',
      processType: 'fixed',
      failureRisks: ['rain', 'travel'],
      milestones: ['5k', '10k'],
      timing: { sessionMinutes: 30, sessionsPerWeek: 3, daypart: 'morning' },
      locationRelevant: true,
    });
  });

  it('drops mistyped / junk values instead of trusting them', () => {
    const payload = validateExtractionPayload({
      title: 123, // wrong type → dropped
      domain: 'astrophysics', // not a known DomainId → dropped (never invented)
      processType: 'sideways', // not a valid enum → dropped
      motivation: '   ', // empty → dropped
      failureRisks: 'not-an-array', // wrong shape → dropped
      timing: 'soon', // wrong shape → dropped
      wantsSupportCircle: 'yes', // not a boolean → dropped
    });
    expect(payload).toEqual({});
  });
});

describe('satisfiedTargets', () => {
  it('reports only the interview targets a payload confidently fills', () => {
    expect(
      satisfiedTargets({
        processType: 'progressive',
        milestones: ['5k'],
        motivation: 'health',
        timing: { sessionMinutes: 30, sessionsPerWeek: 3 },
        locationRelevant: true,
      }),
    ).toEqual(['processType', 'milestones', 'motivation', 'timing', 'locationCalendar']);
  });

  it('does not count timing until both minutes and sessions/week are present', () => {
    expect(satisfiedTargets({ timing: { sessionMinutes: 30 } })).toEqual([]);
  });

  it('returns nothing for an empty payload', () => {
    expect(satisfiedTargets({})).toEqual([]);
  });
});

describe('LlmAnswerParser (front-load extraction over the seam)', () => {
  it('fills many fields from a rich, multi-fact message', async () => {
    const rich = JSON.stringify({
      title: 'Run regularly',
      motivation: 'to feel healthier',
      failureRisks: ['rain'],
      timing: { sessionMinutes: 30, sessionsPerWeek: 3, daypart: 'morning' },
      locationRelevant: true,
    });
    const parser = new LlmAnswerParser(new MockLlmClient(rich));

    const payload = await parser.parse(input());

    expect(payload).toMatchObject({
      title: 'Run regularly',
      motivation: 'to feel healthier',
      failureRisks: ['rain'],
      locationRelevant: true,
    });
    expect(payload.timing).toMatchObject({ sessionMinutes: 30, sessionsPerWeek: 3 });
  });

  it('fills nothing from a vague message (empty object)', async () => {
    const parser = new LlmAnswerParser(new MockLlmClient('{}'));
    expect(await parser.parse(input())).toEqual({});
  });

  it('still parses when the model wraps JSON in a fence and prose', async () => {
    const parser = new LlmAnswerParser(
      new MockLlmClient('Got it —\n```json\n{"motivation":"to feel healthier"}\n```'),
    );
    expect(await parser.parse(input())).toEqual({ motivation: 'to feel healthier' });
  });

  it('retries once on malformed output, then succeeds — no throw', async () => {
    const seen: ExtractionDiagnostics[] = [];
    // First completion is junk; the retry returns valid JSON.
    const llm = new MockLlmClient((_req: LlmRequest, i: number) =>
      i === 0 ? 'totally not json' : '{"motivation":"to feel healthier"}',
    );
    const parser = new LlmAnswerParser(llm, { observer: (d) => seen.push(d) });

    const payload = await parser.parse(input());

    expect(payload).toEqual({ motivation: 'to feel healthier' });
    expect(llm.calls.length).toBe(2);
    expect(seen[0]).toMatchObject({ attempts: 2, retried: true, malformed: false, satisfied: ['motivation'] });
  });

  it('degrades to an empty payload when every attempt is malformed — no throw', async () => {
    const seen: ExtractionDiagnostics[] = [];
    const llm = new MockLlmClient('still not json');
    const parser = new LlmAnswerParser(llm, { observer: (d) => seen.push(d) });

    const payload = await parser.parse(input());

    expect(payload).toEqual({});
    expect(llm.calls.length).toBe(2); // default maxAttempts
    expect(seen[0]).toMatchObject({ attempts: 2, retried: true, malformed: true, satisfied: [] });
  });

  it('degrades safely when the LLM seam itself throws', async () => {
    const throwing = {
      calls: [],
      complete: jest.fn().mockRejectedValue(new Error('network down')),
    };
    const parser = new LlmAnswerParser(throwing as never, { maxAttempts: 2 });

    await expect(parser.parse(input())).resolves.toEqual({});
    expect(throwing.complete).toHaveBeenCalledTimes(2);
  });
});
