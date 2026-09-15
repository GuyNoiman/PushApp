> **EDITORIAL HEADER — added on import, 2026-09-14. The founder's document follows below,
> unchanged, from the first `#` heading onward.**
>
> Sent by the founder on 2026-09-14 and imported so the repository, not the conversation, holds it
> (CLAUDE.md §1.3). Two things a reader must know before §25 and before the name:
>
> - **§25 is SUPERSEDED by D105.** This document has the onboarding conversation end with a Journey
>   recommendation shown on Home. The founder subsequently decided the opposite: the onboarding
>   conversation is an INTRODUCTION and chooses no Journey; matching happens in a second
>   conversation, entered from the fourth Step of the intro Journey. Where this document and D105
>   disagree, **D105 wins**. Nothing else in this document is affected.
> - **The name "Meemor" throughout this document is DROPPED (D107).** `meemor.com` was registered by
>   a third party on 2026-07-02, and the MeMore/Memore spelling collides with an active US
>   cognitive-health brand and two live Google Play apps — see
>   `05_Research/Product_Name_Deep_Clearance_MeMore_Meemor_2026-09-14.md`. Read every occurrence of
>   the name here as the product, not as a decided brand. A replacement is an Open Question.
>
> Everything else in this document stands as the founder's specification.

# Meemor — Initial Conversation, Journey Matching & Coach Handoff Specification

**Version:** 2.0  
**Status:** Implementation update  
**Audience:** Product / engineering agent building the Meemor application  
**Scope:** Initial onboarding conversation → user profiling → Journey matching → Home → handoff from Super Coach to Professional Coach

---

## 1. Objective

Update the onboarding so the **Super Coach** uses a short, natural coaching conversation to learn enough about the user to recommend the most suitable Journey from the available catalog.

The user should experience a free conversation. Under the hood, Meemor should:

1. extract structured information from natural language,
2. update a persistent `User Match Profile`,
3. compare that profile with structured metadata on available Journeys,
4. identify the most important missing information,
5. ask only questions that can improve or change the Journey recommendation,
6. stop when there is enough confidence to recommend the best next Journey,
7. save all context,
8. show the recommendation on Home,
9. hand the user and context to the relevant Professional Coach.

Core rule:

> **Do not follow a questionnaire. Follow the state and the matching uncertainty.**

---

## 2. Coach roles

### 2.1 Super Coach

The Super Coach owns the general Meemor relationship.

Responsibilities:
- run the initial onboarding conversation,
- learn the user's name and current focus,
- extract matching signals from free conversation,
- reflect what it understands according to the existing Meemor coaching principles,
- choose the next best question,
- match the user to the best available Journey,
- explain the recommendation in natural language,
- route the user to the correct Professional Coach,
- preserve cross-domain user context over time.

The Super Coach should not pretend to be the specialist once a domain-specific Journey begins.

### 2.2 Professional Coach

Each professional Journey is assigned to a specialist coach type, for example:
- Career Coach
- Relationship Coach
- Health / Habits Coach
- Finance Coach
- other future specialists

Responsibilities:
- receive the structured handoff,
- receive a useful summary of the onboarding conversation,
- continue from the state already reached,
- perform deeper domain-specific diagnosis when needed,
- guide the authored Journey, milestones and steps.

**Critical rule:** the Professional Coach must not restart discovery from zero or ask again for information already known with sufficient confidence.

---

## 3. Initial conversation goal

Target length: approximately **3 minutes**.

Three minutes is a UX target, not a hard timer.

The goal is not to learn everything about the user. The goal is:

> **Learn the information that can materially change which Journey should be recommended.**

The conversation can finish earlier when the match is already clear and may continue slightly longer when one important distinction is still missing.

---

## 4. Conversation behavior

The user should feel they are talking with a coach, not filling a form.

Preferred flow:

```text
Broad opening
    ↓
Listen
    ↓
Reflect
    ↓
Extract/update state
    ↓
Rank candidate Journeys
    ↓
Identify the biggest uncertainty
    ↓
Ask ONE useful question
    ↓
Re-rank
    ↓
Recommend when confident
```

