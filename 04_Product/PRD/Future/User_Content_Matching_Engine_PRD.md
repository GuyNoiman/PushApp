# User–Content Matching Engine — Unified Product and Research Document

Status: **Future Vision — product requirements and strategic direction approved; research foundation v1 complete; scoring weights and implementation plan remain open**  
Stage: **Future / Commercial** — data foundations should be designed earlier, but automated cohort learning is not part of the POC or MVP  
Owner: founder + AI product team  
Last updated: 2026-08-28  
Related: Creator Journey Authoring Platform, Journey Templates, Explore, Coach insight model, Community Insights, Weekly Review, and `../../../05_Research/User_Matching_Parameters_Research_2026-08-17.md`

## 1. Purpose

The internet contains many courses, workshops, methods, coaches, and step-by-step guides. The main scarcity is
no longer information. It is knowing **which method is likely to fit which person in their current life**.

People often invest time and money in a program that later feels wrong for them. They may then conclude that
they failed, that change is impossible, or that the underlying Dream is not worth pursuing—when the actual
problem was a mismatch between the participant, the method, and the moment.

PushApp's long-term opportunity is to become the matching layer between:

- the person the user chooses to become;
- the user's current capacity, constraints, preferences, and behavioral evidence;
- the structure, method, demands, guidance, and tone of available Journeys;
- outcomes reported by sufficiently large cohorts with relevant, non-sensitive similarities.

The engine should eventually answer:

> Which Journey is most likely to help this user make meaningful real-world progress now, and why?

It must not merely answer:

> Which Journey has the highest average rating?

## 2. Terminology boundary

“Content” is the internal umbrella used in the name of this future engine. It does not introduce a new
participant-facing object.

- A reusable workshop, program, or course is represented in PushApp as a **Journey Template**.
- A user's active copy is a **Journey Instance**.
- A reflection or exercise in the Tools tab remains a **Tool**.

The first matching target is Journey Templates. Future versions may recommend Tools or other approved content
types, but they must retain their own influence and privacy contracts.

## 3. Approved strategic principles

The founder approved the following direction:

1. The Level or recommendation should reflect fit, not popularity alone.
2. The system may use insights derived from conversations, past Journey behavior, stated constraints, and
   ratings/outcomes from relevant cohorts.
3. Similarity should be meaningful to the Journey—such as goal, capacity, prior experience, friction, and
   response to a method—not merely demographic resemblance.
4. Recommendations should explain their reasons, such as time fit, structure, tone, support pattern, or
   evidence among relevant users.
5. The user keeps agency. The Coach recommends; the user may disagree, inspect alternatives, and choose another
   Journey.
6. A completed, popular, or highly rated Journey is not automatically the best Journey for everyone.
7. The engine should learn from real-world progress without optimizing for time in app.

## 3A. Consolidated founder requirements — authoritative

This section consolidates the founder's requirements from the full product discussion. It is the authoritative
contract for the feature; later research and architecture sections explain how to satisfy it.

### 3A.1 A new, independent product engine

The User–Content Matching Engine is a **new and separate engine**. It is not:

- the visible Own Profile;
- the social/friend profile;
- the Coach conversation itself;
- the Journey creation engine;
- the Journey adaptation engine;
- a generic recommendation call delegated to a language model.

It consumes structured outputs from those systems and returns versioned, explainable Journey recommendations.
The Coach may present or discuss its result, but the matching decision, evidence, and learning contract belong to
this dedicated engine.

### 3A.2 The matching objective

The engine's purpose is to efficiently and accurately match:

- the user's needs, desired outcome, current situation, experience, constraints, and demonstrated response to
  different methods;
- the Journey Template's core method, requirements, delivery model, adaptability, quality, and continually
  updated outcome evidence.

The objective is not to maximize clicks, enrollments, completion alone, popularity, ratings, or time in app. It is
to help the user reach a Journey that is viable for them now and produces meaningful real-world progress.

### 3A.3 The user side contains several scopes

The engine must combine, without flattening:

- general account-level insights that plausibly apply across domains;
- domain-specific knowledge and experience, such as extensive gym experience;
- Dream-specific direction, motivation, boundaries, and definition of success;
- Journey-specific history, friction, adaptation, and response;
- short-lived information about the current decision, including present time, energy, schedule, cost, and desired
  depth;
- structured evidence observed across prior Journeys.

Every insight produced by PushApp is private account information stored on the server. It carries scope,
provenance, confidence, evidence count, freshness, expiry, sensitivity, and version. Narrow information is never
silently promoted into a general claim about the person.

### 3A.4 The Journey side is continuously learned

For every Journey Template version, PushApp must maintain:

- authored and reviewed metadata;
- general quality, satisfaction, adherence, completion, effort accuracy, and real-world outcome statistics;
- conditional evidence describing for which relevant starting conditions, needs, contexts, and method-response
  patterns it appears more or less suitable;
- sample size, recency, uncertainty, version integrity, and evidence source;
- common friction, mismatch, and successful-adaptation patterns.

This evidence updates continuously as users complete, partly benefit from, stop, fail to benefit from, or report
mismatch with the Journey. It is aggregated and privacy-preserving; the Journey never stores a discoverable list
of the identities that “fit it.”

### 3A.5 Always present multiple suitable choices

The normal recommendation result must contain several genuinely suitable Journeys—normally three—and explain
the personal advantage, tradeoff, and confidence of each. The slate should include meaningful alternatives, such
as:

- strongest overall fit;
- a strong fit using a different method;
- a strong fit that excels in flexibility, structure, guidance, evidence, or another relevant priority.

The user chooses among them, asks the Coach to refine the assumptions, or rejects all. This choice is itself a
weak learning signal and must be stored with the complete slate, order, reasons, differences, and model version.
If fewer than two Journeys pass safety and hard compatibility rules, the engine must be honest rather than invent
an unsuitable alternative.

### 3A.6 Every Journey outcome teaches both sides

Every successful, partly successful, unsuccessful, abandoned, or mismatched Journey creates one versioned outcome
evidence event. It updates separately:

1. what PushApp knows about the Journey and the contexts in which it works;
2. what PushApp tentatively knows about the user, at the narrowest justified scope.

Completion is not automatically success. Non-completion is not automatically failure. A life interruption does
not lower Journey quality, and one mismatch never creates a negative identity label about the user.

### 3A.7 Ask for positive and negative feedback

At completion, cancellation, quiet abandonment, or another meaningful end state, PushApp asks short, skippable
feedback. It supports:

- closed structured fields required for reliable learning;
- optional text in the user's own words;
- positive attribution: what helped;
- negative attribution: what did not fit or work;
- perceived helpfulness, actual result, effort accuracy, and relevant context.

Text may be processed into bounded structured insights under the approved privacy contract. Structured evidence,
not an uncontrolled text embedding, drives matching. The retention and server treatment of raw text must follow
the separately approved raw-versus-derived data policy.

### 3A.8 Preserve the Journey core; personalize the adaptation envelope

Every Journey Template must explicitly separate:

#### Journey Core

The identity and professional integrity of the Journey:

- intended transformation and explicit non-goals;
- underlying method and required behavior-change ingredients;
- essential Milestone logic and dependencies;
- mandatory Steps/content and minimum completion/safety rules;
- creator expertise, guidance intent, and protected workshop material;
- boundaries beyond which the Journey would become a different method or Journey.

The matching/adaptation system does not rewrite the Core for convenience. If a proposed change alters the
promised outcome, removes a required ingredient, changes the professional method, or breaks the essential arc,
the system must recommend another Journey or a separately versioned Template.

#### Adaptation Envelope

Parameters the creator explicitly permits PushApp to tailor within validated bounds:

- schedule, timing, and allowed pace;
- Step size, frequency, and permitted sequencing flexibility;
- examples and contextual framing;
- language and supported accessible/media alternatives;
- reminder and communication delivery;
- level of Coach, Ally, or group support;
- optional exercises, reflection depth, and recovery behavior;
- intensity or challenge within declared safe limits.

The engine first matches the user to the right Core and then configures the best allowed adaptation envelope for
that user. Matching and adaptation are related but remain separate decisions with separate provenance.

### 3A.9 Efficiency, dynamism, and precision requirements

The engine must be:

- **efficient:** indexed candidate retrieval followed by deep ranking of a small set; never scan all raw users,
  transcripts, or all user–Journey pairs during a request;
- **dynamic:** server insights, Journey evidence, and current context may change; recommendations are based on an
  immutable snapshot and may be recalculated when relevant facts change;
- **precise:** quality, compatibility, personal fit, expected adherence, expected outcome, and confidence remain
  separate measures rather than one unexplained score;
- **explainable:** every displayed reason is generated from the same feature and evidence components that affected
  ranking;
- **correctable:** the user can challenge a recommendation assumption and receive a newly calculated slate;
- **versioned:** user insight vocabulary, Journey Template, scoring policy, evidence cutoff, and recommendation
  snapshot are recorded;
- **progressive:** begin with deterministic rules and metadata; add personal evidence, conditional cohort models,
  and learning-to-rank only when the data supports them;
- **privacy-preserving:** raw text and event histories are not scanned during serving, and personal matching state
  remains separate from aggregate cohort learning;
- **bias-resistant:** popularity and review count increase evidence confidence but do not automatically increase
  personal fit; exposure and position effects are measured.

### 3A.10 Non-negotiable product outputs

For every recommendation run, the engine returns:

- the eligible candidate set and hard-filter reasons;
- an ordered, diverse shortlist;
- fit components for each shortlisted Journey;
- user-facing advantages and tradeoffs;
- evidence/confidence level and meaningful uncertainty;
- which parts belong to the Journey Core;
- which parts may be adapted for this user;
- assumptions the user may correct;
- the model/policy and data-snapshot versions required to reproduce the decision.

