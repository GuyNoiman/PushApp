/**
 * The hook hands the Portrait to a PLANNING conversation, and only to one (Planning_From_Portrait_Plan,
 * Stage 1).
 *
 * The screen passes what the first conversation understood; the hook threads it into the
 * orchestrator it builds and says whether the conversation opened from it (`resumed`), which the
 * screen reads at the build to mark the handoff used. The introduction is the conversation that
 * builds the Portrait, so it is never handed one, even if a caller passes it.
 *
 * `makeCoachLlm` is mocked exactly as in `liveCoachBudget.test.tsx`: no network, no Supabase.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/core/llm/makeCoachLlm', () => ({
  makeCoachLlm: () => ({ complete: async () => ({ text: '', finishReason: 'STOP', model: 'mock' }) }),
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

import { createElement, type ReactElement } from 'react';

import i18n from '@/i18n';
import type { Portrait } from '@/core/coach/portrait';
import { INTERVIEW_PLAYBOOK } from '@/core/coach/interviewPlaybook';
import { EMPTY_BUDGET, type BudgetState } from '@/core/llm/conversationBudget';
import type { ConversationBudgetStore } from '@/core/llm/conversationBudgetStore';
import { useLiveCoach, type UseLiveCoach } from '../useLiveCoach';

interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const store: ConversationBudgetStore = {
  async load(): Promise<BudgetState> {
    return EMPTY_BUDGET;
  },
  async save() {},
  async clear() {},
};

const PORTRAIT: Portrait = {
  primaryWant: { value: 'leave marketing', confidence: 'high', source: 'stated', updatedAt: 1 },
  domain: { value: 'career', confidence: 'high', source: 'inferred', updatedAt: 1 },
};

async function mount(mode: 'introduction' | 'planning', portrait?: Portrait | null) {
  const result: { current: UseLiveCoach } = { current: undefined as unknown as UseLiveCoach };
  function Probe() {
    result.current = useLiveCoach({ mode, portrait, budgetStore: store });
    return null;
  }
  let renderer!: { unmount(): void };
  await act(async () => {
    renderer = TestRenderer.create(createElement(Probe));
  });
  return { result, unmount: () => act(() => renderer.unmount()) };
}

describe('the Portrait reaches planning, and only planning', () => {
  it('opens a planning conversation from it and says so', async () => {
    const { result, unmount } = await mount('planning', PORTRAIT);

    expect(result.current.resumed).toBe(true);
    expect(result.current.items[0]).toMatchObject({
      kind: 'coach',
      text: i18n.t('planning.resume.openingStated', { ns: 'coachContent', want: 'leave marketing' }),
    });
    await unmount();
  });

  it('opens as today with no Portrait', async () => {
    const { result, unmount } = await mount('planning', null);

    expect(result.current.resumed).toBe(false);
    expect(result.current.items[0]).toMatchObject({ kind: 'coach', text: INTERVIEW_PLAYBOOK.opening });
    await unmount();
  });

  it('never hands it to the introduction', async () => {
    const { result, unmount } = await mount('introduction', PORTRAIT);

    expect(result.current.resumed).toBe(false);
    expect(JSON.stringify(result.current.items)).not.toContain('leave marketing');
    await unmount();
  });
});
