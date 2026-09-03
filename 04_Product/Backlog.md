# Backlog — the one list

Status: **The single source for what is done and what is not.** Approved 2026-08-29.
Last updated: **2026-09-03**.

## Why this file exists, and what it replaces

Until now the answer to "what is left" was spread across four documents, none of
which claimed to be the list: `PRD/PRD_Coverage_Gaps.md` (PRD gaps only, and
written on 14 August), `Current_Context.md` (a handoff, not a tracker),
`00_Foundation/CHANGELOG.md` (history) and `01_Vision/Open_Questions.md`
(questions, not work). Four partial lists is the same as none.

**None of them is deleted.** Each keeps its own job and gains a line pointing
here. What moves is the claim to be the list.

**Two more joined them on 2026-09-03** (founder: one file, not several that
overlap): `04_Product/Open_Work_2026-08-21.md`, the last link in the Open_Work
chain, and `04_Product/Open_Questions_For_Founder.md`. Their still-open items are
§1a and the sections below; their standing instructions about how to work with
the founder moved into `CLAUDE.md` §0, which is where a rule that governs every
session belongs. Both keep their text and gain a banner.

## The rule that makes this list different

**Every row carries code truth.** Not "done" — *what exists in the code*, with
the file or the reason it cannot be checked. Four partial lists happened because
"done" was recorded without saying done-as-in-what, and the same item was open in
one document and closed in another for three weeks.

A row leaves this list only when its code truth says it works. A row whose truth
is "specified" is not started, however finished the specification is.

## Status vocabulary

| Status | Means |
|---|---|
| **Shipped** | In the code, tested, and reachable by a person on a phone |
| **Built** | In the code and tested; not yet reachable, or not yet deployed |
| **Half** | Part of it is real; the row says which part |
| **Specified** | A decision or PRD exists and no code does |
| **Open** | Not decided |
| **Blocked** | Waiting on a person or an external thing; the row says which |

---

## 1. Blocking a store submission

| ID | Item | Status | Code truth | Blocked on |
|---|---|---|---|---|
| S-01 | The legal entity — which company publishes, in which country | Blocked | — | The founder. Everything in the store listing hangs on it |
| S-02 | A support email address a human reads | Blocked | — | The founder. Goes in the policy and both stores |
| S-03 | Coach behavioural-log retention period | Blocked | The log exists on-device (`BehaviorModelEngine`); no retention rule is written | The founder. 90 days is on the table |
| S-04 | Friendship exit — remove, block, report a user | Specified | Nothing. `SocialGateway` has no `removeFriend`, `blockUser` or `report*` | — |
| S-05 | Sentry §11.5 verification on a real device | Blocked | SDK wired, canary suite green in unit tests; the on-device payload has never been inspected | Both builds are installed now — this is doable |
| S-06 | Privacy-policy line for operational diagnostics and KPIs | Specified | Policy is live and does not mention either | S-05 lands first |

## 1a. Waiting on a founder decision

Walked in from `Open_Questions_For_Founder.md` on 2026-09-03, when that file was superseded by this
one. Only what was still genuinely open after its own 2026-08-25 re-audit is here; everything it
listed that has since shipped, or been decided, is not repeated.

A row leaves this table when the decision is made and lands in `06_Decisions/Decision_Log.md`.

