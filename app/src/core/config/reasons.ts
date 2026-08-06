/**
 * Reason catalog (Miss-Recovery slice) — the SOURCE OF TRUTH for the closed list of
 * "what happened" a user can pick when a Step didn't happen (config-before-code:
 * the list lives here, never hard-coded in an engine or a screen). Confirmed list,
 * PRD §3. `other` is captured as FREE TEXT only this slice — no AI classify yet.
 *
 * Copy is CARING, never accusatory (product-guardian, locked): the sheet asks "Want
 * to tell me what got in the way?" — never "Why didn't you do it?". Each reason's
 * `caringCopy` is a gentle, blame-free reassurance shown once it's chosen.
 *
 * Pure TS — no React, no UI, no vendor imports.
 */
import type { ReasonId } from '../types/domain';

export interface Reason {
  id: ReasonId;
  /** The short chip label shown in the reason list. */
  label: string;
  /** A gentle, non-accusatory line shown when this reason is chosen. */
  caringCopy: string;
  /**
   * Whether choosing this reason reveals a free-text field. Only `other` does.
   * SECURITY-PRIVACY G1: that text is the on-device-only `ReasonEntry.note` — it
   * must never leave the device or enter any event/summary/log/Profiling signal.
   */
  capturesNote: boolean;
}

/** The closed reason list, in display order (PRD §3). */
export const REASONS: readonly Reason[] = [
  {
    id: 'forgot',
    label: 'I forgot',
    caringCopy: "No worries — let's make it easier to remember next time.",
    capturesNote: false,
  },
  {
    id: 'no_time',
    label: 'No time',
    caringCopy: "Busy day. Let's find a lighter way to fit it in.",
    capturesNote: false,
  },
  {
    id: 'lost_motivation',
    label: 'Lost motivation',
    caringCopy: "That happens. Let's reconnect with why this matters to you.",
    capturesNote: false,
  },
  {
    id: 'too_hard',
    label: 'Too hard',
    caringCopy: "Let's make this Step smaller so it feels doable.",
    capturesNote: false,
  },
  {
    id: 'did_partially',
    label: 'Did it partially',
    caringCopy: 'Progress counts — every bit moves you forward.',
    capturesNote: false,
  },
  {
    id: 'couldnt',
    label: "Couldn't — life happened",
    caringCopy: "Totally understandable. Nothing changes — rest easy.",
    capturesNote: false,
  },
  {
    id: 'not_relevant',
    label: 'Not relevant anymore',
    caringCopy: "That's okay — let's edit this so it fits where you are now.",
    capturesNote: false,
  },
  {
    id: 'other',
    label: 'Something else',
    caringCopy: 'Tell me in your own words — this stays on your device.',
    capturesNote: true,
  },
] as const;

/** The caring header for the "What happened?" screen (product-guardian, locked). */
export const REASON_PROMPT = 'Want to tell me what got in the way?';

/** Look up a reason by id (or undefined if unknown). */
export function resolveReason(id: ReasonId): Reason | undefined {
  return REASONS.find((r) => r.id === id);
}
