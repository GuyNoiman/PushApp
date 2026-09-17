/**
 * TEMPORARY — Settings › Portrait (tester view). Remove with `../portrait-tester.tsx`.
 *
 * What this pins: with the tester tools on, every field of the Portrait is shown in the order of the
 * type, each with its stored `value`, `confidence`, `source` and a readable `updatedAt`; an enum also
 * shows its meaning; an absent field shows "—"; the raw object is there as JSON; the screen follows
 * the core when the Portrait changes; and with the tools off, none of it is rendered at all.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en-US' } }),
}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement, type ReactElement } from 'react';

import { BOTTLENECK_MEANINGS, PORTRAIT_FIELDS, type Portrait } from '@/core/coach/portrait';
import { TESTER_TOOLS_KEY } from '@/state/TesterTools';

const AT = 1_700_000_000_000;

/** Every field filled, one of each shape. */
const FULL: Portrait = {
  primaryWant: { value: 'change careers into design', confidence: 'high', source: 'stated', updatedAt: AT },
  domain: { value: 'career', confidence: 'medium', source: 'inferred', updatedAt: AT },
  currentState: { value: 'accountant for eight years', confidence: 'high', source: 'stated', updatedAt: AT },
  desiredOutcome: { value: 'work that feels like mine', confidence: 'low', source: 'inferred', updatedAt: AT },
  stage: { value: 'prepare', confidence: 'medium', source: 'inferred', updatedAt: AT },
  bottleneck: { value: 'lack_of_plan', confidence: 'medium', source: 'inferred', updatedAt: AT },
  supportNeed: { value: 'planning', confidence: 'low', source: 'inferred', updatedAt: AT },
  readiness: { value: 'prepare', confidence: 'low', source: 'inferred', updatedAt: AT },
  previousAttempts: { value: 'an online course, dropped halfway', confidence: 'high', source: 'stated', updatedAt: AT },
  constraints: { value: ['two kids', 'evenings only'], confidence: 'high', source: 'stated', updatedAt: AT },
};

let mockPortrait: Portrait | undefined;
let mockHandoffUsedAt: number | undefined;
let mockSnapshot = {};
const mockCore = {
  getPortrait: () => mockPortrait,
  getPortraitHandoffUsedAt: () => mockHandoffUsedAt,
};
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: mockCore, snapshot: mockSnapshot }) }));

import PortraitTesterScreen from '../portrait-tester';

interface Node {
  type: unknown;
  props: Record<string, any>;
  children: (Node | string)[];
}
interface TestRoot {
  root: { findAll(predicate: (n: Node) => boolean): Node[] };
  update(e: ReactElement): void;
  unmount(): void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void | Promise<void>): Promise<void> } =
  require('react-test-renderer');

let mounted: TestRoot | undefined;
async function render(): Promise<TestRoot> {
  await TestRenderer.act(async () => {
    mounted = TestRenderer.create(createElement(PortraitTesterScreen));
  });
  return mounted!;
}

/** Every string rendered inside a node, in order. */
function textsIn(node: Node | string): string[] {
  if (typeof node === 'string') return [node];
  return node.children.flatMap(textsIn);
}
const hostById = (r: TestRoot, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.type === 'string')[0];
const allTexts = (r: TestRoot) => r.root.findAll((n) => n.type === 'Text').flatMap((n) => textsIn(n));

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(TESTER_TOOLS_KEY, 'true');
  mockPortrait = undefined;
  mockHandoffUsedAt = undefined;
  mockSnapshot = {};
});
afterEach(async () => {
  if (mounted) await TestRenderer.act(async () => mounted!.unmount());
  mounted = undefined;
});

describe('with the tester tools on', () => {
  it('shows every field in the order of the type, with value, confidence, source and updatedAt', async () => {
    mockPortrait = FULL;
    mockHandoffUsedAt = AT + 1;
    const r = await render();

    expect(textsIn(hostById(r, 'portrait-exists'))).toEqual(['testerTools.yes']);
    expect(textsIn(hostById(r, 'portrait-handoff'))).toEqual([new Date(AT + 1).toLocaleString('en-US')]);

    const readable = new Date(AT).toLocaleString('en-US');
    const order = allTexts(r).filter((s) => PORTRAIT_FIELDS.some((f) => f.id === s));
    expect(order).toEqual(PORTRAIT_FIELDS.map((f) => f.id));

    for (const spec of PORTRAIT_FIELDS) {
      const held = FULL[spec.id]!;
      const texts = textsIn(hostById(r, `portrait-field-${spec.id}`));
      expect(texts[0]).toBe(spec.id);
      expect(texts).toEqual(expect.arrayContaining(['value', 'confidence', 'source', 'updatedAt']));
      expect(texts).toContain(held.confidence);
      expect(texts).toContain(held.source);
      expect(texts).toContain(readable);
      expect(texts).not.toContain('—');
    }
  });

  it('shows a list as one bullet line per item', async () => {
    mockPortrait = FULL;
    const r = await render();
    const texts = textsIn(hostById(r, 'portrait-field-constraints'));
    expect(texts).toEqual(expect.arrayContaining(['• two kids', '• evenings only']));
  });

  it('shows an enum as stored, with its meaning from the taxonomy table', async () => {
    mockPortrait = FULL;
    const r = await render();
    const texts = textsIn(hostById(r, 'portrait-field-bottleneck'));
    expect(texts).toEqual(expect.arrayContaining(['lack_of_plan', BOTTLENECK_MEANINGS.lack_of_plan]));
  });

  it('shows "—" for every field the Portrait does not hold', async () => {
    mockPortrait = { primaryWant: FULL.primaryWant };
    const r = await render();

    expect(textsIn(hostById(r, 'portrait-field-primaryWant'))).not.toContain('—');
    for (const spec of PORTRAIT_FIELDS.filter((f) => f.id !== 'primaryWant')) {
      expect(textsIn(hostById(r, `portrait-field-${spec.id}`))).toEqual([spec.id, '—']);
    }
    expect(textsIn(hostById(r, 'portrait-handoff'))).toEqual(['—']);
  });

  it('says when there is no Portrait at all', async () => {
    const r = await render();
    expect(textsIn(hostById(r, 'portrait-exists'))).toEqual(['testerTools.no']);
    expect(textsIn(hostById(r, 'portrait-json'))).toEqual(['null']);
  });

  it('shows the raw stored object as selectable JSON', async () => {
    mockPortrait = FULL;
    const r = await render();
    const json = hostById(r, 'portrait-json');
    expect(json.props.selectable).toBe(true);
    expect(JSON.parse(textsIn(json).join(''))).toEqual(FULL);
  });

  it('follows the core when the Portrait changes', async () => {
    const r = await render();
    expect(textsIn(hostById(r, 'portrait-field-domain'))).toEqual(['domain', '—']);

    mockPortrait = { domain: FULL.domain };
    mockSnapshot = {};
    await TestRenderer.act(async () => r.update(createElement(PortraitTesterScreen)));
    expect(textsIn(hostById(r, 'portrait-field-domain'))).toContain('career');
  });
});

describe('with the tester tools off', () => {
  it('renders nothing of the Portrait, even when reached directly', async () => {
    await AsyncStorage.removeItem(TESTER_TOOLS_KEY);
    mockPortrait = FULL;
    const r = await render();

    expect(allTexts(r)).toContain('testerTools.lockedBody');
    expect(hostById(r, 'portrait-json')).toBeUndefined();
    expect(allTexts(r)).not.toContain('change careers into design');
  });
});
