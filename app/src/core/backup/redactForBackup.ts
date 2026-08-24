/**
 * What the account backup may carry — and what stays on the phone.
 *
 * THE FOUNDER'S RULE (2026-08-24): *the raw wording stays on the device; our reading of it goes to
 * the server.* So a new phone does not lose the picture of somebody's life, and the sentences they
 * wrote in their own words never travel.
 *
 * IT MAPS ONTO THE DOMAIN EXACTLY, which is the good news: this app already separates the two. A
 * miss carries a `reasonId` — one of a closed vocabulary, and that IS the reading — beside a `note`
 * in the person's own words. Journey feedback is the same shape. The classification syncs, the
 * sentence does not.
 *
 * WHAT IS STRIPPED, field by field:
 *  · `Journey.why` — the most personal sentence in the product.
 *  · `reasonLog[].note` and `Journey.feedback.note` — what somebody wrote when a day went wrong, or
 *    at the end of a Journey.
 *  · `behaviorLog` — the coach's raw minute-by-minute signal, on-device-only by G1 since it was
 *    written; it is a portrait of a life and it has never been ours to hold.
 *  · `coachMemory.journeys[].reasons` — and ONLY that field of the coach's memory. The founder
 *    corrected this on 2026-08-25, and the correction is the rule stated again: *the raw material
 *    stays on the device; the insights the coach draws from it go to the server.* A summary IS the
 *    insight, so it travels. But `reasons` is not an insight — it is a verbatim copy of
 *    `Journey.why`, the same sentences stripped two lines above, arriving by another door. So the
 *    memory syncs and that one field is emptied. Any future field that holds somebody's own wording
 *    belongs on this list too; a field that holds our reading of it does not.
 *
 * WHAT SURVIVES, so a restore is still a restore: every Journey, Step, date, status and report; the
 * closed `reasonId` of every miss and every piece of feedback; Dreams, Buddy, streak, missions,
 * reminders and preferences.
 *
 * THE ONE HONEST GAP: `why` has no derived counterpart today — nothing in the app currently reads a
 * person's "why" into a structured form. So a restored device shows the Journey without the sentence
 * behind it, until such a reading exists. That is the cost of the rule, and it is the right side to
 * err on.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */
import type { AppState } from '../types/domain';

/** A backup-safe copy of the state. The input is never mutated. */
export function redactForBackup(state: AppState): AppState {
  return {
    ...state,
    journeys: state.journeys.map((journey) => {
      const redacted = {
        ...journey,
        // The raw "why" stays on the device. An empty array rather than a missing field, so a
        // restored Journey is shaped like any other and nothing downstream special-cases it.
        why: [],
      };
      // The end-of-Journey verdict keeps its CLOSED reasonId — that is the reading, and it is what
      // the library learns from — and loses the sentence beside it.
      if (redacted.feedback) {
        const { note: _note, ...feedback } = redacted.feedback;
        redacted.feedback = feedback;
      }
      return redacted;
    }),
    reasonLog: (state.reasonLog ?? []).map((entry) => {
      const { note: _note, ...rest } = entry;
      return rest;
    }),
    // The coach's raw behavioural signal has never been allowed to leave the device (G1).
    behaviorLog: [],
    // What the coach remembers TRAVELS — it is the reading, not the wording (founder, 2026-08-25) —
    // minus the one field inside it that is a verbatim copy of the person's own sentences.
    ...(state.coachMemory
      ? {
          coachMemory: {
            ...state.coachMemory,
            journeys: state.coachMemory.journeys.map((context) => ({ ...context, reasons: [] })),
          },
        }
      : {}),
  };
}

/**
 * Whether a serialised backup is clean — used by the test that guards this file, and available to
 * any future caller that wants to assert before sending. Deliberately checks the SHAPE rather than
 * searching for words: a search for a phrase can only find the phrases you thought of.
 */
export function backupCarriesRawText(state: AppState): boolean {
  if (state.journeys.some((journey) => (journey.why?.length ?? 0) > 0)) return true;
  if ((state.reasonLog ?? []).some((entry) => 'note' in entry && entry.note !== undefined)) return true;
  if ((state.behaviorLog ?? []).length > 0) return true;
  if (state.journeys.some((journey) => journey.feedback?.note !== undefined)) return true;
  // The coach's memory may travel; the person's own sentences inside it may not.
  if ((state.coachMemory?.journeys ?? []).some((context) => context.reasons.length > 0)) return true;
  return false;
}
