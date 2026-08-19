/**
 * StepReportSheet — "not now" is ONE action (founder, device pass 2026-08-19).
 *
 * The menu used to carry both "Postpone" and "Reschedule", and on the device they read as the same
 * thing — because they were. Both mean "not now"; whether you name the new time yourself is a
 * choice made INSIDE the postpone sheet, not a separate decision beside it. These tests pin the
 * merge so the second row can't quietly come back:
 *   · exactly one "not now" row is offered, and choosing it reports `postpone`;
 *   · the dead `report.reschedule.*` copy is gone from the sheet entirely;
 *   · the rest of the menu (Done · Partial · Couldn't · the reverse path) is untouched.
 *
 * i18n echoes keys, so a re-added Reschedule row would show up as its key and fail here.
 */
import { createElement, type ReactElement } from 'react';

import { StepReportSheet, type ReportChoice } from '../StepReportSheet';
import type { StepStatus } from '@/core/status/stepStatus';

jest.mock('@/global.css', () => ({}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

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

function renderSheet(status: StepStatus = 'unreported') {
  const onChoose = jest.fn<void, [ReportChoice]>();
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(
      createElement(StepReportSheet, {
        visible: true,
        stepTitle: 'Jog 15 minutes',
        status,
        locked: false,
        onChoose,
        onClose: jest.fn(),
      }),
    );
  });
  return { root, onChoose };
}

const tree = (root: TestRoot) => JSON.stringify(root.toJSON());

describe('StepReportSheet — Postpone and Reschedule are one action', () => {
  it('offers no Reschedule row at all', () => {
    const json = tree(renderSheet().root);
    expect(json).not.toContain('report.reschedule');
  });

  it('offers exactly one "not now" row, and it reports `postpone`', () => {
    const { root, onChoose } = renderSheet();
    // Count by the row's HINT line, which is rendered exactly once per row (the label also appears
    // as the row's accessibilityLabel, so counting it would read 2 for a single row).
    const json = tree(root);
    expect(json.split('report.postpone.hint').length - 1).toBe(1);
    // …and the menu offers three option rows in total: Partial, Couldn't, and the one "not now".
    expect(json.split('.hint"').length - 1).toBe(3);

    const rows = root.root.findAllByProps({ accessibilityLabel: 'report.postpone.label' });
    TestRenderer.act(() => rows[0].props.onPress());
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith('postpone');
  });

  it('leaves the rest of the menu exactly as it was', () => {
    const json = tree(renderSheet().root);
    expect(json).toContain('report.partial.label');
    expect(json).toContain('report.couldnt.label');
    expect(json).toContain('report.doneA11y');
  });

  it('still offers the reverse path on an already-reported Step', () => {
    expect(tree(renderSheet('completed').root)).toContain('report.notReportedYet');
  });
});
