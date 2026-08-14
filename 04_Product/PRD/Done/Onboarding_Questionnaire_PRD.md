# PRD — Initial Onboarding Questionnaire

Status: **Implemented** — product flow and copy approved by the founder 2026-08-12; this K2 flow
(language-first → Personal Information → six-question introduction → six questions → Coach hand-off)
shipped commit `d67c9a6`. **K1 (the surrounding onboarding shell) closed 2026-08-13** by adding the one
piece it was missing: a soft notification-permission pre-prompt placed after the questionnaire and before
the Coach hand-off (commit `1210206`) — onboarding is now complete for MVP purposes. **Deferred (§13.1,
K1-owned, out of this PRD's scope):** real sign-in inside onboarding, blocked on Apple/E1.
Stage: **MVP** (K2; K1 owns the surrounding onboarding shell).
Owner: founder + AI product team.
Related: K1 onboarding shell, `Done/Own_Profile_PRD.md`, `Dream_Management_PRD.md`,
`Coach_Context_Summaries_PRD.md`, Communication Style, E1 authentication, and the Coach.

---

## 1. Purpose

Give the Coach a useful, non-diagnostic starting point without turning first-run into a long form. The
questionnaire learns what the user wants, where they currently stand, what tends to get in the way, what kind
of help may fit, and how much capacity they realistically have.

The experience must feel light, warm, and optional. It never assigns a personality type, score, diagnosis,
or fixed identity. Answers seed the Coach's opening hypotheses; the Coach verifies them conversationally.

## 2. Flow within K1

1. **Language selection** — first and mandatory.
2. **Personal Information** — prefilled profile values, editable by the user.
3. **Questionnaire introduction** — explains the six optional questions.
4. **Six questions** — one question per page.
5. **Completion** — “Let's get started” opens the first Coach conversation.

K1 owns welcome, authentication, permission timing, routing, resume, and the complete first-run shell. This
PRD owns the questionnaire content and its immediate Personal Information handoff.

## 3. Language is first

The user selects language before Personal Information or any question. Device language may be preselected,
but the user sees and confirms/changes it. Each language is displayed in its own name.

Selection immediately controls:

- all subsequent questionnaire copy and answer labels;
- LTR/RTL direction;
- validation, errors, Skip, Back, Continue, and progress;
- form-of-address variants after that preference is available;
- the language in which the first Coach conversation opens.

Free-text answers remain exactly in the language/script entered; PushApp does not silently translate them.
Changing language mid-flow retranslates the interface without deleting answers. Language is saved immediately,
is not skippable, survives restart, and remains editable later in Settings.

## 4. Personal Information

Personal Information appears before the six questions and uses the approved Own Profile fields:

- profile photo;
- display name;
- `@username`;
- full birth date;
- country;
- form of address;
- app language;
- general Active Hours;
- week-start day.

Use trustworthy Google/Apple values where available and existing safe defaults otherwise. Country defaults
from device region, not precise GPS/location permission; language defaults from device language; week start
defaults from country; photo defaults to initials. Provider values are editable suggestions, never permanent
truth. Email remains account/authentication data rather than an editable public profile field.

Present prefilled information compactly instead of asking one question per field. The user can confirm the
page or edit individual values. Existing Own Profile privacy and provider-seeding rules remain authoritative.

Approved opening copy (localized natively):

> A little about you
>
> We filled in what we could. Please check that everything looks right.

Primary action: **Everything looks right, continue**. Secondary action: **Edit details**.

Full birth date is shown but remains optional, consistent with `Done/Own_Profile_PRD.md`; leaving it unspecified
does not block onboarding.

## 5. Questionnaire introduction

A standalone page appears after Personal Information and before question 1:

> Let's get to know you a little better
>
> The next 6 short questions will help us understand what matters to you, what may hold you back, and what
> kind of approach could suit you.
>
> The more accurately you answer, the better we can tailor your guidance and plan to your life.
>
> There are no right or wrong answers, and you can skip any question.
>
> Estimated time: about two minutes.

Primary action: **Start**. Secondary action: **Maybe later**.

Use “guidance,” “plan,” and “help,” not medical/therapeutic wording. PushApp does not claim to provide
treatment. “Maybe later” skips the complete questionnaire and opens the Coach without shame, repeated warning,
or an immediate reprompt.

## 6. The six questions

Every question is skippable. “Other” reveals optional free text. No free-text answer is required.

### Q1 — desired life areas

**Where would you most like to see change?**

Select up to two:

- Health, fitness, and energy.
- Calm and mental well-being.
- Work, career, or studies.
- Money and financial life.
- Relationships, partnership, and family.
- Habits, time, and daily routine.
- Learning, creativity, or a hobby.
- Something else.

“Something else” opens: **You can write what matters to you.**

### Q2 — desired outcome

**If one thing improved in your life, what would you want to look different?**

Optional multiline text. Helper copy:

> One or two sentences are enough. You do not need to know how to get there yet.

Provide lightweight rotating examples appropriate to locale, such as feeling more energetic, progressing at
work, being more present with family, or feeling more in control of time. Secondary action: **It isn't clear
to me yet**.

### Q3 — current starting point

**Where do things stand today?**

Select one:

- I am already taking action and want to progress better.
- I know what I want, but I have not started yet.
- I have a direction, but I do not know how to begin.
- I have several directions and do not know which to choose.
- I tried before, but struggled to stay consistent.
- None of these fits me.

The final option opens: **You can describe it in your own words.**

### Q4 — preferred help

**What kind of help could suit you?**

Select up to two:

- A clear plan I know how to follow.
- Small Steps that are easy to begin.
- Flexibility when life changes.
- A clear view of my progress.
- Reminders and encouragement at the right time.
- Support from someone close to me.
- I do not know yet.
- Something else.

“Something else” opens: **What might help you?**

This answer is a preference hypothesis, not a binding promise or permanent communication setting.

### Q5 — likely friction

**What usually makes it harder for you to progress?**

Select up to two:

- Life gets busy and other things take priority.
- The initial excitement fades.
- I do not have a clear enough plan.
- I try to change too much at once.
- It is hard to feel or see progress.
- After a miss, it is hard to get back on track.
- I lack support from other people.
- I do not know yet.
- Something else.

“Something else” opens: **You can tell us what usually happens.**

This produces a tentative Coach hypothesis only. It is never shown as a diagnosis or fixed fact.

### Q6 — realistic capacity

**How much room do you realistically have for this right now?**

Select one:

- A few minutes on most days.
- A short amount of time a few times a week.
- About half an hour on most days.
- I can invest more when needed.
- It changes a lot from week to week.
- I do not know yet.

Optional free text:

**Is there anything important the Coach should take into account?**

Helper copy:

> For example: work, family, studies, health, or a changing schedule.

## 7. Completion

For any fully or partially answered questionnaire:

> Great, we have a starting point
>
> The Coach already knows a little more about what matters to you, what may get in the way, and how it may
> be best to begin. You can change or add information later.

Primary action: **Let's get started**. It opens the first Coach conversation.

If every question was skipped:

> That's completely fine — we can start here
>
> The Coach will get to know you through the conversation, and together you can decide where to focus.

The same primary action opens the Coach.

## 8. Progress and interaction

- One question per page.
- Persistent overall progress bar plus **Question X of 6**.
- Show the current section name: **How can we help you?** for Q1–Q4 and **What holds you back?** for Q5–Q6.
- Skip advances progress and never triggers guilt copy.
- Single-select may advance automatically only after an accessible, reversible brief confirmation; multi-select
  uses Continue.
- Back permits correction without losing later answers.
- Save after every page; closing and reopening resumes at the same position and language.
- Never show a score, result, personality type, correctness state, or comparative label.
- Target duration for the six questions is approximately two minutes.

## 9. Coach handoff

Create a minimal structured onboarding summary containing:

- selected desired areas;
- the user's optional desired-outcome text;
- current starting-point category;
- preferred help categories;
- likely-friction categories and optional clarification;
- realistic-capacity category and optional constraints;
- skipped/unknown markers and provenance/version.

The first Coach conversation uses the summary to ask a grounded opening question, not to state conclusions.
Preferred pattern:

> From what you shared, it may be best to start with a small, flexible plan. Does that sound right?

Forbidden pattern:

> You are someone who cannot stay consistent.

Dreams and Journeys still follow their own Coach-led proposal and user-approval flows. Questionnaire answers
never silently create either object.

## 10. Storage, privacy, and generation

- Structured selections are private adaptation preferences.
- Free text is sensitive raw disclosure: encrypted/on-device under the current local-first rule, never social,
  never analytics, and cascade-deleted/exported under account rules.
- Use OS keyboard dictation only. PushApp does not record, upload, or retain audio and introduces no microphone
  permission or cloud speech-to-text service.
- The Coach receives only the minimum relevant answer/derived summary required for the first conversation,
  subject to the same consent, safety, server-key, and provider-retention gates as live Coach use.
- Do not retain a marketing “growth style,” personality profile, score, or the research-form result.
- Changing an answer invalidates/rebuilds the derived summary; deleting the account deletes answers and summary.

## 11. Edge cases

- skip one, several, or all questions;
- leave during Personal Information, introduction, or any question;
- language change mid-flow, RTL/LTR flip, and missing localized copy;
- Google/Apple omits profile values or Apple supplies name only once;
- device-region/default conflict or travel;
- invalid/very long free text and keyboard dictation in another language;
- offline completion and deferred Coach handoff;
- duplicate first-run after reinstall or sign-in to an existing account;
- concurrent continuation on another device;
- provider/Coach failure after questionnaire completion;
- accessibility text scaling, screen reader, keyboard, focus order, reduced motion, and low contrast;
- account export/deletion before or after completion.

## 12. Acceptance criteria

1. Language selection precedes and controls the complete remaining flow without deleting answers on change.
2. Personal Information uses approved profile fields/defaults and remains private/editable.
3. The standalone introduction clearly states six questions, benefit, optionality, and approximate duration.
4. Exactly six question pages implement the approved copy, limits, Other/free-text, and Skip behavior.
5. Progress, resume, Back, skip-all, partial completion, and Coach transition work without pressure or data loss.
6. Coach handoff is minimal, private, provenance-aware, and hypothesis-based; no personality label is created.
7. No Dream or Journey is created without the existing explicit user approval.
8. Hebrew/English, RTL/LTR, accessibility, offline, errors, and account deletion/export are covered.

## 13. Implementation dependencies

No product question remains about the six-question content or flow. Implementation must coordinate the
following existing dependencies without changing this approved experience:

1. K1 defines the shell's exact authentication and notification-permission placement.
2. Apply the existing live-Coach consent, safety, privacy, and key-handling release gates.
3. Reconcile the Communication Style PRD: this six-question onboarding does not perform its separate six
   pairwise style assessment unless the founder explicitly adds that flow later.

## 14. Out of scope

- personality type/result or marketing assessment;
- research questions about prior apps, books, courses, or tools;
- automatic diagnosis or treatment claim;
- automatic Dream/Journey creation;
- the separate Communication Style pairwise assessment;
- onboarding Missions or rewards for exploring the app;
- XP, Achievements, Coins, or other gamification.
