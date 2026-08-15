# PRD Coverage Gaps — what still needs a spec

Status: **Living audit · produced 2026-08-13** (branch `feat/buddy-3d-and-reminders`).
Owner: product-manager. Purpose: **one walkable list of every part of the shipped app that has no PRD
behind it**, so the founder can work down it with a parallel AI (Codex) writing drafts.
Stage of the audit itself: MVP hygiene — it specs nothing, it only says what is unspecced.

## What this document is (and is not)

This answers exactly one question: **which parts of PushApp ship user-visible behaviour with no PRD?**
It is not a roadmap, not a task list, and it contains **no product decisions** — every proposed PRD
below is an *open item*, never a decided feature. Where a decision is already logged (D29, D40, D43,
D44, D45) it is cited so a drafter does not re-litigate it.

Related: `README.md` (this folder's working method + the Done-file protection rule),
`../MVP_Task_List.md` (task IDs A1..Q1), `../../06_Decisions/Decision_Log.md`,
`../UX/Archived_Screens.md`.

## How this list was produced

A **code-grounded audit**, not a memory pass:

1. Enumerated every file under `app/src/app/**` — **31 `.tsx` files, of which 28 are real routes**
   (the other three are `_layout.tsx` ×2 and `(tabs)/__tests__/inbox.allyInvites.test.tsx`).
2. Read the live tab bar (`app/src/components/app-tabs.tsx`): the bar is **Home · Journeys · Circle ·
   Inbox · Settings**. `explore` and `buddy` sit in the tab group with `href: null` (route alive, not
   tabbable). **Coach is deliberately NOT in the group** — it is a root Stack route (`app/src/app/coach.tsx`)
   opened from the Home hero, because a `href: null` tab route is not reachable via `router.push`.
3. Enumerated every PRD across the **complete** `04_Product/PRD/` tree — root, `Done/`, `Backfill/`,
   `Future/` — plus the legacy `../Miss_Recovery_PRD.md`.
4. Read `04_Product/UX/*.md` and checked each one's own status line against the code.
5. Cross-referenced `../MVP_Task_List.md` so each gap carries its task ID where one exists.

## Rules a drafter must obey while working this list

- **`Done/` files are immutable.** Never edit, move, rename or overwrite anything in `Done/`. A
  continuation gets a NEW file outside `Done/` with the next serial suffix (`_02`, `_03`…), determined
  by checking active + `Future/` + `Done/` first. (README §"Done-file protection rule".)
- **Never overwrite an existing PRD.** Extend and refine; preserve prior reasoning, including what was
  rejected and why.
- Run the **standard edge-case checklist** (README §"Standard edge-case checklist") against every new
  PRD: empty/first-run · offline · permission denied · completed/frozen/abandoned · concurrent actions ·
  very long/empty input · RTL · form of address (gender) · deletion/data-loss · error states.
- Ground every PRD in the **actual code** (current behaviour + the edge cases the code does and does not
  handle), then state what should change. Purpose before implementation.
- Categorize every statement as **Approved / Future Vision / Open Question**.

## Priority tiers

| Tier | Meaning |
|---|---|
| **P1** | A live MVP surface or shipped behaviour with **no spec at all** — a blocking-quality gap. |
| **P2** | Important, but **partially covered** by an adjacent PRD, or gated on a founder decision / backend. |
| **P3** | Archived, Future-staged, or repo housekeeping. |

**Progress update (2026-08-14): PC-01 is now covered by `Coach_Conversation_PRD.md`. Remaining original
counts: P1 = 8 · P2 = 8 · P3 = 8.**

### Founder-reported gap triage — 2026-08-14

This audit distinguishes a **specification gap** from a feature that is already specified but dormant,
and from a deliberate Future item. Those states require different work and must not be collapsed into
"missing PRD."

| Reported gap | Verified state | Classification | Required next action |
|---|---|---|---|
| Coach has no specification | `Coach_Conversation_PRD.md` now covers the surface, entry contexts, one rolling conversation, retention/reset, development-only scripted mode, and the boundary with the separate agent-intelligence workstream | **Resolved documentation gap** | Implement against that PRD when the production Coach architecture is ready; do not write another screen PRD |
| Weekly Review is not generated in production | The screen, week gate, proposal, 48-hour lifecycle and approval path are built, but `AppCore` runs them only when `adaptiveCoach` or its development-only sibling enables `adaptiveEnabled`; the production flag is off | **Implementation/release gap, not PRD coverage** | Decide which minimum evidence engine can safely be enabled for MVP, then remove the Weekly Review's accidental dependence on the whole experimental adaptive-Coach bundle or approve that bundle for production |
| Experts cannot contribute to Weekly Review | D50 approves one shared Weekly Review with nested per-Journey/per-expert contributions, but explicitly records that no contribution interface exists | **Approved architecture + Future specification/implementation gap** | Write a continuation PRD outside `Done/` before wiring partner content; never edit the immutable completed Weekly Review PRD |
| Three orphaned screens | Founder approved hiding all three. `weekly-planning.tsx`, `missions.tsx`, and `achievements.tsx` have been moved out of the router tree into `app/src/archive/screens/`; their Stack registrations were removed | **Resolved cleanup gap** | Keep their Future concepts and restoration instructions preserved in `UX/Archived_Screens.md`; require a deliberate scope decision and real entry point before restoring any route |
| Circle Invite button is empty | All six founder decisions in `Invite_Friend_Acquisition_PRD.md` §14 were approved on 2026-08-14. The live Circle button still has an empty handler | **Specification resolved; staged implementation gap** | Ship the truthful interim share when a stable destination exists, while retaining a required follow-up for full token/code redemption and automatic pending requests |
| A Journey cannot continue indefinitely | Founder clarified that Journeys are planned for at most two months and remain finite. An approved manual Step postponement may extend the Journey's end date; the extension is never automatic | **Product question resolved; specification delta + implementation gap** | Create a numbered continuation to the immutable Step Postponement PRD, then update postponement code to extend the Journey only when the user explicitly approves the extension; see PC-26 |

The immediate MVP blockers in this list are therefore narrower than the original wording suggests:
production Weekly Review activation and the empty Invite action. Coach coverage is closed; expert
contributions, Missions and Achievements are Future; Weekly Planning should be archived unless revived;
and the non-finite model needs a founder decision before engineering.

---

## 1. ALREADY COVERED — do not re-spec these with Codex

Read the named PRD before touching any of these. Several carry *deferred* sections; a deferral is not a
coverage gap, it is a documented scope boundary.

| Route / area | Covered by | Note |
|---|---|---|
| `coach.tsx` conversation surface and contextual entry | `Coach_Conversation_PRD.md` (PC-01) | One rolling thread; scripted UI is development-only; agent architecture remains a separate workstream. |
| `onboarding.tsx` (questionnaire itself) | `Onboarding_Questionnaire_PRD.md` (K2) | Flow + copy approved 2026-08-12. See PC-11 for the *shell* around it. |
| `settings/language.tsx` | `Backfill/i18n_Localization_and_RTL_PRD.md` (N1) | Backfill; device RTL sweep still unverified. |
| `settings/profile.tsx` | `Done/Own_Profile_PRD.md` (P1 phase 1) | **Immutable.** Photo = phase 2; richer P1 redesign is a separate future file. |
| `settings/active-hours.tsx` | `User_Active_Hours_PRD.md` | Implemented (account slice, clamp-not-disable, D40). |
| `settings/communication-style.tsx` + `-quiz.tsx` | `Communication_Style_Profile_PRD.md` | Ready for implementation. |
| `settings/country.tsx` | `Done/Week_Boundary_Preference_PRD.md` (D33) | **Immutable.** Country drives the week-start default. |
| `weekly-review.tsx` | `Weekly_Review_PRD.md` (C1, D40/D43) | Built + closed 2026-08-13. Needs the housekeeping move — PC-19. |
| `completion.tsx` | `Completion_Celebration_PRD.md` (I1, D42) | Implemented; I1-a / I1-b deferred inside the PRD. |
| `return.tsx` | `Account_Inactivity_Freeze_PRD.md` (J5, D44) | Local-first POC built; server-authoritative freeze deferred. |
| `my-dreams.tsx`, `dream/[id].tsx` | `Dream_Management_PRD.md` (F1, D40) | View-only by design; coach Dream-authoring is an open question **inside** that PRD. |
| Journey lifecycle (edit/delete/freeze/resume) | `Backfill/Journey_Lifecycle_Management_PRD.md` (J1/J2/J3/J5) | Backfill of shipped behaviour. |
| Streak in the Home status strip | `Backfill/Streak_Mechanism_PRD.md` (B2) | Flags the dormant break path (`adaptiveCoach` off). |
| Export + delete account (Settings "Your data") | `Backfill/Account_Deletion_and_Data_Export_PRD.md` (O1) | Release gate; Edge Function undeployed. |
| Per-Journey Support Circle / Ally invites | `Journey_Support_Circle_PRD.md` (D2, D40/D44) | The **Journey-scoped** circle. The Circle *tab* is a different surface — PC-03. |
| Journey reminders on `journey/[id]` | `Journey_Reminder_Management_PRD.md` (J4) + `Smart_Notification_Timing_PRD.md` | Off/Fixed shipped; Smart deferred. |
| Step dependencies (stacked cards) | `Step_Dependencies_PRD.md` | Implemented 2026-08-13. |
| `dev-adaptive.tsx`, `buddy3d-spike.tsx` | — | **No PRD needed.** Dev-only, flag-gated, never ship to users. |

---

## 2. The gap table

One line per gap. The substance — what each PRD must actually answer — is in §3, keyed by ID.

| Priority | ID | Area / route | Task ID | What exists today (code truth) | What's missing | Suggested PRD filename | Notes / dependencies |
|---|---|---|---|---|---|---|---|
| Covered | PC-01 | **Coach screen** — `app/src/app/coach.tsx` (root Stack route) | A1 · A2 · J1 | Development implementations inspected and explicitly classified as non-final | Covered by `Coach_Conversation_PRD.md` | `Coach_Conversation_PRD.md` | Completed 2026-08-14; agent intelligence remains separately specified |
| P1 | PC-02 | **Home** — `app/src/app/(tabs)/index.tsx` | H1 · C1 · I1 · J5 | ~700 lines: status strip, greeting, Coach hero, Weekly-Review card, inactivity CTA, Today's Focus, This Week (by Dream), Give Support board, report sheet, confetti, three-way auto-open priority | No PRD. Only a stale 2026-07-06 UX doc | `Home_Screen_PRD.md` | Must not restate C1/I1/J5 — it owns the **arbitration + hierarchy**, they own their own behaviour |
| P1 | PC-03 | **Circle tab** — `app/src/app/(tabs)/friends.tsx` | D1 · D3 | Header (Invite + Add), add-by-`@username`, one "Your friends" list built from `allyProgress`, one Cheer per row, calm empty state | No PRD for the Circle surface. `Friend_Profile_PRD.md` covers the profile page only | `Support_Circle_Screen_PRD.md` | The `Invite` button is `onPress={() => {}}` — a live dead button; `Invite_Friend_Acquisition_PRD.md` is approved and now awaits staged implementation |
| P1 | PC-04 | **Inbox** — `app/src/app/(tabs)/inbox.tsx` | D2 · D3 | Four tabs (Friends · Allies · Groups · Requested), client-side name search, real friend requests **and** real Ally invites as Accept/Decline rows | No PRD. Ally invitations surface here but `Journey_Support_Circle_PRD.md` specs the invite, not the inbox | `Inbox_Screen_PRD.md` | The "New message" compose control is a plain `View`, not even pressable; Groups tab is empty by D29 |
| P1 | PC-05 | **Journeys tab** — `app/src/app/(tabs)/journeys.tsx` | J-series · L1 | Active/Completed/Future segmented control, `journeyView` derivations, Paused pill, `ParkedGoalCard` for coach-detected deferred goals | No PRD for the list surface itself | `Journeys_Screen_PRD.md` | Lifecycle *behaviour* is covered by the Backfill PRD; this is the **surface**. Depends on PC-13 (parked goals) |
| P1 | PC-06 | **Settings hub** — `app/src/app/(tabs)/settings.tsx` | E2 | Sectioned hub: Profile identity, Account (sign-in "coming soon"), App (notifications/appearance/language/about), Your data | No PRD for the hub. Every *sub-screen* is covered; the hub that composes them is not | `Settings_Hub_PRD.md` | Several rows are tap-to-cycle interim controls (appearance, form of address, week start) explicitly marked as moving into the P1 profile redesign |
| P1 | PC-07 | **Manual Journey creation** — `app/src/app/journey/new.tsx` | D29 | Six-stage wizard (name → why → duration & rhythm → steps → reminders → summary); only the name is required | No PRD. It is also the **fallback destination** of two coach CTAs | `Manual_Journey_Creation_PRD.md` | D29 kept it as a coach-first fallback; `../UX/Archived_Screens.md` marks it "pending archive" — that tension needs resolving, not assuming |
| P1 | PC-08 | **Friendship exit — remove / block / report** | D1 | Nothing. `SocialGateway` has `requestFriend`, `respondToFriend`, `listFriends` — and **no** `removeFriend`, `blockUser` or `report*` anywhere in `app/src` | The entire exit path | `Friendship_Lifecycle_PRD.md` | Store-compliance relevant; loop in **store-compliance** + **security-privacy**. Contrast: per-Journey `removeAlly` DOES exist |
| P1 | PC-09 | **Cheer & Nudge model** | D3 · H1 | `CheerKind = 'cheer' \| 'nudge'`; Home sends `nudge` for friends quiet ≥3 days and `cheer` otherwise; Circle rows always send the default `cheer`; realtime `subscribeToCheers` | No PRD defines what a cheer/nudge *is*, its limits, or its effect | `Cheer_and_Nudge_PRD.md` | No rate limit, no read/ack, no dedupe, no delivery (PC-10). `QUIET_AFTER_DAYS = 3` is an unspecced product constant |
| P2 | PC-10 | **Notification delivery path** | J4 · I1-a | `ReminderEngine` schedules local notifications for Journey reminders; the unified content service has 9 Support-Circle types built | Nothing routes those 9 types anywhere — invites, cheers and completions never reach the user | `Notification_Delivery_PRD.md` | `Backfill/Notification_Content_Service_PRD.md` already documents and flags this; extend, do not duplicate. Push backend does not exist |
| P2 | PC-11 | **Onboarding shell (around K2)** | K1 | One `onboarding.tsx` route; root `_layout` first-run gate; resume from persisted answers; notification pre-prompt added 2026-08-13 | The shell's own rules: gate, resume, skip-all, re-onboarding after account delete | extend `Onboarding_Questionnaire_PRD.md` (new section) | The PRD names K1 as owner of the shell but does not spec it. Prefer a section over a new file |
| P2 | PC-12 | **Journey detail** — `app/src/app/journey/[id].tsx` | J1–J4 | Composite screen: weekly Step pager, why list, Dream link card, reminder card, Support Circle card, dependency deck, final-step confirm | No PRD for the composition/hierarchy of the screen | `Journey_Detail_Screen_PRD.md` | Each *component's* behaviour is covered elsewhere; this is about what belongs on the screen and in what order |
| P2 | PC-13 | **Parked goals / "For later"** | L1 | `AppState.parkedGoals` persists coach-detected extra goals; the Journeys "Future" tab activates or dismisses them; sensitive domains filtered at capture **and** at activation | Spec for label, cap, and activation semantics — all three are explicitly open per D44 | `Parked_Goals_PRD.md` | D44 lists the open founder questions verbatim; the PRD should resolve them, not restate them |
| Resolved | PC-14 | **Weekly planning** | — | Removed from the router tree and preserved under `app/src/archive/screens/`; its invented weekday fallback is not user-reachable | Archived with restoration conditions | — | `UX/Archived_Screens.md` is authoritative; a real weekday model and surface PRD are required before revival |
| P2 | PC-15 | **Authentication & account model** | E1 · K1 | `core/profile/simulatedUser` is a dev stand-in; Settings shows "Coming soon" for Apple and a simulated Google row; social auth is anonymous | No PRD for sign-in, identity linking, or what happens to local data on first real sign-in | `Account_and_Sign_In_PRD.md` | 🔒 Apple Developer account. Data-migration-on-sign-in is the risky part; loop in **security-privacy** |
| P2 | PC-16 | **Photo attached to a Step report** | open (2026-08-09) | Nothing. `StepReportSheet` has no attachment path | Whole feature. **Open Question**, not approved | `Step_Report_Photo_PRD.md` | Founder-raised. On-device-first per G1; upload path is a privacy decision, not an implementation detail |
| P2 | PC-17 | **Messaging + Groups (deferred, but shipping dead UI)** | D29 | Inbox has a non-functional compose control and a permanently empty Groups tab | Either a spec or an explicit UI removal decision | — (fold into PC-04) | D29 defers both post-MVP. The gap is that **deferred features still render controls** |
| P3 | PC-18 | **Explore** — `app/src/app/(tabs)/explore.tsx` | H1 | `href: null`, but the route renders and is fed `sampleContent.ts`; marketplace rows gated off by `SHOW_MARKETPLACE = false` | A decision: archive properly, or spec a discovery surface | `Future/Discovery_and_Explore_PRD.md` | Only remaining place fabricated sample content still renders. `../UX/Archived_Screens.md` documents the gate |
| P3 | PC-19 | **Housekeeping — three implemented PRDs still in the root** | D35 · D37 · C1 | `Daily_Step_Reporting_PRD.md`, `Step_Postponement_PRD.md`, `Weekly_Review_PRD.md` sit in the PRD root and are **absent from the README index** | Update each status header to state what shipped vs. deferred, **then** move to `Done/`, then index | — | Order matters: `Done/` is immutable, so the header must be correct **before** the move |
| P3 | PC-20 | **Housekeeping — README index holes** | — | `Future/User_Learning_PRD.md` is not indexed; `Personal_Growth_Style_Assessment_Form.md` (reference material, not a PRD) is not indexed either | Two index lines, plus a note that the assessment form is reference input | — | Purely additive edits to `README.md` |
| P3 | PC-21 | **Buddy screen** — `app/src/app/(tabs)/buddy.tsx` | B1 | Route alive behind `href: null`; `BuddyScene`, inventory and `EvolveReveal` intact | No PRD for Buddy as a surface | `Future/Buddy_Companion_PRD.md` | D45: deferred to Future, **vision preserved, terminology unchanged**. `Future/Points_and_Leveling_PRD.md` covers Buddy Level only |
| P3 | PC-22 | **Shop / coin economy** — `app/src/app/shop.tsx` | D29 | Route alive; reachable only from the archived Buddy screen. Coins still accrue in the engine but are hidden | No PRD anywhere for the shop or the coin sink | `Future/Shop_and_Coin_Economy_PRD.md` | D29 hid Coins with no sink. Flag the growth-before-engagement tension before reviving |
| Resolved | PC-23 | **Archived Missions and Achievements routes** | B3 · B4 | Both screens and the Achievements placeholder data were moved out of the router tree; Stack registrations and shipping i18n namespaces were removed | Nothing for MVP | — | Future PRDs and restoration instructions remain preserved; neither feature is deleted |
| P3 | PC-24 | **UX specs are stale, not coverage** | G1 | Every file in `04_Product/UX/` is dated 2026-07-06/07 | Re-spec after the PRDs land — **not** Codex work | — | See §4. These predate D23 (pivot) and the 2026-08-07 redesign |
| P3 | PC-25 | **Home's stand-in data heuristics** | H1 | `urgencyForHour` fakes time pressure from the clock; "today" = first pending Step per active Journey; `weekdayForStep` hashes ids | A model decision on per-Step due times/weekdays | — (fold into PC-02 + PC-14) | Every one is marked `TODO(data)` in code. The **model** gap is the real item; the screens just cope |
| P2 | PC-26 | **Manual postponement extends a finite Journey; and a paused Journey is re-planned on resume** | — | Every Journey has a planned duration of at most two months. Postponement currently changes only the Step occurrence/reminder and does not extend `durationDays` or the effective end date. A paused Journey, on resume, keeps every Step on its old (now past) dates | Exact extension transaction, user confirmation, date calculation, limits, repeated postponements and downstream scheduling are specified (D51 + its 2026-08-14 addenda); **plus** the resume re-plan of the remainder; **not yet built** | `Step_Postponement_02_PRD.md` outside `Done/` | **Approved direction:** extension is manual, never automatic. **Approved (2026-08-14 fourth-pass addendum to D51, superseding the third pass):** resuming a paused Journey **re-plans its remainder** from the resume instant — the restart point becomes the start point for the rest of the Journey and every unlived Step is recalculated; the end date moves only as a consequence. The earlier "freeze credit" (add the paused days to the end date) is **superseded and preserved** in §14 Q5.0.a. The automatic J5 inactivity freeze gets the same treatment (§14 Q9 resolved). Allies see a paused/running status tag only — **not expressible in today's `ProgressSummary` whitelist** (§14 Q7). An extension is **not reversible** (§14 Q8). The original PRD is immutable. This is not an endless-Journey model and does not revive the parked Practice object |
| P2 | PC-27 | **Weekly Review contribution contract** | D50 | One Weekly Review exists; experts have no typed way to contribute a nested per-Journey block, evidence, recommendation or display content | A continuation PRD defining the contract, trust boundary, priority/conflict rules, safety, rendering, persistence and approval semantics | `Weekly_Review_Contributions_02_PRD.md` | `Done/Weekly_Review_PRD.md` is immutable. D50 stages the slot as Future even though the architecture is Approved |

---

## 3. What each PRD must actually answer

### PC-01 · Coach conversation — **the top gap**

Since D45 staged Buddy to Future, the coach *is* the MVP's face, and it has no specification of any
kind. The PRD has to name what the two code paths mean as product: `featureFlags.liveCoach` picks
between a real Gemini orchestrator whose "Build my Journey" CTA calls `createJourneyFromGoalSpec`, and
an offline scripted prototype whose CTA currently routes to `/journey/new` — so **most builds today
ship a coach that cannot actually coach**, and the PRD must state whether that is the shipping
experience, a demo, or something to remove. It must also cover conversation persistence (there is
none — `stageIndex`, `selections` and `otherEcho` are local `useState`, so backgrounding the app loses
the interview), the sensitive-domain hand-off (`coach.handoff` silently redirects to the manual wizard
with no explanation of why), and what happens on network failure, a very long free-text opening, or a
user who closes mid-interview. Success metrics matter here more than anywhere: interview→Journey
completion rate, drop-off stage, and how many built Journeys survive a week.

### PC-02 · Home

Home currently arbitrates **three competing major modals** — the completion ceremony, the Weekly
Review and the inactivity return — through a hand-tuned lattice of refs (`ceremonyOpenedThisForegroundRef`,
`ceremonyDeferredReviewRef`, `majorOpenedThisForegroundRef`) and a `COMPLETION_CEREMONY_WINS` constant,
with the rule "one major event per foreground" enforced on `AppState` transitions. That arbitration is
real product policy living only in code comments, and it is exactly what the PRD must own: the priority
order, what "one per foreground" means to a user who opens the app four times a day, and what happens
when a fourth major event is added. It must also settle the section hierarchy (Coach hero above
Today's Focus — is that permanent?), the empty/first-run shape of all four sections, and the honesty
of the Give Support board, which surfaces friends by a bare `QUIET_AFTER_DAYS = 3` threshold. Explicitly
out of scope: restating C1/I1/J5 behaviour, which their own PRDs own.

### PC-03 · Circle tab

Circle is a single "Your friends" list derived from `social.allyProgress` — which means **a friend who
shares no Journey with you does not appear at all**, even though `social.friends` holds accepted
friendships. That is a real behavioural gap the PRD must decide on: is Circle the *friends* list or the
*shared-progress* list? It must also handle the dead `Invite` button (`onPress={() => {}}`), the
add-by-`@username` flow's failure modes (unknown handle, self-add, already-a-friend, already-pending —
none are distinguished in the UI today), and the deliberate error-filtering that swallows any message
matching `/signed in/i` so guests do not see a scary banner. Keep the terminology straight: this screen
is the account-level **Support Circle**; the per-Journey circle is a different, already-specced object.

### PC-04 · Inbox

Inbox is where Ally invitations actually reach the user, so its PRD carries consent weight: the
Requested tab merges friend requests and Ally invites into one list, and the Ally rows state the
permission bundle (Encourager vs Companion) in the preview line so the recipient consents knowingly —
that copy is a consent artifact and must be specced, not left to i18n. The PRD must also decide what
tapping a row does (today **nothing** — `InboxRow` has no navigation), whether cheers are conversations
or events (they render as unread rows that never clear), and what to do with the "New message" control,
which is a non-interactive `View` shipping as if it were a button. Sorting is currently "cheers first,
then friends", with no timestamp ordering across the merged list.

### PC-05 · Journeys tab

The tab splits into Active · Completed · Future via a label-only segmented control, and the Future
bucket does double duty: it holds both genuinely-future Journeys and the coach's **parked goals**
(`ParkedGoalCard`). Those are two different objects sharing one tab, and the PRD must say whether that
is intentional or a collision. It also needs to define the card's information hierarchy (Dream eyebrow →
Journey title → progress → paused pill), what an empty Active tab says to a first-run user, and how
Completed Journeys age out — nothing archives today, so the tab grows forever.