## 4. The first research question: what does “this did not fit me” mean?

The statement is ambiguous. It can describe at least four fundamentally different situations.

### 4.1 Universal quality defect

The content is poor for nearly everyone:

- incorrect or misleading information;
- broken links, missing media, bad audio, inaccessible controls;
- chaotic organization or contradictory instructions;
- unclear language or unexplained terminology;
- marketing claims that do not match the content;
- exercises without useful feedback;
- unsafe or unsupported claims.

This is a quality-assurance problem, not a matching opportunity. The platform should repair, reject, pause, or
lower the quality standing of the Journey rather than search for a user who tolerates it.

### 4.2 Person–method mismatch

The Journey may be good, but its method does not fit this participant:

- too theoretical or too action-heavy;
- too much writing, discussion, video, repetition, or self-direction;
- tone feels too forceful, distant, cheerful, clinical, or vague;
- insufficient or excessive accountability;
- group participation when the user needs privacy, or isolation when the user needs support;
- feedback arrives in a form the user cannot use;
- examples and framing feel culturally or personally remote.

These are true matching signals when they map to a concrete Journey attribute and remain revisable rather than
becoming a personality label.

### 4.3 Person–Journey capability mismatch

The participant currently lacks a requirement the Journey assumes:

- prerequisite knowledge or skill;
- language proficiency;
- digital confidence or required device access;
- physical, cognitive, sensory, or accessibility support;
- confidence or foundational practice needed for the starting difficulty;
- access to required equipment, money, location, or professional support.

Some are hard eligibility filters; others call for a preparatory Journey or an adapted version.

### 4.4 Person–current-context mismatch

The Journey could fit the user in another period, but not now:

- insufficient time or energy;
- unstable work, family, care, health, or travel demands;
- incompatible live-session times or deadlines;
- too many concurrent Journeys;
- missing social support;
- cost or materials are unrealistic now;
- the goal has become less important or another Dream requires attention first.

The recommendation must be time-stamped. “Not now” must never become “not for a person like you.”

### 4.5 Expectation mismatch

The user and creator meant different things by success:

- beginner expected advanced depth, or an experienced participant received basics;
- user expected practical exercises and received theory;
- user expected a credential, community, personal feedback, or quick result that was not included;
- advertised weekly effort or total duration was unrealistic;
- the Journey addressed a neighboring goal rather than the user's actual objective.

Expectation mismatch is partly a discovery/copy problem and partly a matching problem. The system must compare
the user's desired outcome with the Journey's explicit promise and exclusions before recommendation.

### 4.6 Normal difficulty mislabelled as mismatch

A suitable Journey can still be uncomfortable, demanding, repetitive, or slow. The engine must not learn that
every disliked challenge is a bad fit. It should distinguish:

- productive difficulty that serves the agreed outcome;
- unnecessary friction caused by poor design;
- excessive difficulty relative to the user's current starting point;
- a method the user dislikes but that may still work;
- a method the user prefers but that does not produce the intended outcome.

Preference matters for autonomy and persistence, but preference alone is not proof of effectiveness.

## 5. Three outcomes that must never be collapsed

### 5.1 Satisfaction and acceptability

Did the participant like, trust, understand, and value the experience? This includes tone, usability, perceived
relevance, instructor quality, and willingness to recommend.

Satisfaction matters, but it is vulnerable to novelty, charisma, low difficulty, expectation, and survivor
bias. Dissatisfied users often disappear before post-Journey surveys.

### 5.2 Adherence and persistence

Did the user complete the intended dose, continue after difficulty, and return after misses?

Noncompletion is not automatically failure. Some learners sample content, seek one specific answer, achieve
their narrow goal early, or never intend to complete the full Journey. The system must record intended depth
at entry and compare behavior with that intent.

### 5.3 Learning or real-world transformation

Did the user gain the intended skill, behavior, capacity, or life change, and did it persist?

Completion and enjoyment can occur without transformation. Conversely, a useful Journey may create meaningful
change even when the user does not consume every item. This is the primary outcome, although it is usually the
hardest to measure honestly.

### 5.4 Product rule

The engine keeps separate scores for:

- quality;
- satisfaction;
- intended-dose adherence;
- real-world outcome;
- confidence/sample size.

It never trains or ranks on one blended “success” number.

## 6. Initial mismatch taxonomy

The following dimensions synthesize systematic reviews of online learning, adult-education barriers,
large-scale course reviews, coaching-alliance evidence, digital behavior-change research, and PushApp's own
Journey model.

### A. Goal and outcome fit

Questions:

- Does the Journey address the exact Dream, subgoal, and desired change?
- Is the user seeking knowledge, practice, identity change, behavior change, credential, community, or support?
- Does the Journey's definition of success match the user's?
- Is the expected time horizon realistic?
- Is the content relevant and applicable to the user's real context?

Common complaints:

- “This wasn't what I thought I was buying.”
- “Interesting, but it didn't help with my actual problem.”
- “Too general.”
- “It promised a result it never addressed.”

### B. Starting level, prerequisites, and challenge fit

Questions:

- What does the user already know or do?
- What prerequisites does the Journey assume?
- Is the initial difficulty appropriate?
- Does complexity rise gradually and transparently?
- Are foundational explanations or placement alternatives available?

Common complaints:

- too basic;
- too advanced;
- unexplained concepts;
- difficulty jumps;
- exercises assume unavailable skills or tools.

### C. Time, energy, schedule, and resource fit

Questions:

- What is the honest median and high-end time per Step and week?
- How long is the total Journey?
- Is it synchronous, deadline-led, cohort-led, or flexible?
- Can it survive schedule variability?
- What money, equipment, travel, space, or other people does it require?
- How many other Journeys and life demands are active?

Common complaints:

- too long;
- sessions are too long;
- hidden homework;
- impossible schedule;
- workload differs from the promise;
- unexpected costs or materials.

### D. Structure, sequencing, and navigation fit

Questions:

- Is there a clear map and meaningful Milestone sequence?
- Does each Step explain its purpose and completion criteria?
- Does the content build coherently, or jump between subjects?
- Can the user repeat, search, skip where safe, pause, and return?
- Is progress visible without pressure?

Common complaints:

- not organized clearly;
- jumps between topics;
- too much content at once;
- unclear what to do next;
- repetition without purpose;
- no connection between explanation and exercise.

### E. Representation, language, and accessibility fit

Questions:

- Which formats exist: text, audio, video, illustration, demonstration, transcript, captions?
- Is the format appropriate to the content and usable by this participant?
- Are speaking pace, accent, subtitle quality, reading density, contrast, and controls accessible?
- Is localization cultural and semantic, not merely translated?
- Does it work on the user's device, connection, and offline constraints?

Common complaints:

- missing visual aids;
- instructor is difficult to understand;
- videos are monotonous or too long;
- subtitles are missing or inaccurate;
- reading is unnecessarily dense;
- inaccessible exercises or controls.

**Guardrail:** this is not “learning-style” matching. People have format preferences and accessibility needs,
and tasks benefit from appropriate representations. Evidence does not support labelling people visual,
auditory, or kinesthetic learners and claiming that matching that label improves learning.

### F. Teaching or behavior-change method fit

Questions:

- What is the explanation-to-practice ratio?
- Is the Journey based on projects, reflection, repetition, exposure, rehearsal, discussion, quizzes, tracking,
  experimentation, or implementation intentions?
- Does the method target the barrier the user actually has?
- How much writing and emotional reflection is required?
- How is transfer into real life supported?

Common complaints:

- too theoretical;
- too many exercises without explanation;
- repetitive busywork;
- no real-world application;
- generic questions;
- the method addresses motivation when the real barrier is time, skill, environment, or support.

Journey Templates should declare actual techniques and intended mechanisms, not vague labels such as
“transformational.”

### G. Feedback, guidance, and accountability fit

Questions:

- Is the Journey self-guided, Coach-guided, creator-guided, or human-supported?
- Is help proactive, scheduled, or available only on request?
- How quickly and specifically is feedback delivered?
- Does the user need light encouragement, firm accountability, expert correction, or freedom?
- Who verifies progress?

Common complaints:

- no one answers when stuck;
- feedback is vague or arrives too late;
- too controlling;
- too little accountability;
- automated support feels generic;
- promised personal guidance is absent.

### H. Social mode and psychological-safety fit

Questions:

- Is participation solo, paired, group, community, or cohort based?
- Are live sharing, peer review, comparison, or public progress required?
- What privacy and anonymity controls exist?
- Does the participant have or want human support?
- Is the group environment respectful and relevant?

Common complaints:

- isolated and unsupported;
- group feels unsafe or irrelevant;
- forced public sharing;
- competition creates pressure;
- peer feedback is unreliable;
- cohort pace punishes life interruptions.

Social support is not universally beneficial. The engine should match its form and intensity, not maximize it.

### I. Instructor, Coach, and communication fit

Questions:

- Is the guidance clear, organized, credible, and internally consistent?
- What tone does it use: empathetic, direct, exploratory, energetic, calm, formal?
- Does it protect autonomy or prescribe one correct life?
- Are stories and examples understandable and relevant?
- Does the participant trust the creator and method?

Common complaints:

- does not speak clearly;
- patronizing, cold, aggressive, vague, or overenthusiastic tone;
- reads slides without teaching;
- lacks credibility;
- too much storytelling or too little explanation;
- method feels culturally remote.

