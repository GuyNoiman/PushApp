/**
 * Reason catalog (Miss-Recovery slice) — the SOURCE OF TRUTH for the closed list of
 * "what happened" a user can pick when a Step didn't happen (config-before-code:
 * the list lives here, never hard-coded in an engine or a screen). Confirmed list,
 * PRD §3. `other` is captured as FREE TEXT only this slice — no AI classify yet.
 *
 * Copy is CARING, never accusatory (product-guardian, locked): the sheet asks "Want
 * to tell me what got in the way?" — never "Why didn't you do it?". Each reason's
 * caring copy is a gentle, blame-free reassurance shown once it's chosen.
 *
 * LANGUAGE (N1): the user-facing copy (each chip `label`, its `caringCopy`, and the
 * header prompt) now lives in the `journey` i18n namespace under `reason.*`, resolved
 * in the user's ACTIVE language via the framework-free i18next core instance
 * (`i18n.t`, never a React hook). This config keeps only the STRUCTURE — the stable
 * ids and which reason reveals a free-text field — so the id/lever logic is unchanged.
 *
 * Pure TS — no React, no UI, no vendor imports (the i18next core is framework-free).
 */
import i18n from '../../i18n';
import type { ReasonId } from '../types/domain';

export interface Reason {
  id: ReasonId;
  /**
   * Whether choosing this reason reveals a free-text field. Only `other` does.
   * SECURITY-PRIVACY G1: that text is the on-device-only `ReasonEntry.note` — it
   * must never leave the device or enter any event/summary/log/Profiling signal.
   */
  capturesNote: boolean;
}

/** The closed reason list, in display order (PRD §3). Copy → `journey` ns `reason.list.*`. */
export const REASONS: readonly Reason[] = [
  { id: 'forgot', capturesNote: false },
  { id: 'no_time', capturesNote: false },
  { id: 'lost_motivation', capturesNote: false },
  { id: 'too_hard', capturesNote: false },
  { id: 'did_partially', capturesNote: false },
  { id: 'couldnt', capturesNote: false },
  { id: 'not_relevant', capturesNote: false },
  { id: 'other', capturesNote: true },
] as const;

/** The short chip label for a reason, in the active language. */
export function reasonLabel(id: ReasonId): string {
  return i18n.t(`reason.list.${id}.label`, { ns: 'journey' });
}

/** The gentle, non-accusatory line shown when a reason is chosen, in the active language. */
export function reasonCaringCopy(id: ReasonId): string {
  return i18n.t(`reason.list.${id}.caring`, { ns: 'journey' });
}

/** The caring header for the "What happened?" screen (product-guardian, locked). */
export function reasonPrompt(): string {
  return i18n.t('reason.prompt', { ns: 'journey' });
}

/** Look up a reason by id (or undefined if unknown). */
export function resolveReason(id: ReasonId): Reason | undefined {
  return REASONS.find((r) => r.id === id);
}