Internal labels such as `stage`, `bottleneck`, `match_score`, or `confidence` should never be shown to the user.

---

## 5. Existing Meemor coaching principles remain active

This matching layer must preserve the coaching behavior already defined for Meemor.

The Super Coach should:
- listen before leading,
- briefly reflect meaningful information before moving on,
- ask **one question at a time**,
- never ask again for information already supplied,
- extract several useful signals from one answer where possible,
- rephrase rather than mechanically repeat,
- answer direct user questions before returning to onboarding,
- be patient, curious, grounded, warm and concise,
- coach rather than interrogate,
- avoid therapeutic framing,
- avoid unnecessary explanations,
- allow natural language instead of forcing categories,
- avoid solving the entire problem during onboarding,
- use narrow choices/examples only when they help the user think or resolve ambiguity.

Preferred pattern:

> **Listen → Reflect → Clarify → Continue**

---

## 6. Suggested opening

### Name

> **Hi, I'm Meemor. Before we get started, what should I call you?**

User:
> Guy

Store:

```yaml
name: Guy
```

### Broad opening

> **Hi Guy, I'm happy that you're here. What brings you to Meemor right now, and what would you like some help with?**

This stays broad because one rich answer may provide several matching signals.

---

## 7. User Match Profile

The Super Coach continuously builds this structured profile:

```yaml
user_match_profile:

  identity:
    name: null
    language: null

  focus:
    primary_want:
      value: null
      confidence: unknown

    domain:
      value: null
      confidence: unknown

    current_state:
      summary: null
      confidence: unknown

    desired_outcome:
      value: null
      confidence: unknown

  matching:
    stage:
      value: null
      confidence: unknown

    primary_bottleneck:
      universal: null
      domain_family: null
      domain_subtype: null
      confidence: unknown

    support_need:
      primary: null
      secondary: []
      confidence: unknown

    readiness:
      value: null
      confidence: unknown

  experience:
    previous_attempts:
      summary: null
      outcomes: []
      confidence: unknown

  context:
    constraints: []
    resources: []
    relevant_context: []

  recommendation:
    candidate_journeys: []
    leading_journey_id: null
    match_confidence: low
    missing_discriminator: null
    ready_to_match: false
```

Suggested confidence values:

```text
unknown
low
medium
high
```

The technical storage can follow the existing app architecture, but these concepts should remain.

---

## 8. Information to extract

### 8.1 Primary Want

What does the user want to change, achieve, understand, improve or move toward **right now**?

Examples:
- change career,
- improve a relationship,
- get healthier,
- become more consistent,
- make a difficult decision,
- understand what they want next.

If several wants appear, help identify the **primary current focus**. Store other wants for later if useful.

### 8.2 Domain

Which area does the Want belong to?

Initial examples:

```text
career
relationships
health
habits_lifestyle
money
personal_growth
other
```

Infer the domain from natural language whenever possible. Do not ask the user to select a category if it is already clear.

### 8.3 Current State

Where is the user now in relation to the Want?

Keep both a semantic summary and any structured signals needed for matching.

Examples:
- eight years in marketing and ready to leave,
- already has two serious career directions,
- repeatedly starts exercise and stops,
- relationship is stable but communication has deteriorated.

### 8.4 Desired Outcome

What would meaningfully be different if progress were made?

Examples:
- have a clear next career direction,
- choose between two possible paths,
- begin applying successfully,
- rebuild communication,
- establish a sustainable routine.

Do not require a perfect SMART goal during onboarding.

### 8.5 Stage

Stage describes where the user is in the change process, independent of domain.

Recommended universal taxonomy:

```yaml
explore:
  meaning: "Still trying to understand what I want or what is possible."

choose:
  meaning: "I have meaningful options and need to decide."

prepare:
  meaning: "I know the direction and need to get ready."

act:
  meaning: "I am ready and trying to take concrete action."

unblock:
  meaning: "I am already acting, but a specific obstacle prevents progress."

sustain:
  meaning: "I can start, but consistency is the main problem."

grow:
  meaning: "I am already on the path and want to improve or advance."
```

