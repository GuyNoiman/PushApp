# MeMore / PushApp Onboarding v2 — MVP Implementation Handoff

Status: **Proposed MVP revision for implementation**

Date: **2026-08-27**

## 1. Purpose of this revision

The current onboarding collects useful profile signals, but the first-use experience is too long, too questionnaire-like, and does not deliver enough value before the user reaches Home.

For MVP, the onboarding should be redesigned around one product principle:

> **Onboarding should already feel like the first coaching session.**

The goal is not to collect the maximum amount of information up front. The goal is to understand enough to give the user a credible starting point, select the right Journey/variant when possible, and get the user to a first meaningful action quickly.

This revision must preserve the current system boundaries:

- onboarding is **not** a personality assessment;
- onboarding is **not** the domain diagnosis;
- the Coach remains responsible for goal understanding and diagnosis;
- skipped or unknown information must remain unknown;
- private free text must not become a global ranking/profile signal;
- Journey-owned variant logic remains authoritative;
- existing stable ids should be preserved wherever practical for downstream compatibility.

## 2. Core MVP change

### Current first-run structure

```text
Language / profile
  → 9-question onboarding questionnaire
  → Communication Style questionnaire
  → Memory consent
  → Notification permission
  → Home
  → User opens Coach
```

### Proposed MVP structure

```text
Language / essential profile only
  → Short welcome
  → Coach conversation begins immediately
  → Goal understanding + only the missing questions
  → Coach reflection / first useful interpretation
  → Starting-point summary
  → Journey / first step
  → Optional pace question if needed
  → Optional reminder ask
  → Home with a real active next step
  → Memory consent after value is established
```

The main change is that **the Coach becomes part of onboarding**, instead of onboarding being a gate before the Coach.

## 3. MVP success criteria

The revised onboarding should aim for:

- first meaningful value in approximately **60–90 seconds**;
- no fixed 9-question sequence for every user;
- no second 6-question Communication Style survey during first run;
- the user should feel that the Coach listened and understood something specific;
- the user should leave onboarding with a concrete **starting point + first step**;
- Home should not be empty after onboarding;
- optional permissions should come after value, not before it.

## 4. Proposed first-run flow

### Step A — Language and essential profile

Keep language mandatory because it controls:

- UI language;
- RTL/LTR;
- Coach language;
- localized wording.

Keep only profile data that is truly required at first run. Other profile preferences can remain editable in Settings/Profile and do not need to block onboarding.

### Step B — Welcome screen

**Goal:** reduce friction and set the expectation that this is a short conversation, not a form.

Suggested Hebrew copy:

**Title**

בוא נתחיל ממה שחשוב לך עכשיו

**Body**

כמה דקות של שיחה קצרה יעזרו לנו להבין מה אתה רוצה לשנות ואיפה הכי נכון להתחיל.

לא צריך להגיע עם תשובות מוכנות. נבין את זה יחד.

**Primary CTA**

מתחילים

**Secondary CTA**

אולי אחר כך

`Maybe later` must remain non-punitive and should not invent answers.

## 5. Coach-led onboarding

### 5.1 Opening Coach prompt

For the current Career MVP focus, suggested opening:

**Coach:**

היי, נתחיל פשוט. מה היית רוצה שייראה אחרת בעבודה או בקריירה שלך בתקופה הקרובה?

Recommended quick replies:

- למצוא עבודה חדשה
- להתקדם במקום שאני נמצא בו
- לשנות כיוון
- אני מרגיש תקוע ולא ממש יודע מה לעשות
- משהו אחר

Free text must always remain available.

### 5.2 Goal understanding rule

The Coach should read the opening message once and extract what is already known.

Do **not** ask a fixed follow-up if the answer is already present.

The conversation should attempt to establish only what is needed for:

1. **Target** — what the user wants to change or reach.
2. **Current state** — where they are now.
3. **Relevant bottleneck / diagnosis signal** — only where needed for the implemented diagnosis route.
4. **Current constraint / capacity** — only if necessary to make the first plan realistic.

Typical first-run depth: **2–4 Coach questions after the opening message**, not a fixed count.

### 5.3 Example of adaptive follow-up