### PC-06 · Settings hub

The hub is where three interim controls live that the code itself flags as temporary: appearance,
form of address, and week start all **cycle on tap** rather than opening a picker, and each is marked
as moving into the P1 profile redesign. The PRD must decide the section model (Profile · Account · App ·
Your data), where identity ends and preference begins, and how a destructive action (Delete account)
sits in the same list as a cosmetic one (Appearance). It must also cover the Notifications row's real
behaviour — first tap requests OS permission, every later tap deep-links to OS settings — including
what the row says when permission was denied and the user cannot fix it in-app.

### PC-07 · Manual Journey creation

The wizard is simultaneously "kept as a coach-first fallback" (D29) and "pending archive"
(`../UX/Archived_Screens.md`), and the code has quietly promoted it: it is now the destination of the
scripted coach's primary CTA **and** the live coach's sensitive-domain hand-off. So the low-traffic
fallback is, on most builds, the main way a Journey gets created. The PRD must resolve that contradiction
first, then spec the wizard: only the name is required, everything else defaults, reminder slots are a
fixed three (08:00/12:00/19:00), and Stage 5 now creates a *managed* reminder rule editable later (J4).
Edge cases the code does not handle: abandoning mid-wizard loses everything, and there is no draft.

### PC-08 · Friendship exit