Infer this where possible.

---

## 9. Bottleneck

The system must distinguish:

> **What the user wants**

from:

> **What is currently preventing progress**

Two people can want the same outcome but need different Journeys because their bottlenecks differ.

### 9.1 Universal bottleneck

Initial extensible taxonomy:

```text
lack_of_clarity
too_many_options
decision_difficulty
knowledge_or_skill_gap
lack_of_plan
difficulty_starting
specific_execution_block
lack_of_access_or_opportunity
lack_of_evidence_or_confidence
inconsistent_behavior
lack_of_support
external_constraint
unknown
```

### 9.2 Domain-specific bottleneck

Each domain can maintain its own professional taxonomy.

Example for Career:

```text
Target
Capability
Proof
Access
Process
Growth
```

Possible stored form:

```yaml
domain_family: target
domain_subtype: no_direction
```

The Super Coach should capture domain-specific detail when it is supported by the conversation or needed to distinguish Journeys. Full specialist diagnosis can continue inside the professional Journey.

---

## 10. Support Need

Support Need describes **how Meemor can best help**, not the underlying bottleneck.

Recommended values:

```yaml
clarity:
  meaning: "Help me understand what I want or what is happening."

direction:
  meaning: "Help me find or choose a direction."

planning:
  meaning: "Help me turn a direction into a path."

action:
  meaning: "Help me start or take the next concrete action."

consistency:
  meaning: "Help me continue and stick with it."

support:
  meaning: "Help me with accountability, encouragement or the right people."
```

One primary need should normally be identified; secondary needs may also be stored.

---

## 11. Readiness

Understand what the user is realistically ready to do next.

Suggested values:

```text
reflect
explore
decide
prepare
act
maintain
unknown
```

Readiness can distinguish Journeys that otherwise look similar.

---

## 12. Previous Attempts

Where relevant, understand:
- what the user already tried,
- what happened,
- why it worked or failed.

This can materially change the recommendation.

Example:

User A:
> "I want to start exercising."

No meaningful prior attempt → Getting Started may fit.

User B:
> "I've started six routines this year and quit after two weeks every time."

Same Want, different likely Journey: consistency/sustainability.

**Do not ask this automatically.** Ask only when the answer can change the match or when the user mentions it naturally.

---

## 13. Constraints, resources and context

Capture relevant constraints only when they affect what is realistic or which Journey can work.

Possible constraints:
- time,
- money,
- family responsibility,
- schedule,
- energy,
- health limitation,
- location,
- other meaningful constraints.

Possible resources:
- skills,
- experience,
- supportive people,
- available time,
- existing opportunities,
- relevant assets.

Also store useful "why now" / urgency context when it appears naturally.

These are not mandatory standalone onboarding questions.

---

## 14. The fields are NOT a questionnaire

One user answer can populate many fields.

Example:

> "I've been in marketing for eight years. I'm burned out and I know I want something different, but I have no idea what. I've looked at a few roles online but nothing really clicked."

Possible extraction:

```yaml
domain: career

primary_want:
  value: career_change
  confidence: high

current_state:
  summary: "Eight years in marketing; dissatisfied/burned out."
  confidence: high

desired_outcome:
  value: "Find a different career direction."
  confidence: medium

stage:
  value: explore
  confidence: high

primary_bottleneck:
  universal: lack_of_clarity
  domain_family: target
  domain_subtype: no_direction
  confidence: high

support_need:
  primary: clarity
  secondary:
    - direction
  confidence: high

previous_attempts:
  summary: "Browsed several roles; none felt compelling."
  confidence: high
```

Therefore the coach must NOT ask:
- What area is this about?
- Do you want a career change?
- Are you clear on what you want?
- Have you looked at anything yet?

Those answers are already known.

---

## 15. Next Best Question Engine

After every meaningful user message:

