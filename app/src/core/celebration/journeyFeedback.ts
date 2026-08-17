/**
 * journeyFeedback — the end-of-Journey question, and the three places it has to be asked.
 *
 * WHY IT EXISTS: without it we have outcomes but no ground truth. We can see that someone stopped
 * in week three; we cannot see whether the Journey was wrong for them or whether life intervened.
 * The user's own answer is the LABEL on the training data (Plan_Library_and_Learning_PRD §6.3), and
 * without labels a library of variants can be compared on completion rate alone — which is how a
 * learning loop ends up recommending whatever is easiest to finish.
 *
 * THE SURVIVORSHIP TRAP, which is the real reason this file is about hosts and not about a form
 * (PRD §6.4): the completion ceremony only ever meets people who FINISHED. Ask only there and every
 * training label comes from a success, and the library learns that everything works — invisibly,
 * and with data that looks clean. So the question has three hosts:
 *
 *   1. `completed`  — the Journey finished. The easy one, and the one that biases everything.
 *   2. `canceled`   — the user stopped it deliberately. The most informative answer in the product,
 *                     and the one a completion-only design never hears.
 *   3. `quiet`      — the Journey simply died: no report for {@link QUIET_DEATH_DAYS} days. The
 *                     most common ending of all, and the one nobody instruments.
 *
 * HOW THE QUIET HOST BEHAVES, and why it does not send a notification: asking "why did you stop?"
 * by push is an interruption bought with the user's attention to serve OUR data, in a product whose
 * whole objective is fewer interruptions that matter more (§8). So the quiet host waits until the
 * user opens the app of their own accord, asks ONCE, and if it is dismissed it never asks again for
 * that Journey. A label we did not get is better than a label we extracted.
 *
 * SECURITY-PRIVACY G1: `note` is the user's own words — ON-DEVICE-ONLY, same footing as
 * `ReasonEntry.note`. Only `helped`, `host` and `reasonId` (a closed enum) may ever leave the
 * device, and only under the consent gate the library PRD's Stage 3 defines. Nothing here
 * transmits anything.
 *
 * Pure TypeScript — no React, no i18n, no vendor imports, no clock reads (callers inject `now`).
 */
import type { Journey, JourneyFeedback, ReasonEntry } from '../types/domain';
import { resolveJourneyStatus } from '../util/journeyStatus';

/**
 * How long a running Journey may go with nothing reported before we treat it as quietly dead.
 *
 * 21 days, chosen against the alternatives rather than for itself: a week catches people who are
 * simply on holiday and asks them to eulogise a Journey they intend to resume, and six weeks means
 * asking about something the user genuinely cannot remember. Three weeks is long enough that the
 * user has stopped, and short enough that they still know why.
 */
export const QUIET_DEATH_DAYS = 21;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Which of the three moments produced this feedback. */
export type FeedbackHost = 'completed' | 'canceled' | 'quiet';

/** A Journey waiting to be asked, and the host that should ask. */
export interface PendingFeedback {
  journeyId: string;
  journeyTitle: string;
  host: FeedbackHost;
}

/**
 * The single question that decides whether a Journey "worked".
 *
 * FOUNDER DECISION (2026-08-18): a user who FINISHED the Journey is assumed to have been helped by
 * it — unless they say otherwise here. So `helped` is the override on that assumption, not the sole
 * source of it, and its absence is never read as a negative.
 */
export type Helped = 'yes' | 'partly' | 'no';

/**
 * Has this Journey already been asked? Covers both the answered case and the DISMISSED case: a
 * user who closed the sheet has answered the only question that matters about being asked again.
 */
export function alreadyAsked(journey: Journey): boolean {
  return journey.feedback !== undefined;
}

/**
 * The Journey that should be asked about now, or null. PURE — `now` is injected.
 *
 * At most ONE at a time, and the order is deliberate: a completion is a moment the user is already
 * in, a cancellation is fresh, and a quiet death is weeks old and can wait another day. Stacking
 * two of these would turn a considered question into a queue of forms.
 */
