# PushApp Onboarding — Continuation: First-Run Coaching Depth & Flow Corrections

> **SUPERSEDED, 2026-09-03.** The current specification is
> [`04_Product/Onboarding_And_Coach_Spec.md`](../04_Product/Onboarding_And_Coach_Spec.md), which is the ONE file
> to edit. Everything still true here was folded into that file on 2026-09-03; this copy is kept for
> its reasoning and for the record. Do not write corrections against it.

**Date:** 2026-09-02  
**Status:** Partner continuation / implementation handoff  
**Purpose:** Apply corrections identified from the founder's full first-run video walkthrough to the current onboarding and first Coach flow.  
**Relationship to prior docs:** This is a continuation to `Partner_Onboarding_Spec_and_Flow_2026-08-26.md`. Do not edit or erase the historical PRD. Where this document explicitly changes first-run order or Coach behavior, this continuation is the newer product decision.

---

## 1. Principle

> **Onboarding should already feel like the first coaching session — not like a questionnaire rendered inside a chat UI.**

The person should feel, very early, that the coach listened, understood what they said, and is asking only what is still needed.

The system underneath may remain structured and deterministic. The user should not see or feel the classification machinery.

---

## 2. What the video showed

The current build already has a strong visual base:

- clean, calm, coherent UI;
- strong opening statements that reduce pressure;
- good use of answer cards plus a free-text escape;
- a meaningful moment when a Journey is finally created;
- useful agency at the end around when to start.

The main weakness is not visual. It is conversational:

> **The experience currently feels like a smart questionnaire, not yet like a coach that is listening.**

Specific problems observed in the walkthrough:

1. Personal/public-profile setup appears before the user receives meaningful value.
2. Username availability can create friction before the user has experienced the product.
3. The first Coach line is generic: "How can I help you today?"
4. After the user says they want a career change, the coach assumes they are already applying for jobs and asks what roles they are applying to.
5. The user then has to correct the coach: they do not yet know which direction to take.
6. There is very little grounded reflection between answers.
7. The experience becomes a chain of answer cards: question → answer → question → answer.
8. The Journey taxonomy becomes visible to the user.
9. The system says it found one matching Journey and then displays four choices.
10. A Journey family is asked again even when the conversation has already supplied enough information to infer it.
11. Capacity/time information is asked more than once.
12. One observed scheduling question is paired with answer options for a different question.
13. Hebrew flow contains multiple English strings.
14. Some Journey/Home card text is truncated so the first concrete Step is not immediately clear.

---

## 3. What must NOT change

Preserve these existing product and architecture rules:

- Language remains a required first-run choice and controls UI direction, localization and Coach language.
- Existing stable onboarding question IDs and stored values must not be renamed merely to support this UX correction.
- Missing/skipped answers remain unknown. Never infer a negative answer.
- Closed signals remain the deterministic input to diagnosis/routing where currently designed.
- Raw free text remains subject to the current privacy contract and must not become a global ranking/variant signal.
- The AI/model is used to understand wording and voice the conversation naturally.
- Diagnosis, Journey-family routing, variant selection and planning remain governed by deterministic rules/contracts where they already exist.
- If the opening message already establishes a supported signal, do not ask that signal again.
- Unresolved is a legitimate outcome. Do not force the nearest Journey.
- Every Journey remains finite.
- User-facing product vocabulary remains Dream → Journey → Milestone → Step.
- Optional permissions remain non-blocking.
- Answer cards may remain structured, but there must always be an honest free-text escape where the current contract provides one.

---

## 4. New first-run order

### Current problem

The walkthrough asks for account/social information too early. The user can hit username friction before understanding why the product is valuable.

### Change

The preferred first-run sequence is now:

```text
First-run gate
  → Choose language
  → Opening / orientation screens
  → Minimal identity only if technically required
      └─ display name at most
  → First Coach conversation
      → focused opening
      → 2–4 adaptive understanding/diagnosis questions
      → grounded reflection(s)
      → starting-point summary
      → Journey route/selection internally
      → small reality-fit questions only if still needed
      → build Journey
  → Show Journey and first Step clearly
  → Start now / choose start / future
  → Complete optional profile/social identity when relevant
      ├─ username when the social feature actually needs it
      └─ other profile fields where product value justifies the ask
  → Optional Coach-memory consent / reminders at the appropriate contextual moment
  → Home
```