There is **no way to end a friendship** — `SocialGateway` exposes request/respond/list and nothing else,
so a user who adds the wrong `@username` is stuck with them, and a user who receives unwanted nudges has
no recourse. Compare the per-Journey circle, which has a full `removeAlly` + `cancelInvite` lifecycle;
the account-level relationship has none. The PRD must cover remove (symmetric or one-sided?), block
(does the blocked user learn?), report, and what happens to shared Ally memberships, published progress
and in-flight cheers when a friendship ends. Treat this as compliance-adjacent and bring in
**store-compliance** and **security-privacy** before it is approved.

### PC-09 · Cheer & Nudge

A Cheer and a Nudge are now genuinely different objects in the data (`CheerKind`), but nowhere is it
written what either one *means*. Today Home picks between them purely by recency — quiet ≥3 days gets a
Nudge, otherwise a Cheer — while the Circle tab always sends the default Cheer for the same person, so
the same tap means different things on two screens. The PRD must define intent, frequency limits (there
are none: a user can tap Cheer twenty times), whether the recipient sees a count or a person, how a
Nudge avoids reading as pressure or shame, and how this squares with growth-before-engagement — a nudge
that drives app-opens but not real-life action is exactly the pattern we should refuse.

### PC-10 · Notification delivery

The content service can *compose* nine Support-Circle notification types with lock-screen-safe
classification, and `ReminderEngine` can *deliver* local Journey reminders — but the two are not
connected, so an Ally invitation, an accepted invite, a cheer, or a completed Journey produces content
that goes nowhere. The PRD must define the delivery matrix (which type goes to which channel: local,
in-app, push-later), how Active Hours clamping applies to social notifications as it does to reminders
(D40), and the privacy floor for lock-screen previews of someone else's Journey. Extend the existing
`Backfill/Notification_Content_Service_PRD.md`, which already flags this gap, rather than restating it.

