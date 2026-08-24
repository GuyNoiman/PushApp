/**
 * Mirror — the round you already sent, which is the half of this screen a person comes BACK for.
 *
 * Two things are worth a test here and they are both promises rather than features:
 *
 * 1. While a confidential round collects, the screen shows a COUNT and nothing that could be joined
 *    to a person. Against a list of people the requester chose themselves, "who" and "when" are the
 *    same fact, so the test asserts the absence of a name as hard as it asserts the number.
 * 2. When it is over, the screen ASKS the server for the result and renders what came back —
 *    including the questions that produced nothing, in their own words. A rejected question that
 *    rendered as an empty card would read as a bug and quietly teach us to stop rejecting.
 *
 * The real screen over a mock gateway (react-test-renderer); `t` echoes its key, so copy is asserted
 * by i18n key.
 */
import { createElement, type ReactElement } from 'react';

import MirrorScreen from '../tools/mirror';
import type { MirrorGateway } from '@/core/tools/mirror';

jest.mock('@/global.css', () => ({}));

const gateway: { current: Partial<MirrorGateway> } = { current: {} };
jest.mock('@/core/tools/mirror', () => ({ getMirrorGateway: () => gateway.current }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/state/SocialProvider', () => ({
  useSocial: () => ({
    friends: [
      {
        status: 'accepted',
        profile: { id: 'friend-1', handle: 'dana', buddySummary: { name: 'Dana' } },
      },
    ],
  }),
}));

interface TestRoot {
  root: { findAllByProps(props: Record<string, unknown>): unknown[] };
  toJSON(): unknown;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const DAY = 24 * 60 * 60 * 1000;

function round(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mirror_1',
    ownerId: 'me',
    mode: 'confidential',
    questionIds: ['atMyBest', 'helpedSomeone', 'underestimate', 'positiveImpact', 'useMoreOften'],
    customQuestions: [],
    status: 'open',
    openedAt: Date.now() - 4 * DAY,
    closesAt: Date.now() + 3 * DAY,
    ...overrides,
  };
}

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(MirrorScreen));
  });
  await act(async () => {});
  if (!r) throw new Error('render failed');
  return r;
}

const json = (r: TestRoot) => JSON.stringify(r.toJSON());

beforeEach(() => jest.clearAllMocks());

describe('Mirror — a round that is still collecting', () => {
  it('shows the count and the nudge, and never a contributor', async () => {
    gateway.current = {
      enabled: true,
      myRounds: jest.fn(async () => [round()] as never),
      answeredCount: jest.fn(async () => 3),
      requestSynthesis: jest.fn(),
      visibleResponses: jest.fn(),
    };

    const out = json(await render());

    expect(out).toContain('mirror.round.collecting');
    expect(out).toContain('mirror.round.collectingNote');
    // Four days in and short of five: the nudge is due, and it says a number, never a name.
    expect(out).toContain('mirror.round.nudge');
    expect(out).toContain('mirror.round.close');
    expect(out).not.toContain('Dana');
    // Nothing is produced before the round closes, whatever the count says.
    expect(gateway.current.requestSynthesis).not.toHaveBeenCalled();
  });
});

describe('Mirror — a confidential round that is over', () => {
  it('asks the server, and shows both the published patterns and the honest refusals', async () => {
    gateway.current = {
      enabled: true,
      myRounds: jest.fn(async () => [round({ status: 'closed', closesAt: Date.now() - DAY })] as never),
      answeredCount: jest.fn(async () => 5),
      requestSynthesis: jest.fn(async () => 'delivered' as const),
      synthesis: jest.fn(async () => [
        { roundId: 'mirror_1', questionId: 'atMyBest', body: 'People see you steadiest when things are hard.' },
        { roundId: 'mirror_1', questionId: 'helpedSomeone', body: '', rejection: 'noPattern' as const },
        { roundId: 'mirror_1', questionId: 'underestimate', body: '', rejection: 'leaked' as const },
      ]),
    };

    const r = await render();
    const out = json(r);

    expect(gateway.current.requestSynthesis).toHaveBeenCalledWith('mirror_1');
    expect(out).toContain('mirror.round.delivered');
    expect(out).toContain('People see you steadiest when things are hard.');
    expect(out).toContain('mirror.round.noPattern');
    expect(out).toContain('mirror.round.leakedNote');
    // The two questions no row came back for are still named, and still say something true.
    expect(out).toContain('mirror.round.emptyNote');
  });

  it('says so plainly when the round closed short, and asks for nothing else', async () => {
    gateway.current = {
      enabled: true,
      myRounds: jest.fn(async () => [round({ status: 'closed', closesAt: Date.now() - DAY })] as never),
      requestSynthesis: jest.fn(async () => 'notEnough' as const),
      synthesis: jest.fn(),
      visibleResponses: jest.fn(),
    };

    const out = json(await render());

    expect(out).toContain('mirror.round.notEnough');
    expect(out).toContain('mirror.round.notEnoughBody');
    expect(gateway.current.synthesis).not.toHaveBeenCalled();
    expect(gateway.current.visibleResponses).not.toHaveBeenCalled();
  });

  it('offers a retry rather than an empty result when the server could not be reached', async () => {
    gateway.current = {
      enabled: true,
      myRounds: jest.fn(async () => [round({ status: 'closed', closesAt: Date.now() - DAY })] as never),
      requestSynthesis: jest.fn(async () => 'unavailable' as const),
      synthesis: jest.fn(),
    };

    const out = json(await render());

    expect(out).toContain('mirror.round.unavailable');
    expect(out).toContain('mirror.round.retry');
    expect(out).not.toContain('mirror.round.delivered');
  });
});
