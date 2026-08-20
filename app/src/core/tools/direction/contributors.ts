/**
 * Where the two drawers get their contents.
 *
 * The founder's design fills "What draws me" and "What I bring" from a Passion Map and from Strength
 * Evidence. **Neither of those tools exists yet.** This file is the answer to that: a drawer is fed
 * by CONTRIBUTORS, so the tool works today with what is built, and the two missing tools become two
 * more entries here rather than a rewrite.
 *
 * WHAT CONTRIBUTES TODAY, and why each is honest:
 *
 *  · **Values Clarification, top five → "what draws me".** Not an approximation of a Passion Map: it
 *    is a person's own answer to "which five do you want to live by, now", already narrowed and
 *    already ranked by them. It is the strongest material in the app for this drawer.
 *  · **Nothing at all → "what I bring".** Deliberately empty until Strength Evidence exists. Guessing
 *    at somebody's strengths from what they value would be the app telling a person what they are
 *    good at, which is the one thing this drawer must never do. So it starts empty and they type.
 *
 * A contributor NEVER offers something the person has not already confirmed elsewhere. The founder's
 * own words for this tool are that it combines *approved* results — a phrase arriving in a drawer
 * because we inferred it would make the whole sentence ours.
 *
 * Pure TypeScript — no React, no storage. The caller passes in what it has.
 */
import type { Chip } from './model';

/** What the caller can hand over, all optional — an empty app produces empty drawers, not an error. */
export interface ContributorInput {
  /** The Values Clarification's final five, in the person's order, already resolved to labels. */
  values?: readonly { key: string; label: string }[];
}

/**
 * Build the drawers.
 *
 * Order matters in "what draws me": a person's first value is the first chip, because they put it
 * there. Nothing is sorted by us.
 */
export function contributedChips(input: ContributorInput): Chip[] {
  const chips: Chip[] = [];

  for (const value of input.values ?? []) {
    chips.push({ id: `values-${value.key}`, drawer: 'draws', text: value.label, source: 'values' });
  }

  // "What I bring" has no contributor yet, on purpose — see the header.
  return chips;
}

/**
 * Whether a drawer has anything on offer. The screen uses this to decide between "here are yours"
 * and "tell us", and neither of those is a degraded state.
 */
export function hasContributions(chips: readonly Chip[], drawer: Chip['drawer']): boolean {
  return chips.some((c) => c.drawer === drawer && c.source !== 'user');
}