### PC-11 · Onboarding shell

`Onboarding_Questionnaire_PRD.md` names K1 as owner of the shell but never specs it, and the shell has
real rules: the root layout gates first run, answers persist after every page so an interrupted flow
resumes, the notification pre-prompt sits after the questions and before the Coach hand-off, and a
completed onboarding never shows again. The open behaviours are what happens after **account deletion**
(O1 reseeds a clean first run — does onboarding replay?), what a fully-skipped questionnaire hands the
Coach, and whether language changes mid-flow force the RTL restart handshake. Add this as a new section
to the existing PRD rather than a competing file.

### PC-12 · Journey detail

This screen composes six independently-specced components, and nobody has specced the composition. The
PRD must decide reading order and what is collapsed by default, because the screen currently carries the
weekly Step pager, the why list, the Dream link/approval card, the reminder card, the Support Circle
card, the dependency deck and the final-step confirmation — plus a runway nudge that fires only when
`NUDGE_RUNWAY_DAYS = 3` or fewer days remain in the week. It must also state what the screen looks like
for a frozen, completed or abandoned Journey (the code hides the check-in CTA while paused, and hides the
invite CTA on completed/frozen), and what a stale deep-link to a deleted id shows.

### PC-13 · Parked goals

The mechanism is built and safe — sensitive-domain goals are filtered at capture and guarded again at
activation via a shared `sensitiveDomains` module — but D44 leaves three product questions explicitly
open: the user-facing label, a cap on how many goals may be parked, and whether activation builds
directly or re-runs the interview. The PRD should close those three, plus expiry (a goal parked in
January is still sitting there in June), and whether a dismissed goal can return if the user mentions it
again. Keep the terminology decision honest: "For later" is a UI label, not a new object in the model.

