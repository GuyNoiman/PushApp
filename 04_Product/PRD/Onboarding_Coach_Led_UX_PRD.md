# PRD — Coach-Led Onboarding UX

**Status:** Approved direction; implementation-ready UX specification pending rendered visual review.  
**Stage:** MVP.  
**Owner:** founder + AI product team.  
**Date:** 2026-08-31.  
**Related:** `Partner_Onboarding_Spec_v3_2026-08-30.md`,
`10_Partner_Coaching_Content/Master_Specs_Original/15_Meta_Coach_Master_Spec.md`,
`PRD/Done/Onboarding_Questionnaire_PRD.md` (historical implemented flow; immutable),
`PRD/Done/Own_Profile_PRD.md`, `PRD/Coach_Context_Summaries_PRD.md`.

## 1. Outcome

Replace the questionnaire-led first run with a short product introduction and one purposeful Coach
conversation that ends with an approved starting point, an accepted Journey and a real first Step.

The user should leave onboarding feeling:

> “The product understood what I meant, helped me see where to begin, and I have already started.”

This PRD defines the visible experience. The companion v3 specification owns signal compatibility,
diagnosis, Journey selection, privacy and migration behavior.

## 2. Scope boundary

This flow begins **after successful account creation or sign-in**. Authentication has its own flow.

- A new account enters `ONBOARDING_LANGUAGE`.
- An existing account with completed onboarding enters Home.
- An existing account with incomplete onboarding resumes its last persisted meaningful state.
- Back navigation may return as far as the authentication entry screen; it must never trap a user in
  registration or discard a completed sign-in.

The product name remains a working name. All copy must be tokenized so branding can change without
rewriting screen logic.

## 3. Experience principles

1. **One screen, one job.** No dense all-in-one onboarding form.
2. **The CTA is visible without scrolling** on supported phone sizes. Copy may reflow; decorative art
   yields space before the CTA does.
3. **Conversation has no fake step counter.** Its length is adaptive. Show purpose, not “Question 3/9.”
4. **Free text leads; cards assist.** Quick replies never replace the composer.
5. **Reflection precedes recommendation.** The user confirms or corrects the Coach's understanding.
6. **The user approves the direction and Journey.** Selection may happen internally; activation does not.
7. **Permissions follow value.** No notification prompt before an accepted Step exists.
8. **Warm, light and breathable.** One subject per card, generous space, no card inside a card.
9. **Light and dark are equal deliverables.** RTL and LTR are layout modes, not late mirroring patches.

### Resolved scope decisions

- Preferred display name is optional. When absent, the Coach uses a natural nameless opening; it does
  not block onboarding and no random username is used as a name.
- The three brand-introduction screens are required once for a new user because they establish the
  product promise, personalization model and sharing control. They have no Skip action; Save and exit
  remains available, and the total sequence is designed to take well under one minute.
- Personal information remains one compact review screen using the approved Own Profile fields. It is
  not split into a name-only screen and several later profile questions.

## 4. Complete screen map

```text
Authentication success
  → A1 Language
  → A2 Personal information review
  → B1 Why MeMore
  → B2 How it works
  → B3 Progress with people
  → C1 Prepare for the first conversation
  → D1 Onboarding Coach conversation
       ↔ D2 Correction / clarification within the same conversation
       → D3 Reflection confirmation within the conversation
  → E1 Starting point summary
       ↔ D2 when the summary is corrected
  → F1 First Step acceptance
  → G1 Optional Support Circle invitation
  → G2 Optional reminder setup
  → Home populated
  → H1 Memory continuity offer after first value
```

`G1` appears only when the selected Journey can truthfully support the current social flow. `G2`
appears only after an actual Step with a meaningful reminder target exists. Neither blocks completion.

## 5. Shared shell

### Header

- Height follows safe area plus a 52px content row.
- Left in LTR / right in RTL: Back button, 44×44 target.
- Center: product wordmark on introduction screens; contextual title on conversation and plan screens.
- Opposite side: **Save and exit** text action from A2 onward. A1 uses Back only.
- No XP, Level, Coins, streak or main-tab navigation during onboarding.

### Page body

- Horizontal padding: 24px on standard phones, minimum 20px on narrow devices.
- Maximum content width on tablet: 560px, centered.
- Warm neutral page background; one intentional accent surface per screen at most.
- Display title: Fraunces for Latin scripts, Frank Ruhl Libre for Hebrew, with shared line-height.
- Body: Inter or the approved Hebrew body fallback.

### Footer

