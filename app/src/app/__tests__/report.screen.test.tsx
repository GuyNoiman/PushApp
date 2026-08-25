/**
 * Help and feedback — the screen a person reaches when the app has just disappointed them.
 *
 * Two things are worth holding still, and both are promises rather than features:
 *   • it says what travels with the report BEFORE it is sent — in the screen, not in a policy
 *     nobody opens;
 *   • a failure to send is stated. A report that silently vanished is worse than a form that admits
 *     it failed, because the person believes they told us.
 */
import { createElement, type ReactElement } from 'react';

import ReportScreen from '../settings/report';
import type { ReportGateway } from '@/core/reports';

jest.mock('@/global.css', () => ({}));

const gateway: { current: Partial<ReportGateway> } = { current: {} };
jest.mock('@/core/reports', () => {
  const actual = jest.requireActual('@/core/reports/model');
  return { ...actual, getReportGateway: () => gateway.current };
});
jest.mock('@/core/reports/diagnostics', () => ({
  collectDiagnostics: () => ({ appVersion: '1.0.0', platform: 'ios', source: 'settings' }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

interface TestRoot {
  root: { findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[] };
  toJSON(): unknown;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(ReportScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
const byLabel = (r: TestRoot, label: string) => r.root.findAllByProps({ accessibilityLabel: label });

beforeEach(() => jest.clearAllMocks());

describe('before anything is sent', () => {
  it('says what will travel with the report', async () => {
    gateway.current = { enabled: true, send: jest.fn() };
    const out = json(await render());
    expect(out).toContain('report.whatWeSend');
    expect(out).toContain('report.categoryLabel');
  });

  it('will not send until there is a category and something written', async () => {
    gateway.current = { enabled: true, send: jest.fn(async () => 'r1') };
    const r = await render();

    const send = byLabel(r, 'report.send').find((n) => typeof n.props.onPress === 'function');
    await act(async () => send?.props.onPress());

    expect(gateway.current.send).not.toHaveBeenCalled();
  });
});

describe('sending', () => {
  async function fillAndSend(r: TestRoot) {
    const category = byLabel(r, 'report.category.not_working').find(
      (n) => typeof n.props.onPress === 'function',
    );
    await act(async () => category?.props.onPress());
    const input = r.root
      .findAllByProps({ multiline: true })
      .find((n) => typeof n.props.onChangeText === 'function');
    await act(async () => input?.props.onChangeText('The space bar does nothing on question two'));
    const send = byLabel(r, 'report.send').find((n) => typeof n.props.onPress === 'function');
    await act(async () => send?.props.onPress());
  }

  it('sends the category, the words, and only the allowlisted facts', async () => {
    const send = jest.fn(async () => 'r1');
    gateway.current = { enabled: true, send };
    const r = await render();

    await fillAndSend(r);

    expect(send).toHaveBeenCalledTimes(1);
    const [draft, diagnostics] = send.mock.calls[0] as unknown as [Record<string, unknown>, Record<string, unknown>];
    expect(draft.category).toBe('not_working');
    expect(draft.description).toContain('space bar');
    expect(Object.keys(diagnostics).sort()).toEqual(['appVersion', 'platform', 'source']);
    expect(json(r)).toContain('report.sentTitle');
  });

  it('says so when it could not be sent, instead of thanking them for nothing', async () => {
    gateway.current = { enabled: true, send: jest.fn(async () => null) };
    const r = await render();

    await fillAndSend(r);

    const out = json(r);
    expect(out).toContain('report.failed');
    expect(out).not.toContain('report.sentTitle');
  });
});