### PC-14 · Weekly planning — **resolved for MVP**

The route is no longer part of the shipping router. Its source and test are preserved under the archive,
with the real weekday-model dependency and restoration conditions documented in `UX/Archived_Screens.md`.
It must not return merely because the old screen still exists on disk.

### PC-15 · Authentication & account model

Identity today is a fiction with three sources: a dev-simulated Google user for the greeting, an
anonymous Supabase session for social, and a locally-generated `@handle`. No PRD says what a real sign-in
does to any of them. The riskiest question is data migration — a user who has been running locally for
weeks then signs in must not lose Journeys, and must not silently publish private data to a cloud
account. The PRD must also cover sign-out (does local data stay?), multiple accounts on one device, and
what "delete account" means once identity is real (O1 assumes remote-first). Blocked on E1 / the Apple
Developer account, but the *spec* is not blocked.

### PC-16 · Photo on a Step report

Founder-raised on 2026-08-09 and still an **Open Question** — nothing exists in code. A PRD would need to
answer where the photo attaches (the report sheet has no room today), whether it is proof or journal
(those imply very different privacy models), whether it stays on-device per the G1 privacy default, and
what an Ally can or cannot see. Note the tension worth flagging: proof-photos edge toward the
`Future/Accountability_Ally_PRD.md` mandatory-approval model, which is deliberately Future-staged.

