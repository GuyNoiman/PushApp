/**
 * processJourney — the small helper every authored PROCESS Journey is written through.
 *
 * A process Journey in this library has exactly ONE version today, and that is not an accident or a
 * placeholder: the founder's rule is that a differing Milestone arc is a different JOURNEY, and a
 * version is the same arc walked at another pace or by another path. Nobody has authored a second
 * pace for these arcs yet, so each definition holds its single arc — and the day one is written, it
 * is added to `variants` beside this one, with the axis it differs on, and nothing else changes.
 *
 * Writing that structure out eighteen times would bury the content in ceremony and invite the
 * eighteenth to drift from the first. So the shape is here once, and a Journey is what it actually
 * is: an id, a line saying what makes it different, and its arc.
 *
 * Pure TypeScript — no React, no i18n, no clock reads.
 */
import type { AuthoredArc } from './authoredArc';
import type { JourneyDefinition } from './journeyDefinition';

/** The id every single-version process Journey's one version carries. */
export const SOLE_VARIANT_ID = 'sole';

/** Build the definition for a process Journey that has one authored arc. */
export function processJourney(input: {
  id: string;
  /** Bumped when the ARC changes, so a rating gathered under the old one is never read as evidence about the new. */
  version: number;
  domain: string;
  /** The one line saying what makes this Journey different from its siblings — authored English. */
  essence: string;
  /** That line's key in the `library` translation cache. */
  essenceKey: string;
  arc: AuthoredArc;
}): JourneyDefinition {
  return {
    id: input.id,
    version: input.version,
    shape: 'process',
    domain: input.domain,
    // No axes: this Journey's versions cannot differ on anything, because it has one. The axis that
    // separates it from its siblings belongs to their goal family, not to any one of them.
    axes: [],
    variants: [
      {
        id: SOLE_VARIANT_ID,
        essence: input.essence,
        essenceKey: input.essenceKey,
        position: {},
        build: { kind: 'process', arc: input.arc },
      },
    ],
    defaultVariantId: SOLE_VARIANT_ID,
  };
}
