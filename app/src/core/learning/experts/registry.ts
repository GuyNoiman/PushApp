/**
 * DomainExpert registry — maps a stable domain id to its {@link DomainExpert} instance and
 * resolves an expert for a goal (SX.1). The {@link GeneralExpert} is the fallback for the
 * `general` id and for any unknown/absent domain, so a caller ALWAYS gets a usable expert and
 * the Planner never has to special-case a missing one.
 *
 * The {@link DomainId} union is exported so SX.2 can reuse it verbatim on the GoalSpec — the
 * single source of truth for which domains exist.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import { GeneralExpert, type DomainExpert } from '../DomainExpert';
import { AddictionExpert } from './AddictionExpert';
import { BodyImageExpert } from './BodyImageExpert';
import { CareerExpert } from './CareerExpert';
import { RelationshipsExpert } from './RelationshipsExpert';

/** The stable id of every domain PushApp has an expert for. Reused by SX.2's GoalSpec. */
export type DomainId = 'addiction' | 'relationships' | 'body_image' | 'career' | 'general';

/** All domain ids, in a fixed order — handy for iteration, tests, and pickers. */
export const DOMAIN_IDS: readonly DomainId[] = [
  'addiction',
  'relationships',
  'body_image',
  'career',
  'general',
] as const;

/** The id → expert table. `general` maps to the reference {@link GeneralExpert}. */
export const DomainExpertRegistry: Readonly<Record<DomainId, DomainExpert>> = {
  addiction: AddictionExpert,
  relationships: RelationshipsExpert,
  body_image: BodyImageExpert,
  career: CareerExpert,
  general: GeneralExpert,
};

/** True when `id` is a known {@link DomainId}. */
export function isDomainId(id: unknown): id is DomainId {
  return typeof id === 'string' && id in DomainExpertRegistry;
}

/**
 * Resolve the expert for a domain id. Unknown, empty, or absent ids fall back to the
 * {@link GeneralExpert}, so the caller always receives a working expert.
 */
export function getExpert(domain?: string | null): DomainExpert {
  return isDomainId(domain) ? DomainExpertRegistry[domain] : GeneralExpert;
}
