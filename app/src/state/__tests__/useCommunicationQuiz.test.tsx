/**
 * useCommunicationQuiz — the questionnaire flow (PRD §5/§7/§8). Proves a clear winner and a tie-break
 * both reach a result and Save writes it; that the previewed result and the SAVED value can never
 * diverge (review #2 — Save persists the same resolved style the result page shows, using the Warm-first
 * `breakTie` fallback, including a corrupted resume with no pendingResult); and that Back from a
 * tie-derived result returns to the tie-break page rather than skipping it (review #3).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement, type ReactElement } from 'react';

import { ProfileProvider, useProfile } from '@/state/ProfileProvider';
import { COMMUNICATION_QUIZ_KEY, useCommunicationQuiz } from '@/state/useCommunicationQuiz';
import {
  COMMUNICATION_EVENTS,
  COMMUNICATION_QUESTIONNAIRE_VERSION,
} from '@/core/communication/questionnaire';
import type { CommunicationProfileId } from '@/core/communication/communicationProfile';

// react-test-renderer ships no types; type just the surface used here (mirrors the other state tests).
interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

let quiz: ReturnType<typeof useCommunicationQuiz>;
let profile: ReturnType<typeof useProfile>['profile'];
function Probe() {
  quiz = useCommunicationQuiz();
  profile = useProfile().profile;
  return null;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function mount(): Promise<void> {
  await act(async () => {
    TestRenderer.create(createElement(ProfileProvider, null, createElement(Probe)));
  });
  await flush();
}

/** Walk the six pages, choosing one style per page, then advance off the last page. */
async function answerAll(styles: CommunicationProfileId[]): Promise<void> {
  await act(async () => {
    quiz.start();
  });
  for (let i = 0; i < COMMUNICATION_EVENTS.length; i += 1) {
    await act(async () => {
      quiz.select(COMMUNICATION_EVENTS[i], styles[i]);
    });
    await act(async () => {
      quiz.next();
    });
  }
}

describe('useCommunicationQuiz', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('a clear winner reaches the result and Save writes it, clearing progress', async () => {
    await mount();
    await answerAll(['direct', 'direct', 'direct', 'direct', 'direct', 'direct']);

    expect(quiz.phase).toEqual({ kind: 'result', styleId: 'direct' });
    await act(async () => {
      quiz.save();
    });
    await flush();
    expect(profile.communicationProfile).toBe('direct');
    expect(await AsyncStorage.getItem(COMMUNICATION_QUIZ_KEY)).toBeNull();
  });

  it('a tie runs the tie-break; the chosen style becomes the result and is saved', async () => {
    await mount();
    await answerAll(['direct', 'direct', 'direct', 'warm', 'warm', 'warm']);

    expect(quiz.phase.kind).toBe('tieBreak');
    if (quiz.phase.kind === 'tieBreak') expect(quiz.phase.styles.sort()).toEqual(['direct', 'warm']);

    await act(async () => {
      quiz.chooseTieBreak('warm');
    });
    expect(quiz.phase).toEqual({ kind: 'result', styleId: 'warm' });

    await act(async () => {
      quiz.save();
    });
    await flush();
    expect(profile.communicationProfile).toBe('warm');
  });

  it('Back from a tie-derived result returns to the tie-break page (review #3)', async () => {
    await mount();
    await answerAll(['direct', 'direct', 'direct', 'warm', 'warm', 'warm']);
    await act(async () => {
      quiz.chooseTieBreak('direct');
    });
    expect(quiz.phase.kind).toBe('result');

    await act(async () => {
      quiz.back();
    });
    expect(quiz.phase.kind).toBe('tieBreak');
  });

  it('a corrupted resume (result cursor, no pendingResult) previews the SAME style it saves (review #2)', async () => {
    // A tie between direct + warm with cursor at 'result' but no pendingResult: the result must resolve
    // via the Warm-first breakTie (→ warm), not registry order (→ direct), and Save must write that same value.
    await AsyncStorage.setItem(
      COMMUNICATION_QUIZ_KEY,
      JSON.stringify({
        version: COMMUNICATION_QUESTIONNAIRE_VERSION,
        cursor: 'result',
        answers: {
          friendRequest: 'direct',
          friendSupport: 'direct',
          stepsRemain: 'direct',
          streakRisk: 'warm',
          positiveProgress: 'warm',
          stepReminder: 'warm',
        },
      }),
    );
    await mount();

    expect(quiz.phase).toEqual({ kind: 'result', styleId: 'warm' });
    await act(async () => {
      quiz.save();
    });
    await flush();
    expect(profile.communicationProfile).toBe('warm'); // preview === saved
  });
});