### Explicit move

**Move public profile and username creation out of the critical path before the first coaching value.**

A username should be requested when the user reaches a feature that actually needs a public/social identity, or after the first Journey has been created if product needs require it.

If engineering currently requires an account record before the Coach can run, create/retain the minimal internal account silently without forcing public identity setup.

---

## 5. Opening copy

### Replace generic opening

Avoid:

> "How can I help you today?"

Use a focused coaching opening that invites a meaningful direction.

Recommended Hebrew default:

> **מה היית רוצה שיהיה קצת אחרת בחיים שלך עכשיו?**

Alternative:

> **מה הדבר שהכי היית רוצה להתקדם בו עכשיו?**

The exact sentence may vary with localization/communication style, but the intent is stable:

- not customer support;
- not "what feature do you need?";
- not a form label;
- an invitation to name the change that matters now.

---

## 6. Conversation behavior: listen → reflect → ask

### Core rule

Before asking the next question, the Coach must consume everything already known from:

1. the user's current message;
2. earlier turns in this same conversation;
3. relevant structured onboarding/profile signals;
4. already-resolved diagnosis signals.

Then ask **only the highest-value unresolved question**.

### Do not make unsupported assumptions

Observed failure:

User:
> אני רוצה לעשות שינוי בקריירה שלי

Current Coach behavior:
> לאילו סוגי תפקידים את/ה מגיש/ה מועמדות כרגע?

This assumes an active job search that the user did not state.

Required behavior:

User:
> אני רוצה לעשות שינוי בקריירה שלי

Coach:
> **נשמע שאתה יודע שאתה רוצה שינוי — השאלה היא אם כבר יש לך כיוון. יש משהו שמושך אותך, או שאתה עדיין מנסה להבין לאן?**

User:
> אני לא כל כך יודע לאיזה כיוון ללכת.

Coach:
> **אז כרגע לא צריך להתחיל מלחפש עבודה. קודם כדאי להבין איזה כיוון באמת מתאים לך. מה הכי חשוב לך שיהיה בתפקיד הבא?**

The second Coach turn is doing two jobs:

- reflecting what was understood;
- asking the next unresolved question.

That is the desired pattern.

---

## 7. Reflection protocol

### Why

The current UI looks conversational, but cognitively behaves like a form because almost every turn is simply another question.

### Required behavior

During the first Coach sequence, include **2–3 grounded reflections**, not one after every answer.

A reflection must be based on actual evidence from the person's answers. It should add compression or connection, not praise.

Good reflection:

> **אז כרגע לא צריך להתחיל מלחפש עבודה. קודם כדאי להבין איזה כיוון באמת מתאים לך.**

Good cumulative reflection:

> **אני שומע שאתה רוצה שינוי, אבל לא רוצה לקפוץ לתפקיד הבא רק כדי לצאת מהנוכחי. חשוב לך קודם להבין מה באמת מתאים לך, ובמקביל אתה רוצה דרך מספיק ברורה כדי לא להישאר רק במחשבות.**

Avoid generic filler:

- "זה נשמע חשוב."
- "תודה ששיתפת."
- "אני מבין."
- "מעולה."

These may appear occasionally as natural language, but they do **not** count as a reflection.

### Reflection trigger

A grounded reflection should normally appear when one of these happens:

- the user clarifies or corrects an earlier assumption;
- two answers combine into a useful pattern;
- the diagnosis reaches a meaningful branch;
- enough is known to state the starting point before building the Journey.

---

## 8. Question budget and phases

### Phase A — Understand the person and the current goal

Target: **2–4 adaptive questions** after the opening message.

These questions should establish only what is needed to:

- understand the active goal;
- resolve the relevant diagnosis/starting point;
- avoid building the wrong Journey.

The number is a target, not a hard quota. If the opening message already contains sufficient closed signals, ask fewer.

### Phase B — Starting-point reflection

Before asking reality-fit/scheduling details, state what the Coach currently understands.

Pattern:

> **אז אם אני מבין נכון...**

The summary should include only grounded elements such as:

- desired change;
- where the user is now;
- main uncertainty/bottleneck;
- the immediate direction that follows.

### Phase C — Fit the Journey to real life

Only now ask remaining questions that materially change:

- capacity;
- structure;
- pace;
- challenge;
- scheduling.

Do not mix diagnosis and scheduling into one long uninterrupted questionnaire.

---

## 9. Journey routing must be invisible

### Observed failure

The UI says:

> "I found one Journey that fits what you told me..."

and then shows multiple Journey-family choices such as:

- Find a new direction
- Land a new role or job
- Grow where I am
- Build a specific skill

This exposes internal taxonomy and contradicts the sentence that one Journey was found.

### Required rule

If the system already has enough deterministic evidence to select a Journey family:

- select it internally;
- do not ask the user to classify themselves again;
- confirm the meaning naturally only when useful.

Example:

> **ממה שסיפרת, נראה שהשלב הראשון שלך הוא לא למצוא את התפקיד הבא — אלא להבין מה הכיוון הנכון עבורך. זה נשמע מדויק?**

Options:

- כן
- לא בדיוק

If the user says "לא בדיוק", ask one discriminating follow-up. Do not show the internal taxonomy unless the engine is genuinely unresolved and the options are the most user-natural way to resolve it.

### Rule

> **Routing is engine behavior, not user-facing product content.**

The user should feel understood, not classified.

---

## 10. Do not re-ask what is already known

Apply the existing "listen first" rule consistently across:

- opening goal understanding;
- diagnosis;
- Journey-specific questions;
- onboarding/profile signals;
- capacity/scheduling.

Examples:

- If the user states they do not know their career direction, do not later ask them to choose between "find a new direction" and unrelated career families.
- If capacity is already known and sufficiently precise for planning, do not ask the same capacity question again.
- If onboarding has already answered a Journey's declared variant question, skip it.
- If a user corrects the Coach, overwrite the conversational hypothesis immediately; do not preserve the earlier assumption as equally valid.

---

## 11. Capacity and scheduling correction

The previous onboarding spec already identifies an integration gap: capacity is stored but not consistently applied to Journey scheduling.

The walkthrough makes that gap visible to the user.

### Required behavior

There must be **one authoritative capacity value for the current Journey-building session**.

Preferred precedence:

1. current explicit answer in this Coach/Journey conversation;
2. existing relevant onboarding capacity signal;
3. ask the capacity question if neither is sufficient.

If engineering keeps a Journey-specific scheduling interview authoritative, then prior onboarding capacity should prefill/skip where possible rather than causing duplicate questions.

### P0 bug from video

A question equivalent to:

> "How much time can you realistically dedicate each week?"

was observed with options equivalent to:

- about one month;
- about two months;
- no fixed end.

These are **Journey horizon/duration** answers, not weekly-capacity answers.

Fix the question/option mapping and add a parity test so:

- capacity IDs can only render capacity labels;
- horizon/duration IDs can only render duration labels;
- Hebrew and English resources use the same semantic mapping.

---

## 12. Localization: no language leakage

When the selected app language is Hebrew, the full first-run and Journey-building path must be Hebrew except for protected brand/product names that are intentionally untranslated.

Observed English leakage included strings equivalent to:

- "Find a new direction"
- "I'm actively progressing and want to push further"
- "More than 5 hours"
- "Not knowing where to start"
- "A clearer future I want"
- "Build up in clear stages"
- "This is a realistic plan for where you are and the time you have."
- "Career"
- username availability/error text

### P0 requirement

Audit every string used by:

- first run;
- Coach answer cards;
- Career diagnosis;
- Journey family confirmation;
- variant questions;
- capacity;
- horizon/scheduling;
- Journey creation summary;
- first Journey card;
- username/profile errors.

No user-facing string in these paths should be hard-coded in English.

Add a Hebrew-locale smoke test that walks the full Career first-run path and fails if an English resource key/string is rendered unexpectedly.

---

## 13. The starting-point summary

Before Journey creation, replace a generic sentence like:

> "This is a realistic plan for where you are and the time you have."

with a **grounded final reflection**.

For the walkthrough scenario, the desired shape is:

> **אז הנה נקודת ההתחלה שלך: אתה רוצה שינוי בקריירה, אבל עדיין לא רוצה לקפוץ לתפקיד הבא לפני שתבין מה באמת מתאים לך. יש לך זמן להשקיע בזה, ומה שהכי יעזור לך הוא דרך ברורה, בנויה בשלבים.**
>
> **מכאן הייתי מתחיל.**