Coaching research supports the importance of working alliance, but evidence for matching by fixed personality
similarity is limited and inconsistent. PushApp should learn relational response without assigning immutable
types.

### J. Autonomy, flexibility, and current motivation fit

Questions:

- Did the user choose this Journey and understand alternatives?
- Can the user adapt schedule, Step size, pace, or support within safe limits?
- How important does the Dream feel now?
- What happened in prior attempts?
- Does the Journey create choice and competence, or compliance and guilt?

Common complaints:

- too rigid;
- no room to disagree;
- pace cannot adapt;
- content assumes motivation is the problem;
- one missed week makes continuation impossible.

Motivation is dynamic and often a consequence of the other mismatches. “Not motivated” is not a sufficient
diagnosis.

### K. Technical, commercial, and trust fit

Questions:

- Does the product work reliably on the user's device and connection?
- Are price, subscription, refund, duration, access window, and extra purchases clear?
- Does the creator's promise match what is delivered?
- Are privacy, data use, AI involvement, and human involvement transparent?

Common complaints:

- technical failures;
- content locked after purchase;
- hidden upsells;
- confusing interface;
- misleading claims;
- unexpected AI or lack of promised human involvement.

Some issues are hard filters or platform violations, not recommendation features.

## 7. The matching engine must classify every attribute

Every signal belongs to one of four classes.

### 7.1 Universal quality

Examples: factual accuracy, coherent instructions, functioning media, accessibility baseline, honest marketing,
and safe claims.

Action: quality review, repair, pause, or reject. Never recommend a defective Journey to a supposedly tolerant
cohort.

### 7.2 Hard compatibility or eligibility

Examples: goal, prerequisite, language, essential accessibility, required schedule, budget, equipment, safety,
and regulated-domain constraints.

Action: filter before ranking. Explain why an option is unavailable and offer a route to eligibility where
appropriate.

### 7.3 Preference-sensitive fit

Examples: tone, group vs solo, writing load, synchronous interaction, feedback style, media mix, and amount of
choice.

Action: score and explain, while testing whether preference predicts persistence or only satisfaction.

### 7.4 Adaptable delivery parameter

Examples: Step size, pace, timing, reminder mode, frequency, recovery support, and some flexibility settings.

Action: personalize the Journey Instance rather than reject an otherwise suitable Journey Template.

This distinction is central. A weak engine recommends a different Journey whenever one parameter differs. A
strong engine knows when to filter, when to rank, when to adapt, and when to fix the content itself.

## 8. Initial user profile for matching

### Relatively stable, but editable

- language and accessibility requirements;
- prior knowledge and experience by domain;
- digital confidence;
- support and privacy preferences;
- communication preferences;
- preferred degree of structure and choice, treated as a hypothesis;
- known equipment or access constraints the user chose to save.

### Current and contextual

- exact Dream and desired outcome;
- why it matters now;
- intended depth: sample, learn, complete, practice, transform;
- realistic time and energy windows;
- schedule stability;
- concurrent Journey load;
- current budget/material constraints where relevant;
- available human support;
- prior attempts for this goal and where they broke;
- current friction and confidence;
- preferences expressed for this decision.

### Observed behavior

- actual Step effort compared with estimate;
- adherence over recent periods;
- recovery after misses;
- postponement and friction reasons;
- where the user repeats, skips, requests help, or abandons;
- which formats and structures are used successfully;
- response to guidance and communication styles;
- real-world progress and user-confirmed usefulness.

Behavior should update stated assumptions without silently rewriting the user's identity.

### Excluded by default

- gender, age, country, ethnicity, religion, sexuality, disability, health diagnosis, or inferred mental state as
  similarity shortcuts;
- personality labels;
- unsupported readiness stages;
- raw conversation text;
- time in app as a proxy for transformation.

Demographic or sensitive data may be required for safety, law, localization, or a specific evidence-based
clinical protocol, but that is a separate purpose and never general recommendation fuel.

## 9. Required Journey Template metadata

Creators and PushApp's internal authors must provide structured, reviewable declarations:

- target Dream, outcome, and explicit non-goals;
- intended participant and unsuitable conditions;
- prerequisites and starting level;
- difficulty curve;
- median and high-end time per Step/week based first on author estimate and later on observed data;
- total duration and schedule rigidity;
- synchronous/cohort requirements and timezone availability;
- required equipment, location, cost, materials, and human support;
- available languages and localization quality;
- accessibility features and known limitations;
- text/audio/video/demonstration mix;
- reading, writing, practice, reflection, and emotional load;
- instructional and behavior-change techniques;
- degree of choice and adaptability;
- guidance, feedback, accountability, and verification model;
- social mode, privacy expectations, and group size;
- creator communication tone and credential/evidence claims;
- success policy and intended real-world outcome measure;
- safety boundaries and contraindications;
- version identifier so outcomes never mix materially different content.

Marketing estimates must be separated from observed median and high-percentile effort. A Journey that takes
most users twice the advertised time has a metadata-quality problem.

## 10. What feedback must be collected

A star rating alone is insufficient and often heavily positive. Large-scale MOOC review research found rating
bias and extracted more useful themes from text, including applicability, difficulty, teaching style, pace,
video quality, subtitles, assignments, and expectations.

### Before selection

- desired outcome and intended depth;
- relevant prior experience;
- hard constraints;
- current capacity;
- preference between a small number of meaningful alternatives;
- what would make the Journey feel unsuitable.

### During the Journey

- structural events, not raw content: starts, completions, skips, repeats, postponements, help requests;
- actual effort bucket compared with estimated effort;
- comprehension or confidence check where relevant;
- friction reason already reported by the user;
- whether adaptation resolved the friction;
- real-world progress checkpoints.

### At pause, abandonment, or replacement

Ask neutrally and allow multiple reasons:

- not the outcome I needed;
- too basic / too advanced;
- too much time or energy;
- schedule no longer works;
- unclear or poorly organized;
- format or accessibility problem;
- tone or guidance did not fit;
- too little / too much support;
- group or privacy did not fit;
- cost/material/technical barrier;
- life changed;
- I got what I needed without completing;
- I want a different method;
- another reason, with optional private text.

The user may choose not to answer. A stated reason is valuable but may be incomplete or rationalized.

### After intended use

Keep separate questions:

1. Did this Journey help with the result you wanted?
2. How well did its method fit you during this period?
3. Was the time/effort description accurate?
4. Which parts helped or got in the way?
5. Would you choose this method again for a similar goal?
6. What changed in real life?

## 10A. Information feasibility — can PushApp create the data required for matching?

### Conclusion

Yes, with an important boundary. PushApp can create enough reliable information for a useful, explainable
first-generation match before it has a large user base. It cannot initially make a defensible claim that a
Journey works best for “people like you,” because that claim requires enough versioned outcome evidence from
relevant participants.

The initial engine should therefore combine:

1. structured declarations about the Journey;
2. explicit, decision-specific information confirmed by the user;
3. privacy-preserving insights already derived by the Coach;
4. observed behavior from the user's own prior Journeys;
5. quality review and, later, aggregate outcome evidence.

This is consistent with research on course recommenders: hybrid content-based and knowledge-based approaches
are commonly used to reduce cold-start and data-sparsity problems. It also follows context-aware behavior-change
research, which warns that a contextual variable should affect an intervention only when there is evidence that
it is useful for the relevant decision.

### 10A.1 Every matching datum needs provenance

Each field used by the engine must store, or be traceable to:

- **source:** creator declaration, PushApp review, user statement, Coach-derived insight, observed behavior, or
  aggregate evidence;
- **scope:** general user preference, current decision, Dream, Journey category, Journey Template, or Step type;
- **confidence:** low, medium, or high;
- **freshness:** when it was stated, inferred, or observed and when it should be reconfirmed;
- **sensitivity:** ordinary, personal, or restricted;
- **user control:** visible/editable, confirmable, or internal insight with an allowed correction path;
- **evidence count:** when derived from behavior or a cohort;
- **version:** especially for Journey Template attributes and outcomes.

An unverified inference must never silently become a permanent fact about the user.

### 10A.2 What can be known about the user

| Information | Best source | Reliability at first use | How it improves |
|---|---|---:|---|
| Dream and desired real-world result | Coach conversation, confirmed summary | High | Reconfirmed when the user seeks a new Journey |
| Why the result matters | User explanation, stored as a concise insight | Medium–high | Refined through later conversations and outcomes |
| Current time and energy capacity | Short decision-time confirmation | Medium | Compared with actual effort and schedule changes |
| Hard schedule constraints | User settings and calendar, only with future permission | High for stated rules | Reconfirmed when stale; calendar may later provide context |
| Prior knowledge and experience | User statement plus prior Journey evidence | Medium | Calibrated by comprehension, difficulty, and performance |
| Accessibility and language needs | User-controlled settings | High | User edits; never inferred as a diagnosis |
| Need for structure, autonomy, support, or accountability | Choice at selection plus Coach insight | Medium | Updated by help requests, adherence, and explicit feedback |
| Format and communication preferences | Explicit preference plus use history | Low–medium initially | Becomes stronger only when preference predicts success |
| Common friction and previous failure points | Coach insight and structured miss/pause reasons | Medium–high | Confirmed across attempts; kept goal/domain specific |
| Response to behavior-change methods | Prior Journey method tags plus outcomes | Initially unavailable | Learned only after the user experiences tagged methods |
| Current readiness and emotional capacity | Decision-specific user confirmation | Low–medium | Expires quickly; never treated as a stable identity |
| Real-world progress | User-confirmed outcome measures appropriate to the Dream | Variable | Stronger with repeated, concrete measures |

