# PRD — Miss-Recovery &amp; Adaptive Reminders (mock-first core slice)

Status: **Approved for POC build (mock-first slice)** — founder-confirmed 2026-07-21.
Stage: **POC** (deferred pieces map to later stages — vision never shrinks, CLAUDE.md §3.3).
Reviewed 2026-07-21 by product-guardian (approve-with-changes) + security-privacy (approve-with-changes);
outcomes folded in at §9. Owner: founder + AI team. Supersedes nothing; extends the Journey/Reminder pillars.
Related: `04_Product/Strategy_WIP_2026-07/README.md` §5 (miss-recovery funnel), the architecture
trilogy in that folder, `11_Engineering_Bible/Module_Architecture.md` (reserved Location/Calendar/
Intervention seams).

---

## 0. Why — the hypothesis we're testing

The differentiating bet vs Finch's skip/snooze: **the user describes *what happened*; the app
decides *what to do*** — and learns over time. This slice proves the core loop end-to-end with
**dummy data, in Expo Go, at $0** — no native build, no Apple account, no AI:

> Step won't happen → user says *what happened* (closed list) → engine maps the reason to a
> **lever** → the lever changes the **next reminder** (and/or the plan) → the reason is **logged**
> to a per-user history the user can see.

If this feels right and useful, the model is validated and we layer on the real (gated) pieces.

---

## 1. Data-model additions (Step)

Add to the `Step` type (`app/src/core/types/domain.ts`), both **optional** (existing Steps stay valid):

- **`estimatedDuration?`** — minutes the Step is expected to take. Lets the engine only surface/fire
  a reminder when there's an actual slot that fits, and powers the **Reshape** lever (long Step +
  "No time" → offer to shrink).
- **`constraints?: Constraint[]`** — an **extensible list**, not a single flag. V1 supports
  `location` (e.g. "home"); the same slot later holds "needs the gym", "needs my laptop",
  "low-energy OK", etc. A constraint gates whether a reminder may fire (don't nudge to do a
  home-only Step when the user is away).

Both are captured at **Step creation** in the Journey wizard.

---

## 2. The flow (user-triggered this slice)

1. **User taps "Postpone"** on a Step. *(Auto-miss detection — the `StepMissed` keystone — is the
   next slice, not this one.)*
2. **Screen 1 — two options** (both **free** this stage — see §9/D-note, Grace Tokens are OUT of this slice):
   - **Postpone** → reschedule (goes to the reschedule UX, §5) — keep the Step, move it.
   - **Cancel / "Not this time"** (warmer label TBD by design) → let this occurrence go, then → Screen 2.
   - **No token cost, no token language anywhere in this slice.** The optional "spend a token to keep
     your streak" idea is **frozen for a later decision** (§9).
3. **Screen 2 — "What happened?"** — the closed **reason list** (§3). Copy is **caring, not
   accusatory** ("Want to tell me what got in the way?" — never "Why didn't you do it?").
4. Reason → **lever engine** (§4) picks the response → applies it (or proposes it, §5).
5. The reason is **logged** to the per-user reason history (§6). The user can open **"see past
   reasons"** for this Step — the **Mirror** lever.

---

## 3. Reason list (closed) — confirmed

`Forgot` · `No time` · `Lost motivation` · `Too hard` · `Did it partially` · `Couldn't (life happened)`
· `Not relevant anymore` · `Other (free text)`

Source of truth: **`app/src/core/config/reasons.ts`** (config-before-code). `Other` is captured as
**text only this slice — no AI** (a free-provider classifier is the next slice).

---

## 4. Lever catalog &amp; reason→lever mapping

**Levers** (`app/src/core/config/levers.ts`):

| Lever | Effect |
|---|---|
| **Retime** | shift the reminder to a better time |
| **Re-frequency** | add (or reduce) reminders |
| **Re-tone** | change the wording/voice of the nudge |
| **Rally the circle** | pull in an Ally as motivation *(logged placeholder this slice)* |
| **Reconnect the why** | pop a motivation line tied to the Dream *(logged placeholder)* |
| **Reshape** | reduce steps / resize a Step / offer to edit |
| **Mirror** | reflect the pattern back ("you've postponed this 10× — see why") |
| **Grace** | accept, no change, self-compassion |

