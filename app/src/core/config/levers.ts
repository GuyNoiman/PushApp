/**
 * Lever catalog + reason→lever mapping (Miss-Recovery slice) — the SOURCE OF TRUTH
 * for how a reason becomes a response (config-before-code: RULES, not AI, and never
 * hard-coded in an engine). PRD §4.
 *
 * Levers are modelled as an INTERNAL taxonomy of the reserved Intervention domain so
 * the vocabulary doesn't fork (product-guardian). Lever NAMES are internal only —
 * they must never surface in the UI. In particular `mirror` is the internal name for
 * the reflect-the-pattern lever; its user-facing surface is labelled "see past
 * reasons", never "Mirror" (which would collide with the official term Reflection).
 *
 * Pure TS — no React, no UI, no vendor imports.
 */
import type { LeverId, ReasonId } from '../types/domain';

/** Which part of the loop a lever acts on (internal taxonomy). */
export type LeverKind = 'reminder' | 'plan' | 'social' | 'motivation' | 'reflection' | 'grace';

export interface Lever {
  id: LeverId;
  kind: LeverKind;
  /**
   * True when THIS slice performs the lever for real; false when it is only LOGGED
   * as a "would do X" placeholder (needs a pillar not built yet — Social / Dream-why)
   * or is intentionally inert this slice (`retone`).
   */
  executesForReal: boolean;
}

/**
 * The full lever catalog. This slice executes for real only the reminder-affecting
 * levers (retime · refrequency · reshape) + mirror (the history view) + grace
 * (accept, no change). `rally` and `reconnect_why` are logged placeholders; `retone`
 * stays in the catalog but is inert this slice.
 */
export const LEVERS: readonly Lever[] = [
  { id: 'retime', kind: 'reminder', executesForReal: true },
  { id: 'refrequency', kind: 'reminder', executesForReal: true },
  { id: 'retone', kind: 'reminder', executesForReal: false }, // inert this slice
  { id: 'rally', kind: 'social', executesForReal: false }, // placeholder — needs Social pillar
  { id: 'reconnect_why', kind: 'motivation', executesForReal: false }, // placeholder — needs Dream-why
  { id: 'reshape', kind: 'plan', executesForReal: true },
  { id: 'mirror', kind: 'reflection', executesForReal: true }, // the "see past reasons" view
  { id: 'grace', kind: 'grace', executesForReal: true },
] as const;

/**
 * Reason → default lever(s), EXACTLY per PRD §4. `mirror` and `retone` are not mapped
 * from any reason: `mirror` is reached by opening "see past reasons", and `retone` is
 * inert this slice. `other` maps to nothing executable this slice — it is captured as
 * text and logged (an AI classifier is a later slice).
 */
export const REASON_LEVERS: Record<ReasonId, LeverId[]> = {
  // Retime (propose times) + Re-frequency (extra pre-reminders); the UI adds the
  // zero-permission add-to-calendar link as part of the "Forgot" bundle.
  forgot: ['retime', 'refrequency'],
  no_time: ['reshape'], // lighter slot / fewer steps
  lost_motivation: ['reconnect_why', 'rally'], // both logged placeholders this slice
  too_hard: ['reshape'], // resize / edit the Step
  did_partially: ['reshape'], // mark partial → optionally a smaller next Step
  couldnt: ['grace'], // life happened — no change
  not_relevant: ['reshape'], // edit the Step (true retire/archive is a follow-up)
  other: [], // capture text + log only this slice
};

/** Resolve the default lever(s) for a reason (pure). */
export function resolveLevers(reasonId: ReasonId): LeverId[] {
  return REASON_LEVERS[reasonId] ?? [];
}

/** Look up a lever's catalog entry (or undefined if unknown). */
export function resolveLever(id: LeverId): Lever | undefined {
  return LEVERS.find((l) => l.id === id);
}

/** Whether a lever changes the reminder schedule when executed (retime / refrequency). */
export function isReminderLever(id: LeverId): boolean {
  return resolveLever(id)?.kind === 'reminder' && (resolveLever(id)?.executesForReal ?? false);
}