```text
1. Extract all supported signals.
2. Merge into the current User Match Profile.
3. Resolve contradictions and update confidence.
4. Run Journey hard filters.
5. Rank the remaining candidates.
6. Check whether there is a clear recommendation.
7. If not, identify the highest-value missing discriminator.
8. Generate ONE natural coaching question to resolve it.
9. Reflect the user's meaning before asking when appropriate.
10. Repeat.
```

The system should not ask:

> "Which field is empty?"

It should ask:

> **"What missing information is most likely to change the Journey recommendation?"**

---

## 16. Discriminator questions

A discriminator question separates close Journey candidates.

Example candidates:

```text
A — Find Your Career Direction
B — Choose Between Career Options
```

Difference:
- A: user has no meaningful direction yet.
- B: user has several serious options and needs to choose.

Internal state:

```yaml
missing_discriminator:
  field: target_state
  possible_values:
    - no_direction
    - multiple_directions
```

Natural question:

> **Do you already have a few directions you're seriously considering, or does it still feel completely open?**

This is much better than a generic profile question because the answer directly changes the recommendation.

---

## 17. Reflection behavior

When the user gives meaningful information, briefly reflect before the next question.

Example:

User:
> "I know I need to leave my job but I don't know what I want instead."

Meemor:
> **It sounds like the need for a change is already pretty clear. What's missing is a direction you'd actually feel good moving toward.**

If more information is needed:

> **Do you already have any directions you're considering, or does it still feel completely open?**

Reflection should be:
- short,
- accurate,
- based on meaning rather than word-for-word repetition,
- non-judgmental,
- easy for the user to correct,
- useful for moving the conversation forward.

---

## 18. Journey Match Profile

Reliable matching requires structured metadata for every Journey.

Recommended schema:

```yaml
journey_match_profile:

  journey_id: null
  title: null

  domain: []
  intents: []

  outcome:
    primary: null
    secondary: []

  suitable_stages: []

  target_bottlenecks:
    universal: []
    domain_specific: []

  support_needs:
    primary: []
    secondary: []

  readiness_required: []

  prerequisites: []
  exclusion_signals: []

  previous_attempt_conditions: []

  constraint_fit:
    compatible_with: []
    incompatible_with: []

  expected_result: null
  duration: null
  effort_level: null

  professional_coach_type: null
```

The Journey catalog must gradually use this standardized metadata. Do not rely only on title/description or a prompt that asks an LLM to "pick the best Journey."

---

## 19. Example Journey profile

```yaml
journey_id: career_find_direction
title: Find Your Career Direction

domain:
  - career

intents:
  - career_change
  - find_next_direction

outcome:
  primary: clear_career_direction

suitable_stages:
  - explore

target_bottlenecks:
  universal:
    - lack_of_clarity
    - too_many_options
  domain_specific:
    - target.no_direction
    - target.vague_target

support_needs:
  primary:
    - clarity
    - direction

readiness_required:
  - reflect
  - explore

prerequisites:
  - wants_meaningful_career_change

exclusion_signals:
  - clear_target
  - main_bottleneck_is_access
  - main_bottleneck_is_interview_performance
  - active_interview_process_for_defined_target

expected_result:
  "A clearer, validated direction for the user's next career move."

professional_coach_type:
  career
```

---

## 20. Matching engine

Use two layers.

### 20.1 Hard filters

Remove clearly incompatible Journeys using signals such as:
- wrong domain,
- prerequisite not met,
- explicit exclusion signal,
- clearly incompatible stage,
- critical constraint that makes the Journey unsuitable.

### 20.2 Ranking

Rank remaining Journeys.

Suggested configurable MVP weighting:

```text
Primary bottleneck fit      30%
Desired outcome fit         25%
Stage fit                   20%
Support need fit            10%
Readiness fit               10%
Context / constraints fit    5%
```

These weights are a starting point and should be configurable rather than embedded in free-text prompts.

Store:
- total score,
- match confidence,
- reasons for the match.

---

## 21. Match confidence

