/**
 * The conversation tag on the wire (2026-09-15).
 *
 * The proxy can only add up what a conversation cost if every call says which conversation it is.
 * These tests hold what leaves the device: the tag rides ONLY on the proxy envelope, it is two
 * opaque fields and nothing else, and a tag that cannot be produced costs the caller nothing — the
 * call still goes. NO real network: fetch is a jest mock.
 */
import { GeminiClient } from '../GeminiClient';
import type { LlmRequest } from '../LlmClient';

const PROXY = 'https://project.supabase.co/functions/v1/gemini-proxy';
const ID = '0123456789abcdef0123456789abcdef';

function mockFetchOk() {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }],
      modelVersion: 'gemini-2.5-flash',
      usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30, totalTokenCount: 150 },
    }),
  } as unknown as Response);
}

const REQUEST: LlmRequest = { messages: [{ role: 'user', content: 'I want to run.' }] };

const sentBody = (fetchImpl: jest.Mock) => JSON.parse(fetchImpl.mock.calls[0][1].body as string);

describe('the conversation tag', () => {
  it('rides on the proxy envelope, beside the model and the body', async () => {
    const fetchImpl = mockFetchOk();
    const client = new GeminiClient({
      proxyUrl: PROXY,
      getAccessToken: async () => 'session-token',
      getConversationTag: async () => ({ id: ID, kind: 'introduction' }),
      fetchImpl,
    });

    await client.complete(REQUEST);

    expect(sentBody(fetchImpl)).toMatchObject({
      model: 'gemini-2.5-flash',
      conversationId: ID,
      conversationKind: 'introduction',
    });
  });

  it('sends the id and the kind and NOTHING else about the conversation', async () => {
    const fetchImpl = mockFetchOk();
    const client = new GeminiClient({
      proxyUrl: PROXY,
      getAccessToken: async () => 'session-token',
      getConversationTag: async () => ({ id: ID, kind: 'planning' }),
      fetchImpl,
    });

    await client.complete(REQUEST);

    // The envelope's own keys are fixed. A new key here is a new thing being sent about a person.
    expect(Object.keys(sentBody(fetchImpl)).sort()).toEqual([
      'body',
      'conversationId',
      'conversationKind',
      'model',
    ]);
  });

  it('is absent when the caller supplies none, rather than invented', async () => {
    const fetchImpl = mockFetchOk();
    const client = new GeminiClient({
      proxyUrl: PROXY,
      getAccessToken: async () => 'session-token',
      fetchImpl,
    });

    await client.complete(REQUEST);

    const body = sentBody(fetchImpl);
    expect(body.conversationId).toBeUndefined();
    expect(body.conversationKind).toBeUndefined();
  });

  it('never goes to Google in direct mode — the provider has no use for it', async () => {
    const fetchImpl = mockFetchOk();
    const client = new GeminiClient({
      apiKey: 'AQ.test-secret-key',
      getConversationTag: async () => ({ id: ID, kind: 'planning' }),
      fetchImpl,
    });

    await client.complete(REQUEST);

    expect(String(fetchImpl.mock.calls[0][1].body)).not.toContain(ID);
  });

  it('completes the call anyway when the tag cannot be produced', async () => {
    const fetchImpl = mockFetchOk();
    const client = new GeminiClient({
      proxyUrl: PROXY,
      getAccessToken: async () => 'session-token',
      getConversationTag: async () => {
        throw new Error('storage unavailable');
      },
      fetchImpl,
    });

    const result = await client.complete(REQUEST);

    expect(result.text).toBe('OK');
    expect(sentBody(fetchImpl).conversationId).toBeUndefined();
  });

  it('still reports the provider’s token counts, which the proxy now records too', async () => {
    const fetchImpl = mockFetchOk();
    const client = new GeminiClient({
      proxyUrl: PROXY,
      getAccessToken: async () => 'session-token',
      getConversationTag: async () => ({ id: ID, kind: 'planning' }),
      fetchImpl,
    });

    const result = await client.complete(REQUEST);

    expect(result.usage).toEqual({ promptTokens: 120, completionTokens: 30, totalTokens: 150 });
  });
});