If the user says:

> אני כבר כמה שנים באותה חברה ואני מרגיש שאני לא מתקדם. אני לא יודע אם לנסות להתקדם פה או להתחיל לחפש משהו אחר.

The Coach should not ask generic onboarding questions about area, desired outcome, or starting point again.

Suggested response:

> נשמע שאתה בעצם בין שתי אפשרויות: לנסות לפתוח לעצמך דרך להתקדם במקום הנוכחי, או להבין אם הגיע הזמן לזוז הלאה. מה מרגיש יותר נכון כרגע?

Possible quick replies:

- להישאר אם יש פה אפשרות אמיתית להתקדם
- אני כבר נוטה לעזוב
- אני באמת עוד לא יודע

If the user answers that they are unsure, the Coach can narrow the uncertainty rather than forcing a decision.

## 6. Reflection / first-value moment

This is mandatory in the new flow.

Before asking more preference questions, the Coach should return a short grounded interpretation of what it understood.

Example:

> אוקיי, זה כבר ממקד אותנו. נשמע שהבעיה שלך כרגע היא פחות אם אתה מספיק טוב, ויותר איך העבודה והערך שלך נראים לאחרים. לפני שנחליט אם לעזוב, הייתי בודק אם אפשר לשנות את זה במקום שאתה כבר נמצא בו. רוצה שנתחיל משם?

Rules:

- this is a **hypothesis**, not a diagnosis label;
- it must be grounded in what the user actually said;
- it should be short;
- it should not assign a personality or permanent trait;
- the user must be able to correct it.

## 7. Starting-point summary screen

After the Coach has enough information, show a concise product screen before moving into the Journey.

Suggested structure:

### נקודת ההתחלה שלך

**מה אתה מנסה להבין / להשיג**

<personalized target>

**מה נראה שעוצר אותך כרגע**

<personalized bottleneck or uncertainty>

**הצעד הראשון**

<first concrete action>

**Primary CTA**

בוא נתחיל

**Secondary action**

משהו פה לא מדויק?

This screen is the bridge between conversation and plan execution.

## 8. Journey selection and diagnosis

The revised onboarding must **not** replace the current diagnosis architecture.

The intended sequence remains:

```text
Opening message / Coach conversation
  → Goal understanding
  → Use already-known closed signals
  → Run domain diagnosis when applicable
  → Map subtype + bottleneck to Journey family
  → Select authored Journey / variant
  → Build Milestones and Steps
```

The key implementation change is that first-run conversation can now provide more of the signals before the diagnosis tree asks its own cards.

Existing rule remains:

> If a supported closed signal is already known from the user’s message or prior answer, do not ask it again.

Unresolved outcomes must remain unresolved; do not force the nearest Journey.

## 9. What happens to the current nine onboarding questions

The nine current questions should no longer be treated as a mandatory first-run questionnaire.

### Q1 — Desired areas

**Current role:** context only; no direct Journey family or diagnosis use.

**MVP recommendation:** remove from the fixed questionnaire. For Career MVP, the Coach opening already establishes the active domain/goal.

If broader multi-domain onboarding returns later, Q1 can be reintroduced as a light domain picker.

### Q2 — Desired outcome

**Current role:** context only.

**MVP recommendation:** move into the opening Coach conversation. The user's own words are better than a separate form field.

### Q3 — Current starting point

**Current role:** context only.

**MVP recommendation:** infer from conversation when possible; ask only if genuinely missing.

### Q4 — Preferred help

**Current role:** Journey variant signal when declared by the Journey.

**MVP recommendation:** do not ask globally up front. Ask contextually only when a selected Journey actually needs this axis and the signal is still unknown.

### Q5 — Likely friction

**Current role:** strongest onboarding profile signal for Journey variant selection.

**MVP recommendation:** preserve as a useful signal, but collect it in the Coach conversation when relevant. It should not require a fixed standalone onboarding screen for every user.

### Q6 — Realistic capacity

**Current role:** stored Coach context; intended for scheduling but not yet fully wired.

**MVP recommendation:** keep as one optional lightweight question **after the first-value moment** if the first Journey needs pacing/scheduling.

Suggested copy:

> עוד דבר קטן כדי שלא נבנה לך משהו שלא מתאים לחיים שלך — כמה מקום יש לך לזה כרגע?

Suggested options:

- כמה דקות פה ושם
- קצת זמן כמה פעמים בשבוע
- אני יכול להשקיע יותר כשצריך
- זה משתנה משבוע לשבוע
- לא בטוח

Where practical, map these options to existing stable ids.

### Q7 — Starting mode

**Current role:** Journey variant signal when declared by Journey.

**MVP recommendation:** ask only contextually when the selected Journey needs it.

Suggested natural Coach phrasing:

> איך הכי נוח לך להתחיל עם הדבר הזה?

- אני רוצה לראות קודם את התמונה המלאה
- תן לי צעד קטן ונבין תוך כדי
- תלוי במה מדובר
- לא בטוח

### Q8 — Structure preference

**Current role:** Journey variant signal when declared by Journey.

**MVP recommendation:** ask only contextually when needed.

Suggested phrasing:

> כמה מסגרת תעזור לך כאן?

- תוכנית ברורה
- כיוון כללי עם חופש
- יותר מסגרת בהתחלה, פחות אחר כך
- לא בטוח

### Q9 — Desired challenge

**Current role:** Journey variant signal when declared by Journey.

**MVP recommendation:** do not ask by default in first run. Ask only if the selected Journey has materially different challenge variants and no stronger evidence already exists.

Suggested phrasing:

> באיזה קצב נכון לך להתקדם עכשיו?

- בעדינות
- דחיפה טובה שאפשר להתמיד בה
- אפשר לאתגר אותי יותר
- לא בטוח

## 10. Communication Style questionnaire

### Current state

The current first run includes a 6-question Communication Style selection flow.

### MVP recommendation

**Remove this entire questionnaire from first-run onboarding.**

Reasons:

- it creates high friction before value;
- users are being asked to predict which push wording will motivate them before they have experienced the product;
- this can be learned later from behavior, explicit Settings choice, or a much simpler preference.

For MVP, choose one strong default MeMore coaching/notification tone.

If a preference is required, reduce it to a single optional setting later:

**איך נוח לך שנדבר איתך?**

- עדין ותומך
- ישיר ודוחף קדימה
- מאוזן

Do not block onboarding on this choice.

## 11. MeMore Coach tone of voice

The current Hebrew onboarding copy is often formal, translated, and questionnaire-like. The new onboarding should establish one consistent MeMore voice.

### Tone rules

1. **Natural Hebrew** — write sentences a real coach would actually say.
2. **Short** — usually 1–3 sentences before the next question.
3. **Warm, not sugary** — avoid exaggerated praise after every answer.
4. **Direct, not judgmental** — it is okay to reflect tension or uncertainty clearly.
5. **Listen before advising** — understand, reflect, then propose.
6. **Reuse the user's language** — if the user says “אני דורך במקום”, the Coach can use that phrase.
7. **No diagnostic persona language** — avoid “אתה טיפוס ש...”.
8. **Avoid product jargon in conversation** — do not talk about variants, Milestones, diagnosis, signals, or profile scoring.
9. **Do not overpromise** — reflections are hypotheses and should be correctable.
10. **Prefer one good question over several stacked questions.**

## 12. First step and first Journey state

The onboarding should not end merely with “we have a starting point.”

It should end with a real first action from the selected Journey.

Example:

**Coach:**

> מעולה. נתחיל ממשהו קטן. רשום 3 דברים שאתה עושה היום בעבודה שיש להם ערך ברור לצוות, ללקוחות או לעסק. אל תנסה לנסח אותם יפה עדיין. רק נוציא אותם החוצה.

**CTA**

להתחיל

This is the moment onboarding becomes product usage.

## 13. Reminder / notification permission

### Current state

Reminder preference and OS notification permission are part of first-run completion.

### MVP recommendation

Move the reminder ask until **after** the user has a concrete first step.

Suggested prompt:

> רוצה שאעזור לך לא לשכוח לחזור לזה?

Options:

- כן, תזכיר לי
- לא עכשיו

Only if the user says yes should the OS permission request appear.