- Sticky safe-area footer.
- Primary button: full available width, 52px high, radius 16.
- Secondary action: text button below or beside only when genuinely useful.
- Minimum 12px between actions; minimum 16px above the home indicator.
- Footer may gain a subtle top fade when content scrolls behind it.

### Progress

- A1–C1 use six small progress dots grouped in the header. Completed dots are teal, current dot is
  larger, future dots use the muted edge color.
- D1–D3 replace dots with the label **Your starting point** / **נקודת ההתחלה שלך** and a quiet
  animated line showing that the conversation is moving, without implying a fixed number of questions.
- E1–G2 show a simple checkmark plus **Almost ready** / **כמעט מוכנים**.

## 6. Screen A1 — Language

### Job

Choose the language that controls all subsequent UI, Coach conversation and directionality.

### Layout

1. Small globe illustration or language glyph cluster, maximum 88px high.
2. Title: **Which language feels natural to you?**
3. Supporting line: **You can change this later in Settings.**
4. Language list as full-width selectable rows, not flags-only tiles. Each language is written in its
   own language; optional region is secondary text.
5. Sticky CTA: **Continue**.

### Behavior

- Device language is preselected when supported.
- Selecting Hebrew immediately flips the current screen and every later screen to RTL without losing state.
- Continue remains disabled until a supported language is selected.
- Save language immediately after Continue.
- Network is not required.

## 7. Screen A2 — Personal information review

### Job

Confirm the minimum information needed for natural address and the existing profile contract.

### Default view

1. Title: **A little about you** / **קצת עליך**.
2. Body: **We filled in what we could. Check that it feels right.**
3. One profile surface containing:
   - initials/photo;
   - preferred display name;
   - username;
   - full birth date, marked optional;
   - country;
   - form of address;
   - app language;
   - general Active Hours;
   - week-start day.
4. Each row has a value and Edit affordance. No field is publicly labelled as public unless it is.
5. Primary CTA: **Everything looks right**.
6. Secondary CTA: **Edit details**.

### Edit mode

- Opens a full-height sheet preserving the review screen behind it.
- Fields use existing validation and defaults; username validation is asynchronous and must show
  checking, available and unavailable states without blocking unrelated edits.
- Photo remains optional and defaults to initials.
- Birth date remains optional under the current profile decision.
- Email is never shown as editable profile data.
- Save returns to review; Cancel restores the last saved values.

### Error behavior

- Provider-prefilled data is a suggestion, never treated as verified truth.
- If username availability cannot be checked, preserve the draft and explain that verification needs
  a connection; do not silently create a different username.

## 8. Screen B1 — Why the product exists

### Job

Explain the intention-to-action promise.

### Copy

**Title:** More of what matters to you. More of you.  
**Body:** There are things we want to change, begin or achieve, but it is not always clear where to
start or how to keep going. MeMore helps you find direction and turn what matters into Steps you can
actually move with.  
**CTA:** Continue.

### Design

- Small horizon/path illustration occupying no more than the upper 28% of the usable height.
- Teal-to-sunset soft gradient wash behind the illustration; no hard-edged hero card.
- Title and body occupy more visual weight than the illustration.

## 9. Screen B2 — How personalization works

### Job

Set the expectation that the user does not need the full answer now and that the product learns over time.

### Copy

**Title:** You do not need to know the whole way yet.  
**Body:** We begin with what is happening for you now. We listen, make sense of it together and build
the way as we go. The more we learn—with your approval—the better it can fit your real life.  
**CTA:** Continue.

### Design

- Three lightweight stages connected by one curved line: **Now → Learn → Adapt**.
- Stages are not cards and are not numbered.
- Reduced motion: static line. Standard motion: 500ms gentle line draw on first appearance only.

## 10. Screen B3 — Progress can include real people

### Job

Introduce support without implying mandatory sharing or functionality that is not yet available.

### Copy

**Title:** You do not have to do it alone.  
**Body:** Sometimes progress is easier with someone beside you. You may invite someone you trust to
support a Journey. You always choose who joins and what they can see.  
**CTA:** Continue.

### Design

- The user/Buddy is central; two quiet profile circles approach from either side.
- A small privacy shield sits beside the final sentence.
- Do not show a social feed, matching promise or unavailable collaboration mode.

## 11. Screen C1 — Prepare for the first conversation

### Job

Explain the purpose and create a calm transition into a meaningful conversation.

### Copy