Then:

> **מצאנו את נקודת ההתחלה. בוא נבנה את הדרך.**

Do not copy this text for every user. It is an example of the required behavior: synthesize only facts actually established in this session/profile.

---

## 14. Journey/Home handoff

The post-onboarding moment is strong and should be preserved.

Correction:

> **The first Step must be immediately legible.**

On the first Journey/Home card:

- avoid truncating the first Step title if at all possible;
- prioritize "what do I do now?" over secondary metadata;
- if text must truncate, allow opening the card without ambiguity and keep the primary Step visible;
- the user should not finish onboarding with only a sense that "a plan exists"; they should know the next action.

---

## 15. Username/public profile behavior

### Move

Move username/public-profile completion later in the flow as described in §4.

### Error behavior

When a username is taken:

- keep the message in the selected locale;
- preserve what the user typed;
- offer a small number of available alternatives if the current identity system can do this cheaply;
- never block access to private/core Journey functionality solely because public username selection is unresolved, unless a current backend invariant truly requires it.

If a backend invariant does require it, surface that constraint explicitly in implementation notes rather than treating public profile setup as a coaching requirement.

---

## 16. Example target transcript — Career / unclear direction

This is a reference transcript for expected behavior, not fixed copy.

**Coach**  
מה היית רוצה שיהיה קצת אחרת בחיים שלך עכשיו?

**User**  
אני רוצה לעשות שינוי בקריירה שלי.

**Coach**  
נשמע שאתה יודע שאתה רוצה שינוי — השאלה היא אם כבר יש לך כיוון. יש משהו שמושך אותך, או שאתה עדיין מנסה להבין לאן?

**User**  
אני לא כל כך יודע לאיזה כיוון ללכת.

**Coach**  
אז כרגע לא צריך להתחיל מלחפש עבודה. קודם כדאי להבין איזה כיוון באמת מתאים לך. מה הכי חשוב לך שיהיה בתפקיד הבא?

**User**  
אני רוצה להרגיש עניין, ושיהיה לי יותר חופש.

**Coach**  
יש פה שני דברים שכבר די ברורים: אתה לא מחפש רק "עבודה אחרת", אלא משהו שירגיש יותר מעניין וייתן לך יותר חופש. לפני שנבנה דרך, אני רוצה להבין עוד דבר אחד — מה בדרך כלל עוצר אותך כשאתה מנסה לעשות שינוי כזה?

**User**  
אני לא יודע מאיפה להתחיל.

**Coach**  
זה עוזר. אז נקודת ההתחלה היא לא קורות חיים ולא הגשת מועמדויות — היא לצמצם את האפשרויות לכיוונים שמתאימים למה שחשוב לך, ואז לבדוק אותם במציאות.

[If needed, ask capacity/structure questions here.]

**Coach**  
אז הנה מה שאני מבין: אתה רוצה שינוי בקריירה, עדיין אין כיוון אחד ברור, חשובים לך עניין וחופש, והחסם המרכזי כרגע הוא שאין לך דרך מסודרת להתחיל לבדוק אפשרויות. מכאן הייתי מתחיל.

[Engine selects the appropriate Career Journey family/variant internally.]

**Coach**  
מצאנו את נקודת ההתחלה. בוא נבנה את הדרך.

---

## 17. Failure cases

### 17.1 Offline / model unavailable

The new first-run relies more heavily on the Coach. It must never become a dead end.

If the model/network is unavailable:

- preserve the user's first-run progress locally;
- explain briefly that the conversation cannot continue right now;
- allow the user to continue into the app/Home without losing access;
- provide an obvious way to resume the first Coach conversation later;
- do not fabricate a Journey from unprocessed free text.

If an existing offline structured onboarding fallback already exists, it may be retained as an optional fallback, but do not silently present it as if it were the same coaching experience.

### 17.2 User skips / does not know

- "I don't know" is valid information.
- Skip/unknown must not be translated into a default belief about the user.
- If routing cannot be resolved, preserve unresolved and ask the smallest useful question later.

### 17.3 Coach misunderstanding

If the user corrects the Coach:

1. acknowledge the correction through a reflection;
2. discard the invalid conversational assumption;
3. recompute the next unresolved signal/question;
4. do not continue down the previous route.

### 17.4 Username unavailable