### High confidence
One Journey has a clear lead, major required signals are sufficiently understood, and there is no meaningful contradiction.

**Action:** finish onboarding and recommend.

### Medium confidence
Two or more Journeys are close and one additional answer could change the winner.

**Action:** ask one discriminator question and re-score.

### Low confidence
The Want/domain/stage/bottleneck are still too unclear.

**Action:** continue natural discovery.

Never force a professional Journey only because the UI expects one.

---

## 22. Stop condition

Do NOT stop because:
- exactly 3 minutes passed,
- a fixed number of questions was reached,
- every optional profile field is filled.

Stop when the system knows enough to choose the next Journey responsibly.

Recommended logic:

```yaml
ready_to_match: true

minimum_understanding:
  primary_want_is_clear: true
  domain_is_clear: true
  current_state_is_clear_enough: true
  desired_outcome_is_clear_enough: true
  stage_is_clear_enough: true
  primary_bottleneck_is_clear_enough: true

and_one_of:
  one_journey_has_clear_lead: true
  additional_questions_unlikely_to_change_recommendation: true
```

`support_need` and `readiness` should be inferred and used where relevant but must not create unnecessary questions when the match is already stable.

---

## 23. Fallback when there is no confident match

Possible causes:
- unsupported domain,
- Journey catalog does not cover the need,
- insufficient confidence,
- candidates remain genuinely indistinguishable.

Behavior:
1. do not fabricate a match,
2. persist everything learned,
3. route to a general continuation/discovery Journey (working title: **Find Your Way Forward**) if available,
4. collect only the missing information,
5. rematch when confidence becomes sufficient.

This is a valid product state, not an error.

---

## 24. End-of-onboarding summary

Before Home, the Super Coach gives a short personalized reflection.

Example:

> **Got it, Guy. You know you're ready for a career change, but before you start planning the move, the important thing is getting clearer on what direction actually fits you.**

Then:

> **I have a good place for you to start.**

The summary must come from the actual conversation/profile. Do not expose internal labels or scores.

---

## 25. Home after onboarding

For a new user, Home contains two Journey areas.

### 25.1 Universal Journey — Make Meemor Yours

Available to every new user.

Purpose:
- learn the app through use,
- understand Journeys and Steps,
- progressively personalize coaching style,
- define preferred rhythm,
- later introduce Circle/social support preferences.

### 25.2 Personalized recommended Journey

The Super Coach selects the strongest fit from the current Journey catalog.

The Home card should communicate:
- Journey title,
- why it is relevant,
- expected direction/outcome,
- clear CTA to begin.

Example:

> **Recommended for you**  
> **Find Your Career Direction**  
> Based on what you shared, the best place to start is getting clearer on what kind of work you want to move toward before building a plan.

Do not show match scores or diagnostic labels.

---

## 26. Super Coach → Professional Coach handoff

When the user opens the recommended Journey, route the Journey conversation to the appropriate Professional Coach.

The handoff must include structured context, not only a raw transcript.

Suggested payload:

```yaml
coach_handoff:

  user:
    name:
    language:

  selected_journey:
    journey_id:
    title:
    professional_coach_type:
    match_score:
    match_reasons: []

  user_match_profile:
    primary_want:
    domain:
    current_state:
    desired_outcome:
    stage:
    primary_bottleneck:
    support_need:
    readiness:
    previous_attempts:
    constraints:
    resources:
    relevant_context:

  conversation:
    onboarding_summary:
    important_user_facts: []
    unresolved_questions: []

  handoff_rules:
    do_not_reask_known_information: true
    continue_from_current_state: true
```

The raw transcript may remain available as additional context but should not replace structured state.

---

## 27. Professional Coach startup behavior

The Professional Coach should behave like a warm handoff from another coach.

Bad:

> "What are you hoping to achieve in your career?"

when onboarding already established this.

Better:

> **Guy, Meemor filled me in on where you are. You know you want to move on from marketing, and right now the important part is figuring out which direction actually fits. Let's start there.**