The system should ask only questions that can change the recommendation. Existing Coach insights should prefill
a provisional answer, but the user should see or confirm materially important assumptions at selection time.

### 10A.3 What can be known about a Journey before anyone uses it

Much of the content-side information is producible at authoring time. Existing educational metadata standards
already represent prerequisites, competency, level, language, resource type, interactivity, accessibility,
audience, and what a resource teaches. PushApp must extend this foundation for behavior change and real-life
execution.

The Journey authoring process can reliably require:

- promised outcome, explicit non-goals, and intended depth;
- prerequisite knowledge, capability, equipment, cost, location, and human support;
- planned duration, frequency, schedule rigidity, and estimated effort distribution;
- Step graph, dependencies, repetition, mandatory Steps, Milestones, and completion threshold;
- media and input types, reading/writing/reflection/practice load, and accessibility support;
- guidance, feedback, accountability, verification, group, and privacy model;
- degree of choice, pace flexibility, recovery rules, and permitted adaptations;
- tone and facilitation style expressed through controlled descriptors and concrete examples;
- behavior-change techniques used, rather than a vague marketing description;
- intended result measure, evidence claim, contraindications, and safety boundaries.

The Behavior Change Technique Taxonomy provides a standardized vocabulary of 93 potentially active techniques.
PushApp should expose a smaller creator-friendly subset and allow trained internal or automated review to map
the final Journey to the fuller taxonomy. The taxonomy identifies ingredients; it does not by itself prove which
technique works for which person, in which combination, or at what dose.

### 10A.4 What author declarations cannot be trusted to establish alone

Creators may estimate or describe the following, but PushApp should mark them as **claimed** until reviewed or
observed:

- actual time and energy burden;
- clarity and navigability;
- true starting difficulty and difficulty curve;
- emotional intensity;
- quality and speed of feedback;
- accessibility in real use;
- tone as experienced by participants;
- effectiveness and suitability claims;
- the proportion of participants for whom the Journey is realistically viable.

PushApp should display separate values for author estimate, PushApp review, and observed participant evidence.

### 10A.5 What PushApp can derive automatically

With no additional sensitive collection, the platform can calculate:

- planned duration, frequency, dependency depth, repetition, and schedule rigidity from the Journey graph;
- planned media and input mix;
- expected daily and weekly load from Step estimates;
- observed median and high-percentile effort;
- common stuck points, postponements, skips, help requests, and abandonment points;
- recovery after a miss and response to an approved adaptation;
- the gap between promised and observed duration;
- method-specific performance for the same user, once multiple tagged Journeys exist;
- outcome, adherence, and satisfaction separately for each Journey version.

Automatic text analysis may propose tags for creator confirmation and quality review. It must not manufacture
evidence, infer sensitive user traits, or turn opaque language-model judgments into high-confidence facts.

### 10A.6 Minimum viable information contract

The smallest useful first release does not require a long personality questionnaire. It requires:

**From the user, for the current decision**

1. desired result and intended depth;
2. prior experience or starting level;
3. realistic time/energy capacity and hard constraints;
4. required language/accessibility/support conditions;
5. the most important previous friction, when relevant;
6. confirmation of any Coach assumptions that materially affect the recommendation.

**From every Journey Template**

1. outcome and non-goals;
2. prerequisites and exclusions;
3. duration, effort, rigidity, costs, and required resources;
4. structure, media/input mix, and accessibility;
5. method/technique, support, feedback, accountability, and social mode;
6. versioned success definition and safety boundaries.

**From participation**

1. start, Step state, postponement, help, pause, replacement, and completion events;
2. actual effort bucket;
3. structured friction reason when voluntarily provided;
4. user-confirmed real-world progress;
5. end-of-use fit, effort accuracy, and usefulness feedback.

This is sufficient for transparent hard filtering and weighted rule-based ranking. It is not sufficient for
collaborative claims about similar users.

### 10A.7 Confidence ladder

- **Level 0 — compatibility only:** hard constraints and safety filters.
- **Level 1 — declared fit:** user-confirmed needs matched to creator metadata.
- **Level 2 — reviewed fit:** Journey metadata has been independently reviewed or automatically validated.
- **Level 3 — personal evidence:** this user's prior behavior shows which structures or methods worked.
- **Level 4 — cohort evidence:** enough relevant users and outcomes support a moderated fit claim.
- **Level 5 — validated recommendation:** prospective testing shows that using the match improves meaningful
  outcomes compared with a reasonable alternative.

The explanation shown to the user must never imply a higher level than the available evidence supports.

### 10A.8 Information we should deliberately not create

- a broad psychological profile assembled because it may become useful someday;
- demographic similarity clusters;
- permanent personality or “learning style” labels;
- raw Coach conversation storage for recommendation convenience;
- location history or continuous movement history;
- a single opaque suitability score without reasons and uncertainty;
- a negative identity inferred from misses, pauses, or one failed Journey.

### 10A.9 Feasibility verdict by capability

| Capability | Feasible now? | Condition |
|---|---:|---|
| Reject a Journey that violates hard constraints | Yes | Complete structured metadata |
| Explain why one Journey appears more suitable | Yes | Confirmed user needs plus controlled Journey attributes |
| Adapt schedule, pace, or support within a Journey | Partly | The Journey declares which parameters are adaptable |
| Learn from the user's own prior Journeys | Yes, over time | Versioned event, method, and outcome data |
| Compare actual versus advertised effort | Yes, over time | Effort estimates and privacy-safe observations |
| Say “users similar to you succeeded here” | Not initially | Sufficient relevant sample, outcome quality, bias controls |
| Predict the best method with high confidence | Not initially | Prospective validation and meaningful alternatives |
| Import arbitrary external courses and match them reliably | No | External content lacks the required structured contract |

The core strategic implication is that the Creator Journey Authoring Platform is not only a publishing tool.
Its structured authoring contract is a prerequisite for the matching advantage.

## 10B. Current PushApp user-information audit — 2026-08-28

### 10B.1 Finding

PushApp does not currently have one canonical matching profile. Relevant information exists, but it is split
across identity/preferences, onboarding, Coach context, Journey history, and an inactive profiling seam. The
selection layer can already consume coarse signal ids, but the data feeding it lacks a unified provenance,
scope, freshness, confidence, and correction contract.

This means the product does **not** need to ask the user everything again. It does need a private matching
projection that assembles only the approved, relevant signals from their existing owners.

### 10B.2 Existing stores and their suitability

| Existing area | What exists now | Matching value | Main limitation |
|---|---|---|---|
| Own Profile | Display name, country, birth date, form of address, communication style, week boundary | Language/localization and communication delivery only | Identity/settings object, not a transformation profile |
| Social Profile | Handle and cosmetic Buddy summary | None for matching | Publicly readable discovery surface; matching data must never enter it |
| Onboarding answers | Desired areas/outcome, starting point, preferred help, friction, capacity, starting mode, structure, current challenge | Useful cold-start hypotheses | Point-in-time, mostly device-only, generic option ids, and may become stale |
| Coach onboarding summary | A bounded derivation of onboarding answers | Useful opening context | Not a durable account-level matching model |
| Dream Coach context | Direction, starting point, boundaries, open questions | Strong Dream-scoped context | Only exists with Coach-memory consent and should stay Dream-scoped |
| Journey Coach context | Outcome, starting point, reasons, constraints, obstacle categories, adaptation rationale, assumptions | Strong Journey-specific context | Describes one existing Journey, not universal suitability |
| Journey behavior/history | Step outcomes, postponements, misses, reasons, effort slots, feedback, selected library version | Strong observed evidence | Raw logs are device-only; some fields are not populated; cross-Journey derived traits are not yet built |
| ProfileGateway seam | Preferred time of day and consistency | Correct architectural boundary | Disabled; only two fields; no real implementation |
| Library selection | Open signal ids, Journey-declared axes, variants, explicit-answer → profile → rating → default ladder | Strong foundation for explainable matching | Currently chooses mainly versions after a Journey is selected; content metadata and signal semantics are incomplete |

### 10B.3 The Own Profile object should not become the matching profile

The current Own Profile is an editable settings and identity surface. Adding obstacles, readiness, adherence,
failure history, or inferred preferences to that object would create several problems:

- it would mix public-facing/profile-edit concepts with private adaptive intelligence;
- it would imply that temporary context is a stable identity trait;
- it would make every inferred field look user-authored and equally reliable;
- it would create accidental exposure risk through profile and social projections;
- it would lose Dream/Journey scope and provenance.

Only explicit durable settings that users naturally expect to manage belong in Own Profile, such as language,
accessibility requirements, general active hours, communication style, and broad notification/privacy choices.

### 10B.4 Proposed private Matching Profile projection

Create a separate private domain object, tentatively named `MatchingProfile`. It is not a new user-facing
profile page and is never exposed to friends. It is a versioned projection assembled from existing sources,
not a second store of raw answers.

Each signal should follow this conceptual shape:

```text
signal id
value or controlled value ids
scope: account | domain | Dream | current decision
source: user-confirmed | onboarding | Coach insight | observed behavior
confidence
observations/count
created at / last confirmed at / expires at
sensitivity
correction or confirmation policy
```

The first useful signal groups are:

- **capability:** prior knowledge, experience, digital/access requirements;
- **capacity:** realistic time/energy, schedule stability, concurrent load;
- **method response:** structures and behavior-change techniques previously associated with progress;
- **support response:** self-directed, Coach, Ally, group, feedback, and accountability patterns;
- **friction:** controlled categories that have repeatedly blocked progress;
- **delivery:** language, accessibility, communication, media/input requirements;
- **context:** goal-specific readiness and current constraints with short expiry;
- **evidence:** outcome, adherence, fit feedback, and the number/version of observations behind a signal.

