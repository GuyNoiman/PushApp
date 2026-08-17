# PRD — Weekly Review Contributions (continuation 02)

Status: **Approved architecture, interface NOT built, NOT scheduled.** The founder approved the
architectural rule on 2026-08-14 (Decision Log **D50**): there is exactly ONE Weekly Review, and every
domain expert and every Journey contributes into it rather than creating a parallel review. The
*contribution slot itself does not exist in the code today* and does not need to be implemented as part of
the basic review. This file specifies the socket so that it is designed before anything is plugged into
it; it is not a build request. Seven open questions in §14 remain unanswered, two of them
(§14.2, §14.6) decide whether the first real consumer is even expressible.
Stage: **Future.**
Owner: founder + AI product team.
Source: founder decision 2026-08-14 (D50), triggered by the external coaching partner's per-Journey
weekly review in `10_Partner_Coaching_Content/01_Eating_Daily_Consistency_Progression.md` §7.

**Predecessor (immutable):** `Done/Weekly_Review_PRD.md` — the shipped account-level Weekly Review
(D40/D43). That file is in `Done/` and is **not edited, moved or renamed by this PRD**, per the Done-file
protection rule in `README.md`. This continuation **extends** it with one new concept (a contribution
surface) and **supersedes nothing**. Every rule in the predecessor stays exactly as written; where this
document and the predecessor could be read as conflicting, the predecessor wins and the conflict becomes
an open question here.

Related PRDs: `Smart_Notification_Timing_PRD.md` (§6 — the first, already-specified contributor),
`Done/Daily_Step_Reporting_PRD.md` (the evidence a contribution may reference),
`Done/Week_Boundary_Preference_PRD.md` (the one week boundary, D33),
`Done/Step_Postponement_PRD.md`, `Coach_Conversation_PRD.md`, `Future/User_Learning_PRD.md`,
`Future/Personalized_Motivation_Engine_PRD.md` (the other future producer of Journey-level content).