**Mapping** (`reasonId → lever`, rules not AI — config-before-code):

| Reason | Default lever(s) |
|---|---|
| Forgot | **Retime** (propose times) + **Re-frequency** (extra pre-reminders) + add-to-calendar link |
| No time | **Reshape** (lighter slot / fewer steps) |
| Lost motivation | Reconnect the why · Rally the circle *(both logged placeholders this slice)* |
| Too hard | **Reshape** (resize / edit the Step) |
| Did it partially | mark partial → optionally a smaller next Step |
| Couldn't (life happened) | **Grace** — no change |
| Not relevant anymore | offer to **edit / retire** the Step or Journey |
| Other | *(this slice: capture text + log; AI classify later)* |

**This slice executes for real only the reminder-affecting levers** (Retime · Re-frequency ·
Reshape) + Mirror + Grace. Rally-the-circle and Reconnect-the-why are **logged as "would do X"**
placeholders (they need the Social / Dream-why pillars).

---

## 5. Reschedule UX (Retime) — and the "Forgot" bundle

- On a reminder change, the app **proposes a few candidate times** and lets the user **confirm one**,
  with an **"Other → pick a specific time"** fallback.
- **"Forgot" specifically** bundles three things:
  1. propose alternative time(s) (above),
  2. **offer to add the Step to the user's calendar via a link / `.ics`** — the user taps to create
     the event, so **the app needs no calendar-write permission**, and
  3. **add extra reminders before the event** (Re-frequency).

**Zero-permission principle:** prefer link / `.ics` / local-notification mechanisms over native
permissions wherever they do the job.

---

## 6. Learning data — the per-user reason log

Every reason (reasonId, stepId, journeyId, timestamp, chosen lever, outcome) is written to a
**per-user reason history**. This is the seed of the "learn the user" data and the source for the
**Mirror** view. **No PII, no free text beyond the optional "Other" note** — this is the data a
future Profiling/Analytics layer consumes, so keep it minimal and structured from day one.

---

## 7. Mock-first scope — real vs mocked

**Real now (Expo Go, $0):**
- Step fields (`estimatedDuration`, `constraints[]`), the two-screen flow, the reason list, the
  reason→lever rules, the reminder-affecting levers, the per-user reason log + Mirror view.
- **Add-to-calendar link / `.ics`** (no permission needed).
- **Extra pre-event reminders** (on-device local notifications).

**Mocked this slice (dev toggles):**
- **Location** ("I'm home / away") — real geofencing is deferred (native + privacy red-line R3).
- **Calendar free/busy** — smart "only suggest a real free slot" needs calendar *read* (native +
  security-privacy). This slice proposes times from a **simple heuristic** (same time tomorrow,
  +2h, an evening slot).
- **Auth** — stays **anonymous** (no Google sign-in; that + the $99 Apple account are a later,
  separately-approved step).

**Out of scope for this slice:** AI on "Other"; executing the social + motivation levers; auto-miss
(`StepMissed`) detection; real geofence; real calendar read; Google/Apple native sign-in.

---

## 8. Architecture touchpoints (for the plan)

Grounded in the existing engine-over-event-bus, config-before-code, vendor-isolated-gateway shape:
- `types/domain.ts` — extend `Step` (+ `Constraint`), add `PostponeOutcome`/reason types.
- `config/reasons.ts`, `config/levers.ts` — the two registries (source of truth).
- `JourneyEngine` — Step postpone/cancel, partial-done, reschedule application, reason logging.
- `ReminderEngine` / `CommunicationScheduler` — apply Retime / Re-frequency; the constraint +
  duration gating hooks (mock gateways behind them).
- Reserved **Location/Calendar gateways** (`core/location`, `core/calendar`) — stay `Null`, driven
  by a **dev mock** for this slice; behind `featureFlags`.
- A calendar-link/`.ics` helper (pure, no permission).
- UI: Postpone/Cancel sheet, "What happened?" reason sheet, reschedule/propose-times sheet, the
  "see past reasons" (Mirror) view.

**Privacy note:** the reason log and any future calendar *read* route through **security-privacy**
before they leave the device or gain real (non-mock) data.

---

## 9. Review-gate outcomes (2026-07-21) — binding on the build