### 10B.5 Changes required to the user-information model

#### Required foundation changes

1. Expand the reserved ProfileGateway into a real matching-profile boundary rather than adding fields to the
   React Own Profile provider.
2. Replace its current fixed two-trait result with versioned, scoped signals carrying provenance, confidence,
   freshness, and observation count.
3. Build the projection from existing structured sources; do not copy raw onboarding text, Coach transcripts,
   or raw behavior logs into it.
4. Add explicit expiry/reconfirmation rules. Current capacity and challenge expire quickly; accessibility and
   language persist until edited; method response requires repeated evidence.
5. Separate `unknown`, `not asked`, `user declined`, `stale`, and `insufficient evidence`.
6. Allow a current Journey-selection answer to override a prior profile signal without deleting history.
7. Version the signal vocabulary and mappings from onboarding answers so changed questions do not silently
   change the meaning of historical data.
8. Define account sync and encryption separately from the public Supabase profile. No matching field may be
   added to the currently public-readable social profile row.

#### Useful existing foundations to preserve

- Keep Journey-specific axes open-ended: each Journey declares which distinctions matter to it.
- Keep explicit current answers above profile history and aggregate ratings.
- Keep the selected Journey/variant/version reference on each live Journey.
- Keep raw behavioral and free-text material local or transient; derive only bounded structured signals.
- Preserve Dream- and Journey-scoped Coach context rather than flattening it into permanent account traits.

### 10B.6 Fields that appear missing or insufficient today

The current data model has no canonical representation for:

- profile signal provenance, confidence, observation count, freshness, or expiry;
- domain-specific prior knowledge with a reusable level scale;
- current concurrent Journey load as a matching signal;
- schedule stability and time/energy capacity distinct from one onboarding answer;
- required accessibility and media/input constraints in the matching layer;
- support/accountability preference versus observed response to support;
- response to tagged behavior-change techniques across Journeys;
- repeated friction patterns separated from one-off life interruptions;
- real-world outcome measures normalized by Journey purpose;
- the difference between stated preference and demonstrated effectiveness;
- user-visible confirmation of the assumptions used for a recommendation.

### 10B.7 Migration direction

No destructive migration is required. The new model should be additive:

1. treat existing onboarding selections as low/medium-confidence cold-start signals with their original version;
2. read current profile settings only for their intended purposes;
3. read consented Coach summaries only within their declared scope;
4. derive new signals from future structured events, without uploading historical raw logs;
5. leave old users with unknown fields and ask only when a missing field can change a real recommendation;
6. never fabricate defaults that claim knowledge about fit.

### 10B.8 Server-side insight decision and documentation cleanup

Founder clarification, 2026-08-29: **all app-derived insights are account data stored on the server**. Raw user
wording and raw behavioral records remain governed by their separate minimization rules, but the bounded insight
derived from them belongs to the server-side internal user model and must survive a device change.

The current privacy contract and backup redaction already state this direction, while some older code comments
still describe Coach memory as device-only. Those comments and the owning specifications must be reconciled
before implementation so the code does not accidentally apply the stricter raw-data rule to derived insights.

### 10B.9 Product recommendation

Do not redesign the visible Profile screen for this feature. Introduce the private matching projection and add
small confirmation moments inside Journey selection, such as:

> “We based this recommendation on 20–30 minutes available three times a week and your preference for clear,
> guided Steps. Is that still accurate?”

This makes the recommendation correctable without asking the user to maintain an abstract psychological profile.

## 10C. Proposed server architecture for user-to-Journey matching

### 10C.1 Core principle: one model, multiple scopes

The server should not hold one flat list of traits. It should hold versioned insight facts at the narrowest scope
that makes them true:

1. **Account scope:** broadly reusable information, such as language/accessibility needs or a repeatedly observed
   response to highly structured work across several domains.
2. **Domain scope:** knowledge and experience relevant to a field, such as substantial gym experience, beginner
   financial knowledge, or familiarity with meditation.
3. **Dream scope:** motivation, boundaries, and desired direction attached to one Dream.
4. **Journey scope:** constraints, friction, adaptations, and outcomes specific to one Journey Instance.
5. **Decision scope:** current capacity, preference, and constraints confirmed for this recommendation moment.

Narrower, fresher, user-confirmed information outranks broader historical information. A domain insight must not
be promoted to account scope merely because it was useful once.

### 10C.2 Recommended server entities

#### Insight definition registry

Defines the controlled vocabulary: id, meaning, allowed values, permitted scopes, sensitivity, expiry policy,
minimum evidence, and which matching attributes it may influence. This prevents creators or models from inventing
unreviewed psychological labels.

#### User insight fact

One bounded claim about one user, including:

- user id and insight-definition id;
- scope type and scope id;
- controlled value or numeric band;
- source and source version;
- confidence and supporting observation count;
- first observed, last observed, last confirmed, and expiry timestamps;
- status: provisional, confirmed, contradicted, stale, or withdrawn;
- sensitivity and processing-purpose marker.

The fact stores the app's conclusion, not the raw sentence or event series that produced it.

#### User evidence aggregate

Privacy-minimized counters used to support an insight without copying raw behavior to the server, for example:

- three structured Journeys attempted, two completed with positive outcome;
- repeated postponement under high weekly load;
- stronger adherence with short guided Steps than with long self-directed Steps;
- positive outcomes with accountability in a particular domain.

Evidence must remain linked to the Journey Template and version that generated it.

#### Journey feature profile

The versioned structured counterpart to the user model: outcome, prerequisites, domain level, load, flexibility,
structure, media, support, feedback, behavior-change techniques, social mode, accessibility, cost, safety, quality,
and observed participant evidence.

#### Match request snapshot

An immutable record of what was known for one recommendation decision: desired result, candidate set, applicable
insight ids and versions, hard filters, ranking-model version, and evidence cutoff. It should avoid raw text.

#### Recommendation slate

The ordered shortlist presented to the user. Each candidate stores:

- Journey Template and version;
- compatibility result and fit dimensions;
- confidence level;
- two or three user-facing reasons;
- relevant tradeoffs or uncertainties;
- whether each reason comes from declared metadata, review, personal evidence, or cohort evidence.

#### Recommendation response

Stores which candidate the user chose, whether they requested another option, and any structured reason they
voluntarily gave. The choice is a useful preference signal, but not proof that the unchosen alternatives were bad
or that the chosen Journey was effective.

#### Match outcome

Later joins the recommendation snapshot to adherence, fit feedback, effort accuracy, and real-world result. This
is what teaches the engine whether its recommendation was good; selection alone teaches only what looked
appealing at the decision point.

### 10C.3 Matching flow

1. The Coach establishes the desired outcome and selects the relevant domain/Dream.
2. The server resolves applicable insight facts using scope, freshness, confidence, and consent.
3. Hard filters remove unsafe or impossible Journeys.
4. The engine scores the remaining candidates by goal, capability, capacity, method, delivery, and support fit.
5. Quality and evidence modify confidence; they never erase a hard incompatibility.
6. The system produces a small diverse shortlist rather than pretending one Journey is certainly best.
7. Every candidate receives concrete reasons and meaningful tradeoffs.
8. The user chooses, asks the Coach to refine the shortlist, or rejects all options.
9. The system stores the decision snapshot and response.
10. During and after the Journey, outcomes update narrowly scoped insight facts and aggregate Journey evidence.

When signals conflict, use this default precedence unless a safety rule is stricter:

1. safety and accessibility requirements;
2. explicit answer for the current decision;
3. current Dream context;
4. relevant domain knowledge/experience;
5. repeated personal behavioral evidence;
6. account-scope hypotheses;
7. old onboarding answers;
8. cohort evidence.

A newer fact supersedes the active value without erasing history; context-dependent changes are useful evidence,
not inconsistency to be hidden.

### 10C.4 Recommendation presentation

The first version should normally show up to three genuinely suitable options. They should differ on a meaningful
dimension rather than being near-duplicates:

- the strongest overall match;
- a strong alternative using a meaningfully different method;
- a strong alternative that excels on another priority such as flexibility, evidence, or guidance.

Example reasons include:

- “Its short, flexible Steps fit the time you said you have this month.”
- “It is highly structured and explains exactly what to do next.”
- “It includes frequent feedback, which helped you in a previous Journey.”
- “It has substantial positive outcome evidence from participants with similar starting experience.”

Avoid vague reasons such as “popular,” “for people like you,” or “AI selected.” “Many reviews” is useful only
when the review count, quality, relevance, and measured outcome are distinguished from popularity.

### 10C.5 What the user's choice teaches

Choosing among matched options is valuable because it reveals a preference under a real decision, not an abstract
questionnaire response. It should update only a provisional signal such as preference for flexibility, structure,
feedback, creator style, or expected intensity.

Guardrails:

- one choice has low weight;
- non-selection is not a dislike;
- position and wording bias must be logged and controlled;
- the chosen option's later outcome determines whether preference also predicted effectiveness;
- repeated preference without success should not be presented as the best method for transformation;
- user choice never promotes a domain-specific insight to global scope without cross-domain evidence.

### 10C.6 Efficient retrieval and scoring

For each recommendation, the server should read only:

- active insights at account scope;
- active insights for the relevant domain and Dream;
- the current decision snapshot;
- summarized evidence from relevant prior Journey versions;
- candidate Journey feature profiles.

It should not scan transcripts, raw behavior logs, or the full account backup. Precomputed, versioned projections
make matching fast, testable, explainable, and reversible when an insight is corrected or deleted.

