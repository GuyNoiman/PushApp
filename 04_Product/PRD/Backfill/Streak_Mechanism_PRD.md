# PRD — Streak Mechanism

Status: **Backfill PRD** — documents an ALREADY-SHIPPED feature retroactively; captured 2026-08-13.
Not a forward spec.
Stage: **MVP** (task B2).
Owner: founder + AI product team.
Related Decision Log: **D26.4** (the streak = a prominent day-count that breaks ONLY when an urgent Step is
missed — a non-punishing streak, consistent with the earlier non-punishing-streak direction), **D33** (the
one authoritative week boundary the urgency test reads).
Related code: `app/src/core/engines/StreakEngine.ts`, `app/src/core/util/urgency.ts`,
`app/src/core/config/streak.ts`, `app/src/core/util/week.ts`, `app/src/core/util/date.ts`.

---

## 1. Purpose

The streak exists to give visible, low-pressure continuity — a day count that rewards showing up — **without**
becoming the punishing "don't break the chain" mechanic that turns a growth tool into an anxiety machine. Its
whole design point (D26.4) is that it breaks **only** when the user misses something that genuinely mattered
that week, not on any missed Step. This keeps it aligned with growth-before-engagement: the streak reinforces
real action, and a forgiving definition means a single ordinary slip never wipes out weeks of progress.

## 2. Current shipped behavior

`StreakEngine` subscribes to the event bus and persists `streak` + `lastActiveDay` onto `AppState`, mirroring
the other engines (injected bus, `getState`, clock, and config, so it is deterministic and unit-testable).

**Increment rule (`onStepCheckedIn`):** the `streak` counts up by 1 the **first** time the user checks in a
Step on a **new calendar day** — a day whose `dateKey` is later than `lastActiveDay`. Further check-ins the
same day do not move it. The first-ever check-in makes it 1. Any change emits `StreakChanged` so AppCore
persists through the normal save path.

**Break rule (`onStepMissed`):** an **ordinary** missed Step does **not** reset the streak. A miss resets to
0 (and clears `lastActiveDay`, so the next check-in starts fresh at 1) **only** when the missed Step is
**URGENT** — meaning its Journey has "no slack left this week."

**Urgency test (`util/urgency.isUrgentMiss`):** a miss is urgent when the sessions the Journey still needs
this week are at least the days still left in the week — `remaining-required-sessions >= remaining-days-in-week`
(the founder phrased it as `==`; the code generalizes to `>=` so an already-over-committed week also counts,
and a Journey that has already met its weekly target — remaining required = 0 — is never urgent). The
required-sessions-per-rhythm mapping lives in `config/streak.ts`: `daily → 7`, `few-times-week → 3`,
`weekly → 1`. "This week" is read from the **one authoritative week service** (`util/week`), so it honors the
user's configured week start (D33), not a hardcoded Monday.

Configuration-before-code: the streak **rule** (the required-sessions numbers) lives in `config/streak.ts`,
not as magic numbers in the engine, so the definition is tunable without touching logic.

## 3. Decisions already made

- **D26.4:** the streak is a prominent day-count that **breaks only when an urgent Step is missed** — a
  deliberately non-punishing design. Levels reward breadth, the streak rewards showing up.
- **D33:** the urgency window uses the single authoritative week boundary (`util/week`), so the streak and
  every other week-referencing area agree on when the week starts.

## 4. Open questions & edge cases NOT yet handled

1. **KNOWN LIMITATION — the streak effectively never breaks in plain production.** The reset path fires on
   `StepMissed`, and `StepMissed` is emitted **only** by the BehaviorModelEngine's slip detector, which is
   **gated behind the off-by-default `adaptiveCoach` flag** (documented in the `StreakEngine` header:
   "when that flag is off no miss fires and the streak simply never resets"). So in the shipped MVP
   configuration the streak **only ever increments** — it grows on the first check-in of each new day and is
   never reset by a miss. This is the single most important thing to review: the "breaks on urgent miss"
   rule is built and unit-tested but **dormant** until the adaptive-coach miss detector is on. Decide whether
   MVP needs a flag-independent miss signal (e.g. a lightweight day-rollover sweep) or whether the streak is
   intentionally increment-only for now.
2. **No decay / no "missed a whole day" concept.** Because the only reset is an urgent-miss event, a user who
   simply stops checking in does not lose the streak — it just stops growing and resumes from where it was on
   the next check-in (since `lastActiveDay` still holds). There is no "you were away 5 days, streak reset"
   behavior. Confirm this is intended vs. a gap.
3. **Timezone / clock-move sensitivity.** Increment uses `dateKey(new Date(now))` (device-local calendar
   day). A device traveling across midnight or moving its clock back could get an unexpected same-day or
   new-day classification. The week service is DST-safe, but the day-key increment itself is not explicitly
   guarded against a backward clock the way `InactivityEngine` clamps its gap.
4. **`requiredSessionsPerWeek` is coarse.** `few-times-week` is hardcoded to a representative `3`; a Journey
   whose real target is 2 or 5 times a week is not modeled — urgency can fire early or late for such a
   Journey. This is a config approximation, acceptable for MVP but worth noting.
5. **Streak is global, not per-Journey.** One account-level number spans all Journeys; a user running several
   Journeys has a single streak. There is no per-Journey or per-Dream streak, and no product surface
   currently explains the "urgent miss" rule to the user, so a break (once the flag is on) could feel
   unexplained.
6. **No streak-milestone reward wired.** The engine emits `StreakChanged` but there is no
   streak-milestone celebration or XP hook in MVP (that lives in the Future Points/Leveling PRD). The number
   is displayed; crossing a threshold does nothing yet.

## 5. Out of scope / deferred

- A flag-independent miss/rollover signal so the break rule is live in plain MVP (§4.1) — decision pending.
- Per-Journey or per-Dream streaks.
- Streak-milestone rewards / celebrations (Future: `Future/Points_and_Leveling_PRD.md`).
- Fine-grained per-Journey weekly targets feeding the urgency test (§4.4).
- User-facing explanation of the "breaks only on an urgent miss" rule.