### PC-17 · Messaging & Groups dead UI

D29 deferred both post-MVP, which is settled — the gap is that the deferral is invisible to the user:
Inbox ships a compose control that does nothing and a Groups tab that is permanently empty. This does
not need its own PRD; it needs a paragraph inside PC-04 deciding whether deferred surfaces are hidden or
labelled. Prefer hiding: an empty tab teaches users the app is broken, and an inert button teaches them
not to trust buttons.

### PC-18 · Explore

Explore is the last place fabricated sample content still renders after the H1 realness pass — `forYou`,
`topCreators` and `fromBrands` are all invented. It is off the tab bar but the route still resolves, and
`SHOW_MARKETPLACE = false` already hides the creator/brand rows. The decision is binary: archive it
properly (entry points gone, `Archived_Screens.md` updated) or spec discovery as a real surface, in which
case it belongs under `Future/` and connects to `Future/Creator_Journey_Authoring_Platform_PRD.md`.

### PC-19 · Move three implemented PRDs to `Done/`

`Daily_Step_Reporting_PRD.md` (D35), `Step_Postponement_PRD.md` (D37) and `Weekly_Review_PRD.md` (C1,
closed 2026-08-13) all still read "Ready for implementation" / "Ready" while their behaviour ships, and
none of the three appears in the README index. The protocol has an order that must not be inverted:
update each status header to state precisely what shipped and what is deferred **first**, because once a
file is in `Done/` it is immutable and cannot be corrected in place — a later continuation would need a
`_02` file. Verify implementation against the code before moving; do not take this document's word for it.

