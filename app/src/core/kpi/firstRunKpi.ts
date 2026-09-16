/**
 * The first run's screen-level KPI events, built in one place so the two screens that show first-run
 * steps (`/onboarding` and the coach's tail) cannot count the same step two different ways.
 *
 * Pure TypeScript — no React, no vendor imports.
 */
import type { KpiInput } from './KpiGateway';
import { ONBOARDING_STEP_BUCKETS } from './taxonomy';

const STEPS: readonly string[] = ONBOARDING_STEP_BUCKETS;

/**
 * "This step was shown", or null for a page that is not one of the first run's steps — a retired page
 * a device resumed on is not a place in the funnel, and counting it would add a row nobody can read.
 * Once per installation per step is the gateway's job, not the caller's.
 */
export function onboardingStepReached(step: string): KpiInput | null {
  return STEPS.includes(step) ? { name: 'onboarding_step_reached', bucket: step } : null;
}

/** Why the account step had nothing to offer: no backend at all, or a backend and no usable provider. */
export function accountEscapeUsed(authEnabled: boolean): KpiInput {
  return { name: 'account_escape_used', bucket: authEnabled ? 'no_provider' : 'no_backend' };
}

export const introductionStarted: KpiInput = Object.freeze({ name: 'introduction_started' });
export const introductionCompleted: KpiInput = Object.freeze({ name: 'introduction_completed' });