export function pendingFeedback(
  journeys: readonly Journey[],
  reasonLog: readonly ReasonEntry[],
  now: number,
): PendingFeedback | null {
  const ask = (journey: Journey, host: FeedbackHost): PendingFeedback => ({
    journeyId: journey.id,
    journeyTitle: journey.title,
    host,
  });

  const unasked = journeys.filter((j) => !alreadyAsked(j));

  // 1. Finished. Only once the ceremony has been seen — the card comes first, and a question
  //    landing on top of the celebration would read as though the app doubted it.
  const completed = unasked
    .filter((j) => resolveJourneyStatus(j) === 'completed' && j.completionCard?.ceremonyShownAt)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
  if (completed) return ask(completed, 'completed');

  // 2. Stopped deliberately. The most informative answer in the product.
  const canceled = unasked
    .filter((j) => resolveJourneyStatus(j) === 'abandoned')
    .sort((a, b) => (b.abandonedAt ?? 0) - (a.abandonedAt ?? 0))[0];
  if (canceled) return ask(canceled, 'canceled');

  // 3. Quietly dead. Never surfaced by a notification — this is only ever read when the user has
  //    opened the app themselves.
  const quiet = unasked
    .filter((j) => isQuietlyDead(j, reasonLog, now))
    .sort((a, b) => lastActivityAt(a, reasonLog) - lastActivityAt(b, reasonLog))[0];
  return quiet ? ask(quiet, 'quiet') : null;
}

/**
 * Has this Journey quietly died? A RUNNING Journey with nothing reported for
 * {@link QUIET_DEATH_DAYS}.
 *
 * A FROZEN Journey is explicitly excluded: the user told us they were pausing it, and asking them
 * why they stopped would be the app failing to listen to something it was just told. A `future`
 * Journey is excluded for the same reason — it has not started.
 */
export function isQuietlyDead(
  journey: Journey,
  reasonLog: readonly ReasonEntry[],
  now: number,
): boolean {
  if (resolveJourneyStatus(journey) !== 'active') return false;
  return now - lastActivityAt(journey, reasonLog) >= QUIET_DEATH_DAYS * DAY_MS;
}

/**
 * The last moment this Journey saw ANY sign of life — a check-in, a report of a Step that did not
 * happen, or failing both, its creation. Reading the reason log matters: a user who has been
 * honestly reporting "couldn't today" every week has not abandoned anything, and treating them as
 * quietly dead would ask the one person who is still showing up why they left.
 */
function lastActivityAt(journey: Journey, reasonLog: readonly ReasonEntry[]): number {
  const checkIns = journey.steps
    .map((s) => s.lastCheckInAt ?? 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const stepIds = new Set(journey.steps.map((s) => s.id));
  const reports = reasonLog
    .filter((e) => stepIds.has(e.stepId))
    .map((e) => e.at)
    .reduce((a, b) => Math.max(a, b), 0);
  return Math.max(checkIns, reports, journey.createdAt);
}

/** Build the durable record. PURE — the caller injects `now` and persists the result. */
export function buildJourneyFeedback(input: {
  host: FeedbackHost;
  helped?: Helped;
  reasonId?: string;
  note?: string;
  now: number;
}): JourneyFeedback {
  return {
    host: input.host,
    at: input.now,
    ...(input.helped ? { helped: input.helped } : {}),
    ...(input.reasonId ? { reasonId: input.reasonId } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  };
}

/**
 * Did this Journey work? The founder's rule, in one function.
 *
 * Finishing IS the evidence — someone who completed a Journey is assumed to have been helped by it
 * — UNLESS they told us otherwise at the end. `partly` is deliberately NOT counted as a failure:
 * it is the honest middle answer, and a library that treats it as a negative would learn to avoid
 * every Journey people found genuinely mixed.
 *
 * `undefined` means we do not know, and it must stay distinguishable from `false`: a Journey that
 * was never labelled is missing data, not a bad Journey, and collapsing the two is precisely how a
 * training set fills up with silent negatives.
 */
export function journeyWorked(journey: Journey): boolean | undefined {
  const helped = journey.feedback?.helped;
  if (helped) return helped !== 'no';
  return resolveJourneyStatus(journey) === 'completed' ? true : undefined;
}