### PC-20 · README index holes

`Future/User_Learning_PRD.md` exists on disk but is missing from the README's Future list, and
`Personal_Growth_Style_Assessment_Form.md` sits in the PRD root while explicitly declaring itself
reference material rather than a PRD. Two additive index lines fix both, with a short note on the latter
so nobody mistakes a research form for a spec.

### PC-21 · Buddy

D45 deferred Buddy to Future and preserved the vision, terminology and all reasoning — but there has
never been a Buddy PRD, so the concept lives scattered across `Product_Terminology.md`,
`AI_Product_Principles.md` Principle 9 and `Future/Points_and_Leveling_PRD.md`. A `Future/` PRD would
consolidate what Buddy is, what it represents emotionally, and what conditions would justify bringing it
back — without reopening D45. Low urgency, high value the day someone asks "what was Buddy again?"

### PC-22 · Shop & coins

Coins still accrue in the engine but are hidden with no sink (D29), and `shop.tsx` is reachable only from
the archived Buddy screen. Nothing in the repo specs the economy. If this is ever revived, the PRD must
lead with the growth-before-engagement test: a currency that rewards app activity rather than real-life
follow-through is precisely the pattern PushApp exists to avoid, so the burden of proof sits on the
feature, not on the objection.

### PC-23 · Orphaned routes

Resolved for MVP. Missions and Achievements were moved out of the router tree and documented in
`UX/Archived_Screens.md`. Their Future PRDs and dormant concepts remain preserved, but neither surface is
deep-linkable or visible in the MVP. Restoring either requires an approved surface specification, real data
and a deliberate entry point.

### PC-26 · Manual postponement extends a finite Journey

Founder decision: a Journey is initially planned for no more than two months and always remains finite.
If the user postpones a Step in a way that moves work beyond the current Journey boundary, the app may
extend the Journey end date, but only through an explicit user-approved action. A postponement must never
silently lengthen the Journey.

The code does not support this today: Step postponement changes the occurrence and one-shot reminder but
does not update `durationDays` or an effective end date. Since `Done/Step_Postponement_PRD.md` is immutable,
the detailed contract belongs in `Step_Postponement_02_PRD.md` outside `Done/`. It must settle at least:
the confirmation moment and copy; whether extension equals the exact overflow or a whole day/week; repeated
postponements; the maximum permitted extended duration; what happens to other scheduled Steps and reminders;
Weekly Review treatment; Ally notices; time-zone boundaries; cancellation/reversal; and atomic persistence.
As of 2026-08-14 that PRD also settles: nothing happens on a Journey's last day beyond the existing
completion ceremony (§14 Q4).

**Corrected the same day (fourth founder pass) — a paused Journey is RE-PLANNED, not compensated.** An
earlier version of this section recorded that a manual Pause/Resume (J3) freeze *compensates* the end date
on resume via a `freeze_credit` ledger entry. **That design is superseded.** The founder's correction: it is
not compensation, it is *continuing the Journey from where it stopped* — the restart point becomes the start
point for the remaining part, and every unlived Step is recalculated, keeping the same plan and adapting it
to the restart time. The end date moves only as a **consequence** of the rebuild.

The superseded design failed for a concrete reason worth keeping: adding days to the end date leaves every
Step where it was, so a Journey paused on a Sunday and resumed a month later on a Thursday keeps Steps
planned for Sundays. The user gets a plan that no longer fits their life, just with a later finish. The full
design — which Steps move (`deriveStepStatus`, **not** `stepHasHistory`), what is preserved, the
preferred-day re-anchoring and its honest limits, reuse of `activateJourney`'s existing rebase seam, the
optional "what made you stop" moment on `return.tsx`, and the window consequence — is in
`Step_Postponement_02_PRD.md` §14 Q5, with the superseded credit model preserved in §14 Q5.0.a.

**Also settled in that pass:** the automatic J5 inactivity freeze gets the **same** treatment as J3 (§14 Q9
resolved — the consent moment moves from the freeze to the resume, and `return.tsx` never auto-resumes);
Allies see a **paused/running status tag and nothing about the window** (§14 Q7); and an extension is **not
reversible** (§14 Q8).

**Two implementation gaps this surfaces beyond the PRD's own scope**, both verified in code on 2026-08-14:

