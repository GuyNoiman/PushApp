/**
 * What actually reaches the model — the narrowest part of this feature, on purpose.
 *
 * PRD §10: select the relevant ids first, take only the bounded fields of those, and never attach
 * the catalogue. So this takes a memory and ONE reference (the Dream or Journey being discussed) and
 * returns at most two records' worth of short lines. There is no call shape here that can send
 * everything, which is the only reliable way to guarantee that everything is never sent.
 *
 * The rendered block is labelled as WHAT WE THINK WE KNOW, and assumptions are labelled as
 * assumptions. That is not decoration: a coach that states a remembered guess as a fact is worse
 * than one that forgot, because the person then has to argue with it.
 *
 * Pure TypeScript — no React, no network, no vendor.
 */
import { consentActive } from './consent';
import type { CoachMemoryState, DreamCoachContext, JourneyCoachContext } from './types';

export interface CoachContextBrief {
  dream?: DreamCoachContext;
  journey?: JourneyCoachContext;
}

/**
 * The minimum for this request, or null.
 *
 * Null when consent is not active — the check lives HERE, at the boundary the data crosses, rather
 * than at each call site. A caller that forgets to ask about consent gets nothing, which is the
 * right way round for a mistake to fail.
 */
export function briefFor(
  memory: CoachMemoryState | undefined,
  ref: { dreamId?: string; journeyId?: string },
): CoachContextBrief | null {
  if (!memory || !consentActive(memory.consent)) return null;
  const dream = ref.dreamId ? memory.dreams.find((d) => d.id === ref.dreamId) : undefined;
  const journey = ref.journeyId ? memory.journeys.find((j) => j.id === ref.journeyId) : undefined;
  if (!dream && !journey) return null;
  return { ...(dream ? { dream } : {}), ...(journey ? { journey } : {}) };
}

function lines(label: string, values: readonly string[]): string[] {
  return values.length > 0 ? [`${label}: ${values.join('; ')}`] : [];
}

/** The prompt fragment. Empty string when there is nothing worth saying. */
export function renderBrief(brief: CoachContextBrief | null): string {
  if (!brief) return '';
  const out: string[] = [];

  if (brief.dream) {
    const d = brief.dream;
    out.push('About the Dream this belongs to:');
    if (d.direction) out.push(`Direction: ${d.direction}`);
    if (d.startingPoint) out.push(`Starting point: ${d.startingPoint}`);
    out.push(...lines('Boundaries to respect', d.boundaries));
    out.push(...lines('Still open', d.openQuestions));
  }

  if (brief.journey) {
    const j = brief.journey;
    if (out.length > 0) out.push('');
    out.push('About this Journey:');
    if (j.outcome) out.push(`Outcome: ${j.outcome}`);
    if (j.startingPoint) out.push(`Starting point: ${j.startingPoint}`);
    out.push(...lines('Why it matters to them', j.reasons));
    out.push(...lines('Constraints that shaped the plan', j.constraints));
    out.push(...lines('Obstacle kinds already anticipated', j.obstacleCategories));
    out.push(...lines('Why past changes were made', j.adaptationRationale));
    out.push(...lines('ASSUMPTIONS — confirm before relying on them', j.assumptions));
  }

  if (out.length === 0) return '';

  return [
    'WHAT YOU ALREADY KNOW about this person, from what they told you and approved before.',
    'Use it so you do not ask again. Never repeat it back as a summary of them, and never treat an',
    'assumption as a fact.',
    '',
    ...out,
  ].join('\n');
}
