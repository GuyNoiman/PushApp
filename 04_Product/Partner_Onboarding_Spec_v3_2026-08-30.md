# MeMore MVP Onboarding v3
## Implementation Handoff for App Development

**Status:** Proposed MVP replacement for current first-run onboarding  
**Date:** 2026-08-30  
**Audience:** Product / Engineering / Design  
**Goal:** Replace the current nine-question first-run questionnaire with a branded, coach-led onboarding flow while preserving downstream compatibility where useful.

---

# 0. Executive summary

This specification is intended to be implemented in the application.

The current onboarding collects a broad profile first and only later sends the user to Home, where the Coach is opened separately.

The proposed MVP changes that model.

The new onboarding should:

1. Explain who MeMore is and why it exists.
2. Explain how MeMore works and learns the user over time.
3. Introduce the idea that progress can include real people such as friends, partners, accountability partners, or people with similar goals.
4. Explain why the first conversation exists.
5. Start a dedicated onboarding coaching session, separate from ordinary Coach chat.
6. Let the Coach understand the user from natural language first.
7. Ask only the missing questions that are needed to select or shape the correct Journey.
8. Reflect back what was understood before creating a plan.
9. Create a starting direction / Journey and a concrete first action.
10. Land the user in Home with meaningful content already present.
11. Ask for reminders, sharing, and memory only after relevant value exists.

Core principle:

**MeMore learns the user while already helping them.**

The implementation must not turn the old nine-question questionnaire into nine chat messages.

---

# 1. Preserve existing data compatibility

Where possible, preserve the current stable onboarding signal ids and existing downstream selectors.

The existing stable signals remain useful as coarse evidence:

- Q1 desired area
- Q2 desired outcome
- Q3 starting point
- Q4 preferred help
- Q5 friction
- Q6 capacity
- Q7 starting mode
- Q8 structure
- Q9 challenge

However, these signals are no longer required to be collected in one fixed onboarding questionnaire.

They may be populated from:

1. deterministic user card selections during the onboarding conversation;
2. high-confidence interpretation of supported natural-language signals where the existing Coach logic already permits this;
3. later Journey-specific questions;
4. later product use.

If a value is not known, it must remain unknown/skipped.

Do not infer a closed value merely to complete the profile.

Free text must remain private and must not be used as a replacement for the existing privacy boundaries around variant selection.

---

# 2. New first-run state machine

```text
FIRST_RUN
  → LANGUAGE
  → ESSENTIAL_PROFILE
  → BRAND_INTRO_1
  → BRAND_INTRO_2
  → BRAND_INTRO_3
  → FIRST_SESSION_INTRO
  → ONBOARDING_COACH_SESSION
       → GOAL_UNDERSTANDING
       → ADAPTIVE_CLARIFICATION
       → REFLECTION_CONFIRMATION
       → DOMAIN_DIAGNOSIS_IF_APPLICABLE
       → JOURNEY_OR_STARTING_DIRECTION
  → STARTING_POINT_SUMMARY
  → FIRST_ACTION
  → OPTIONAL_CONTEXTUAL_PROFILE_SIGNAL
  → OPTIONAL_PACE
  → OPTIONAL_SHARING
  → OPTIONAL_REMINDER
  → ONBOARDING_COMPLETE
  → HOME_POPULATED
  → MEMORY_CONSENT_AFTER_VALUE
```

Important:

`ONBOARDING_COACH_SESSION` must be a distinct session/state from an ordinary Coach conversation.

It can use the same Coach infrastructure, but the product must know that this is first-run onboarding.

---

# 3. Stage A: Language and essential profile

## Objective

Collect only information required to address the user correctly and render the product properly.

## Required

- App language
- Display name / preferred first name when available
- Existing profile essentials already required by the application

## Do not collect here

- desired area
- motivation
- friction
- preferred help
- capacity
- starting mode
- structure preference
- challenge level
- communication style

These are not first-screen profile requirements.

---

# 4. Stage B: Brand introduction

This is a short product introduction before the Coach conversation.

It is not a feature tour.

It should explain:

- who MeMore is;
- what problem it helps solve;
- how personalization develops over time;
- the role of other people in progress;
- why the user is about to enter a first coaching conversation.

## Screen B1

### Title

**יותר ממה שחשוב לך. יותר ממך.**

### Body

