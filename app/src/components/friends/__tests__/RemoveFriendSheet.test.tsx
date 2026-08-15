/**
 * RemoveFriendSheet — the destructive confirmation for "Remove friend" (Friend_Profile_PRD §4.5).
 *
 * The whole point of this sheet is that the numbers in front of an irreversible action are never
 * guessed, so that is what these tests hold down:
 *   · while the impact is loading the destructive button is DISABLED;
 *   · if the impact load FAILS it stays disabled — no `0` is ever shown as a fact, and Retry
 *     re-asks rather than giving up;
 *   · it unlocks only when the counts are known AND the acknowledgement is ticked;
 *   · a MEASURED zero reads as its own calm sentence, visibly different from "we couldn't check";
 *   · a failed removal keeps the sheet open with a translated message (the provider's `removeFriend`
 *     re-throws for exactly this reason), and a successful one hands off to `onRemoved`.
 *
 * The sheet is rendered directly with injected `loadImpact` / `onConfirm`, since that injection IS
 * its contract. The addressed `t` (D31) echoes its key + interpolation options, so a count is
 * asserted by i18n key AND by the numbers it was handed.
 */
import { createElement, type ReactElement } from 'react';

import { RemoveFriendSheet } from '../RemoveFriendSheet';
import type { UnfriendImpact } from '@/core/social';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
const echo = (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k);
// The sheet speaks to the user, so it uses the addressed `t` (which reads ProfileProvider); stub the
// hook so the sheet can be tested on its own.
jest.mock('@/i18n/useAddressedTranslation', () => ({ useAddressedTranslation: () => ({ t: echo }) }));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));

// react-test-renderer ships no types; type just the surface used here.
interface TestInstance {
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
  toJSON(): unknown;
  update(element: ReactElement): void;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
/** The stubbed `t()` output as it appears inside the stringified tree (quotes escaped once more). */
const tKey = (k: string, opts?: Record<string, unknown>) => JSON.stringify(echo(k, opts)).slice(1, -1);
// findAllByProps returns each Pressable's composite + forwarded host View; the composite carries a
// function `onPress`. Filter to it so a match is one logical element (and pressable).
const byLabel = (r: TestRoot, a11yLabel: string) =>
  r.root.findAllByProps({ accessibilityLabel: a11yLabel }).filter((n) => typeof n.props.onPress === 'function');
/** Press the first element carrying this accessibility label, flushing any async handler. */
async function press(r: TestRoot, a11yLabel: string) {
  await act(async () => {
    byLabel(r, a11yLabel)[0].props.onPress();
    await Promise.resolve();
  });
}
/** Is the destructive button offerable right now? (asserted through a11y, not by pressing it) */
const confirmDisabled = (r: TestRoot) =>
  byLabel(r, 'remove.confirm')[0].props.accessibilityState.disabled === true;

const NO_IMPACT: UnfriendImpact = {
  journeysTheySupportForMe: 0,
  journeysISupportForThem: 0,
  pendingInvites: 0,
};

interface SheetProps {
  loadImpact?: () => Promise<UnfriendImpact>;
  onConfirm?: () => Promise<void>;
  onRemoved?: () => void;
  onCancel?: () => void;
}

const sheet = (props: SheetProps, visible: boolean) =>
  createElement(RemoveFriendSheet, {
    visible,
    friendName: 'Pip',
    loadImpact: props.loadImpact ?? (async () => NO_IMPACT),
    onCancel: props.onCancel ?? jest.fn(),
    onConfirm: props.onConfirm ?? (async () => {}),
    onRemoved: props.onRemoved ?? jest.fn(),
  });

/** Mount the sheet already open (its impact read fires on `visible`) and flush that read. */
async function mount(props: SheetProps = {}): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(sheet(props, true));
  });
  await act(async () => {
    await Promise.resolve();
  });
  if (!r) throw new Error('render failed');
  return r;
}

