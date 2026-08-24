/**
 * horizonQuestion — "how long do you want to give this?", asked of every user, in every domain.
 *
 * WHY IT IS NOT AN EXPERT'S QUESTION. Every other interview question is domain knowledge: what a
 * body-image expert asks about a baseline is not what a career expert asks. How long someone wants
 * to commit for is not domain knowledge at all — it is a fact about the person's life, identical in
 * shape whether the goal is a protein shake or a career move. Putting it in each expert's list
 * would be the same question written four times, drifting apart on the fifth.
 *
 * WHY IT EXISTS AT ALL. The Planner used to fall back to a default of eight weeks whenever no
 * deadline was captured, and nothing ever asked. The founder's objection was exact: *"אני מצפה
 * שהמאמן כן ישאל אותי כמה זמן יש לי להשקיע במסע הזה - ולא להניח שכל מסע הוא חודשיים כי ייתכן
 * ושתיית שייק חלבון יכולה גם להיות רק חודש."* A default that is never surfaced is not a default —
 * it is a decision the app made on the user's behalf and never mentioned.
 *
 * "No fixed end" is a REAL option, not a polite way of saying eight weeks. Some repeated actions
 * genuinely have no finish line, and forcing one onto them would be inventing a commitment the user
 * did not make. It resolves to the standing default, and it is the only path that still uses it.
 *
 * Pure TypeScript — copy resolves through the shared i18next core instance, like the rest of the
 * coach's deterministic content (C-Lang-1).
 */
import i18n from '../../i18n';
import { addressContext } from '../../i18n/addressForm';
import { MAX_JOURNEY_DAYS } from '../config/journeyLength';
import type { DomainQuestion } from '../learning/DomainExpert';

/** The question's stable id, keyed into `InterviewAnswers` like any expert question. */
export const HORIZON_QUESTION_ID = 'shared.horizon';

/**
 * The lengths offered, in days, aligned by index with the `interview.horizon.options` copy.
 * `undefined` is the open-ended choice. Kept as CONFIG so the offer can be tuned without touching
 * the resolution logic below.
 *
 * THREE MONTHS IS GONE (founder, 2026-08-25). It contradicted his own guidance that a Journey is
 * planned for up to two months, and it was never a considered exception — it was the third option in
 * a row of three. The ceiling now lives in one place ({@link ../config/journeyLength}); a Journey can
 * still RUN longer, by an explicit extension, which is a decision made with the plan in hand rather
 * than before it started.
 */
export const HORIZON_DAYS: readonly (number | undefined)[] = [30, MAX_JOURNEY_DAYS, undefined];

/** The shared question, in the active language and form of address. */
export function horizonQuestion(): DomainQuestion {
  return {
    id: HORIZON_QUESTION_ID,
    intent: 'time',
    prompt: i18n.t('interview.horizon.prompt', { ns: 'coachContent', context: addressContext() }),
    options: [
      ...(i18n.t('interview.horizon.options', {
        ns: 'coachContent',
        returnObjects: true,
        context: addressContext(),
      }) as unknown as string[]),
    ],
    // Free text is allowed: "until the wedding in March" is a real answer and a better one than any
    // option here. It lands as raw text, which resolves to the default length — the plan is still
    // right, and the answer is kept for the coach rather than discarded.
    allowOther: true,
  };
}

/**
 * The Journey length the user chose, in days — or `undefined` for "no fixed end" and for any answer
 * that is not one of the offered options. Undefined means the caller keeps its standing default.
 */
export function horizonDays(answer: string | string[] | undefined): number | undefined {
  const text = (Array.isArray(answer) ? answer[0] : answer)?.trim();
  if (!text) return undefined;
  const options = horizonQuestion().options;
  const index = options.indexOf(text);
  return index >= 0 ? HORIZON_DAYS[index] : undefined;
}