The specialist may clarify known information only when:
- confidence is low,
- information conflicts,
- the information appears outdated,
- deeper specificity is required for the current professional step.

---

## 28. Separation of responsibilities

### Super Coach owns
- universal onboarding,
- cross-domain user understanding,
- User Match Profile,
- initial Journey recommendation,
- Home recommendation,
- routing/handoff,
- reusable cross-Journey context.

### Matching Engine owns
- hard filters,
- eligibility,
- ranking,
- confidence,
- discriminator identification.

### Journey definition owns
- matching metadata,
- milestones,
- steps,
- expected outcome,
- required specialist type.

### Professional Coach owns
- domain-specific coaching,
- deeper specialist diagnosis,
- Journey adaptation,
- professional questions,
- execution of milestones and steps.

---

## 29. Persistence and provenance

Everything learned during onboarding should persist and be reusable by:
- Home,
- Super Coach,
- Journey matcher,
- Professional Coaches where relevant,
- future Journeys and recommendations.

Stable information should not be asked again without a reason.

Where possible, store confidence and provenance:

```yaml
field:
  value:
  confidence:
  source:
    - explicit_user_statement
    - inferred_from_conversation
  updated_at:
```

This makes it possible to distinguish facts explicitly stated by the user from model inference.

---

## 30. Separate extraction from conversation generation

For each turn, treat these as separate logical jobs.

### A. Extraction layer
Produces structured state updates.

Example:

```json
{
  "domain": {"value": "career", "confidence": "high"},
  "stage": {"value": "explore", "confidence": "high"},
  "support_need": {"primary": "clarity", "confidence": "high"}
}
```

### B. Decision layer
Uses:
- current User Match Profile,
- Journey candidates,
- match confidence,
- missing discriminator,
- stop condition

to determine the objective of the next reply.

### C. Conversation layer
Writes the user-facing message in the Meemor coaching voice.

The wording generated by the LLM should not itself be the database schema.

---

## 31. Recommended per-turn pipeline

```text
USER MESSAGE
     ↓
Structured signal extraction
     ↓
Merge with persistent User Match Profile
     ↓
Resolve confidence / contradictions
     ↓
Run Journey hard filters
     ↓
Rank Journey candidates
     ↓
Calculate recommendation confidence
     ↓
Decision
     ├── clear match → summarize + finish onboarding
     ├── need discriminator → reflect + ask ONE question
     └── still broad → reflect + ask highest-information open question
     ↓
Generate Meemor response
```

---

## 32. Example complete flow

### Meemor

> Hi, I'm Meemor. Before we get started, what should I call you?

### User

> Guy.

### Meemor

> Hi Guy, I'm happy that you're here. What brings you to Meemor right now, and what would you like some help with?

### User

> I've been in marketing for eight years and I think I'm done with it. I want to do something else, but I honestly don't know what.

Possible state:

```yaml
domain: career
primary_want: career_change
current_state: eight_years_marketing_and_ready_to_leave
desired_outcome: different_career_direction
stage: explore

primary_bottleneck:
  universal: lack_of_clarity
  domain_family: target
  domain_subtype: no_direction

support_need:
  primary: clarity
```

Possible ranking:

```text
Find Your Career Direction       84
Choose Between Career Options    58
Build a Career Change Plan       42
```

The system may want one discriminator.

### Meemor

> It sounds like the change itself is pretty clear — what's missing is a direction that actually feels right for you. Do you already have a few possibilities you're seriously considering, or does it still feel pretty open?

### User

> Mostly open. I've looked at product roles and consulting, but neither feels like a real decision yet.

Updated state:

```yaml
stage: explore
domain_subtype: no_direction
candidate_options_exist_but_not_validated: true
```

Updated ranking:

```text
Find Your Career Direction       94
Choose Between Career Options    61
Build a Career Change Plan       38
```

Now confidence is high.

### Meemor

> Got it. You already know you're ready for a change; the useful next step is figuring out what kind of direction genuinely fits before trying to build a plan around it. I have a good place for you to start.