**Title:** Now we start with you.  
**Body:** The first conversation will help us understand what matters now, where you are starting and
what may be a useful first direction. You do not need prepared answers.  
**Preparation note:** If you can, set aside a few quiet minutes somewhere you can think without
interruptions. You can save and continue later at any time.  
**Primary CTA:** Start the conversation.  
**Secondary CTA:** I need a moment.

### Behavior

- Secondary action saves state and exits to the signed-in welcome shell. It must not start a
  reminder loop or mark onboarding complete.
- Estimated time is shown with a clock icon: **About 5–8 minutes**. This is an expectation, not a timer.
- No microphone permission or voice recording is requested.

## 12. Screen D1 — Dedicated onboarding Coach conversation

### Job

Understand the goal, deepen only what matters and reach a user-confirmed reflection.

### Header

- Context title: **Building your starting point**.
- Subtle Coach presence indicator; never “AI is thinking about you.”
- Save and exit action.
- Back returns to C1 only before the first message. Afterwards Back asks: **Save and leave the
  conversation?** with Save and leave / Keep talking.

### Conversation body

- Coach messages use the normal calm Coach bubble.
- User messages use the normal user bubble.
- Meaningful reflection may use a softly tinted full-width reflection surface, but only when it is a
  genuine synthesis; ordinary Coach messages remain bubbles.
- Maximum content width 640px on large screens.
- The transcript resumes at the last unread Coach message.

### Opening

When preferred first name is known:

> **Hi, {firstName}. Let’s start simply. What would you like to look different in your life right now?**

Without a name, omit it; never substitute the username.

### Input

- Sticky multiline composer, one-to-four visible lines.
- Send target 44×44.
- Placeholder follows selected language.
- Optional quick replies sit above the composer as horizontally wrapping chips.
- Quick replies include only supported routes and disappear after use.
- Keyboard does not cover the latest message or Send action.

### Conversation behavior

The Coach follows the permanent meta-agent loop:

```text
listen → answer direct question → acknowledge/reflect → deepen if needed
→ identify one missing distinction → ask one question or propose one direction
```

- Usually one question per turn.
- Preserve the user's key words and metaphors.
- Use the name sparingly, not as a sentence prefix on every turn.
- Do not expose fields, diagnosis mode, Expert names or routing logic.
- Do not ask a question already answered in the current conversation or approved context.
- The user can always type rather than use a card.

### Thinking state

- After Send, the user message appears immediately.
- Show a small animated three-dot Coach indicator after 400ms; do not show it for instant local turns.
- After 12 seconds, replace it with **Still with you…**.
- After recoverable failure, keep the user's message and show **I lost the connection for a moment. Try
  again** with Retry. Never ask the user to rewrite it.

### Offline

- The Coach conversation cannot proceed offline in the current product.
- Preserve draft and transcript locally.
- Show a blocking but calm connection notice with Retry and Save and exit.

## 13. State D2 — Conversational correction

Correction never edits an old bubble. The user can say what is wrong in ordinary language.

- The Coach acknowledges the correction.
- Any dependent diagnosis, Journey recommendation and starting summary are invalidated.
- Earlier user messages remain visible; stale internal selections do not.
- The Coach asks at most one question needed to rebuild the understanding.

## 14. State D3 — Meaningful reflection confirmation

### Trigger

Only when the Coach has enough information to propose a starting direction safely.

### Surface

A full-width reflection card appears in the conversation:

1. Eyebrow: **What I’m hearing**.
2. Two or three short paragraphs, maximum 90 words total.
3. The user's meaningful wording appears where natural.
4. The proposed first direction is framed as a hypothesis, not a verdict.
5. Primary action: **Yes, that’s right**.
6. Secondary action: **I want to clarify something**.

The Coach may use the first name once here because this is a meaningful transition.

### Correction

Secondary action focuses the composer with placeholder **What doesn’t feel accurate?**. After the user
corrects it, the Coach rebuilds and presents a new reflection. Old reflection remains in history but is
visually marked **Updated** and its actions disappear.

## 15. Screen E1 — Starting point summary

### Job

Turn the confirmed understanding into a calm, scannable decision before Journey activation.

### Layout

1. Small compass/path illustration, maximum 72px.
2. Title: **Your starting point**.
3. One large surface divided by hairlines into three sections—not three nested cards:
   - **What matters now** — user-centered goal statement;
   - **What to work out first** — bottleneck or uncertainty, never personality language;
   - **Where we begin** — selected Journey and first action in plain language.
