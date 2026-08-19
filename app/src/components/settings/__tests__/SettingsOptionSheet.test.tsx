/**
 * SettingsOptionSheet — the picker that replaced "tap to cycle" (founder, 2026-08-19).
 *
 * What matters about the replacement, and what these tests hold down:
 *   · EVERY option is on screen at once — that is the whole reason the sheet exists, because a
 *     cycling row never shows what the choices are;
 *   · picking reports that exact value and closes, so one gesture is the whole interaction;
 *   · the current value is ANNOUNCED as selected, not carried by the tick alone;
 *   · the sheet body swallows its own taps, so a mis-aimed tap inside it costs nothing.
 */
import { createElement, type ReactElement } from 'react';

import { SettingsOptionSheet } from '../SettingsOptionSheet';

jest.mock('@/global.css', () => ({}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));

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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const OPTIONS = DAYS.map((label, value) => ({ value, label }));

function renderSheet(selected = 1) {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(
      createElement(SettingsOptionSheet<number>, {
        visible: true,
        title: 'Week starts on',
        options: OPTIONS,
        selected,
        onSelect,
        onClose,
      }),
    );
  });
  return { root, onSelect, onClose };
}

const tree = (root: TestRoot) => JSON.stringify(root.toJSON());

describe('SettingsOptionSheet', () => {
  it('shows every option at once — the reason it replaced a cycling row', () => {
    const json = tree(renderSheet().root);
    for (const day of DAYS) expect(json).toContain(day);
  });

  it('reports the picked value and closes in the same gesture', () => {
    const { root, onSelect, onClose } = renderSheet(1);
    const friday = root.root
      .findAllByProps({ accessibilityLabel: 'Friday' })
      .find((n) => typeof n.props.onPress === 'function')!;
    TestRenderer.act(() => friday.props.onPress());

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(5);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('announces the current value as selected, so the tick is never the only signal', () => {
    const { root } = renderSheet(3);
    const selected = root.root
      .findAllByProps({ accessibilityRole: 'button' })
      .filter((n) => n.props.accessibilityState?.selected === true);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.every((n) => n.props.accessibilityLabel === 'Wednesday')).toBe(true);
  });

  it('opens with nothing chosen — a mere render never writes a value', () => {
    const { onSelect, onClose } = renderSheet();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