### 10C.7 Server privacy and control requirements

The founder's decision makes derived insights server-readable account data. This must be disclosed honestly; it
is not end-to-end encrypted from PushApp. Before implementation, the privacy contract, Coach-memory consent, and
any older local-only profile promises must be updated and reconciled.

Required safeguards:

- derived-insight tables are private and never reused by public/social profile projections;
- raw conversations, Why text, miss notes, Tool answers, messages, and exact behavioral timelines are excluded;
- inference services receive minimum transient input and persist only allowlisted structured output;
- only narrowly privileged server functions may create confidence/evidence or run ranking;
- the user can correct an assumption from the recommendation explanation, which invalidates dependent matches;
- Dream, Journey, consent, and account deletion cascade through insights, indexes, caches, and addressable
  learning artifacts;
- export includes understandable active insights, scopes, source categories, and recommendation history;
- current-decision and capacity insights expire quickly; stale facts are deleted rather than accumulated forever;
- sensitive health, addiction, trauma, sexuality, religion, politics, relationships, disability, finances, or
  diagnoses are never inferred from behavior or choice without a dedicated approved purpose and legal review;
- logs contain operation codes, latency, and schema/model versions—not goals, signal values, recommendation
  vectors, prompts, raw rows, or sensitive Journey identifiers.

Personal matching and cohort learning are separate processing layers. Cohort data must use coarse non-sensitive
dimensions, minimum group thresholds, rare-template suppression, deletion rules, bias review, and a distinct
purpose/choice contract. A user who declines cohort contribution should still receive private rules-based matching.

## 10D. Efficient retrieval and ranking architecture

### 10D.1 The serving question

The online system must answer quickly:

> Given this user's current goal, context, and active insight profile, which small set of Journey Templates is
> most likely to fit and help now?

It must not compare raw user histories, scan conversations, or calculate every user-to-Journey pair at request
time. The architecture separates slow learning and aggregation from fast recommendation serving.

### 10D.2 Three separate Journey assessments

Every Journey Template version should expose three values that must not be collapsed in storage:

1. **General quality:** clarity, reliability, accessibility, creator/reviewer quality, participant satisfaction,
   adherence, and observed outcomes across all eligible participants.
2. **Conditional fit:** how outcomes differ by relevant starting point, capacity, context, and method-response
   signals.
3. **Evidence confidence:** sample size, recency, version consistency, missingness, bias risk, and whether the
   evidence is authored, reviewed, observed, or prospectively validated.

A widely reviewed Journey may have high evidence confidence but only moderate fit. A new Journey may have strong
declared fit but low confidence. The product should show this distinction rather than hiding it in one star score.

### 10D.3 Shared feature space

User insights and Journey attributes should use a common, controlled feature registry. Examples:

| Feature family | User side | Journey side |
|---|---|---|
| Goal | desired outcome and depth | promised outcome and non-goals |
| Capability | domain experience and starting level | prerequisites and difficulty curve |
| Capacity | available time/energy and schedule stability | expected load, duration, rigidity |
| Structure | response/preference for structure | sequence clarity, Step specificity, navigation |
| Method | evidence of response to practice, reflection, instruction, tracking | tagged behavior-change techniques and activity mix |
| Support | desired/observed response to guidance and accountability | Coach, Ally, group, feedback, verification model |
| Delivery | language, accessibility and media/input needs | supported language, accessibility, media/input mix |
| Constraints | budget, equipment, place and current boundaries | cost, equipment, location and participation requirements |

The common feature space should be typed and versioned, not an opaque text embedding. Text analysis may suggest
features for review, but the serving engine reads controlled values.

### 10D.4 Two-stage online recommendation

#### Stage A — candidate retrieval

Use indexed database filters to reduce the catalog quickly:

- active Journey Template version;
- relevant Dream/domain/outcome family;
- language and accessibility support;
- prerequisite and safety eligibility;
- cost/equipment/location availability;
- duration, current capacity, and start constraints;
- catalog quality threshold.

For an early catalog this is ordinary indexed relational querying. At larger scale, precomputed domain/outcome
candidate lists or approximate vector retrieval may accelerate the same step. Retrieval is broad enough to keep
good alternatives; it does not make the final decision.

#### Stage B — personalized ranking

Rank only the retrieved candidates. Calculate separate sub-scores:

- outcome fit;
- capability fit;
- capacity fit;
- method fit;
- structure/delivery fit;
- support fit;
- general quality;
- personal evidence;
- relevant cohort evidence;
- uncertainty/confidence.

The ranking policy combines these versioned sub-scores, applies uncertainty and quality guardrails, and creates a
small, meaningfully diverse slate. The sub-scores also generate the explanation; no second language model needs
to invent why a Journey ranked highly.

### 10D.5 What to store about “who this Journey fits”

Do not store a list of user identities or a permanent label such as “for disciplined people.” Store conditional,
privacy-preserving evidence attached to the Journey Template version:

- feature or context condition, such as beginner domain experience or low schedule stability;
- eligibility and sample count;
- start, adherence, completion, satisfaction, and real-world outcome rates separately;
- effort accuracy and common friction distribution;
- effect estimate relative to reasonable alternatives where available;
- confidence interval/band, recency, and evidence/model version;
- minimum-cohort and suppression status.

Early examples may be coarse buckets. As data grows, a statistical model can estimate the same conditional
outcomes without materializing every possible combination of features, which would create an exponential number
of tiny groups.

### 10D.6 Avoid a permanent segment explosion

Fixed personas such as “busy beginner who likes video and support” multiply rapidly and become stale. Use:

- atomic scoped features for retrieval and explanation;
- aggregate statistics for a small number of approved, meaningful conditions;
- a versioned prediction model for interactions among features once enough data exists;
- minimum sample thresholds before any cohort statement is shown.

The system estimates likely outcomes from relevant features; it does not need to find a named cluster of users
identical to the current user.

### 10D.7 Learning progression

#### Generation 1 — rules and metadata

Hard filters plus transparent weighted scoring. Fast, deterministic, testable, and suitable for cold start.

#### Generation 2 — personal-history adjustment

Adjust method, structure, support, and capacity scores using this user's prior Journey outcomes. One Journey is
weak evidence; repeated cross-Journey patterns earn higher weight.

#### Generation 3 — conditional cohort model

Use regularized statistical models to estimate adherence, fit, and outcomes from user/context features, Journey
features, and their interactions. Keep the outcome predictions separate and calibrate confidence.

#### Generation 4 — learning-to-rank

Learn how to order eligible candidates from recommendation snapshots, choices, and later outcomes. Optimize for
real-world progress rather than click or selection alone. Maintain hard rules and explanation features outside
the learned component.

#### Generation 5 — controlled exploration

When several safe candidates are close, occasionally vary the order or include a plausible under-exposed Journey
to learn. This requires explicit guardrails, monitoring, and enough traffic; it is not an early-stage feature.

### 10D.8 Fast data path

#### Updated asynchronously

- Journey feature profile after publication or version change;
- general Journey quality and outcome aggregates;
- conditional cohort aggregates;
- user insight facts after a Coach-approved insight or structured behavior update;
- compact active Matching Profile projection;
- precomputed candidate pools for common domain/outcome families.

#### Calculated per request

- current-decision overrides;
- hard eligibility;
- sub-scores for the small candidate set;
- uncertainty and diversity policy;
- explanation reasons and tradeoffs;
- immutable recommendation snapshot.

This makes the common request proportional to the retrieved candidate set, not to all users multiplied by all
Journeys.

### 10D.9 Recommended technical path for PushApp

1. Start with Postgres tables, indexes, materialized/summary rows, and a pure versioned scoring module.
2. Keep one canonical feature registry shared by authoring, insight derivation, matching, and explanations.
3. Store score components and model/policy versions for every recommendation.
4. Run a shadow evaluation before user-facing ranking: compare engine recommendations with Coach/human judgment.
5. Add a vector index only when catalog size or semantic retrieval measurements justify it; do not make opaque
   embeddings the source of truth.
6. Add a trained model only after outcome labels, version integrity, cohort size, and offline evaluation are
   adequate.

No separate paid recommendation platform is required for the first generations. The existing server/database can
support rules, indexed retrieval, aggregates, and later vector search while the data contract matures.

### 10D.10 Evaluation

Offline and shadow tests should measure:

- hard-filter correctness and safety;
- whether the relevant Journey appears in the retrieved candidate set;
- ranking quality against expert/Coach comparisons;
- explanation fidelity to the actual score components;
- calibration: high-confidence matches outperform low-confidence matches;
- time to a viable Journey;
- adherence, perceived fit, and real-world outcome separately;
- exposure diversity and creator/popularity bias;
- performance by catalog size and response latency.

The primary success is not that the user selected the first card. It is that the selected Journey was viable,
helped them persist, and produced the intended real-world progress.

## 10E. Dual learning from a Journey outcome

### 10E.1 An outcome is an evidence event, not a direct rewrite

When a user reports that a Journey succeeded, partly succeeded, did not help, did not fit, or was stopped, the
server creates one immutable, versioned `JourneyOutcomeEvidence`
record linked to:

- user id;
- Journey Instance;
- Journey Template and version;
- recommendation run and the alternatives shown, when applicable;
- Matching Profile snapshot used at selection;
- start and outcome context;
- completion/adherence facts;
- the user's success verdict and optional structured attribution;
- result-measure version and timestamp.

Two asynchronous projections then consume the same evidence:

1. the Journey Evidence Projector learns what is known about the Journey;
2. the User Insight Projector learns what may be true about this user.