4. Source/fit line where available: **Suggested because…** followed by one concise reason.
5. Primary CTA: **Let’s start**.
6. Secondary CTA: **Something doesn’t feel accurate**.

### Behavior

- Secondary CTA returns to D2 with the confirmed summary in context.
- If the correction changes the recommendation, E1 is rebuilt and presented again.
- Back returns to D1 without discarding the confirmed reflection.
- No XP, score, “diagnosis result” or personality label.

## 16. Screen F1 — First Step acceptance

### Job

Make the starting direction real before onboarding completes.

### Layout

1. Title: **Your first Step**.
2. One Step surface with:
   - action title beginning with a verb;
   - why this is the first Step;
   - estimated time with clock icon;
   - proposed day/window only when the Journey needs one;
   - edit affordance.
3. Primary CTA depends on Step type:
   - in-app action: **Start now**;
   - external action with a chosen time: **Add to my Journey**;
   - external action without a required time: **I’m ready to begin**.
4. Secondary CTA: **Adjust this Step**.

### Behavior

- Adjustment opens the Coach in an edit state; the user explains the change conversationally.
- The revised Step is shown again and requires approval.
- A Step is not silently activated before approval.
- On approval, create/activate the Journey and persist the Step atomically. If creation fails, neither
  is presented as active.
- Completing an in-app Step now is allowed but not required to finish onboarding.

## 17. Screen G1 — Optional human support

### Eligibility

Show only after Journey activation and only when the current invitation/Support Circle capability can
truthfully complete the action.

### Layout and copy

- Title: **Would you like someone beside you?**
- Body: **You can invite someone you trust and choose exactly what they can see.**
- Primary CTA: **Invite someone**.
- Secondary CTA: **Maybe later**.

### Behavior

- Invite opens the existing Support Circle configuration flow with the new Journey preselected.
- Explain sharing level before Send.
- Decline records no negative preference and does not reprompt during onboarding.

## 18. Screen G2 — Optional reminder

### Eligibility

Show only when an accepted Step has a time or window for which a reminder is meaningful.

### Layout and copy

- Clock illustration or icon, not a notification bell alarm.
- Title: **Want help keeping this in view?**
- Body references the actual Step without exposing sensitive content on a locked screen.
- Primary CTA: **Set a reminder**.
- Secondary CTA: **Not now**.

### Behavior

1. Primary CTA opens the in-app reminder time/window choice.
2. Only after the user confirms the reminder does the OS permission pre-prompt appear.
3. Only affirmative pre-prompt opens the OS permission dialog.
4. Denial returns calmly; the Journey remains active and onboarding can finish.

## 19. Populated first Home

Home must show, on first load:

- the accepted active Journey;
- Today's Steps with the first Step when scheduled for today;
- otherwise the next scheduled Step with truthful timing;
- the Coach card with continuation context;
- a valid zero-progress state, never an empty-plan state.

Suggested Coach line:

> **We already found a place to begin. When you want, we’ll continue from here.**

The top Level/XP/streak bar follows the current Home decision. It must not fabricate initial progress.

## 20. H1 — Memory continuity offer

### Timing

After the first value moment, not as a blocking onboarding screen. Suitable triggers:

- first return to Home after Journey activation; or
- reopening the Coach for the second conversation.

### Surface

Use a dismissible bottom sheet:

- Title: **Continue without starting over**.
- Body: **There are a few approved takeaways from our conversation that can help me continue from
  here next time. Would you like me to remember them?**
- Primary: **Yes, remember**.
- Secondary: **Not now**.
- Link: **What would be saved?** opens the existing consent explanation.

Decline never reduces product access.

## 21. Resume, exit and reset

Persist after every meaningful transition:

- current stage;
- profile values already confirmed;
- conversation transcript needed for resumption under the approved retention rule;
- resolved closed signals;
- latest confirmed reflection;
- recommendation and its version;
- accepted Journey/Step creation result.

Resume rules:

- Introduction screen → same screen.
- Active conversation → last unread Coach message, composer draft restored.
- Confirmed reflection → reflection card with actions.
- E1 → summary screen.
- Journey already created → never create it twice; continue at remaining optional screen or Home.

Reset is available from Save and exit → **Start this introduction again**. It requires confirmation and
clears onboarding-only draft state, not the account or any Journey already activated.

## 22. Light and dark modes

### Light

- Page: warm near-white.
- Surfaces: white with hairline edge.
- Primary accent: teal.
- Reflection surface: very light teal tint.
- Introduction art: soft sunset/teal washes with AA-safe foreground text.

### Dark

