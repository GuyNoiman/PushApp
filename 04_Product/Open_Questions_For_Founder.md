# Open Questions — founder decisions pending

Status: **Living list.** Compiled 2026-08-14 from every PRD, decision and code audit produced in the
2026-08-13/14 sessions. Each item names where it came from and what it blocks, so it can be answered
out of order.

**How to use this:** answer down **Section 1 first** — those four questions are the only ones stopping
code from being written today. Everything below them can wait without idling the build.

Answered questions are removed from here and recorded in `06_Decisions/Decision_Log.md`. Nothing in
this file is a proposal; it is only a list of what still needs deciding.

---

## 1. Blocking implementation right now

These four sit in front of `Step_Postponement_02_PRD.md` (Journey extension + resume re-plan). The
spec is written and cannot be built until they are answered.

| # | Question | Why it matters | Recommendation |
|---|---|---|---|
| 1.1 | **What does the app show at the moment a Journey is extended?** | You decided extension is always explicit and always respected. Open: whether the app also *says* anything — e.g. "you first planned to finish on 12 Sep". It must never become a warning, a nag, or a count of extensions. | Show the two dates always; add one neutral original-plan line only on a repeat extension. Showing nothing is also defensible. |
| 1.2 | **The creation wizard offers a 90-day Journey. You said Journeys are planned for up to two months.** Which wins? | A user can plan 90 days today, which contradicts the guidance you just set. This is a planning-flow question only — it does not affect extension. | Align the wizard to the two-month guidance, or accept 90 days and restate the guidance as "about two to three months". |
| 1.3 | **When a postponement extends the Journey, does the postponed Step's own date move too?** | Today postponing moves the Step occurrence and its reminder. Whether the extension *also* re-dates that Step is unspecified. | No in this slice — keep the extension and the Step move as separate effects (matches D37 §4). |
| 1.4 | **`deferDependents` shifts a dependent Step by a week, automatically, with no warning today.** Does it fall under the same explicit-consent rule? | It is the one remaining path that moves a user's plan without asking. Your freeze decision makes this sharper, not softer — both are automatic movements. | Out of scope for this slice, but it needs an answer before the rule can be called complete. |

---

## 2. Needed before any public release

Not blocking today's work; blocking the store.

| # | Item | State |
|---|---|---|
| 2.1 | **Privacy policy document** | Does not exist. Nothing for consent text or store disclosures to match. |
| 2.2 | **Server-side LLM proxy** | The Gemini key is inlined into the client bundle today. Anyone who downloads the app can extract it and bill your card. Needs an Edge Function proxy, plus a per-user quota and a hard spend cap. |
| 2.3 | **Encryption: is the device key locked to one device?** | Stronger, but guarantees total data loss on every phone upgrade until a recovery path exists. **Recommendation: leave it migratable for MVP.** |
| 2.4 | **Encryption: should server-assisted recovery ever exist?** | It would mean the server can decrypt. **Recommendation: no — keep the strong promise.** |
| 2.5 | **Quarantine recovery tool** | Unreadable data is now preserved instead of overwritten, but nothing in the app can read it back. Until a tool exists, "start fresh" is the only exit and it destroys the copy. |
| 2.6 | **Deploy the `delete-account` Edge Function + host a Google Play deletion URL** | Written, never deployed. Store release gate (O1). |
| 2.7 | **Apple Developer account** | Gates real sign-in, device notifications, the native build, design sign-off, RTL and gendered-copy visual QA, and completion-card image export. |
| 2.8 | **Support Circle live-DB authorization QA** | Needs a second real account against the live database. |

---

## 3. Product direction

### 3.1 Ally status visibility — needs a security-privacy pass
You asked that Allies see a status tag when a Journey is paused or resumed. Two findings:
- What leaves the device for an Ally is a strict four-field whitelist (`journeyId`, `title`, `progress`,
  `streak`). **There is no status field at all**, so even the minimal tag requires widening it, and every
  widening of that list is a privacy decision.