Never make this failure look like failure of onboarding/coaching. It belongs to identity/social setup.

---

## 18. Cost / implementation shape

Expected implementation shape:

### Mostly cheap / JavaScript/config/model-prompt work

- opening copy;
- localization fixes;
- Coach reflection/wording behavior;
- hiding Journey taxonomy;
- skip/re-ask logic where signals already exist;
- answer-card copy;
- capacity/horizon mapping bug;
- final starting-point summary;
- Home/Journey first-Step presentation where this is a React/JS layout change.

### Moderate logic/integration work

- moving profile/public username later in first-run;
- making prior capacity authoritative/prefill-aware across onboarding and Journey scheduling;
- adding reflection state / conversational synthesis if the current Coach orchestrator does not expose enough resolved evidence;
- preserving a resumable fallback when the Coach is unavailable.

### Not requested

- no new native permission;
- no new analytics SDK;
- no new server-side personal profile/learning pipeline;
- no change to the privacy rule for raw free text;
- no change to deterministic Journey/Planner ownership.

If implementation discovers that any requested behavior requires one of these, stop and flag it rather than silently expanding scope.

---

## 19. What this replaces / supersedes

This continuation changes the following prior/current behaviors:

1. **Profile-before-value** → public/social profile data moves after first coaching value.
2. **Generic Coach opening** → focused change-oriented opening.
3. **Question-chain conversation** → listen/reflect/ask pattern.
4. **Visible Journey-family selection when already resolved** → internal routing + natural confirmation only when needed.
5. **Repeated capacity questions** → one authoritative current capacity path.
6. **Generic pre-plan summary** → grounded starting-point reflection.
7. **Mixed-language Hebrew first run** → fully localized first-run path.

It does **not** supersede:

- stable onboarding data IDs;
- privacy boundaries;
- deterministic diagnosis/routing/planning contracts;
- protected product terminology;
- the Career authored Journey library.

---

## 20. Acceptance criteria

A build is ready for founder re-test when all of the following pass:

### Conversation

- [ ] A user can say "I want a career change" without the Coach assuming they are already applying for jobs.
- [ ] The Coach asks only unresolved high-value questions.
- [ ] The first understanding/diagnosis segment normally uses 2–4 adaptive questions after the opening message.
- [ ] At least one grounded reflection appears by the time two meaningful user signals are known.
- [ ] The first Coach sequence contains 2–3 grounded reflections where appropriate, not generic acknowledgements.
- [ ] If the user corrects the Coach, the next turn reflects the correction and abandons the invalid route.
- [ ] A starting-point summary appears before Journey creation.

### Routing

- [ ] The user is not shown internal Journey taxonomy when the route is already determined.
- [ ] The UI never says "one matching Journey" and then asks the user to pick among multiple unrelated Journey families.
- [ ] A signal already resolved from the conversation/onboarding is not asked again.

### Scheduling

- [ ] Weekly capacity and Journey duration/horizon render the correct answer sets.
- [ ] Capacity is not asked twice when a sufficient authoritative answer already exists.
- [ ] Capacity/horizon resource parity tests pass in Hebrew and English.

### Localization

- [ ] A complete Hebrew Career first-run contains no accidental English strings.
- [ ] Username errors are localized.
- [ ] Journey-family/variant/scheduling cards are localized.
- [ ] RTL remains correct throughout.

### First value / handoff

- [ ] The public username is not required before the user reaches first coaching value unless a documented backend invariant makes it unavoidable.
- [ ] The first Step is readable immediately after Journey creation.
- [ ] A new tester can explain, in one sentence, what the app understood about them and what they should do next.
- [ ] In a clean test with normal connectivity, the user reaches a concrete first Step without unnecessary profile/social detours; use **~90 seconds from entering the first Coach conversation** as the target observation, not a hard product promise.

### Failure

- [ ] Offline/model-unavailable first run does not trap the user.
- [ ] Progress is resumable.
- [ ] No Journey is fabricated from unprocessed free text.

---

## 21. Test scenarios

### T1 — Career change, no direction

Opening:
> "אני רוצה לעשות שינוי בקריירה שלי"

Expected:
- no application/job-search assumption;
- clarify direction;
- reflect uncertainty;
- route toward direction-finding if evidence supports it;
- do not expose taxonomy.

### T2 — Active job search explicitly stated

