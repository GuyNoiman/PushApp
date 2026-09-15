/**
 * The name to address somebody by — or nothing, honestly.
 *
 * ── WHY THIS IS ITS OWN HOOK ───────────────────────────────────────────────────────────────────
 *
 * The approved handoff screen (build spec §6) opens "It's good to know you, ⟨name⟩", and it is
 * rendered from two places: the coach's first-run tail on the real path, and the onboarding route
 * when a device resumes onto it. One answer, one place, or the two screens greet the same person
 * differently.
 *
 * ── AND WHY IT MAY RETURN NOTHING ──────────────────────────────────────────────────────────────
 *
 * Between 2026-09-03 and 2026-09-15 the first run had no place that asked for a name at all: the
 * profile page had left the flow and nothing replaced it. The INTRODUCTION now asks in conversation
 * ("what should I call you?") and `coach.tsx` writes the answer to `profile.displayName` — which is
 * exactly the shape this hook was written for, so it picked the name up with no screen changing.
 *
 * `undefined` is still a perfectly ordinary outcome: somebody may decline, or answer in a way the
 * reader cannot place, and nothing is ever invented for them. The screens that use this are written
 * for that — they carry a second, complete sentence rather than a blank or a placeholder.
 *
 * The simulated identity is a dev-only fallback and is inert in a release build (see its header).
 */
import { firstName, getSimulatedUser } from '@/core/profile/simulatedUser';
import { useProfile } from '@/state/ProfileProvider';

export function usePersonalName(): string | undefined {
  const { profile } = useProfile();
  const chosen = profile.displayName?.trim();
  if (chosen) return chosen;
  const simulated = firstName(getSimulatedUser().name).trim();
  return simulated || undefined;
}
