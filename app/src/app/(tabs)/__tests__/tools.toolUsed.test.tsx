/**
 * Tools tab — opening a Tool is what "Discover one Tool" asks for (Gap Register B2).
 *
 * The Tools share no single "an entry was saved" moment (five stores; some save nothing at all), so
 * the moment every Tool has in common is being opened from this tab. This proves that moment reports
 * `toolUsed` to the core, alongside what it already did: remember the Tool and go to it.
 */
jest.mock('@/global.css', () => ({}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('@/hooks/use-tab-press', () => ({ useOnTabPress: () => {} }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/ui/TabScrollView', () => ({
  TabScrollView: ({ children }: { children: unknown }) => children,
}));
const mockShelf = {
  // Recently used, so the Tool sits in the rail at the top of the tab.
  usage: { lifeWheel: Date.now() } as Record<string, number>,
  saved: [] as string[],
  markUsed: jest.fn(),
  isSaved: () => false,
  toggleSaved: jest.fn(),
};
jest.mock('@/state/ToolsShelf', () => ({ useToolsShelf: () => mockShelf }));
const mockCore = { noteInAppAction: jest.fn() };
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: mockCore }) }));

import { createElement, type ReactElement } from 'react';

import ToolsScreen from '../tools';

interface Node {
  props: Record<string, any>;
}
interface TestRoot {
  root: { findAll(predicate: (n: Node) => boolean): Node[] };
  unmount(): void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void): void } = require('react-test-renderer');

it('reports the Tool as used, remembers it, and opens it', () => {
  let r!: TestRoot;
  TestRenderer.act(() => {
    r = TestRenderer.create(createElement(ToolsScreen));
  });
  const lifeWheel = r.root.findAll(
    (n) => n.props.accessibilityLabel === 'items.lifeWheel' && typeof n.props.onPress === 'function',
  )[0];
  expect(lifeWheel).toBeDefined();

  TestRenderer.act(() => lifeWheel.props.onPress());

  expect(mockCore.noteInAppAction).toHaveBeenCalledWith('toolUsed');
  expect(mockShelf.markUsed).toHaveBeenCalledWith('lifeWheel');
  expect(mockPush).toHaveBeenCalledWith('/tools/life-wheel');
  TestRenderer.act(() => r.unmount());
});