→ Home  
→ Recommended Journey: **Find Your Career Direction**  
→ When opened: handoff to **Career Professional Coach**

The Career Coach receives the structured context and continues from there.

---

## 33. Journey catalog requirement

The matching system is only as reliable as Journey metadata.

Every Journey used for matching should define at least:

```text
journey_id
title
domain
intents
primary outcome
suitable stages
target bottlenecks
support needs
readiness
prerequisites
exclusion signals
expected result
professional coach type
```

Existing and future Journeys should be migrated toward this structure.

---

## 34. MVP test cases

Required tests:

1. **Very short user**
   - "Career."
   - Coach expands naturally without assuming.

2. **Very detailed user**
   - One answer contains Want, Domain, Stage, Bottleneck, attempts.
   - Coach does not repeat questions.

3. **Multiple wants**
   - Coach identifies primary current focus.

4. **Two close Journey candidates**
   - Matching layer produces a discriminator.

5. **Clear Journey after one rich answer**
   - System may finish early.

6. **No matching Journey**
   - Do not fabricate; use fallback.

7. **Unsupported domain**
   - Store understanding and route safely.

8. **User asks a direct question mid-onboarding**
   - Answer it and resume naturally.

9. **User corrects prior information**
   - Latest explicit correction updates state.

10. **Professional handoff**
    - Specialist demonstrates context and does not restart onboarding.

---

## 35. Acceptance criteria

Implementation is successful when:

- onboarding is driven by dynamic user state rather than a fixed questionnaire,
- structured matching information is extracted from free conversation,
- one answer can fill multiple fields,
- known information is not re-asked,
- Meemor still reflects and coaches naturally,
- one main question is asked at a time,
- inferred signals carry confidence,
- Journeys have standardized matching metadata,
- candidates are filtered and ranked,
- the engine can identify a high-value discriminator,
- onboarding stops when a stable recommendation exists,
- Home includes **Make Meemor Yours** plus the personalized Journey recommendation,
- the recommended Journey is based on user/Journey metadata rather than title similarity,
- entering the Journey routes to the relevant Professional Coach,
- the Professional Coach receives structured context and continues rather than restarts,
- there is safe fallback behavior when a confident professional match is unavailable.

---

## 36. Product principles

### Conversation first, classification underneath
The user speaks naturally; classification happens silently.

### Ask only what matters
Before asking another onboarding question, effectively ask:

> **Can this answer change the Journey recommendation?**

If not, do not ask it now.

### Matching is not full diagnosis
Collect enough professional information to choose the correct Journey. Deeper diagnosis can continue inside the Journey with the specialist.

### Never reset context
The whole experience should feel like one relationship with Meemor even when different coaches participate.

### Specialist handoff, not chatbot switching
The intended user experience is:

> **Meemor understood me → found the right path → brought in the right coach.**

Not:

> **I finished one bot and now another bot is asking me the same things.**

---

## 37. Summary architecture

```text
INITIAL ONBOARDING
Super Coach
        │
        ▼
Natural free conversation
        │
        ▼
Structured signal extraction
        │
        ▼
Persistent User Match Profile
        │
        ▼
Journey catalog + standardized metadata
        │
        ▼
Hard filters
        │
        ▼
Ranking / confidence
        │
        ├── uncertain ──► missing discriminator
        │                     │
        │                     ▼
        │               next best question
        │                     │
        └─────────────────────┘
        │
        ▼
High-confidence Journey recommendation
        │
        ▼
HOME
 ├── Make Meemor Yours
 └── Personalized Recommended Journey
        │
        ▼
User opens Journey
        │
        ▼
Structured coach handoff
        │
        ▼
Professional Domain Coach
        │
        ▼
Domain-specific coaching + milestones + steps
```

---

## Final implementation rule

> **The Super Coach's job during onboarding is not to complete a script. Its job is to reduce uncertainty until Meemor knows the best next Journey for this user.**

> **Once that Journey is selected, all relevant context must travel with the user to the Professional Coach so the conversation continues rather than starts over.**