Opening:
> "אני שולח קורות חיים כבר חודש ולא חוזרים אליי"

Expected:
- skip questions whose signals are already present;
- enter Career diagnosis at the correct unresolved point;
- do not ask whether the user is applying.

### T3 — Multiple goals

Opening:
> "אני רוצה להחליף עבודה וגם לחזור להתאמן"

Expected:
- reflect both;
- ask which to work on first;
- preserve the other as deferred if current architecture supports that behavior.

### T4 — User corrects Coach

Coach makes a wrong tentative interpretation; user says:
> "לא, זה לא העניין."

Expected:
- reflect the correction;
- clear the invalid hypothesis;
- ask the next discriminating question.

### T5 — Hebrew localization

Run the entire Career path in Hebrew.

Expected:
- zero accidental English strings;
- correct RTL;
- all cards/errors/summaries localized.

### T6 — Capacity versus horizon

Choose a weekly-capacity question.

Expected:
- only weekly-capacity answers.

Choose a Journey-duration/horizon question.

Expected:
- only duration/horizon answers.

### T7 — Offline at first Coach

Expected:
- progress preserved;
- user can enter app/Home;
- clear resume path;
- no fabricated Journey.

### T8 — Username collision

Expected:
- localized error;
- no loss of typed value;
- no loss of first Journey/core access solely because a public username is unavailable, unless a documented technical invariant requires it.

---

## 22. Phased implementation

### P0 — Fix defects visible in the walkthrough

1. Fix capacity/horizon question-option mapping.
2. Remove Hebrew/English language leakage across the full path.
3. Remove contradictory "one Journey found" + multiple-family chooser behavior.
4. Stop unsupported active-job-search assumptions.
5. Prevent duplicate questions when a signal is already known.
6. Localize username/profile errors.

### P1 — Make the conversation feel like coaching

1. Replace generic Coach opening.
2. Add grounded reflection behavior.
3. Add the starting-point summary.
4. Limit the first understanding segment to the minimum adaptive questions.
5. Hide routing taxonomy and confirm meaning naturally.
6. Separate understanding/diagnosis from reality-fit scheduling questions.

### P2 — Improve first-run value order

1. Move public username/profile completion after first coaching value.
2. Integrate capacity cleanly into scheduling so it is not collected twice.
3. Make the first Step clearly readable at Journey/Home handoff.
4. Add/verify offline resumability for Coach-led first run.

---

## 23. Likely code/reference surfaces

Start from the current implementation and verify actual repo state before changing anything.

Known relevant references from the previous onboarding handoff:

- `app/src/core/onboarding/model.ts`
- `app/src/core/onboarding/questions.ts`
- `app/src/core/onboarding/answers.ts`
- `app/src/i18n/resources/en/onboarding.json`
- `app/src/i18n/resources/he/onboarding.json`
- `app/src/app/onboarding.tsx`
- `app/src/core/learning/library/matchApproach.ts`
- `app/src/core/coach/CoachOrchestrator.ts`
- `app/src/core/learning/experts/careerDiagnosis.ts`
- `app/src/core/coach/goalSpecToJourney.ts`

Also locate the current resources/components for:

- Career answer-card localization;
- Journey-family/variant question rendering;
- scheduling/horizon/capacity questions;
- profile/username first-run screen and validation;
- post-create Journey/Home card.

Do not assume these paths have not changed since 2026-08-26.

---

## 24. Implementation directive for the receiving agent

Please treat this as a **continuation spec**, not as permission to redesign the architecture.

Before implementation:

1. read the current repo/source-of-truth docs;
2. compare current behavior against this continuation;
3. preserve stable IDs and privacy rules;
4. identify any conflict with a newer founder decision;
5. implement the smallest slice that satisfies P0, then P1, then P2;
6. add tests for every deterministic bug/skip/localization rule that can regress.

When finished, report back in this format:

```text
Implemented
- ...

Preserved
- ...

Changed from this spec because current code/source-of-truth required it
- ...

Tests added
- ...

Still open
- ...

Founder should re-test these exact paths
- T1 ...
- T5 ...
- T6 ...
- T7 ...
```

The goal is not to make the Coach talk more.

> **The goal is to ask less, listen better, reflect what was actually heard, keep the machinery invisible, and get the person to a believable first Step with as little friction as possible.**
