/**
 * Learning layer entry point — the deterministic Planner and its pluggable DomainExpert
 * seam (adaptive coach, S1). The Planner is pure and domain-ignorant; a DomainExpert
 * supplies the domain knowledge. NO LLM anywhere in this layer.
 */
export * from './types';
export * from './DomainExpert';
export * from './experts';
export * from './Planner';
export * from './AdaptivePlanner';
export * from './applyReplan';
export * from './deriveConstraints';
export * from './CoachNarrator';
export * from './BehaviorModelEngine';