Related Decision Log: **D50** (one Weekly Review; contributions nest inside it — the decision this PRD
specifies), **D43** (apply-on-approval, never silently), **D40** (week-close proposal, forward-only apply,
48h window), **D30** (domain experts are internal tools; the meta-agent is the sole user-facing voice),
**D24/D53** (the four domains; Addiction and Relationships & Loneliness cannot reach real users until
expert review before release has happened — D53, 2026-08-18, corrects D24's mechanism from a
development-stage gate to a release-stage review; the requirement that they may not ship unreviewed is
unchanged), **D25** (framework-not-content), **D31** (form of
address), **D49** (the partner's "Meta-Coach" is our coach / meta-agent).

Grounding — read, not assumed: `Done/Weekly_Review_PRD.md` §§5–11 and its resolved §13;
`Smart_Notification_Timing_PRD.md` §§5–7; `10_Partner_Coaching_Content/01_Eating_Daily_Consistency_Progression.md`
§§5–8; `11_Engineering_Bible/Sync_Manifest.md` §§1, 4 (the on-device red lines);
`app/src/core/review/weeklyReview.ts` (the shipped pure analysis engine, its `WeeklyReviewInput`, and the
existing per-Journey `WeeklyReviewJourneyProposal` shape that a contributed proposal must live beside).
No code was written or changed for this PRD.

---

## 1. Purpose

The Weekly Review answers one question for the user: *given what actually happened last week, what should
next week look like?* Today only PushApp's own analysis may answer it. As soon as a second producer of
weekly judgement exists — a domain expert, a partner-authored progression mechanism, a future motivation
engine — that producer needs somewhere to put its answer.

There are only two places it can go. It can become its own weekly ritual, or it can go inside the one
review the user already knows. D50 chose the second, and the reason matters more than the choice: two
weekly rituals would compete for the same week boundary and the same approval moment, and the user would
have to work out which one owns their plan. That would fork the trust model D43 exists to protect.

So this PRD does not design a feature the user sees. It designs a **socket**: the contract by which
something other than the review's own analysis may put information — and, in one carefully bounded case, a
proposed change — into the review the user already has.

The founder's framing, which is the whole architecture in one sentence: *the Weekly Review is a shared
mechanism available to every domain expert and every Journey, into which they can contribute information
for display.*

## 2. Feature-proposal checklist (CLAUDE.md §3.5)

- **What problem does it solve?** A second producer of weekly judgement has no legitimate way to reach the
  user. Without a socket, the only paths are a parallel review (rejected by D50) or a direct Journey
  mutation (rejected by D43).
- **Why is it needed?** Because the first such producer already exists on paper (the partner package) and
  a second one is already specified (Smart Notification Timing §6). We are choosing the shape once, before
  two producers invent two different shapes.
- **What existing system does it improve?** The shipped Weekly Review — it gains extensibility without
  gaining a second approval path.
- **What complexity does it introduce?** A contribution collection step at week close, a validation and
  re-voicing layer, volume caps, and one more thing that can fail while the review is being built. Real,
  but bounded: everything a contribution can do is a subset of what the review already does.
- **Does it align with Product Philosophy?** Yes, with one live tension named in §6: any extension surface
  invites more content, and more content is time-in-app, not transformation. The caps exist precisely to
  make the surface refuse to grow.
- **Which roadmap stage?** **Future.** Nothing depends on it shipping; the basic review is complete
  without it.

## 3. The case that forced it

The external coaching partner's eating package specifies a weekly review at the level of a **single
Journey**: after a week of daily `Kept it / Partly / Didn't happen` check-ins, decide between exactly three
outcomes — `STABILIZE` (keep the target), `ADAPT` (same behaviour, change the context, environment or
busy-day version), `PROGRESS` (expand one dimension only, frequency **or** context, never both).

We already shipped a Weekly Review at the **account** level. Two things called "weekly review" at different
levels would confuse both users and code, so D50 makes the partner's the nested content and ours the
container.

Mapping the partner's three outcomes onto this contract is the honest test of whether the socket is
adequate:

| Partner outcome | Contribution kind (§4) | Notes |
|---|---|---|
| `STABILIZE` | none, or at most one `note` | Nothing changes. §14.7 asks whether it deserves any visible line at all. |
| `ADAPT` | `proposal` | Expressible only if the change fits the review's existing change vocabulary. |
| `PROGRESS` — Option A (frequency) | `proposal` | Frequency is already in the vocabulary (predecessor §7). |
| `PROGRESS` — Option B (context) | **not currently expressible** | `context` and `busyDayVersion` are Step content fields the partner defines that PushApp's Step model does not have. See §14.2. |

That last row is the most valuable thing this exercise produced. The socket does **not** paper over it: a
contribution whose change cannot be expressed in the vocabulary the review's applier already understands
**degrades to a `note` or is dropped**. It never invents a change type (§4.4).

## 4. The contribution contract

### 4.1 The three kinds, ranked by consent weight

A contribution is exactly one of the following. The distinction is not cosmetic — it is the difference
between something that informs the user and something that changes their week.

**`note` — display only.** One short block rendered inside a Journey's section of the review. It can change
nothing: no plan change, no notification, no write to any store, no side effect of any kind. It must be
derived from records the user already owns; it may not introduce a fact the user has never seen.

**`evidence` — display only, structured.** A factual line (counts, ratios, a streak of kept occasions)
rendered as data rather than prose. Same zero authority as `note`. **Every evidence contribution must
reference the first-party record ids it was computed from** (Step occurrences, check-ins, derived
statuses), so the review can verify it rather than trust it. A contributor may *select and frame* evidence;
it may never be a new source of truth.

**`proposal` — a structured change to next week's plan.** Expressed only in the change vocabulary the
predecessor already defines (§7: workload, timing, frequency, Step size, and the recurring-obstacle /
partial-progress / over-performance triggers). This is the only kind with any power, and §7 states exactly
how tightly that power is bounded.

### 4.2 What a contribution carries

Product-level shape; the engineering representation is an architect decision, not this document's.

- the `journeyId` it is about (a contribution is always about exactly one Journey — there is no
  account-level contribution; the account level is the review's own summary and stays first-party);
- the internal `contributorId` (never displayed — see §5);
- the `kind` (`note` | `evidence` | `proposal`);
- an **`intentKey`**: which of the meta-agent's own message templates should render it (§5);
- **structured slots** to fill that template (numbers, Journey/Step names, an enum outcome). Never prose;
- **`evidenceRefs`**: the first-party record ids the contribution is grounded in;
- for a `proposal`, a structured diff in the existing change vocabulary, plus the prior-plan reference the
  predecessor §8 output already requires ("what the prior plan expected → what happened → what was
  inferred → the proposed change → the resulting plan");
- an optional confidence/priority used only for ordering under a cap (§6), never displayed.

### 4.3 What a contribution may never do

- speak to the user in its own words or its own voice (D30 — see §5);
- send a notification, schedule anything, or trigger any outreach;
- mutate a Journey, a Step, a report, or any preference directly;
- write to the reason log, the behaviour log, or the coach thread;
- carry or reference free text the user wrote (§8);
- deliver a safety-critical signal. **The Weekly Review is never a safety channel** — it is weekly, it is
  optional to open, and it can expire unread. Anything urgent belongs to the safety/referral path the
  domain owns, not here. This matters immediately: the first consumer is a Body Image mechanism whose own
  §2 is a safety precondition;
- feed back into the review's own first-party analysis. Predecessor §6 lists the review's inputs; a
  contribution is an **output** produced alongside them, never an input to them. This boundary also stops
  barred data being laundered into the analysis path through a contributor.

### 4.4 Fail-closed

Anything the review cannot fully validate is dropped, silently to the user and loudly to the internal log:
an unknown `intentKey`, a slot the template does not accept, a change type the applier does not understand,
an `evidenceRef` that no longer resolves, a Journey that is ineligible (§9), a payload over the cap (§6).
Dropping is always preferred to rendering something we cannot stand behind. There is no "render it anyway"
fallback, because a fallback that shows unvalidated content is how a single voice becomes two.

## 5. Who may contribute, and how it is attributed

**Who.** Any first-party engine PushApp owns (Smart Notification Timing is one today), and — once they are
specified and un-gated — the domain experts. This PRD deliberately does **not** design the experts; they
are unspecced and gated (D24/D53), and D25 keeps them framework-not-content. This is the socket, not the plug.
Whether a contributor may ever run off-device is §14.4, and is not assumed here.

**Attribution, and the D30 rule.** D30 is not negotiable and this interface does not bend it: the
meta-agent is the SOLE user-facing voice; domain experts are internal tools that never speak to the user
directly. So a contribution is **re-voiced, never surfaced verbatim**, using exactly the mechanism D30
already shipped for the coach interview (`CoachOrchestrator.metaVoiced`):

1. the contributor supplies **structure only** — an `intentKey` plus structured slots;
2. the review renders the **meta-agent's own localized template** for that intent, filled from those slots;
3. the rendered block is in the user's language, in the coach's voice, with the correct form of address
   (D31), and is indistinguishable in tone from the review's first-party copy;
4. if no template exists for that intent, the contribution is **dropped** (§4.4). It is never rendered
   verbatim as a fallback.

Deterministic templates are kept deliberately, for the same reason D30 chose them over per-question LLM
phrasing: cost and latency. A contribution costs zero extra model calls.

**The user sees no attribution.** No "your Body Image expert suggests". There is one coach. The
`contributorId` is retained internally for audit, debugging and the instrumentation in §12, and never
displayed. Whether the user should nonetheless be told that a specialist informed a block — a transparency
argument that pulls against D30's single voice — is **§14.1**, open.

## 6. Ordering, volume and truncation

A review that becomes a wall of text fails on its own terms. The product optimises for real-life
transformation, never for time-in-app, and an extension surface is exactly where that erodes: every new
contributor has a local incentive to be seen. The caps below exist to make the surface refuse.

**Placement.** Contributions never precede the review's own content. The predecessor's order stands: the
past-week summary opens the screen (D40), then the existing per-Journey sections. A contribution is
rendered **inside** the section of the Journey it is about. It never creates a new top-level section, a new
screen, or a new entry point. (One grandfathered exception: Smart Notification Timing's proposals already
render in the predecessor's §8 "Communication adjustments" block. This PRD does not re-home shipped output
— see §10.)

**Caps.**

- at most **one contributed block per Journey per week**;
- at most **three contributed blocks in the entire review**;
- at most **one contributed proposal per Journey per week**, where "one proposal" may group several
  individually selectable items of the same kind from the same contributor (this is what keeps Smart
  Notification Timing's multi-window case legal — §10);
- a rendered block is short by construction: our template enforces the length, so the cap does not depend
  on a contributor behaving.

**Ordering under a cap.** `proposal` outranks `evidence` outranks `note`; within a kind, the review's
existing Journey order decides. Ranking Journeys by need ("the one you are struggling with most, first")
is a judgement the review does not currently make and this PRD does not add — **§14.5**.

**Beyond the cap.** Dropped, not queued. A contribution about last week is worthless the week after, so
nothing is stored for replay. A contributor whose proposal was dropped may generate it again next week
**from fresh evidence** — regenerate, never replay.

**The tension, named.** If contributions later look valuable and someone proposes raising the caps because
"users engage with them", that is an engagement argument, not a growth argument, and it should be refused
on those grounds. The right response to valuable contributions is a *better* three, not a longer list.

## 7. Approval semantics

Nothing in this document weakens D43. To state it plainly:

- **`note` and `evidence` can never change anything.** Zero mutation authority. They are text and numbers
  on a screen.
- **A `proposal` can change next week's plan, and only through the exact gate that already exists.** It
  joins the same single draft as the review's first-party proposals; it is individually selectable and
  de-selectable; it applies only inside the **one atomic approval of the complete weekly plan**; it is
  **forward-only** (never touches a reported or past occurrence); it lives inside the **same 48-hour
  window** and expires unapplied with it.
- **There is no separate approval, no shorter path, no longer window, no default-on, and no automatic
  apply — ever.** A contribution that cannot be validated against current reality at approval time (the
  predecessor's rebase step) is dropped from the draft rather than applied.
- If a contributed proposal and a first-party proposal both target the same Journey in the same week, they
  must not both appear — the predecessor's "never stack two competing actionable proposals" rule applies
  within a Journey too. **Proposed default: first-party wins, the contributed one is dropped and logged.**
  This is a proposal, not a decision — **§14.6**.

## 8. Empty and degraded states

**Empty is the normal week.** Most weeks, most Journeys contribute nothing. With zero contributions the
review must render **exactly** as it does today — the predecessor's output shapes are unchanged, and this
feature is invisible.

**No filler, ever.** There is no "no updates from your experts this week" line, no empty contribution
placeholder, no encouragement generated to occupy the space. Manufacturing content to fill a slot teaches
the user to expect a slot, which is precisely the failure mode §6 is guarding against.

**Degraded.** A contributor that errors, times out, or returns something invalid simply does not appear.
Collection runs on a bounded budget and the review ships with whatever arrived in time; a contribution
never delays week close, never blocks the review from opening, and never produces a user-visible failure.
The predecessor's §10 rule governs: keep the current plan active, show no fabricated insight, stay
non-blocking.

## 9. Journey eligibility

Follows the predecessor §7 rules rather than inventing new ones:

- **frozen for the entire reviewed week** — the Journey does not appear at all, so it receives no
  contribution;
- **frozen during part of the week** — named in the summary, excluded from next-week changes: a `note` or
  `evidence` may render, a `proposal` may not;
- **completed in-window** — D41 makes completion final: display-only contributions may render, a proposal
  may never;
- **abandoned / cancelled** — nothing;
- **deleted** — the contribution goes with the Journey (§11).

## 10. Interaction with Smart Notification Timing

`Smart_Notification_Timing_PRD.md` §6 already defines a Weekly Review contract for timing proposals. It is
effectively the FIRST contributor, and it was written before this interface existed, so the cross-check is
the sharpest available test of the contract.

**Verdict: it generalises. It does not conflict.** Its §6 is a strict instance of the `proposal` kind here:

| Smart Notification Timing §6 | This contract |
|---|---|
| "Timing changes never apply automatically" | §7 — no contribution has an auto-apply path |
| "shows evidence, old time, exact proposed time, and resulting schedule" | §4.2 — structured diff + prior-plan reference + `evidenceRefs` |
| "Multiple reminder proposals can be selected, discussed, and included in one final weekly-plan confirmation" | §7 — individually selectable inside one atomic approval |
| "Only the complete approved plan applies atomically" | §7 — identical |
| Per-Journey evidence, at most 15 minutes of movement per review | §4.1 — a per-Journey structured proposal in an existing change category (timing) |

Three things had to be adjusted for the generalisation to be honest, and all three are recorded rather
than glossed:

1. **The per-Journey proposal cap had to become "one block, several selectable items".** Smart Notification
   Timing §5 learns per-day windows independently, so one Journey can legitimately produce more than one
   timing proposal in a single review. A naive "one proposal per Journey" cap would have silently broken a
   shipped, approved spec. §6's cap is written as one *block* that may group several individually
   selectable items of the same kind from the same contributor, which preserves §6 verbatim.
2. **Presentation placement is grandfathered, not migrated.** Timing proposals render today in the
   predecessor's §8 "Communication adjustments" block, not inside a per-Journey section. This PRD does not
   move shipped output; the predecessor is immutable and its §8 stands. New contributions render inside
   Journey sections per §6. If the founder later wants one consistent placement, that is a separate change
   to a `Done/` feature and needs its own continuation PRD.
3. **First-party contributors need no re-voicing decision.** Smart Notification Timing is a PushApp engine,
   not a domain expert, so D30's "internal tools never speak to the user" concern does not arise for it —
   but it costs nothing for it to use the same intent-template path, and doing so keeps one rendering
   mechanism instead of two.

The practical consequence: when this interface is eventually built, Smart Notification Timing should be
**migrated onto it as the reference contributor** rather than left as a special case. Its spec needs no
change to qualify.

## 11. Edge cases (README standard checklist)

- **Empty / first-run** — no closed week yet, no contributors registered, brand-new account: no
  contribution path runs at all; the review behaves exactly as §8 describes.
- **Offline** — contributions are computed on-device with the rest of the review; nothing here requires
  network. A future contributor that needs network degrades to nothing (§8), never to a spinner or an
  error.
- **Permission denied** — notification permission is irrelevant: contributions never notify (§4.3). No
  other permission is involved.
- **Completed / frozen / abandoned** — §9.
- **Concurrent actions** — the draft is closed at approval time; a contribution arriving after the user has
  approved is dropped, never applied post-hoc. If another week closes while a review is unresolved, the
  predecessor §9 rule governs: the older review is marked not completed and its contributions die with it.
  Two devices must not produce two contribution sets for the same review/week (the predecessor's
  idempotency rule extends unchanged).
- **Very long / empty input** — the rendered length is enforced by our template, not by trusting the
  contributor; an empty or malformed payload is dropped (§4.4).
- **RTL** — contributors supply no prose, so nothing untranslated can leak into the UI; the meta-agent's
  templates carry en/he parity and RTL like every other string.
- **Form of address (gender)** — inherited automatically from the template mechanism (D31); a contributor
  never phrases anything, so it can never mis-address the user.
- **Deletion / data-loss** — contributions live inside the review record in the encrypted `AppState` blob,
  so they cascade-delete with `resetToFirstRun()`/account deletion and are included in the state export,
  exactly as the predecessor §13.7 resolved for review data. Deleting a Journey removes its contributions.
- **Error states** — silent drop, internal log, never a user-visible failure and never fabricated content.

## 12. Success metrics and instrumentation

The point of this feature is that a second producer of judgement can be useful *without* making the review
heavier. So the primary metric is a guardrail, not a usage number.

**Signals**

1. **Guardrail (primary): review length and time do not grow.** Median time-in-review and rendered block
   count stay flat versus the zero-contribution baseline. If contributions make the review longer to get
   through, the feature is failing on its own terms even if every block is "good".
2. **Contributed proposals are as trustworthy as ours.** Approval rate of contributed proposals is
   comparable to first-party proposals. Materially lower means a contributor is producing noise and should
   be capped or removed.
3. **Real-life outcome (the one that actually matters).** For Journeys where a contributed proposal was
   approved, next-week completion/adherence versus comparable Journeys where none was. This is the
   growth-not-engagement test.
4. **The caps are right.** Drop-by-cap rate. Persistently high means contributors are too chatty or the cap
   is wrong; near-zero forever means the cap is theatre.
5. **Empty weeks still read well.** Review completion rate on zero-contribution weeks does not differ from
   the baseline.

**Events to instrument** (for the implementer to wire and qa-engineer to verify, when this is scheduled).
All payloads are ids, enums and counts. **No text, ever** (§13).

| Event | Payload |
|---|---|
| `weekly_review_contribution_offered` | `reviewId`, `journeyId`, `contributorId`, `kind`, `intentKey` |
| `weekly_review_contribution_rendered` | `reviewId`, `journeyId`, `contributorId`, `kind`, `intentKey`, `position` |
| `weekly_review_contribution_dropped` | + `reason`: `cap` \| `no_template` \| `invalid_payload` \| `stale_evidence` \| `journey_ineligible` \| `contributor_error` \| `conflict_first_party` |
| `weekly_review_contribution_proposal_selected` / `_deselected` | `reviewId`, `journeyId`, `contributorId`, `itemId` |
| `weekly_review_contribution_proposal_applied` | `reviewId`, `journeyId`, `contributorId`, `itemId`, `approvedAt` |
| `weekly_review_contribution_expired` | `reviewId`, `journeyId`, `contributorId` (48h window closed with a contributed proposal pending) |
| `weekly_review_contribution_volume` | `reviewId`, `offered`, `rendered`, `dropped`, `journeysWithContribution` |

Reuse the review's existing open/approve/expire events for the denominators rather than adding parallel
ones.

## 13. Privacy

**Required reviewer: security-privacy, before any implementation begins.** This surface takes content
produced about a Journey and puts it on a screen, which is exactly the shape that leaks.

**Barred from every contribution payload, every `evidenceRef`, every analytics event, and every sync path**
(the standing on-device-only red lines, `Sync_Manifest.md` §4):

- raw `reasonLog.note` free text (the `other` / `did_partially` notes);
- partial-report explanations and any free text the user wrote;
- coach conversation text and reflections;
- raw `behaviorLog` records.

These are on-device only, forever (G1), and the predecessor already resolved that free text is **not
analysed at all** (its §13.2). A contributor inherits that restriction without exception — it may not read
what the review itself is forbidden to read.

**Permitted:** first-party structured records the user already owns — Step occurrences and their derived
statuses, check-ins, approved structured reasons, planned schedule, counts derived from those, and the
Journey's own titles as the user wrote them.

**Never leaves the review:** contributed content never enters a social/Ally payload, never becomes a
notification body, never reaches third-party engagement analytics, and never becomes a long-term user fact
(cross-Journey hypotheses belong to `Future/User_Learning_PRD.md`).

**Locality.** Today everything runs on-device and review data rides the encrypted `AppState` blob, so no
new data path is opened. If a contributor were ever to run server-side, that is a genuinely new cloud path:
the predecessor's §13.6 resolution ("no new cloud path — the optional narration rides the existing
live-coach gate") **does not cover it**, and it would need its own data-flow contract before anything is
built. See §14.4.

## 14. Open questions (founder)

None of these is decided. Each is a founder call, not an AI call.

1. **Transparency vs. one voice.** Should the user ever learn that a specialist informed a block ("this
   came from the eating specialist"), or is the coach's single voice absolute? D30 says absolute; the
   counter-argument is that attribution builds trust in a recommendation. *Default if unanswered: absolute,
   no attribution.*
2. **Does the change vocabulary get extended?** The partner's `context` and `busyDayVersion` are Step
   content fields PushApp's Step model does not have, so `PROGRESS`-by-context is currently inexpressible
   (§3). Either the vocabulary grows (a change to the Step model and the review's applier, well beyond this
   PRD) or such proposals permanently degrade to a `note`. **This decides whether the first real consumer
   is fully expressible, so it is the highest-value question here.**
3. **Are the caps right?** One block per Journey, three per review, one proposal per Journey. These are my
   numbers, chosen to keep the review short, not measured. The founder owns the final figure.
4. **May a contributor ever run off-device?** If yes, it needs its own data-flow contract (§13) and a
   security-privacy gate before any work starts. If no, say so now — it constrains the expert architecture
   in a useful way.
5. **Ordering across Journeys under a cap.** Stable review order, or ranked by need (most-struggling
   first)? Ranking by need is a judgement the review does not currently make, and it risks reading as
   ranking the user's failures.
6. **First-party vs. contributed conflict on the same Journey.** Proposed default is first-party wins and
   the contribution is dropped (§7). The opposite is defensible — a domain expert may know more about that
   Journey than the generic replan does. Founder decides which.
7. **Does `STABILIZE` deserve a visible line?** "Nothing changed, keep going" is honest and reassuring, but
   rendering it every week for every Journey is exactly the content-manufacturing §8 forbids. *Default if
   unanswered: no line.*

## 15. Out of scope

- **The domain experts themselves.** Unspecced and gated (D24/D53/D30). This is the socket, not the plug.
- **Wiring any partner content into the app.** The `10_Partner_Coaching_Content/` folder's standing rule
  holds: nothing there is wired in, and PushApp's code is not changed to accommodate it.
- Any change to `Done/Weekly_Review_PRD.md`, its screen, its 48-hour window, its week boundary, or its
  approval flow.
- Re-homing Smart Notification Timing's existing presentation (§10.2).
- Extending the Step model to carry `context` / `busyDayVersion` (§14.2 decides whether that is even
  wanted).
- A contributor authoring UI, a contributor marketplace, or anything creator-facing
  (`Future/Creator_Journey_Authoring_Platform_PRD.md` owns that direction).
- Backend, sync, or cross-device contribution state.