- **An Ally status tag is not expressible today.** `ProgressSummary` is a strict four-field whitelist with
  no status field, and `SocialProvider.publishAll` **withdraws** a paused Journey's summary entirely rather
  than tagging it — so a paused Journey currently *disappears* from an Ally's view. Widening the whitelist
  needs a security-privacy review (its own comment says so).
- **A per-Step weekday/due-time model does not exist** (`Step` has no weekday field; weekday meaning lives
  only in account-level `SchedulingPrefs.preferredDays` / `ActiveHours` / `ReminderRule.trigger.weekdays`).
  This is the same model gap as **PC-25**, and it bounds how faithfully any rebuild can re-anchor a rhythm.

This resolves the reported gap without an endless Journey and without reviving the parked Practice model.

**Written (2026-08-14):** the continuation now exists as `Step_Postponement_02_PRD.md`, and the founder
resolved the ceiling question the same day (**D51**): the two-month window is **planning guidance, not a
cap**, there is **no ceiling on extension**, and the invariant is that *a Journey's end date only ever moves
because the user said so* — same stance as D46. Verified code truth: a postponement writes only the four
per-occurrence Step fields plus one OS notification and **never** touches `durationDays` or any end date, so
work postponed past the last day is silently stranded outside the window today. **Specification gap closed;
the implementation gap remains open**, and after the 2026-08-14 fourth pass **four** questions in that PRD's
§14 are still the founder's — Q1 (the extension-moment copy), Q2 (the wizard's 90-day option), Q3 (whether
an extension also moves `plannedFor`) and Q6 (the `deferDependents` cascade). Q1–Q3 gate implementation.

### PC-27 · Weekly Review contribution contract

D50 settles the top-level architecture: there is exactly one Weekly Review, and domain experts contribute
nested information rather than creating their own review ritual. What remains unspecified is the seam:
which evidence an expert may read; the typed shape it may return; whether it contributes observation,
recommendation, proposed plan changes or all three; how conflicting expert contributions are prioritized;
what the Coach may rewrite; what the user sees; retention and privacy; timeout/error behavior; and how one
final approval atomically applies only the accepted weekly plan.

Because `Done/Weekly_Review_PRD.md` is immutable, this belongs in a numbered continuation outside `Done/`.
It is not required merely to generate the existing first-party Weekly Review in production.

### PC-24 · The UX folder is stale

Every file in `04_Product/UX/` is dated **2026-07-06 or 2026-07-07** — before the 2026-08-01 AI-adaptive-coach
pivot (D23) and before the 2026-08-07 mature redesign. Verified by reading: `Home_Screen.md` specs a
Steps-feed decision engine with no Coach hero; `Friends_Screen.md` specs a two-section help-first list
with Buddy portraits and level badges, which the code no longer has; `Inbox_Screen.md` calls Inbox "not
a main tab" when it is one; `Journeys_Screen.md`, `Explore_Screen.md`, `Journey_Creation_Screen.md`,
`Weekly_Planning_Screen.md` and `Profile_Screen.md` are the same vintage (`Profile_Screen.md` says its
own layout is "not yet settled"); `Buddy_Screen.md`, `Shop_Screen.md`, `Missions_Modal.md` and
`Achievements_Screen.md` describe archived surfaces. **None of these count as coverage.** They should be
refreshed by ux-designer *after* the PRDs above land, not rewritten by a PRD drafter.

### PC-25 · The stand-in data model

Three screens invent data the model does not carry: Home fakes time pressure from the device clock
(`urgencyForHour`), Home defines "today" as the first pending Step of each active Journey, and weekly
planning hashes Step ids into weekdays. Each is honestly marked `TODO(data)` in code. The gap is not a
screen gap — it is that `Step` has no due-time and no weekday, so any PRD that says "the Step due today"
is currently describing something that does not exist. Flag this dependency inside PC-02 and PC-14 rather
than writing a separate PRD.

---

## 4. Suggested working order with Codex

1. **PC-01 Coach** — the MVP's central entity, and everything else references it.
2. **PC-02 Home** — the arbitration policy is the highest-risk undocumented logic in the app.
3. **PC-08 / PC-09** — the two social behaviours that ship today with no rules at all.
4. **PC-03 / PC-04 / PC-05 / PC-06** — the remaining live tab surfaces.
5. **PC-07 / PC-12** — the two composite Journey screens.
6. **Invite implementation** — ship the interim share, then complete the explicitly tracked full attribution and automatic-request connection.
7. **PC-26** — write the postponement continuation, then implement explicit Journey extension.
8. **PC-14 / PC-18 / PC-23** — decide fate first; archive entries are cheaper than PRDs.
9. **PC-19 / PC-20** — housekeeping; do PC-19 in the stated order.

## 5. Categorization

- **Approved** (facts this document relies on): D29, D40, D43, D44, D45; the `Done/` immutability rule;
  the MVP task IDs in `../MVP_Task_List.md`.
- **Future Vision**: PC-21 (Buddy), PC-22 (Shop/coins), PC-27 (Weekly Review contribution slot), PC-18 if
  Explore is specced rather than archived.
- **Open Question**: PC-14 (does weekly planning survive?), PC-16 (Step-report photo), PC-17 (hide vs.
  label deferred UI), PC-13's three D44 questions, and **every
  suggested PRD filename in §2** — those are proposals, not decisions.

*Nothing in this document has been approved as a feature. It is an inventory of missing specifications.*
