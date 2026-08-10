/**
 * stepStatus unit tests — the full derivation matrix (D35 §5 / D36). Pure TS. Proves the four
 * distinct statuses, that a postpone stays `unreported`, that the latest terminal report wins, and
 * that `lastReportClearedAt` supersedes older rows while the history itself is untouched.
 */
import type { PostponeAction, ReasonEntry, ReasonId, Step } from '../../types/domain';
import { deriveStepStatus } from '../stepStatus';

function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    id: 'step_1',
    title: 'Walk',
    isStarterStep: false,
    cadence: 'once',
    done: false,
    ...overrides,
  };
}

let seq = 0;
function reason(
  reasonId: ReasonId,
  action: PostponeAction,
  at: number,
  overrides: Partial<ReasonEntry> = {},
): ReasonEntry {
  seq += 1;
  return {
    id: `reason_${seq}`,
    stepId: 'step_1',
    journeyId: 'journey_1',
    reasonId,
    leverIds: [],
    outcome: 'logged',
    at,
    action,
    ...overrides,
  };
}

describe('deriveStepStatus', () => {
  it('defaults to unreported for a pristine Step with no log', () => {
    expect(deriveStepStatus(makeStep())).toBe('unreported');
    expect(deriveStepStatus(makeStep(), [])).toBe('unreported');
  });

  it('is completed when the Step is done', () => {
    expect(deriveStepStatus(makeStep({ done: true }))).toBe('completed');
  });

  it('done wins even if a partial/couldn\'t entry exists in the log', () => {
    const log = [reason('did_partially', 'postpone', 100), reason('couldnt', 'cancel', 200)];
    expect(deriveStepStatus(makeStep({ done: true }), log)).toBe('completed');
  });

  it('is partially_completed for a did_partially report', () => {
    const log = [reason('did_partially', 'postpone', 100)];
    expect(deriveStepStatus(makeStep(), log)).toBe('partially_completed');
  });

  it('is not_completed for a couldn\'t (cancel) report', () => {
    const log = [reason('couldnt', 'cancel', 100)];
    expect(deriveStepStatus(makeStep(), log)).toBe('not_completed');
  });

  it('treats any cancel action as not_completed regardless of reason id', () => {
    const log = [reason('not_relevant', 'cancel', 100)];
    expect(deriveStepStatus(makeStep(), log)).toBe('not_completed');
  });

  it('stays unreported for a plain postpone (an action, not a status — D37)', () => {
    const log = [
      reason('forgot', 'postpone', 100),
      reason('no_time', 'postpone', 200),
    ];
    expect(deriveStepStatus(makeStep(), log)).toBe('unreported');
  });

  it('takes the LATEST terminal report when several exist (append-only history)', () => {
    const partialThenCouldnt = [
      reason('did_partially', 'postpone', 100),
      reason('couldnt', 'cancel', 200),
    ];
    expect(deriveStepStatus(makeStep(), partialThenCouldnt)).toBe('not_completed');

    const couldntThenPartial = [
      reason('couldnt', 'cancel', 100),
      reason('did_partially', 'postpone', 200),
    ];
    expect(deriveStepStatus(makeStep(), couldntThenPartial)).toBe('partially_completed');
  });

  it('ignores a later postpone: the last TERMINAL report still stands', () => {
    const log = [
      reason('did_partially', 'postpone', 100),
      reason('forgot', 'postpone', 300),
    ];
    expect(deriveStepStatus(makeStep(), log)).toBe('partially_completed');
  });

  it('ignores entries belonging to a different Step', () => {
    const log = [reason('couldnt', 'cancel', 100, { stepId: 'other_step' })];
    expect(deriveStepStatus(makeStep(), log)).toBe('unreported');
  });

  it('supersedes terminal rows at/older than lastReportClearedAt', () => {
    const log = [reason('couldnt', 'cancel', 100)];
    // Cleared AFTER the report → the report no longer counts.
    expect(deriveStepStatus(makeStep({ lastReportClearedAt: 150 }), log)).toBe('unreported');
    // Cleared BEFORE the report → the report still stands.
    expect(deriveStepStatus(makeStep({ lastReportClearedAt: 50 }), log)).toBe('not_completed');
  });

  it('counts only the terminal report NEWER than a clear', () => {
    const log = [
      reason('did_partially', 'postpone', 100), // superseded by the clear
      reason('couldnt', 'cancel', 300), // after the clear → stands
    ];
    expect(deriveStepStatus(makeStep({ lastReportClearedAt: 200 }), log)).toBe('not_completed');
  });

  it('excludes a dropped Step (out of reporting scope → unreported)', () => {
    const log = [reason('did_partially', 'postpone', 100)];
    expect(deriveStepStatus(makeStep({ dropped: true }), log)).toBe('unreported');
  });

  it('KEEPS a report at the exact clear timestamp (reverse-then-apply may land same-ms)', () => {
    // A clear supersedes only STRICTLY older rows; a report at the same ms is a fresh correction.
    const log = [reason('couldnt', 'cancel', 200)];
    expect(deriveStepStatus(makeStep({ lastReportClearedAt: 200 }), log)).toBe('not_completed');
  });
});