Neither projector edits the evidence event. This preserves auditability and allows a corrected/deleted verdict or
changed model version to rebuild both projections consistently.

### 10E.2 What the Journey learns

The Journey Template version gains separate evidence about:

- perceived helpfulness;
- real-world outcome, when measured;
- adherence and completion;
- actual effort versus declared effort;
- fit satisfaction;
- friction and recovery;
- which relevant starting conditions and contexts were present;
- which adaptations were used;
- confidence and sample size.

The global Journey score updates, but so do conditional estimates such as:

> Participants with relevant prior experience and low schedule stability had strong outcomes when using the
> flexible version.

These conditions are aggregate feature combinations, never a list of identifiable participants. Every statistic
is isolated by materially different Journey version.

### 10E.3 What the user learns

The same success may strengthen scoped hypotheses such as:

- the Journey's starting difficulty fit this user's experience in the relevant domain;
- short guided Steps were viable in the current context;
- a flexible schedule supported adherence;
- frequent feedback or Ally support coincided with progress;
- a specific behavior-change technique may have helped in this domain;
- the estimated weekly capacity was realistic.

Each update is incremental. It records the relevant Journey feature, scope, evidence count, and confidence delta.
One successful Journey normally creates provisional or low/medium-confidence evidence—not a permanent general
trait.

### 10E.4 Credit assignment: what caused the success?

A successful Journey contains many attributes at once. Success does not prove that the user likes or benefits
from all of them. The engine should assign evidence in this order:

1. **Explicit attribution:** the user selected one or two elements that helped most.
2. **Observed adaptation:** an approved change was followed by improved adherence/outcome.
3. **Distinctive feature:** the Journey differed meaningfully from previously attempted alternatives.
4. **Repeated pattern:** the same method/structure succeeded across several Journeys.
5. **Correlation only:** the feature was present but its contribution is unknown.

The fifth case may update exposure counts but should barely affect fit confidence. A language model must not
invent causal attribution from a success label.

### 10E.5 Minimal success feedback

The current `helped: yes | partly | no` signal is a useful starting label, but it cannot tell the engine what
worked or whether real-life change occurred. A short optional follow-up should capture:

1. **Did this Journey help you move toward the result you wanted?** Yes / partly / no.
2. **What helped most?** Choose up to two Journey-specific, actually present attributes—for example clear
   structure, practical Steps, flexibility, feedback, Coach guidance, Ally support, media, reflection, or pace.
3. **Did the intended real-world result change?** A Journey-specific structured measure or “not sure yet.”
4. **Was the effort description accurate?** Less / about right / more than expected.

All questions remain skippable. The option list must be generated from the Journey's declared attributes so a
user is never asked whether a nonexistent feature helped.

### 10E.6 Confidence update rules

- A direct user attribution is stronger than mere feature exposure.
- A concrete outcome is stronger than completion alone.
- Repeated evidence in one domain strengthens a domain insight.
- Evidence across meaningfully different domains is required before promotion to account scope.
- Partial success updates only the dimensions supported by the response/outcome.
- Contradictory evidence lowers confidence or creates a context distinction; it does not erase history.
- Old evidence decays when context, Journey version, or user circumstances materially change.
- Completion is not automatically equivalent to success, and non-completion is not automatically failure.

### 10E.7 Example

A user with substantial gym experience chooses a flexible, highly structured strength Journey from three
recommendations. They complete it, report meaningful progress, and select “clear structure” and “flexible timing”
as the two most helpful elements.

**Journey update**

- one additional successful outcome for this exact version;
- increased evidence among participants with advanced domain experience and unstable schedules;
- confirmed effort estimate if reported accurate;
- structure and flexibility attribution counters increase.

**User update**

- gym/strength experience remains a high-confidence domain fact;
- preference/response to clear structure gains domain-scoped evidence;
- flexible timing gains current-context/domain evidence;
- no global claim is made yet that the user always needs structure or flexibility;
- if later success repeats in another domain, an account-scope hypothesis may be proposed with explicit
  provenance and confidence.

### 10E.8 Why the recommendation snapshot matters

Without the alternatives, order, reasons, and score components shown at selection, the system cannot tell whether
the user chose the Journey because of structure, price, creator recognition, card position, or another feature.
The snapshot reduces false learning and later enables propensity-aware or randomized evaluation when traffic is
large enough.

## 10F. Learning from non-success and mismatch

### 10F.1 Non-success is usually more diagnostic—but only with a reason

“This did not work” is not one label. The engine must distinguish:

- **quality defect:** unclear, disorganized, broken, inaccessible, misleading, or poorly delivered;
- **capability mismatch:** too basic, too advanced, missing prerequisite or required skill;
- **method mismatch:** exercises, media, tone, structure, feedback, support, or social mode did not fit;
- **capacity/context mismatch:** time, energy, schedule, cost, equipment, environment, or emotional load;
- **expectation mismatch:** the promised outcome, depth, pace, or support differed from what was understood;
- **life interruption:** circumstances changed independently of the Journey;
- **goal change:** the user no longer wants the same result;
- **sufficient partial use:** the user got what they needed without completing;
- **unknown:** the user skipped or could not identify a reason.

Only the first category is a broadly negative quality signal. The others are conditional evidence about fit,
context, expectation, or intent.

### 10F.2 Adaptive mismatch feedback

After a `no`, `partly`, cancellation, or quiet stop, ask a short, non-judgmental flow:

1. **What best describes what happened?** Choose up to two structured reasons from the applicable categories.
2. **Which part did not fit?** Show only attributes actually present in this Journey, such as pace, structure,
   flexibility, media, feedback, Coach guidance, group work, writing load, or difficulty.
3. **Would a different version of this approach still interest you?** Yes / maybe later / no.
4. **What would need to be different?** Optional controlled alternatives plus optional private text.

The application may process free text transiently into an allowlisted structured insight, but the matching
evidence stores the structured result rather than the sentence.

### 10F.3 How the Journey model updates

- A verified clarity/technical/accessibility defect lowers general quality and may trigger review or suspension.
- “Too advanced” lowers conditional fit for that starting level, not for advanced participants.
- Excess effort updates observed workload and the accuracy of the Journey's declaration.
- Method/tone/support mismatch updates conditional fit for the relevant feature/context combination.
- Life interruption or goal change does not penalize Journey quality.
- Getting sufficient value early may be a positive outcome with non-completion, not abandonment.
- Repeated concentrated friction at one Step or Milestone triggers content-quality investigation.

### 10F.4 How the user model updates

- A stated current constraint becomes decision-, Dream-, or domain-scoped evidence with an appropriate expiry.
- A method or delivery mismatch becomes a provisional preference/response signal in the relevant domain.
- A prerequisite mismatch updates domain starting level when the user confirms it or repeated evidence supports it.
- A one-off life interruption is not converted into a trait such as “low consistency.”
- Repeated mismatch with the same feature across Journeys increases confidence gradually.
- A preference for a different method is stored separately from evidence that the alternative produces better
  outcomes.

### 10F.5 Negative evidence must not blame the person

The system learns that a particular Journey-method-context combination was not viable. It does not learn that the
user is lazy, undisciplined, resistant, incapable, or “a quitter.” Those are prohibited identity inferences and
are neither useful nor justified by the evidence.

### 10F.6 Example

A user stops a rigid strength Journey and reports that the sessions were longer than described and impossible to
fit around changing work shifts.

**Journey update**

- observed effort rises above the author estimate;
- effort-description accuracy declines;
- conditional fit decreases for participants with unstable schedules;
- no conclusion is made about participants with stable schedules;
- repeated reports may trigger creator review.

**User update**

- unstable scheduling becomes a current/domain-scoped fact with short expiry;
- need for scheduling flexibility gains provisional domain evidence;
- no global “does not persist” trait is created;
- the next recommendation should favor flexible Journeys and explain that reason for confirmation.

## 11. Recommendation pipeline

### Phase 0 — metadata and quality foundation

No machine learning. Require high-quality Journey metadata, versioning, outcome definitions, and structured
feedback. Without this foundation, a sophisticated algorithm will learn marketing quality and popularity.

### Phase 1 — explainable rule-based matching

1. Filter by goal, safety, prerequisites, language, accessibility, budget/resources, and schedule.
2. Score current feasibility: time, energy, duration, workload, concurrent load.
3. Score method fit: structure, practice/reflection mix, guidance, social mode, tone, and format.
4. Identify what can be adapted inside the Journey Instance rather than affecting Template selection.
5. Show one recommended Journey and one meaningfully different alternative.

### Phase 2 — personal history

Adjust recommendations using the user's own evidence:

- structures that supported real progress;
- recurring friction and recovery behavior;
- actual capacity;
- successful guidance/support intensity;
- outcome by method rather than clicks.

Personal history should generally outrank cohort similarity.

### Phase 3 — cohort evidence

Use aggregate outcomes from sufficiently large cohorts matched on relevant, non-sensitive dimensions. Keep
outcome, adherence, and satisfaction separate. Apply minimum sample sizes and uncertainty intervals.

Never display “people like you” without explaining the relevant dimensions. Prefer:

> Among participants who started with similar experience, weekly capacity, and need for flexible scheduling,
> this Journey produced stronger reported progress than the alternatives. Evidence is still limited.

### Phase 4 — controlled learning

When several Journeys are plausibly suitable, the system may carefully explore alternatives to improve future
matching. Exploration must never expose a user to an unsafe, incompatible, or clearly inferior Journey, and
the user must still choose knowingly.

## 12. Recommendation explanation contract

Every recommendation should contain:

