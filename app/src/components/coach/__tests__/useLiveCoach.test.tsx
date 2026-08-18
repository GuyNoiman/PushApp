/**
 * useLiveCoach — the live-coach React adapter. These tests drive the hook over a DETERMINISTIC
 * {@link MockLlmClient} (no network, no RN native) via react-test-renderer, asserting the three
 * behaviours the screen depends on:
 *   • triage → question → done → a completed GoalSpec (the "Build my Journey" input);
 *   • the SENSITIVE-DOMAIN STOP: an `addiction`/`relationships` goal hands off, never interviews
 *     and never yields a GoalSpec to build;
 *   • the error path: a throwing triage surfaces a calm retry line and leaves the opening reopened,
 *     never crashing.
 */
// `makeCoachLlm` now reaches the shared Supabase client (to authenticate the coach against our
// key-holding proxy instead of shipping the API key in the bundle), which pulls in AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createElement, type ReactElement } from 'react';

import { CoachOrchestrator } from '@/core/coach/CoachOrchestrator';
import { LlmError, MockLlmClient } from '@/core/llm/LlmClient';
import { useLiveCoach, type UseLiveCoach } from '../useLiveCoach';
// The hook localizes its injected lines (hand-off / retry / labels) via react-i18next, so the i18n
// instance must be initialized here — imported for its side-effect init so `t` resolves real copy.
import '@/i18n';

// Give i18n a deterministic locale at boot (mirrors parity.test) so importing it never throws.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

// react-test-renderer ships no type declarations; type just the tiny surface we touch here.
interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

/** A mock understanding response carrying a SINGLE goal of the given domain (triage's only call). */
function singleGoalMock(domain: string, title = 'run a 5k'): MockLlmClient {
  return new MockLlmClient((req) =>
    req.json ? JSON.stringify({ goals: [{ title, kind: 'process', domain }] }) : 'UNUSED',
  );
}

/** Render the hook and expose its latest return value (Probe renders nothing). */
function renderLiveCoach(orchestrator: CoachOrchestrator): {
  result: { current: UseLiveCoach };
  unmount: () => void;
} {
  const result: { current: UseLiveCoach } = { current: undefined as unknown as UseLiveCoach };
  function Probe() {
    result.current = useLiveCoach({ orchestrator });
    return null;
  }
  let renderer!: { unmount(): void };
  void act(() => {
    renderer = TestRenderer.create(createElement(Probe));
  });
  return {
    result,
    unmount: () => {
      void act(() => renderer.unmount());
    },
  };
}

describe('useLiveCoach', () => {
  it('greets on mount and awaits the opening free-text', () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('general') });
    const { result, unmount } = renderLiveCoach(orchestrator);

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({ kind: 'coach' });
    expect(result.current.awaitingOpening).toBe(true);
    expect(result.current.status).toBe('idle');
    unmount();
  });

  it('drives triage → question → done → a completed GoalSpec', async () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('general', 'run a 5k') });
    const { result, unmount } = renderLiveCoach(orchestrator);

    await act(async () => {
      result.current.sendOpening('I want to run a 5k');
    });

    // The opening free-text is echoed and triage surfaced the expert's first question — no crash.
    expect(result.current.status).toBe('idle');
    expect(result.current.awaitingOpening).toBe(false);
    expect(result.current.items.some((i) => i.kind === 'user' && i.text === 'I want to run a 5k')).toBe(true);
    expect(result.current.question).not.toBeNull();

    // Answer every remaining question by picking its first option until the interview completes.
    let guard = 0;
    while (result.current.question && guard++ < 25) {
      await act(async () => {
        result.current.selectSingle('0');
      });
    }

    expect(result.current.question).toBeNull();
    expect(result.current.goalSpec).not.toBeNull();
    expect(result.current.goalSpec?.title).toBe('run a 5k');
    // A NEW JOURNEY summary card closes the transcript, ready for the Build CTA.
    expect(result.current.items.some((i) => i.kind === 'journey')).toBe(true);
    expect(result.current.handoff).toBe(false);
    unmount();
  });

  it('STOPS on a sensitive domain — hands off, never interviews or builds', async () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('addiction', 'quit smoking') });
    const { result, unmount } = renderLiveCoach(orchestrator);

    await act(async () => {
      result.current.sendOpening('I want to quit smoking');
    });

    expect(result.current.handoff).toBe(true);
    expect(result.current.question).toBeNull(); // no specialised interview was surfaced
    expect(result.current.goalSpec).toBeNull(); // nothing to build here
    // The last coach line is the calm hand-off, not an expert question.
    const lastCoach = [...result.current.items].reverse().find((i) => i.kind === 'coach');
    expect(lastCoach?.kind === 'coach' && lastCoach.text).toMatch(/deserves a person/i);
    unmount();
  });

  it('surfaces a calm retry line on an LLM error and never crashes', async () => {
    const orchestrator = new CoachOrchestrator({ llm: singleGoalMock('general') });
    jest.spyOn(orchestrator, 'triage').mockRejectedValue(new LlmError('boom', 500, 'http'));
    const { result, unmount } = renderLiveCoach(orchestrator);

    await act(async () => {
      result.current.sendOpening('I want to get fit');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.awaitingOpening).toBe(true); // the opening stays open to retry
    expect(result.current.goalSpec).toBeNull();
    const lastCoach = [...result.current.items].reverse().find((i) => i.kind === 'coach');
    expect(lastCoach?.kind === 'coach' && lastCoach.text).toMatch(/once more/i);
    unmount();
  });
});