- **Current behaviour is the opposite of what you asked**: a paused Journey silently *disappears* from the
  Ally's view and reappears on resume.

**Question:** approve a narrowly-projected `active | paused` field — never the raw status, which would
leak `completed` and `abandoned` — subject to a security-privacy review?

### 3.2 Should real-world supporters be modelled at all?
An Ally is only someone added to a Support Circle (D47). Sponsors, clinicians and family are not modelled
anywhere. The partner's addiction content assumes they are. Deliberately **not** inventing a term for them
before you decide, because naming something is how you accidentally decide it exists.

### 3.3 Journey resume has grown into its own feature
Your re-plan answer turned a question inside the postponement spec into a full mechanism: the resume point
becomes the start of the remainder, all unreported Steps re-plan, and the coach may ask what happened first.
**Question:** split it into its own `Journey_Resume_Replan_PRD.md`? One PRD, one feature.

### 3.4 Freeze and the weekday gap
`Step` has no weekday field anywhere in the model — weekday meaning lives only in your account-level
preferred days. So "paused Sunday, resumed Thursday" is a scenario the model **cannot currently express**.
The rebuild targets your standing preferences and offers to show them rather than silently editing them.
**Question:** is that acceptable, or does `Step` need a real scheduling field first? (Same gap that got
`weekly-planning` archived.)

### 3.5 Smart Notification Timing — the aggregate
The learning loop is built. The remaining piece bundles several Journeys into one adaptive notification and
is roughly as large as everything else combined. It also carries the sharpest deviation from the spec: a
local notification cannot be cancelled at the moment it fires, so "suppress if nothing is pending" is
approximated by cancelling on the next reconcile.
**Question:** build it, or ship the learning loop with a simple daily cap per Journey and treat the
aggregate as a fast follow?

### 3.6 Two smaller ones from the Future Journey build
- The creation wizard asks for **notification permission** while creating a Future Journey, even though the
  reminder stays dormant until it starts. Move the prompt to activation?
- A Future Journey's detail screen shows **"3 Steps in the plan"** — a plan-structure fact, not progress,
  but it is the only number on that screen.

---

## 4. Weekly Review contributions (`Weekly_Review_Contributions_02_PRD.md` §14)

Stage Future — none of these block anything today, but they decide whether the partner's content can ever
be wired.

| # | Question |
|---|---|
| 4.1 | **Does the change vocabulary grow** to cover the Step content fields the partner's model needs (`context`, `busyDayVersion`)? **Highest value here** — it decides whether the first real consumer is even expressible. |
| 4.2 | Is the user told a specialist was involved, or does the single-coach-voice rule (D30) mean no attribution at all? |
| 4.3 | Are the caps (one block per Journey, three per review) your numbers? They are unmeasured guesses. |
| 4.4 | May a contributor ever run **off-device**? That would open a genuinely new cloud path. |
| 4.5 | Under a cap, is the order stable, or ranked by need? Ranked-by-need risks reading as a ranking of the user's failures. |
| 4.6 | When a first-party and a contributed proposal target the same Journey, who wins? (Proposed default: first-party.) |
| 4.7 | Does the partner's `STABILIZE` state deserve a visible line at all, or is silence the honest rendering? |

---

## 5. Partner content — remaining

| # | Question |
|---|---|
| 5.1 | Send the drafted reply? `04_Product/Partner_Reply_Terminology_2026-08-13.md` is written and **not sent**. |
| 5.2 | Their weekly `STABILIZE / ADAPT / PROGRESS` review nests inside ours (D50) — but the contribution interface does not exist. Anything to tell them before they write v1.2? |

---

## 6. Not questions — just uncommitted

- **Codex's PRD drafts are untracked**, including `Future_Journey_Management_PRD.md`, which the shipped
  Future Journeys code implements. The code is in git history; the spec it implements is not.
  Approve committing them, or leave them to Codex?
- The **Invite** feature's six decisions are approved, but the interim share needs a **stable download
  destination**, and there is no website yet. Only the `@username` share is buildable today.
