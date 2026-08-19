/**
 * TodayFocusCard — the streak-role badge (Open Work 1.1).
 *
 * The defect this closes is not a wrong rule, it is an invisible one: a Step with slack left in the
 * week and a Step with none rendered identically, so a missed Step whose streak still rose read as a
 * bug. These tests hold the visible difference down:
 *   · a Step with slack is labelled `recommended`, one without is labelled `binding`;
 *   · each state announces its CONSEQUENCE in words, so the meaning is never colour-only;
 *   · a settled (completed) Step carries no badge — the question is only about a Step still open;
 *   · the badge is additive: the reporting-status chip and the row's identity are untouched.
 *
 * Same stub set as TodayFocusCard.reported.test.tsx (i18n echoes keys; the native swipe is stubbed).
 */
import { createElement, type ReactElement } from 'react';

import { TodayFocusCard } from '../TodayFocusCard';
import type { StepStatus } from '@/core/status/stepStatus';
import type { StreakRole } from '@/core/util/urgency';

jest.mock('@/global.css', () => ({}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    SwipeDirection: { LEFT: 'left', RIGHT: 'right' },
    default: function SwipeableStub({ ref, ...props }: Record<string, any>) {
      React.useImperativeHandle(ref, () => ({ close: jest.fn() }), []);
      return React.createElement(View, { ...props, testID: 'swipeable' }, props.children);
    },
  };
});

interface TestInstance {
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
  toJSON(): any;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void): void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');

const TITLE = 'Jog 15 minutes';

function renderCard(status: StepStatus, streakRole?: StreakRole) {
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(
      createElement(TodayFocusCard, {
        icon: 'walk',
        title: TITLE,
        meta: 'Run 5km · Milestone 2 of 4',
        progress: 0.5,
        urgency: 'calm',
        status,
        streakRole,
        onPress: jest.fn(),
        onDone: jest.fn(),
        onPostpone: jest.fn(),
        onLetGo: jest.fn(),
      }),
    );
  });
  return root;
}

const tree = (root: TestRoot) => JSON.stringify(root.toJSON());

describe('TodayFocusCard — the streak role is SHOWN, not left to be inferred', () => {
  it('labels a Step with slack left in the week as `recommended`', () => {
    expect(tree(renderCard('unreported', 'recommended'))).toContain('streakRole.recommended.label');
  });

  it('labels the Step the week now rests on as `binding`', () => {
    expect(tree(renderCard('unreported', 'binding'))).toContain('streakRole.binding.label');
  });

  it('never shows both labels at once', () => {
    const json = tree(renderCard('unreported', 'recommended'));
    expect(json).not.toContain('streakRole.binding.label');
  });

  it('spells the streak consequence out in words, so the meaning is never colour-only', () => {
    for (const role of ['recommended', 'binding'] as const) {
      const card = renderCard('unreported', role);
      expect(
        card.root.findAllByProps({ accessibilityLabel: `streakRole.${role}.a11y` }).length,
      ).toBeGreaterThan(0);
    }
  });

  it('drops the badge on a settled Step — the question is only about one still open', () => {
    expect(tree(renderCard('completed', 'binding'))).not.toContain('streakRole.');
  });

  it('renders nothing at all when the role is unknown', () => {
    expect(tree(renderCard('unreported'))).not.toContain('streakRole.');
  });

  it('is additive — the reporting-status chip and the row identity are untouched', () => {
    const json = tree(renderCard('partially_completed', 'binding'));
    expect(json).toContain(TITLE);
    expect(json).toContain('report.status.partiallyCompleted');
    expect(json).toContain('streakRole.binding.label');
  });
});
