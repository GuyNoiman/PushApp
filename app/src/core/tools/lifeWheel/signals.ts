/**
 * What the Life Wheel teaches the app — the second half of the founder's rule that every tool must
 * both be worth doing AND leave the app knowing something it did not know.
 *
 * THE ONE THING IT KNOWS THAT NOTHING ELSE DOES. Onboarding asks which areas someone is interested
 * in. That is a statement of intent, and people are generous with it — most tick four. The wheel
 * asks something people answer honestly because the question is not about ambition: how is this
 * going, and how much does it matter. The difference between those two is the area a person is
 * quietly paying for, and nothing else in the app has ever asked it.
 *
 * WHAT IT IS ALLOWED TO CHANGE, and this list is deliberately short:
 *
 *  1. **The coach's opening context.** When somebody starts shaping a Journey, the coach may know
 *     that Money has been sitting at a gap of six for a month. It NEVER opens with it and never
 *     steers a goal toward it — a tool that quietly redirects people is a tool that stops being
 *     safe to take honestly. It is context for understanding, not an agenda.
 *  2. **What "which area" means when it is asked again.** A later tool or Journey that needs an area
 *     can offer the pressing one first instead of a flat list of eight.
 *  3. **Nothing else.** Not notifications, not Home, not the Buddy, not the Circle. Anything wanting
 *     to read this later is a decision, made once, written down.
 *
 * WHAT IT MUST NEVER DO — and this is the founder's philosophy, not a technical limit: it must never
 * create a Journey by itself, never nag about a low area, and never show the person a number about
 * their life that they did not ask for. The tool reflects. The person decides.
 *
 * SECURITY-PRIVACY G1: everything here is derived from ON-DEVICE-ONLY answers and stays on device.
 * The raw wheel is never synced; nor is this summary. It is smaller than the answers, which does not
 * make it shareable — "Money, gap of six" is more revealing than the eight numbers it came from, not
 * less.
 *
 * Pure TypeScript — no React, no i18n, no storage, no clock reads.
 */
import { PRESSING_GAP_THRESHOLD, type LifeAreaId, type LifeWheelReading } from './model';

/**
 * The PII-free summary the rest of the app is allowed to see. Deliberately much smaller than the
 * answers: a consumer gets what it needs to be useful and nothing it could use to describe a person.
 */
export interface LifeWheelSummary {
  /** When the wheel was taken. A reading of a life goes stale; a six-month-old gap is history. */
  takenAt: number;
  /** The area under the most pressure, or null when nothing crossed the threshold. */
  pressingArea: LifeAreaId | null;
  /** How wide that gap is, 0 when there is none. */
  pressingGap: number;
  /** The area currently carrying the person, if any area both matters and is going well. */
  strongestArea: LifeAreaId | null;
}

/** Build the summary from a completed reading. */
export function summarise(reading: LifeWheelReading, takenAt: number): LifeWheelSummary {
  const pressing = reading.pressing[0] ?? null;
  return {
    takenAt,
    pressingArea: pressing?.area ?? null,
    pressingGap: pressing?.gap ?? 0,
    strongestArea: reading.strongest?.area ?? null,
  };
}

/**
 * How long a reading stays worth acting on.
 *
 * NINETY DAYS, and the number is an argument rather than a preference: a life wheel is a snapshot of
 * a season. A gap somebody reported in January may have closed, and a coach that keeps bringing it
 * up in April is a coach that stopped listening. Past this, the summary is still readable history —
 * it simply stops being used as context.
 */
export const SUMMARY_FRESH_DAYS = 90;

export function isFresh(summary: LifeWheelSummary, now: number): boolean {
  return now - summary.takenAt <= SUMMARY_FRESH_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * The area worth carrying into a conversation, or `null`. Null is the common answer and must be
 * comfortable for every caller: nothing pressing, nothing recent, and a wheel never taken all return
 * it, and none of them is a degraded state.
 */
export function contextArea(
  summary: LifeWheelSummary | null,
  now: number,
): LifeAreaId | null {
  if (!summary || !isFresh(summary, now)) return null;
  if (summary.pressingGap < PRESSING_GAP_THRESHOLD) return null;
  return summary.pressingArea;
}