/** Close the sheet and open it again, as dismissing and re-tapping "Remove friend" would. */
async function reopen(r: TestRoot, props: SheetProps) {
  await act(async () => {
    r.update(sheet(props, false));
  });
  await act(async () => {
    r.update(sheet(props, true));
    await Promise.resolve();
  });
}

beforeEach(() => jest.clearAllMocks());

describe('RemoveFriendSheet — the destructive button stays locked until the counts are known', () => {
  it('is disabled while the impact is still loading', async () => {
    // A read that never settles holds the sheet in its checking state.
    const r = await mount({ loadImpact: () => new Promise<UnfriendImpact>(() => {}) });

    expect(json(r)).toContain(tKey('remove.checking'));
    expect(confirmDisabled(r)).toBe(true);
    // The acknowledgement cannot even be ticked yet — there is nothing to acknowledge.
    expect(byLabel(r, 'remove.acknowledge')[0].props.accessibilityState.disabled).toBe(true);
  });

  it('STAYS disabled after an impact-load error, and shows "we couldn’t check" instead of a 0', async () => {
    const r = await mount({ loadImpact: jest.fn(async () => { throw new Error('offline'); }) });

    expect(json(r)).toContain(tKey('remove.checkError'));
    // The honest failure line, NOT the measured "this won't affect any shared Journeys".
    expect(json(r)).not.toContain(tKey('remove.none'));
    expect(json(r)).not.toContain(tKey('remove.summary', { name: 'Pip', theirs: 0, yours: 0 }));
    expect(confirmDisabled(r)).toBe(true);

    // Ticking is barred too, so there is no route to an enabled destructive button.
    await press(r, 'remove.acknowledge');
    expect(confirmDisabled(r)).toBe(true);
  });

  it('Retry re-asks for the counts, and a second-attempt success unlocks the flow', async () => {
    const loadImpact = jest
      .fn<Promise<UnfriendImpact>, []>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ journeysTheySupportForMe: 2, journeysISupportForThem: 1, pendingInvites: 0 });
    const r = await mount({ loadImpact });

    await press(r, 'remove.checkRetry');
    expect(loadImpact).toHaveBeenCalledTimes(2);
    expect(json(r)).not.toContain(tKey('remove.checkError'));
    expect(json(r)).toContain(tKey('remove.summary', { name: 'Pip', theirs: 2, yours: 1 }));

    await press(r, 'remove.acknowledge');
    expect(confirmDisabled(r)).toBe(false);
  });

  it('needs BOTH the loaded counts and the acknowledgement before it unlocks', async () => {
    const onConfirm = jest.fn(async () => {});
    const r = await mount({
      loadImpact: async () => ({ journeysTheySupportForMe: 1, journeysISupportForThem: 0, pendingInvites: 0 }),
      onConfirm,
    });

    // Counts are in, but nobody has agreed to anything yet.
    expect(confirmDisabled(r)).toBe(true);
    await press(r, 'remove.confirm');
    expect(onConfirm).not.toHaveBeenCalled();

    await press(r, 'remove.acknowledge');
    expect(confirmDisabled(r)).toBe(false);
  });
});