| ID | The decision | Why it is his | Recommendation on the table |
|---|---|---|---|
| F-01 | **Remove `relationships` from `SENSITIVE_DOMAINS`** | The coach refuses to plan for it, so a finished expert cannot ship. The gate is built; whether the domain sits behind it is a judgement about people, not code | Also tracked as S-20 — the single thing blocking a finished expert |
| F-02 | **The wizard offers 90 days; the guidance says up to two months** | One of the two has to move. `journey/new.tsx` has `DURATION_VALUES = [30, 60, 90]` | Align the wizard, or restate the guidance as "about two to three months" |
| F-03 | **What the app SAYS when a Journey is extended** | Extension is explicit and always respected (decided). Open: whether the app also shows the original date. It must never become a warning, a nag, or a count | Show both dates always; one neutral original-plan line only on a repeat extension. Showing nothing is defensible |
| F-04 | **`deferDependents` moves a dependent Step by a week with no warning** | The one remaining path that moves somebody's plan without asking. The freeze decision makes this sharper, not softer | Needs an answer before the explicit-consent rule can be called complete |
| F-05 | **Does a postponement that extends the Journey also re-date the postponed Step?** | Unspecified today; postponing moves the occurrence and its reminder | No — keep extension and Step move as separate effects (matches D37 §4) |
| F-06 | **Ally status visibility when a Journey is paused** | He asked for it; what leaves the device is a strict four-field whitelist with no status field, so even a minimal tag widens what a paused person reveals | Needs a security-privacy pass before it is a yes |
| F-07 | **Should real-world supporters be modelled at all?** | A person supported by somebody who will never install the app is the common case, and the object model has no room for them | Open |
| F-08 | **Smart Notification Timing — the aggregate** | The learning loop shipped (D74); nothing bundles several Journeys into one notification | Open |
| F-09 | **Ratify D76 — coach memory is on-device only** | Decided in his absence on 2026-08-24. The alternative would have quietly downgraded a promise the PRD makes explicitly | Ratify or overturn |
| F-10 | **Weekly Review contributions — seven questions** | 4.1 decides whether the partner's content is expressible at all; the rest follow from it | Also tracked as S-19 |
| F-11 | **Encryption: keep the device key migratable?** | Locking it to one device is stronger and guarantees total data loss on every phone upgrade until a recovery path exists | Leave it migratable for MVP |
| F-12 | **Encryption: should server-assisted recovery ever exist?** | It would mean the server can decrypt | No — keep the strong promise |
| F-13 | **Quarantine recovery** | Unreadable data is preserved and explained, but nothing can read it back, so "start fresh" is the only exit and it destroys the copy | Needs a tool, or an accepted limitation written down |
| F-14 | **Google Play developer account — $25 one-time** | Cannot be created without him: identity verification and a payment method. Blocks internal testing and the store | Register at `play.google.com/console`; also tracked as O-22 |

## 2. The MVP delta (`POC_and_MVP_Scope.md` §2.1)

| ID | Item | Status | Code truth |
|---|---|---|---|
| M-01 | Explore + an adoptable starter library | **Deferred** (founder, 2026-08-29) | Tab renders `sampleContent.ts` behind `SHOW_MARKETPLACE = false`; no adoption path exists anywhere. Returns with the creator platform |
| M-02 | Proper onboarding, egg→hatch | Half | v2 phase 1 shipped 2026-08-27: first run is three steps and then the conversation. **The partner's v3 spec (2026-08-30) supersedes v2** — see O-09 to O-14 |
| M-03 | The five Journey types (frequency · completion · avoidance · critical-compliance · hybrid) | **Not started** | `Rhythm` is `daily` / `few-times-week` / `weekly` and that is the whole model. An avoidance Journey ("not to smoke") cannot be expressed at all |
| M-04 | Light AI: personalised encouragement + smarter reminders | Half | `CommunicationScheduler` exists; encouragement from the "why" answers is partial |

## 2a. Onboarding v3

**The spec is now [`Onboarding_And_Coach_Spec.md`](./Onboarding_And_Coach_Spec.md) and nothing else.**
The three dated versions and the separate corrections file are marked superseded in place
(2026-09-03): four documents describing four different products is what had the founder and the
partner reading different specs, and it is over. Its §3 is GENERATED from
`app/src/core/coach/coachCharacter.ts` with a test that fails when the two drift, so the half of the
spec that quotes the code cannot go stale quietly.

Broken out below because "onboarding v3" as one row is unactionable and would sit at Half forever.
Ordered by what unblocks what.