יש דברים שאנחנו רוצים לשנות, להתחיל או להשיג, אבל לא תמיד ברור מאיפה מתחילים ואיך ממשיכים.

MeMore עוזרת לך לעשות סדר, למצוא כיוון, ולהפוך את מה שחשוב לך לצעדים שאפשר באמת להתקדם איתם.

### CTA

**ממשיכים**

---

## Screen B2

### Title

**לא צריך לדעת את כל הדרך מראש.**

### Body

מתחילים ממה שקורה אצלך עכשיו.

מקשיבים, עושים סדר, מבינים מה יכול לעזור, ובונים את הדרך תוך כדי.

ככל שנכיר אותך יותר, נוכל להתאים אותה יותר למה שבאמת עובד בשבילך.

### CTA

**ממשיכים**

---

## Screen B3

### Title

**ולא חייבים לעשות את זה לבד.**

### Body

לפעמים קל יותר להתקדם כשמישהו איתך.

אפשר לשתף אדם שאתה סומך עליו, לבחור מישהו שיעזור לך להישאר מחובר למה שחשוב לך, ובהמשך גם להתחבר לאנשים שנמצאים בדרך דומה.

אתה בוחר מי נכנס לדרך שלך וכמה אתה רוצה לשתף.

### CTA

**ממשיכים**

---

# 5. Stage C: First coaching session introduction

This screen explains why the next step is a conversation.

## Screen C1

### Title

**עכשיו נתחיל ממך.**

### Body

השיחה הראשונה שלנו נועדה להבין מה חשוב לך עכשיו, איפה אתה נמצא, ומה יכול להיות צעד ראשון נכון עבורך.

לא צריך להגיע עם תשובות מוכנות.

נבין את זה יחד.

### CTA

**מתחילים**

After CTA, open the dedicated onboarding Coach session.

---

# 6. Stage D: Dedicated onboarding Coach session

## UI state

Suggested header:

**בונים את נקודת ההתחלה שלך**

This session must not look like a generic new Coach chat.

The user should understand they are in a guided first-session process.

## Opening message

If first name is known:

**היי {firstName}. נתחיל פשוט. מה היית רוצה שייראה אחרת בחיים שלך עכשיו?**

If the MVP only supports a restricted domain, replace the broad question with the supported domain.

Example for Career-only:

**היי {firstName}. נתחיל פשוט. מה היית רוצה שייראה אחרת בעבודה או בקריירה שלך עכשיו?**

## Quick replies

Quick replies are optional helpers.

They must never prevent free text.

Only show domains that the current product can actually route and support.

---

# 7. Coach behavior rules during onboarding

On every turn the Coach must:

1. Read the entire current user message.
2. Consider already-known onboarding/session signals.
3. Answer a direct user question before continuing the flow.
4. Avoid asking for information already supplied.
5. Reflect meaningful content when there is something useful to return.
6. Ask only one next useful question in most cases.
7. Stop collecting information when enough is known to help.

The old questionnaire must not be recreated conversationally.

Correct behavior:

```text
user input
→ understand what is already known
→ answer user if needed
→ reflect meaningful content
→ determine missing information
→ ask one useful next question
```

Incorrect behavior:

```text
Q1
→ Q2
→ Q3
→ Q4
...
```

---

# 8. Reflection requirements

Reflection is a required behavior in the first coaching session.

There are two levels.

## 8.1 Micro-reflection

Used naturally during conversation when the user says something meaningful.

Example:

User:

"אני רוצה לעזוב את העבודה אבל אין לי מושג מה לעשות במקום."

Coach:

**נשמע שאתה כבר די בטוח שאתה רוצה שינוי. מה שעוד לא ברור הוא לאן.**

Then:

**יש לך כבר כיוון שמושך אותך, או שעוד אין משהו ברור?**

Do not micro-reflect after every trivial card tap or yes/no answer.

## 8.2 Meaningful reflection before plan creation

Before selecting/presenting the starting direction, the Coach must summarize its current understanding.

Example:

**יואב, נראה לי שאני מתחיל להבין את התמונה.**

**אתה לא באמת מתלבט אם אתה רוצה שינוי. בזה אתה די ברור. הקושי כרגע הוא שאתה לא רוצה לעזוב משהו מוכר לפני שיש לך מושג לאן אתה הולך.**