Decline/denial remains non-blocking.

## 14. Coach-memory consent

### Current state

Memory consent is part of the onboarding completion flow before Home.

### MVP recommendation

Move memory consent until after the first useful conversation or after the first step is created.

Suggested framing:

> יש כמה דברים מהשיחה הזאת שיעזרו לי לא להתחיל איתך מאפס בפעם הבאה. רוצה שאזכור אותם?

Options:

- כן, תזכור
- לא עכשיו

The existing privacy rules remain unchanged.

## 15. Home must be populated after onboarding

This is a critical UX requirement.

The current Home can show an empty weekly plan and no steps after a relatively long onboarding. The new flow should not end in an empty dashboard.

At completion, Home should contain at least:

1. an active Journey or starting direction;
2. one concrete next step;
3. Coach continuity from the onboarding conversation.

Suggested first Home state:

### הצעד הבא שלך

<first Journey step>

**CTA:** להמשיך

### המאמן שלך

> התחלנו להבין מה עוצר אותך. כשאתה מוכן, נמשיך מכאן.

**CTA:** לדבר

### השבוע שלך

- 1 צעד מתוכנן
- 0 הושלמו

The user should feel that onboarding created something real.

## 16. Dynamic question policy

The Coach should follow this order:

1. read what the user already said;
2. extract supported known signals;
3. ask only the highest-value missing question;
4. stop questioning as soon as enough information exists to provide a useful next step;
5. defer preference questions until the selected Journey actually needs them.

Do **not** convert the old questionnaire into nine chat bubbles. That would preserve the same problem in a different UI.

## 17. Data compatibility and migration

Where an existing question is preserved contextually, prefer mapping the user answer back to the existing stable ids:

- `q4` help ids;
- `q5` friction ids;
- `q6` capacity ids;
- `q7` starting mode ids;
- `q8` structure ids;
- `q9` challenge ids.

If a conversational answer cannot be confidently mapped to a supported closed id, keep the signal unresolved. Do not guess.

Free text remains private Coach context and must not become variant ranking input where currently prohibited.

The existing `CoachOnboardingSummary` can remain temporarily for backward compatibility, but the source of its values may increasingly be the first Coach conversation rather than a fixed questionnaire.

## 18. Suggested implementation sequence

### Phase 1 — MVP first-run simplification

1. Remove mandatory Q1–Q9 questionnaire from the first-run path.
2. Remove Communication Style questionnaire from first run.
3. Route onboarding directly into Coach after welcome.
4. Let opening Coach conversation establish Q1–Q3-equivalent context.
5. Reuse existing diagnosis/listening logic to skip already-known signals.
6. Add mandatory short reflection before plan creation.
7. Create first Journey/step before Home.
8. Move reminder ask after first step.
9. Move memory consent after first value.
10. Ensure Home receives populated first state.

### Phase 2 — Contextual variant questions

1. For each authored Journey, identify which of Q4/Q5/Q7/Q8/Q9 are actually needed for variant selection.
2. Ask only those missing signals in conversation.
3. Map card answers to current stable ids.
4. Preserve current selection precedence and privacy rules.

### Phase 3 — Scheduling integration

Wire Q6 / capacity into scheduling so that asking it has an immediate visible effect on plan pacing.

## 19. Proposed MVP first-run in one view

```text
First-run gate
  → Language
  → Essential profile only
  → Welcome
  → Coach opens automatically
      → User states goal in own words
      → Coach listens for known signals
      → 2–4 adaptive questions max
      → Domain diagnosis when applicable
      → Reflection: “here is what I think is happening”
      → User confirms/corrects
      → Journey family / variant selection
      → Starting-point summary
      → First concrete step
      → Optional capacity question if needed
      → Optional reminder ask → OS permission only if yes
      → Home populated with active next step
  → Memory consent after value is established
```

## 20. Product principle to preserve

The intended experience should be:

```text
Intent
  → Conversation
  → Understanding
  → Direction
  → First action
  → Continuity
```

not:

```text
Profile
  → Questionnaire
  → Preferences
  → Permissions
  → Empty Home
  → Coach
```

The MVP should optimize for **feeling understood and starting**, not for completing a profile.