describe('RemoveFriendSheet — what the counts actually say', () => {
  it('renders the real X/Y counts, and the pending-invite line when invites are waiting', async () => {
    const r = await mount({
      loadImpact: async () => ({ journeysTheySupportForMe: 3, journeysISupportForThem: 2, pendingInvites: 1 }),
    });

    expect(json(r)).toContain(tKey('remove.summary', { name: 'Pip', theirs: 3, yours: 2 }));
    expect(json(r)).toContain(tKey('remove.pending', { pending: 1 }));
    expect(json(r)).not.toContain(tKey('remove.none'));
  });

  it('re-reads the counts every time it opens — never from a cache', async () => {
    // The other person may have shared or withdrawn a Journey since the profile loaded, and these
    // numbers sit in front of an irreversible action.
    const props = {
      loadImpact: jest.fn(async () => ({
        journeysTheySupportForMe: 1,
        journeysISupportForThem: 0,
        pendingInvites: 0,
      })),
    };
    const r = await mount(props);
    expect(props.loadImpact).toHaveBeenCalledTimes(1);

    // Dismiss the way a person does — Cancel — then come back.
    await press(r, 'remove.acknowledge');
    await press(r, 'remove.cancel');
    await reopen(r, props);

    expect(props.loadImpact).toHaveBeenCalledTimes(2);
    // And it re-opens clean: the earlier acknowledgement is not still ticked behind the scenes.
    expect(confirmDisabled(r)).toBe(true);
  });

  it('on re-open it goes back to checking — the previous counts are never re-shown as current', async () => {
    const props = {
      loadImpact: jest
        .fn<Promise<UnfriendImpact>, []>()
        .mockResolvedValueOnce({ journeysTheySupportForMe: 3, journeysISupportForThem: 2, pendingInvites: 0 })
        // The second read hangs, so anything on screen is what the sheet chose to show meanwhile.
        .mockImplementation(() => new Promise<UnfriendImpact>(() => {})),
    };
    const r = await mount(props);
    expect(json(r)).toContain(tKey('remove.summary', { name: 'Pip', theirs: 3, yours: 2 }));

    await press(r, 'remove.cancel');
    await reopen(r, props);

    expect(json(r)).toContain(tKey('remove.checking'));
    expect(json(r)).not.toContain(tKey('remove.summary', { name: 'Pip', theirs: 3, yours: 2 }));
    expect(confirmDisabled(r)).toBe(true);
  });

  it('a MEASURED zero reads as its own sentence — never as the unknown-counts state', async () => {
    const r = await mount({ loadImpact: async () => NO_IMPACT });
    const shown = json(r);

    expect(shown).toContain(tKey('remove.none'));
    // The three things a measured zero is NOT: a failure, a spinner, or a fabricated "0 and 0".
    expect(shown).not.toContain(tKey('remove.checkError'));
    expect(shown).not.toContain(tKey('remove.checking'));
    expect(shown).not.toContain(tKey('remove.summary', { name: 'Pip', theirs: 0, yours: 0 }));
    expect(shown).not.toContain(tKey('remove.pending', { pending: 0 }));
    // And unlike the error state, a measured zero can be confirmed against.
    await press(r, 'remove.acknowledge');
    expect(confirmDisabled(r)).toBe(false);
  });
});

describe('RemoveFriendSheet — confirming', () => {
  it('a failed removal keeps the sheet open with a TRANSLATED message', async () => {
    const onRemoved = jest.fn();
    const r = await mount({
      onConfirm: jest.fn(async () => { throw new Error('denied'); }),
      onRemoved,
    });

    await press(r, 'remove.acknowledge');
    await press(r, 'remove.confirm');

    expect(json(r)).toContain(tKey('remove.errorGeneric', { name: 'Pip' }));
    // Never the raw server string: it is English-only and means nothing to the person reading it.
    expect(json(r)).not.toContain('denied');
    expect(onRemoved).not.toHaveBeenCalled();
    // Still open, still actionable — the acknowledgement survives so one tap retries.
    expect(byLabel(r, 'remove.confirm')).toHaveLength(1);
    expect(confirmDisabled(r)).toBe(false);
  });

  it('a successful removal calls onRemoved exactly once', async () => {
    const onConfirm = jest.fn(async () => {});
    const onRemoved = jest.fn();
    const r = await mount({ onConfirm, onRemoved });

    await press(r, 'remove.acknowledge');
    await press(r, 'remove.confirm');

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onRemoved).toHaveBeenCalledTimes(1);
    expect(json(r)).not.toContain(tKey('remove.errorGeneric', { name: 'Pip' }));
  });

  it('Cancel dismisses without touching the friendship', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn(async () => {});
    const r = await mount({ onCancel, onConfirm });

    await press(r, 'remove.cancel');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