**אז במקום להתחיל ישר מחיפוש עבודה, הייתי קודם עוזר לך להבין אילו כיוונים באמת יכולים להתאים לך.**

**זה נשמע לך נכון?**

Actions:

- **כן, בדיוק**
- **בערך, אני רוצה לדייק משהו**

The user must be able to correct the Coach before the direction is finalized.

---

# 9. Goal understanding

The first free-text message should remain the primary conversational input for understanding what the user wants now.

The Coach should extract when possible:

- active goal / desired change
- domain
- process type
- title or short description
- supported closed diagnosis signals already present in the message

Several goals:

- reflect them;
- ask which one to work on first;
- preserve others as deferred where the existing system supports this.

No usable goal:

- ask a simple clarification;
- do not invent a goal.

---

# 10. Domain diagnosis

Onboarding itself is not the diagnosis.

When a supported domain route has an authored diagnosis, run it after sufficient goal understanding and before Journey creation.

Rules:

- skip diagnosis questions whose closed signal is already known;
- deterministic answer cards should record their mapped values without an unnecessary model call;
- free text should only resolve supported signals when sufficiently grounded by the existing signal-reading logic;
- unresolved remains unresolved;
- stop as soon as the authored diagnosis determines an outcome;
- do not force the nearest Journey when the authored tree says the state is unresolved.

The diagnosis should feel like a continuation of the same conversation.

Do not show a visible "Diagnosis mode" transition.

---

# 11. Journey / starting direction selection

Once sufficient information exists:

1. select the authored Journey family when diagnosis provides a supported match;
2. select the relevant variant using available existing profile/interaction signals;
3. fall back to the existing expert/general planner where no authored match exists.

Do not collect every variant signal first.

Only ask a Journey-owned signal when that signal can materially change the selected variant.

Existing evidence priority should remain compatible with the current selector unless engineering intentionally changes it:

1. Journey-specific answer
2. relevant friction signal
3. relevant help preference
4. starting mode
5. structure
6. challenge
7. existing weak learned tie-breakers if already implemented
8. Journey default

---

# 12. Starting-point summary screen

After the user confirms the meaningful reflection, present a non-chat summary.

## Title

**נקודת ההתחלה שלך**

## Block 1

### מה חשוב לך עכשיו

Short user-centered goal statement.

## Block 2

### מה כדאי לפצח קודם

The first bottleneck, uncertainty, or direction to work on.

Do not phrase it as a personality diagnosis.

## Block 3

### מאיפה מתחילים

One simple first action or first Journey step.

## Primary CTA

**בוא נתחיל**

## Secondary CTA

**משהו פה לא מרגיש מדויק?**

Secondary action returns to the Coach/session for correction.

---

# 13. First concrete action

The user must perform or receive a real first action before onboarding is considered complete.

Examples depend on the selected Journey.

The action should be:

- concrete;
- small enough to start now;
- clearly connected to the reflection;
- part of the selected Journey or fallback direction.

Do not end onboarding with:

"סיימנו להכיר אותך"

or only:

"בנינו לך תוכנית"

The intended outcome is:

**the user has already started.**

---

# 14. Contextual profile learning

The old onboarding signals remain available, but collection becomes contextual.

## Q1-Q3

Prefer to learn from the first conversation:

- desired area
- desired outcome
- current starting point

## Q4 preferred help

Ask only when a Journey or current intervention can materially differ based on the answer.

## Q5 friction

Use as strong evidence when it is naturally learned or when a Journey needs clarification.

## Q6 capacity

Ask when needed to constrain scheduling or effort.

## Q7 starting mode

Ask only if the selected Journey has variants that differ meaningfully on clarity-first vs action-first behavior.

## Q8 structure

Ask only if the Journey needs a structure preference.

## Q9 challenge

Ask only when challenge intensity changes the current Journey/variant.

Important:

If a signal is absent, keep it absent.

Do not silently set defaults as if the user answered.

---

# 15. Pace

Only ask when it is useful for the plan.

Suggested copy:

**כדי שזה באמת יתאים לחיים שלך, כמה מקום יש לך לזה בתקופה הקרובה?**

Options:

- **כמה דקות פה ושם**
- **קצת זמן כמה פעמים בשבוע**
- **אני יכול להשקיע יותר כשצריך**
- **זה משתנה משבוע לשבוע**
- **לא בטוח עדיין**

