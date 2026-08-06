/**
 * GeminiClient tests — the Gemini implementation of the LlmClient seam (S2.1). NO real network:
 * fetch is a jest mock. We assert the REQUEST shape (endpoint, header auth, body mapping), the
 * RESPONSE parsing, and every ERROR path (non-2xx, transport, timeout, empty). We also prove the
 * key never leaks into a URL or an error message.
 */
import { GeminiClient } from '../GeminiClient';
import { LlmError, MockLlmClient, type LlmRequest } from '../LlmClient';

const KEY = 'AQ.test-secret-key';

/** Build a jest-mocked fetch that returns one canned Gemini JSON response. */
function mockFetchOk(text: string, over: Record<string, unknown> = {}) {
  const body = {
    candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
    modelVersion: 'gemini-2.5-flash',
    ...over,
  };
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response);
}

const REQUEST: LlmRequest = {
  system: 'You are the PushApp coach.',
  messages: [
    { role: 'user', content: 'I want to run.' },
    { role: 'model', content: 'Great — tell me more.' },
    { role: 'user', content: 'Three times a week.' },
  ],
};

describe('GeminiClient.complete — request shape', () => {
  it('POSTs to the versioned generateContent endpoint for the configured model', async () => {
    const fetchImpl = mockFetchOk('OK');
    const client = new GeminiClient({ apiKey: KEY, model: 'gemini-2.5-flash', fetchImpl });

    await client.complete(REQUEST);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    );
    expect(init.method).toBe('POST');
  });

  it('authenticates with the x-goog-api-key header, never in the URL', async () => {
    const fetchImpl = mockFetchOk('OK');
    const client = new GeminiClient({ apiKey: KEY, fetchImpl });

    await client.complete(REQUEST);

    const [url, init] = fetchImpl.mock.calls[0];
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    expect(String(url)).not.toContain(KEY);
  });

  it('maps system → systemInstruction and messages → role-tagged contents', async () => {
    const fetchImpl = mockFetchOk('OK');
    const client = new GeminiClient({ apiKey: KEY, fetchImpl });

    await client.complete(REQUEST);

    const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'You are the PushApp coach.' }] });
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'I want to run.' }] },
      { role: 'model', parts: [{ text: 'Great — tell me more.' }] },
      { role: 'user', parts: [{ text: 'Three times a week.' }] },
    ]);
  });

  it('requests strict JSON only when asked', async () => {
    const fetchImpl = mockFetchOk('{}');
    const client = new GeminiClient({ apiKey: KEY, fetchImpl });

    await client.complete({ messages: [{ role: 'user', content: 'hi' }], json: true });

    const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('omits generationConfig when no tuning options are given', async () => {
    const fetchImpl = mockFetchOk('OK');
    const client = new GeminiClient({ apiKey: KEY, fetchImpl });

    await client.complete({ messages: [{ role: 'user', content: 'hi' }] });

    const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(body.generationConfig).toBeUndefined();
    expect(body.systemInstruction).toBeUndefined();
  });

  it('passes temperature and maxOutputTokens through', async () => {
    const fetchImpl = mockFetchOk('OK');
    const client = new GeminiClient({ apiKey: KEY, fetchImpl });

    await client.complete({
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.2,
      maxOutputTokens: 256,
    });

    const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(body.generationConfig).toEqual({ temperature: 0.2, maxOutputTokens: 256 });
  });
});

describe('GeminiClient.complete — response parsing', () => {
  it('concatenates candidate parts and reports finishReason + model', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: 'Hello ' }, { text: 'world' }] }, finishReason: 'STOP' },
        ],
        modelVersion: 'gemini-2.5-flash',
      }),
    } as unknown as Response);
    const client = new GeminiClient({ apiKey: KEY, fetchImpl });

    const result = await client.complete(REQUEST);

    expect(result.text).toBe('Hello world');
    expect(result.finishReason).toBe('STOP');
    expect(result.model).toBe('gemini-2.5-flash');
  });
});

describe('GeminiClient.complete — error handling', () => {
  it('throws a config LlmError (no network call) when the key is missing', async () => {
    const fetchImpl = jest.fn();
    const client = new GeminiClient({ apiKey: '', fetchImpl });

    await expect(client.complete(REQUEST)).rejects.toMatchObject({
      name: 'LlmError',
      kind: 'config',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps a non-2xx to an http LlmError carrying status + provider message, not the key', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'You exceeded your current quota' } }),
    } as unknown as Response);
    const client = new GeminiClient({ apiKey: KEY, fetchImpl });

    const error = (await client.complete(REQUEST).catch((e) => e)) as LlmError;
    expect(error).toBeInstanceOf(LlmError);
    expect(error.status).toBe(429);
    expect(error.kind).toBe('http');
    expect(error.message).toContain('quota');
    expect(error.message).not.toContain(KEY);
  });

  it('maps a transport failure to a network LlmError', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const client = new GeminiClient({ apiKey: KEY, fetchImpl });

    await expect(client.complete(REQUEST)).rejects.toMatchObject({ kind: 'network' });
  });

  it('maps an aborted request to a timeout LlmError', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    const fetchImpl = jest.fn().mockRejectedValue(abortErr);
    const client = new GeminiClient({ apiKey: KEY, fetchImpl, timeoutMs: 5 });

    await expect(client.complete(REQUEST)).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('throws an empty LlmError when the model returns no text', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [] } }] }),
    } as unknown as Response);
    const client = new GeminiClient({ apiKey: KEY, fetchImpl });

    await expect(client.complete(REQUEST)).rejects.toMatchObject({ kind: 'empty' });
  });
});

describe('MockLlmClient', () => {
  it('is deterministic and records the requests it received', async () => {
    const mock = new MockLlmClient('scripted answer');

    const result = await mock.complete(REQUEST);

    expect(result.text).toBe('scripted answer');
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]).toBe(REQUEST);
  });

  it('supports a per-call responder function', async () => {
    const mock = new MockLlmClient((_req, i) => `turn ${i}`);

    expect((await mock.complete(REQUEST)).text).toBe('turn 0');
    expect((await mock.complete(REQUEST)).text).toBe('turn 1');
  });
});