- exact goal match;
- two or three strongest fit reasons;
- any important compromise;
- confidence level and why;
- expected effort and requirements;
- an alternative with a meaningfully different method;
- controls to inspect, disagree, or ask the Coach for another option.

Example:

> This Journey is recommended because its three short weekly practices fit the time you described, it begins at
> your current experience level, and its flexible return-after-a-miss structure matches what interrupted your
> last attempt. Confidence is medium: we know your constraints, but we do not yet have enough outcome data from
> comparable participants.

The system must not say “best for you” when it only knows “most popular” or “best rated.”

## 13. Data and modeling risks

### Cold start

At first there will be few Journey Templates, users, and outcomes. Use authored metadata, Coach reasoning,
hard constraints, user choice, and explicit rules. Do not fabricate cohort evidence.

### Survivor and rating bias

People who finish are more likely to review. Star ratings cluster at the top. Users who leave early may never
answer. Collect friction at several moments and show missingness/confidence.

### Popularity loop

Recommending popular Journeys creates more data for them and starves alternatives. Separate exposure from
quality and reserve controlled discovery for plausible options.

### Easy-Journey bias

Completion optimization favors short, easy, low-impact Journeys. Keep transformation, intended dose, and
usefulness separate, and compare within honest outcome categories.

### Creator gaming

Creators may understate workload, encourage ratings, select easy participants, or design trivial completion.
Use observed effort, versioned outcomes, quality review, anomaly detection, and transparent definitions.

### Correlation mistaken for matching

A characteristic may predict success across all Journeys without proving that a specific method is better for
that characteristic. The engine should distinguish prognosis (“may need more support”) from moderation
(“method A works better than method B for this context”). Most early evidence will be correlational.

### Over-personalization

Matching should not trap users in easy, familiar, or preferred formats. Growth sometimes requires supported
difficulty and new methods. Offer agency, rationale, and alternatives rather than a filter bubble.

### Sensitive inference and discrimination

Raw conversation content and sensitive traits must not enter cohort vectors. Use derived, purpose-limited,
revocable insights; cohort-size floors; access controls; deletion; bias audits; and a clear explanation of how
recommendations are formed.

## 14. Privacy direction

- Raw Coach conversations remain outside the recommendation dataset.
- Only explicitly defined, derived insights may influence the user's local or account-level match profile.
- Cohort evidence uses minimum necessary buckets, aggregate counts, and cohort-size floors.
- Sensitive goal domains require stricter isolation and may not support cross-user similarity until a dedicated
  legal, privacy, and safety review approves it.
- Users can inspect and correct declared preferences and constraints.
- Users can opt out of contributing their outcomes to aggregate recommendation learning without losing basic
  rule-based recommendations.
- Account deletion removes personal match state; aggregate privacy policy must ensure records cannot be traced
  back to the deleted account.

## 15. Success criteria

The north-star metric cannot be rating, clicks, session time, or raw completion. Evaluation should compare
recommendation quality against a baseline and include:

- user-confirmed match after meaningful exposure;
- intended-dose persistence;
- recovery after misses;
- real-world outcome appropriate to the Journey;
- replacement rate due to mismatch;
- accuracy of effort and prerequisite expectations;
- regret: would the user choose the same Journey again?
- calibration: high-confidence recommendations should succeed more often than low-confidence ones;
- fairness and performance across relevant cohorts without demographic shortcutting;
- user understanding of why the Journey was recommended.

The strongest product outcome is not “the recommendation was accepted.” It is:

> The user found a viable method sooner, made meaningful progress, and did not interpret a method mismatch as
> personal failure.

## 16. Edge cases

- **No Journey passes hard filters:** say so honestly and offer to adjust constraints, create a custom Journey,
  or wait; never recommend an incompatible option to avoid an empty state.
- **User chooses a lower-ranked Journey:** respect the choice, show material requirements, and learn without
  treating disagreement as an error.
- **Several methods are equally plausible:** show the meaningful difference and let the user choose.
- **High rating but weak outcomes:** explain that popularity and demonstrated result differ; do not conceal the
  evidence split.
- **Strong outcomes but low enjoyment:** present the tradeoff without assuming the user should accept it.
- **User changes goal mid-Journey:** rematch only after confirmation; preserve history and avoid attributing the
  previous outcome to the wrong goal.
- **Journey version changes:** do not pool outcomes across materially different versions without compatibility
  rules.
- **Tiny cohort:** show no cohort claim; use metadata/personal evidence and low confidence.
- **Conflicting needs:** identify the compromise, such as strong method fit but incompatible schedule.
- **Accessibility need appears later:** immediately re-filter and offer an accessible route without recording a
  generalized deficit label.
- **Life interruption causes abandonment:** classify as context change rather than negative content outcome.
- **User completes only what they intended:** do not label partial platform consumption as failure.
- **Creator removes a Journey:** preserve the user's history and explain replacement recommendations.

## 17. Strategic advantage and flywheel

If built responsibly, the engine creates a defensible loop:

`better Journey metadata → better initial match → more relevant participation → cleaner outcome evidence →
better matching → more user success → more creator value`

For users, PushApp reduces wasted time, money, discouragement, and false self-blame.

For creators, PushApp becomes more than distribution: it helps a method reach participants for whom it is
plausibly suitable and reveals where the Journey itself creates friction.

For PushApp, the long-term asset is not a generic catalog or language model. It is a versioned map of which
methods, structures, support patterns, and contexts are associated with meaningful progress—combined with a
transparent system that lets the user choose.

## 18. Evidence base — initial pass

### Dropout, persistence, and online-learning satisfaction

- Systematic review of MOOC engagement and dropout factors:
  <https://www.sciencedirect.com/science/article/pii/S2405844023024271>
- Systematic review of motivation and MOOC retention:
  <https://link.springer.com/article/10.1186/s41039-022-00181-3>
- Systematic review of online higher-education attrition, retention, and progress:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC9753023/>
- Review of factors influencing online-learning satisfaction:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC9039172/>
- Meta-analysis of teaching presence, satisfaction, and perceived learning:
  <https://www.sciencedirect.com/science/article/pii/S0360131520301640>
- Review of adult-education participation decisions and barriers:
  <https://nces.ed.gov/pubs98/9810.pdf>

### Large-scale review evidence

- Structural topic modeling of large-scale language-MOOC reviews:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC10155997/>
- Analysis of 21,692 programming-course reviews:
  <https://doaj.org/article/1460252e94e74c0e84d680fdf5f80898>
- Large-scale analysis of 2.4 million open MOOC reviews, including numeric-rating bias:
  <https://arxiv.org/abs/2201.06967>
- Open-ended MOOC feedback on pace, long videos, subtitles, audio, assignments, and feedback:
  <https://www.cs.purdue.edu/homes/dgoldwas/downloads/papers/NDWMG_tlt_2021.pdf>

### Preference, coaching, and relationship evidence

- Meta-analysis of treatment preference, dropout, and alliance:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC6902231/>
- Meta-analysis of working alliance and coaching outcomes:
  <https://doi.org/10.1177/0018726718819725>
- Systematic review of organizational coaching effectiveness and mechanisms:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC4945054/>

### Personalization and guardrails

- Systematic review of course recommendation systems, including hybrid approaches for cold start and sparse
  evidence:
  <https://www.mdpi.com/2504-4990/5/2/33>
- Systematic review of adaptive learning-content recommenders and learner-model attributes:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC8357108/>
- Systematic review of context-aware digital behavior-change interventions and evidence-based tailoring
  variables:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC8158169/>
- Dynamic framework for personalized education:
  <https://link.springer.com/article/10.1007/s10648-020-09570-w>
- Contextual indicators for personalized learning recommendations:
  <https://arxiv.org/abs/2308.16661>
- Meta-analysis testing the learning-style matching hypothesis:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC11270031/>
- Engagement with digital behavior-change interventions as a multidimensional construct:
  <https://pubmed.ncbi.nlm.nih.gov/27966189/>
- Systematic review of behavior-change techniques associated with engagement:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC10545861/>

### Information standards and intervention description

- Schema.org Course and LearningResource properties for prerequisites, competency, level, language,
  interactivity, accessibility, resource type, and intended outcome:
  <https://schema.org/Course>
- Quality Matters course-design framework, including alignment, objectives, assessment, materials,
  interaction, technology, support, accessibility, and usability:
  <https://www.qualitymatters.org/qa-resources/rubric-standards/higher-ed-rubric>
- UCL Behavior Change Technique Taxonomy resources: 93 standardized, observable intervention ingredients and
  their limitations:
  <https://www.ucl.ac.uk/brain-sciences/behaviour-change/resources/advancing-behavioural-science>

### Existing PushApp foundation

- `../../../05_Research/User_Matching_Parameters_Research_2026-08-17.md`
- `Creator_Journey_Authoring_Platform_PRD.md`
- `../../Strategy_WIP_2026-07/09_future_vision_notes.md` — aggregate Journey recommendation concept
- `../../Product_Bible.md` — Explore and future AI-guided Journey recommendation

## 19. Next research layer

This document is intentionally not implementation-ready. The next analysis should:

1. Build a controlled taxonomy from real negative and mixed reviews across coaching, self-development,
   professional learning, fitness, addiction support, and creator courses—not only academic MOOCs.
2. Separate complaints that predict dissatisfaction from those that predict abandonment or weak outcomes.
3. Determine which Journey metadata can be reliably authored, automatically measured, or user-confirmed.
4. Define the smallest structured feedback set that yields useful learning without burdening participants.
5. Study existing course and treatment recommender systems for transparency, cold start, bias, and causal
   evaluation.
6. Design the first explainable rule-based score and test it against human Coach recommendations before any
   cohort model is built.