Where possible, map these back to the existing Q6 capacity ids instead of introducing an incompatible second field.

---

# 16. Sharing / accountability

Sharing is part of the product philosophy, but it should not block onboarding.

After the user has a real direction or first step, the product may offer:

## Prompt

**יש מישהו שהיית רוצה שיהיה איתך בזה?**

## Supporting copy

חבר, בן זוג, קולגה, שותף מחויבות או מישהו שעובר דרך דומה.

## Actions

- **לשתף מישהו**
- **אולי בהמשך**

## Requirements

- optional;
- explain exactly what will be shared before sending;
- user controls who receives access;
- user controls what is shared;
- declining does not reduce product access.

If similar-goal matching is not implemented in the MVP, the onboarding copy may introduce the philosophy, but the actual CTA must only expose functionality that currently exists.

---

# 17. Reminder permission

Do not ask for notification permission before a real action exists.

After a step exists:

## Prompt

**רוצה שאעזור לך לא לאבד את זה בתוך היום-יום?**

Actions:

- **כן, תזכיר לי**
- **לא עכשיו**

Only after Yes:

- show the existing notification pre-prompt if still required;
- request OS permission.

Communication Style questionnaire:

Remove it from mandatory MVP first-run.

It may remain in Settings if the current product still supports it.

---

# 18. Onboarding completion

The onboarding-complete flag should be set only after:

- brand introduction is resolved;
- first coaching session has reached a usable starting direction;
- starting-point summary is confirmed;
- first action is created;
- optional reminder/sharing prompts that belong in first-run are resolved or skipped.

Memory consent does not have to block the onboarding-complete flag if product wants it after Home/first value.

---

# 19. First Home state

The first Home after onboarding must not be empty.

It should contain at minimum:

## Active direction / Journey

The user can see what they are currently working toward.

## Next step

The first concrete action created during onboarding.

## Coach continuation

The user can resume from the same context rather than starting a generic new conversation.

Suggested Coach copy:

**כבר התחלנו לעשות סדר. כשתרצה, נמשיך בדיוק מכאן.**

## Progress

A valid initial progress state.

Do not show an empty state that implies no plan exists when the onboarding has just created one.

---

# 20. Memory consent

Ask after the user has experienced why continuity matters.

Suggested copy:

**יש כמה דברים מהשיחה שלנו שיעזרו לי להמשיך איתך מכאן ולא להתחיל מחדש בכל פעם.**

**רוצה שאזכור אותם?**

Actions:

- **כן, תזכור**
- **לא עכשיו**

If Yes, show the existing consent/explanation flow.

Declining must not reduce ordinary product access.

---

# 21. Resume behavior

The flow must remain resumable.

Persist:

- current first-run stage
- onboarding Coach session
- user messages
- Coach messages needed for continuation
- already-resolved signals
- confirmed reflection
- selected Journey/direction if already created
- first action if already created

On restart, resume at the last meaningful stage.

Do not restart the conversation from the beginning unless the user explicitly chooses to reset it.

---

# 22. Back / correction behavior

Brand screens:

- normal back navigation is allowed.

Coach conversation:

- correction should happen conversationally rather than by editing old messages.

Starting-point summary:

- **משהו פה לא מרגיש מדויק?** returns to the onboarding Coach session.

If the correction changes goal/diagnosis/Journey:

- rebuild dependent selection and starting point;
- do not keep stale downstream plan state.

---

# 23. Coach language rules for implementation

The onboarding Coach prompt/instructions should explicitly include:

1. Listen before directing.
2. Reflect before proposing.
3. Do not repeat already-known questions.
4. Prefer the user's own language.
5. Do not define the user's personality or identity.
6. Present hypotheses tentatively.
7. Ask one question at a time in most turns.
8. Answer direct questions before returning to the flow.
9. Keep responses concise.
10. Stop gathering data once there is enough information to help.
11. Convert insight to an actionable next step.
12. Preserve user agency.

---

# 24. Hebrew copy rules

Avoid translated/product-system Hebrew such as:

- "איזו גישה יכולה להתאים לך"
- "רמת המחויבות שלך"
- "מהו החסם המרכזי"
- "סגנון הצמיחה שלך"
- "בנה תהליך חדש"

Prefer natural spoken Hebrew:

- "מה הכי חשוב לך בזה?"
- "מה בדרך כלל מקשה?"
- "כמה מקום יש לך לזה עכשיו?"
- "מה יעזור לך יותר כאן?"
- "מה היית רוצה שייראה אחרת?"
- "נראה ש..."
- "זה מתחבר לך?"
- "בוא נתחיל ממשהו קטן."

Do not use artificial enthusiasm after every answer.

Use the user's first name sparingly.

---

# 25. Scope changes from current implemented onboarding

## Remove from mandatory first-run

- fixed nine-question questionnaire
- mandatory Q1→Q9 sequence
- six-question Communication Style selection
- early notification permission before a real step exists
- memory request before the user understands its value
- first landing into an empty Home

## Add

- brand introduction screens
- explanation of the first coaching session
- separate onboarding Coach session state
- natural-language-first goal understanding
- micro-reflection
- meaningful reflection + confirmation
- contextual signal collection
- starting-point summary
- first concrete action before completion
- optional sharing/accountability prompt
- populated Home landing
- later memory consent

## Preserve where useful

- current stable onboarding ids
- current encrypted/local storage/privacy boundaries
- current Career diagnosis
- current Journey mapping
- current Journey variant selector semantics
- current skip/unknown semantics
- current notification permission infrastructure
- current memory consent infrastructure

---

# 26. Migration / backward compatibility

Existing users who already completed onboarding:

- do not force them through the new onboarding automatically;
- preserve existing onboarding answers;
- continue using existing stored signals;
- optionally expose new brand/coach concepts through ordinary product surfaces later.

New users after release:

- use the new flow.

Users who started the old onboarding but did not complete:

Preferred MVP behavior:

- migrate them to the new first-run stage;
- retain any already-stored answers as background context;
- do not force them to answer them again;
- start at the appropriate new brand/session stage based on product decision.

Engineering should avoid destructive migration of existing answers.

---

# 27. Analytics / evaluation events

Recommended MVP events:

- onboarding_brand_started
- onboarding_brand_completed
- onboarding_coach_started
- onboarding_first_user_message
- onboarding_reflection_presented
- onboarding_reflection_confirmed
- onboarding_reflection_corrected
- onboarding_diagnosis_started
- onboarding_journey_selected
- onboarding_starting_point_shown
- onboarding_first_action_created
- onboarding_sharing_offered
- onboarding_sharing_selected
- onboarding_reminder_offered
- onboarding_notification_requested
- onboarding_completed
- onboarding_home_loaded
- onboarding_memory_offered
- onboarding_memory_accepted
- onboarding_memory_declined

Useful measures:

- time to first user message
- time to meaningful reflection
- time to first action
- drop-off by stage
- percentage of users requiring correction
- percentage of onboarding turns that repeat already-known information
- percentage of users reaching Home with a valid next step

---

# 28. MVP acceptance criteria

The implementation is accepted when all of the following are true:

1. User sees the MeMore introduction before the onboarding Coach session.
2. User understands why the first conversation exists.
3. First conversation is visibly/functionally distinct from generic Coach chat.
4. Known first name is used naturally.
5. User can answer the opening question in free text.
6. Coach answers direct user questions instead of ignoring them.
7. Coach does not ask for known information again.
8. Coach uses reflection when meaningful information is present.
9. Coach does not mechanically run Q1-Q9.
10. Unresolved profile signals remain unknown.
11. Diagnosis runs only for supported routes.
12. Existing authored Career stop rules remain enforced.
13. User receives meaningful reflection before plan creation.
14. User can correct the reflection.
15. Correction can change downstream Journey/direction.
16. User receives a starting-point summary.
17. User receives a concrete first action.
18. Capacity/structure/challenge questions appear only when useful.
19. Sharing is optional and explained.
20. Notification permission is not requested before a step exists.
21. Communication Style is not mandatory in first-run.
22. Home is populated with active direction and next step.
23. Memory is asked only after value is established.
24. Flow is resumable.
25. Existing stable data ids remain compatible where reused.
26. Existing privacy boundaries are preserved.
27. Hebrew copy follows the MeMore voice rules.

---

# 29. Final intended user experience

The user should not feel:

"I filled in a profile and now the app will start."

The user should feel:

"MeMore explained what it is, asked what is actually happening with me, listened, understood something useful, reflected it back, helped me choose where to start, and I already have my first step."

That is the MVP onboarding target.