- Page: deep neutral, not pure black.
- Surfaces: one elevation step lighter with a visible edge.
- Teal is desaturated/lightened enough for AA contrast.
- Reflection surface uses a restrained teal overlay; no neon glow.
- Illustration gradients are re-authored for dark tokens, never merely dimmed.

Every screen, error, sheet and permission pre-prompt must be reviewed in both modes.

## 23. RTL and LTR

- Text alignment follows language direction.
- Back chevron and row chevrons mirror.
- Progress dots preserve chronological order from the language's start edge.
- Avatar/Coach placement follows the established conversation convention consistently; do not mirror
  message ownership if doing so conflicts with the app's existing chat model.
- Mixed `@username`, numbers and dates use isolated direction-safe components.
- Primary and secondary CTA order follows reading direction when side-by-side.
- User-entered text keeps its detected direction independently of UI language.

## 24. Accessibility

- Dynamic type may make content scroll, but the sticky CTA remains reachable and never overlaps text.
- Minimum 44px touch target.
- Screen-reader order follows visual meaning, not absolute layout positions.
- Progress announces stage purpose, not color.
- Quick replies expose selected state.
- Reflection card announces heading, content and actions as one logical group.
- Motion respects reduced-motion settings.
- No color-only error, selection or completion state.
- Keyboard and switch-control users can complete every screen.

## 25. Edge cases

1. No preferred name → natural nameless opening.
2. Name contains emoji, several words or unsupported script → display saved preferred name verbatim;
   do not infer a shorter form.
3. User changes language mid-flow → translate UI and future Coach turns; preserve prior messages as sent.
4. User asks a direct question during routing → answer before returning to clarification.
5. Several goals → reflect them, choose one now, preserve the rest when supported.
6. No clear goal → continue conversation or offer a Clarification Journey; never invent one.
7. Clear goal but no authored Journey → truthful no-match/recovery path; do not use clarification to
   hide missing content.
8. Safety disclosure → safety flow overrides onboarding and may prevent ordinary Journey creation.
9. App killed during model response → preserve user message and mark response pending/retryable.
10. Recommendation changes while session is open due to content update → fail closed and rebuild; never
    silently substitute another Journey.
11. OS notifications denied → continue without reminder and expose Settings path later.
12. Support invitation canceled → return to onboarding without losing Journey state.
13. Journey creation succeeds but UI confirmation is interrupted → idempotent resume finds the existing Journey.
14. Small screen / large text → art shrinks or disappears before essential copy/actions do.

## 26. Analytics and privacy

Use the event list in the v3 specification. Add only structural metadata:

- stage id;
- duration;
- completion/correction/retry outcome;
- number of Coach turns;
- whether a quick reply or free text was used;
- whether a recommendation changed after correction.

Never include display name, transcript, goal text, reflection text, Journey title, Step text, free-text
answers or profile fields in analytics or crash breadcrumbs.

## 27. Acceptance criteria

1. Every screen and state above has approved light/dark and RTL/LTR designs.
2. Every introduction screen keeps its primary CTA visible without required scrolling at default text size.
3. New accounts enter A1 after authentication; existing completed accounts do not.
4. A2 uses the existing profile contract and does not expose email as profile data.
5. C1 includes the founder-approved quiet-time preparation note and Save/continue-later promise.
6. D1 is visibly distinct from ordinary chat and supports free text throughout.
7. Coach behavior follows the permanent meta-agent specification, not a fixed field sequence.
8. D3 is required before E1 and can be corrected.
9. A correction invalidates dependent selection and rebuilds the summary.
10. E1 contains goal, first bottleneck/direction and first action in one calm surface.
11. Journey and first Step require explicit approval and are created atomically/idempotently.
12. Sharing and reminders are optional, eligible only after relevant value exists, and can be skipped.
13. First Home is populated and context-aware.
14. Memory consent occurs after value and does not block onboarding.
15. Resume works from every meaningful stage without duplicate Journey creation.
16. No sensitive content enters analytics, monitoring or notification lock-screen previews.

## 28. Implementation order

1. Persisted state machine and idempotent resume.
2. A1–C1 visual screens and responsive shell.
3. Dedicated D1 conversation state and permanent Coach prompt integration.
4. D3 reflection/correction contract.
5. E1 summary and correction rebuild.
6. F1 atomic Journey + first Step approval.
7. Conditional G1/G2 flows.
8. Populated Home and H1 continuity offer.
9. Accessibility, light/dark, RTL/LTR and failure-state QA.