| ID | Item | Status | Code truth |
|---|---|---|---|
| O-09 | The coach's voice | **Shipped** | `COACH_SYSTEM_PROMPT` carries the partner's voice rules with the wrong version beside each right one |
| O-10 | Purpose + calm-setting guidance before the conversation | **Shipped** | On the intro screen, both languages (founder's addition, 2026-08-30) |
| O-11 | Brand introduction — three screens | **Shipped** | The three promise screens run in the first flow, both languages |
| O-21 | The profile page leaves the first run | **Shipped 2026-09-03** | Founder's decision. `personalInfo` is retired from `ONBOARDING_STEP_ORDER`; its fields are the Steps of the "Getting to know PushApp" Journey created at completion (`core/onboarding/introJourney.ts`). `Step.appLink` lets a Step open a screen. **Supersedes the 2026-08-30 spec's "Stage A: essential profile"** |
| O-12 | A distinct onboarding coach SESSION | Specified | The coach opens as an ordinary conversation with `?firstRun=1`. There is no separate state, no header, and nothing downstream knows this is first-run |
| O-13 | Meaningful reflection + user correction before the plan | **Specified, and the heart of it** | Nothing reflects. §8.2 requires a summary the user can confirm or correct, and a correction must rebuild the Journey |
| O-14 | Starting-point summary screen | Specified | Nothing. §12's three blocks and the "something here does not feel right" return path |
| O-15 | A concrete first action before onboarding completes | Specified | Onboarding completes when the flow ends, not when a step exists |
| O-16 | Populated first Home | **Shipped** | Onboarding completes only when the coach builds a Journey, and the intro Journey (O-21) lands beside it — so a first Home now has at least two Journeys and a Starter Step |
| O-17 | Contextual profile signals instead of a block | Half | The nine questions are retired from first-run and reachable from Tools; nothing asks them contextually |
| O-18 | Resume mid-conversation | **Gap** | The coach session, messages and resolved signals must survive a restart. The orchestrator lives in a React ref and has no rehydration path — a restart loses the conversation. Spec §4.16 |
| O-19 | Memory + reminder + sharing asked after value | Half | The tail moved after the first Journey (v2 phase 1). Sharing is not offered at all |
| O-20 | The v3 analytics events | Specified | §27 lists 20 events; the KPI taxonomy has none of them |
| O-23 | **The §11 implementation order** | Specified, in detail | The partner's 2026-09-03 pass turned §4 into an executable contract: a hard Phase-A ceiling of 4 questions, a next-question contract the ORCHESTRATOR enforces (not the prompt), the capacity/horizon pairing test, the Hebrew smoke path, and §9's acceptance checklist plus §10's eight regression scenarios T1–T8. Nothing of it is built. **§4 may not be marked BUILT until the §9 tests pass in a running build** |

## 3. Specified and not built

| ID | Item | Status | Code truth |
|---|---|---|---|
| B-01 | The routine Dream and its short path (D89) | Specified | Nothing. D89 carries the design and one model gap: "every two weeks" cannot be expressed by `Rhythm` |
| B-02 | Journey resume / re-plan (R2, PC-26) | Specified | PRD and a six-step build order exist; a paused Journey still resumes onto its old dates |
| B-03 | Strength Evidence | Half | Started, not finished |
| B-04 | Notification delivery for Support Circle | Specified | Nine content types are built; nothing routes them anywhere |
| B-05 | Weekly Review contribution contract (PC-27) | Specified | Experts have no typed way to contribute a per-Journey block |
| B-06 | Parked goals: label, cap, activation semantics (D44) | Open | State persists and the tab works; the three rules are undecided |

## 4. Operations and platform

| ID | Item | Status | Code truth |
|---|---|---|---|
| O-01 | Operations console | Shipped | `app/console/`, live at `pushapp-invite--ops.expo.app`. Reports and Versions complete; health 4 of 13 services measured, the rest gray with written reasons |
| O-02 | Users / permissions administration | Shipped | Migration 0014 + console Users tab. super_admin and admin enforced in SQL |
| O-03 | Product KPIs, version 0 | Shipped | Closed taxonomy, bus subscriber, console tab with definitions. Four of §7.3's eight are listed as not computable, each with what blocks it |
| O-04 | Journey outcome evidence | Built | Migration 0015 + `core/outcomes`. Every ending records automatically; **nothing asks the felt half yet** — that survey is the next piece |
| O-05 | `app_versions` registry is never written | **Closed differently** | Superseded by `runtime_installs` (0016): the app reports what is INSTALLED, which answers the question the registry was wanted for. The release registry stays empty and unused |
| O-21 | A build that cannot receive updates says so | **Shipped** | `current-build.json` on the public install site + a Home banner. Protects from the next install onward; it cannot reach a phone that predates it |
| O-23 | Health tab headline | **Half, honestly** | The denominator exists now (installations report themselves); the numerator needs a blocking-failure stream that nothing produces |
| O-22 | **Play Console internal testing** | **Next, high** | Testers install a raw APK today, which means Android's unknown-source warning AND Play Protect — whose prominent button cancels. It stopped the partner cold on 2026-08-31. Internal testing removes both, is free, and Play Console is needed for the store regardless |
| O-06 | MFA is answered but not enforced | Gap | The studio completes a TOTP challenge when a factor exists; nothing requires one. §10 asks for MFA before production access |
| O-07 | A permanent subdomain for the two web surfaces | Open | Both live on `pushapp-invite--<alias>` aliases. Moving either is one command |
| O-08 | Sentry source maps | Blocked | `SENTRY_DISABLE_AUTO_UPLOAD=true` in every build profile; stack traces name minified frames | 

## 5. Creator platform

| ID | Item | Status | Code truth |
|---|---|---|---|
| C-01 | Studio foundation: sign-in, permission check, dashboard, analytics | Shipped | `app/creator/`, live at `pushapp-invite--studio.expo.app` |
| C-02 | Metadata draft authoring | Built | Migration 0012's server-owned write boundary + the create form. **The §0.1 release gate — one authenticated draft-save smoke test — has not been run** |
| C-03 | The structure builder: Milestones, Steps, dependencies, release rules | Open | Nothing, deliberately. The largest open design in the PRD; `journey_templates` has no structure column, not even an empty one |
| C-04 | Publishing, review workflow, versions | Open | The lifecycle column accepts all eight of §13's states; only reading them exists |
| C-05 | Nothing enrols anybody | Open | `template_enrollments` is written by adopting a creator Journey, which is not a feature yet. Every number the studio shows is honestly zero |

## 6. Domain experts

| ID | Item | Status | Code truth |
|---|---|---|---|
| E-01 | Career expert, wired end to end | Shipped | Diagnosis → family → journey fit → selection. 477-line diagnosis + ~2,900-line authored library |
| E-02 | Body Image · Relationships · Addiction | Half | A ~220-line expert each with generic arcs, no diagnosis, no authored library. A spec with a domain's name on a generic arc |
| E-03 | The authoring guide for a new domain | Shipped | `04_Product/Domain_Expert_Authoring_Guide.md` — four files per domain, including the value-id appendix that the Career drift proved was needed |
| E-04 | The consultation seam is a domain string comparison | Gap | `this.spec.domain === 'career'` in `CoachOrchestrator`. Worth making a registry capability while there is one implementation to migrate |

## 7. Matching engine

| ID | Item | Status | Code truth |
|---|---|---|---|
| X-01 | Outcome evidence collection | Built | See O-04 |
| X-02 | The feedback ask at an ending | **Half** | Model, storage, latch and tests shipped 2026-09-02 (`core/outcomes/askModel.ts`, `AppCore.getPendingOutcomeAsk`). **The sheet that renders it is not built** — until it is, nothing asks |
| X-03 | `intended_depth` at Journey start | **Next** | The column exists and nothing writes it, so adherence is uncomputable by design rather than by accident |
| X-04 | Aggregate read functions | Open | Deliberate: nothing should read this until there is something to read |
| X-05 | The engine itself | Open | Future/Commercial. Do not build before X-02 and X-03 have produced data |

## 7a. Needs specification before it can be built

The founder asked (2026-09-02) for everything still open that requires a spec rather than a
decision. These are the items where "start building" is not yet a sensible instruction — each says
what specifically is undecided, so the gap is answerable rather than vague.

| ID | Item | What is undecided |
|---|---|---|
| **S-10** | **The five Journey types** (`M-03`) | `Rhythm` has three values; the MVP names five. Nobody has defined what an AVOIDANCE Journey is as an object: what a Step is when success means *not* doing something, what "done" means on a day nothing happened, whether a lapse is a miss or a report, and how completion is judged. Same question for critical-compliance and hybrid. This is a product model decision, not a schema one, and it blocks a whole class of domains |
| **S-11** | **Interval rhythms** (`N-03`, blocks `B-01`) | "Every two weeks" is not expressible. Deciding it means deciding whether `Rhythm` becomes an interval type, what that does to existing Journeys, and what the coach asks to establish it |
| **S-12** | **The routine Dream and its short path** (D89) | Decided in principle and carries its own open tension, written in D89: every Journey must end, and a routine by definition does not. That contradiction has no resolution yet |
| **S-13** | **Creator: the structure builder** (`C-03`) | The largest open design in the Creator PRD. Milestones, Steps, dependencies, release rules, rich Step types. `journey_templates` deliberately has no structure column so nothing is guessed at |
| **S-14** | **Creator: publishing and review** (`C-04`) | Who reviews a Journey before it reaches anybody, against what, and what happens to participants when a published Journey is edited or withdrawn |
| **S-15** | **Adoption: what happens when somebody takes a creator's Journey** (`C-05`) | Nothing enrols anybody today. Needs: what is copied vs referenced, what the participant may change, what the creator sees, and what happens when the template moves on |
| **S-16** | **The matching engine's v1 scoring** (`X-05`) | Its own PRD says it is not implementation-ready. The next analysis is named in that document's §19; nothing should be built before X-02's sheet has produced data |
| **S-17** | **KPI: "Journeys moving forward"** | Needs a periodic snapshot of which Journeys were ELIGIBLE in a period — an event shape nobody has designed. Three more §7.3 KPIs are blocked behind similar gaps |
| **S-18** | **Parked goals: label, cap, activation** (`B-06`) | D44 lists the three open questions verbatim and none is answered |
| **S-19** | **Weekly Review contributions** (`B-05`) | The trust boundary, priority and conflict rules for an expert contributing a per-Journey block |
| **S-20** | **Relationships: the safety gate** | Not a spec gap — a DECISION gap. `relationships` sits in `SENSITIVE_DOMAINS`, so the coach refuses to plan for it. The partner's spec builds the gate; removing the domain from that set is the founder's call and has not been made. **This is the single thing blocking a finished expert from shipping** |
| **S-21** | **Onboarding v3 P0 defects** | Specified in detail; the corrections file is superseded and its items now live in `Onboarding_And_Coach_Spec.md` §4.1. Not a spec gap; listed here so it is not lost. Codex is mid-build |

## 8. Known small defects

| ID | Item | Status | Code truth |
|---|---|---|---|
| D-01 | `createJourneyFromGoalSpec(spec)` one-arg overload promises non-null | Gap | The Career guard can return null on that path. Only tests use the one-arg form, so no production crash |
| D-02 | "Build my Journey" can do nothing visibly | Gap | `coach.tsx` has `if (!journey) return;` — no journey, no message, no navigation |
| D-03 | Dead UI for deferred features | Gap | Inbox's compose control is a plain `View`; the Groups tab is permanently empty |
| D-04 | `PRD_Coverage_Gaps.md` is superseded by this file | — | Its 14 August table stays as accurate history; its re-audit section is folded in above |

---

## How to use this

Add a row when work is identified, with its code truth from the code rather than
from a document. Move a row's status when the code truth changes, not when the
work feels done. Delete a row only when it ships and the truth column says what
shipped.

`Current_Context.md` stays the handoff — where to start today. The CHANGELOG
stays the history — what happened and why. The Decision Log stays the record of
decisions. This is the only one that answers "what is left".