### Founder decision — Grace Tokens
**Out of this slice. Cancel is free.** No `−1 Grace Token`, no token language, no `graceTokenCost` on
the `StepCancelled` event. The **streak-protection** reframe (optional "spend a token to keep your
streak, or let it rest, no penalty," never charged for "life happened") is a **good idea, FROZEN for
a later decision** — not dropped (vision never shrinks). → log this as a Frozen Decision in
`06_Decisions/Decision_Log.md`.

### product-guardian (approve-with-changes)
- **`Mirror` stays an internal name only** — the user-facing label is **"see past reasons."** It must
  never appear in UI (would collide with the official term **Reflection**). Same for all lever names —
  internal to `config/levers.ts`.
- **Screen 2 copy is locked** (caring, never accusatory — "Want to tell me what got in the way?").
- **"Cancel" gets a warmer, non-colliding label** ("Not this time" / "Let it go") — design's call;
  whatever wins is logged in `Product_Terminology.md` + `Decision_Log.md`. "Postpone" is kept (matches §36.1).
- Model levers internally as a taxonomy of the reserved **Intervention** domain so vocabulary doesn't fork.
- Reason list is fine for a mock-first POC; flag that it needs a **research pass before Commercial**.

### security-privacy (approve-with-changes) — implementer guardrails
- **G1 — Fence the "Other" free-text `note` as strictly on-device, forever.** Annotate the field
  ("ON-DEVICE ONLY — never into a DomainEvent, ProgressSummary, log line, or Profiling signal; moving
  it needs a fresh review"). The reason→lever code must never copy `note` into any event.
- **G2 — Whitelist-exclude the whole reason log from Social's sync path.** Add a comment on
  `ProgressSummary`/`SocialGateway` barring reason/reflection data; `SocialProvider` must never read
  `AppState.reasonLog`.
- **G3 — Fix the red-line citation:** `LocationGateway.ts`/`CalendarGateway.ts` cite **R2**; it should
  be **R3** (D21). Correct it and extend the "never synced" clause to the new read methods' return values.
- **G4 — Bar the gateway read results** (`currentPlace()`/`isBusy()`) from being persisted or emitted —
  transient, gating-only.
- **G5 — Cap the reason log** (rolling window per Step) and require Profiling to consume only *derived*
  aggregates, never raw records, always stripping `note`.
- **G6 — Forward:** include the reason log (incl. `note`) in account-deletion/export scope when E3 P7 lands.
- Red-lines **R1/R2/R3 preserved**; this opens no new cloud-PII surface.

### Confirmed small defaults (architect flags)
Retime adjusts the **Journey's** reminder (per-Step retiming is a later data-model change) · "Not
relevant" → **edit** the Step (true retire/archive is a follow-up) · `Re-tone` lever stays in the
catalog but **inert** this slice · Grace Tokens enter app state in a later slice (moot here — Cancel is free).

---

## 10. Flow-walkthrough refinements (founder, 2026-07-21) — binding

1. **Step fields.** `estimatedDuration` is **optional, default 15 min**. The **location constraint is
   only editable when location access is available** (the mock counts as available in dev; real =
   device permission granted) — otherwise the field is **disabled/hidden**. When editable, **default
   "anywhere."**
2. **Recovery entry point = Home screen only.** Journey-detail is for editing the Journey's
   *structure*, not for recovering the currently-active occurrence — so Postpone / reason / "see past
   reasons" live on **Home**, not the Journey-detail screen.
3. **The reason list pops on BOTH Postpone and Cancel** (capture a reason on either path — we learn
   from postpones too).
4. **⭐ Escalate on a pattern, not on the first miss (supersedes "fire the lever immediately").**
   A **single** postpone triggers **no sweeping change** — we just help reschedule *this* occurrence
   and log the reason. Only when a **repeated** pattern is detected (e.g. the same Step postponed
   several times) does the app **propose** adapting the reminder (timing / frequency). The per-Step
   **reason log is the data source** for detecting the pattern. **Exact thresholds / escalation logic
   are pending — the founder will specify them separately; do not finalize the escalation engine until
   then.**

   → **Build delta:** the first-pass engine fires the mapped lever immediately on any reason. It must
   become **frequency-aware** — light-touch on the first occurrence, escalate only on a detected
   repeat. This is the next change once the founder details the logic.
