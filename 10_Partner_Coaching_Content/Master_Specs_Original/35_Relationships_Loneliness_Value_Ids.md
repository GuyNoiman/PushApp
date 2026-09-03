# 35 — Relationships / Loneliness Value IDs and Routing Contract

**Version:** 0.1 content draft  
**Status:** Implementation contract candidate; safety review required before release.  
**Domain id:** `relationships`  
**User-facing voice:** Coach only. The Expert receives closed signals and never the transcript.

## 1. Routing principle

This is an adaptive conversation, not a form. The Coach listens to what the user already said,
extracts only allowlisted closed signals, and asks the fewest questions that can change the Journey
recommendation.

The Expert may recommend a Journey only when these are known:

1. the desired connection goal family;
2. the primary connection bottleneck;
3. the relationship context;
4. no safety or clinical-scope override is active.

If these cannot be established with reasonable confidence, the correct result is
`clarification_journey`, not a guessed Journey.

## 2. Closed values

### Goal family

| Concept | Id | Type | Allowed values | Meaning of each value | Default when absent |
|---|---|---|---|---|---|
| Desired connection change | `relationships.goal` | subtype | `reduce_isolation`, `meet_new_people`, `dating_initiation`, `deepen_connection`, `maintain_existing_relationship`, `assertiveness_boundaries`, `relationship_clarity`, `unclear` | The user's current aspiration, not a personality label. | `unclear` |

### Primary bottleneck

| Concept | Id | Type | Allowed values | Meaning of each value | Default when absent |
|---|---|---|---|---|---|
| Where the connection process currently breaks | `relationships.bottleneck` | bottleneck | `structure_gap`, `opportunity_fit_gap`, `initiation_friction`, `follow_through_gap`, `quality_responsiveness_gap`, `boundary_clarity_gap`, `relationship_maintenance_gap`, `outcome_fixation`, `unclear` | Access, fit, initiation, continuity, depth, boundaries, maintenance, dependence on another person's choice, or insufficient evidence. | `unclear` |

### Context

| Concept | Id | Type | Allowed values | Meaning of each value | Default when absent |
|---|---|---|---|---|---|
| Relationship context | `relationships.context` | signal | `friendship`, `community`, `dating`, `partnership`, `family`, `mixed`, `unclear` | The context that changes which Journeys and guardrails are relevant. | `unclear` |

### Existing relationship potential

| Concept | Id | Type | Allowed values | Meaning of each value | Default when absent |
|---|---|---|---|---|---|
| Is there an existing safe tie worth exploring? | `relationships.existing_tie` | signal | `deepen_candidate`, `reconnect_candidate`, `maintenance_candidate`, `none_identified`, `unsure` | A candidate for depth, reconnection or maintenance; no candidate; or insufficient clarity. | `unsure` |

### Loneliness pattern

| Concept | Id | Type | Allowed values | Meaning of each value | Default when absent |
|---|---|---|---|---|---|
| What kind of absence is most noticeable? | `relationships.missing_connection` | signal | `presence`, `belonging`, `depth`, `support`, `romantic_connection`, `voice_and_boundaries`, `varies`, `unclear` | Regular presence, group belonging, being known, mutual support, romance, self-expression, changing need, or insufficient evidence. | `unclear` |

### Natural social setting

| Concept | Id | Type | Allowed values | Meaning of each value | Default when absent |
|---|---|---|---|---|---|
| Setting likely to be natural and repeatable | `relationships.setting_fit` | signal | `small_group`, `structured_activity`, `shared_interest`, `shared_identity`, `contribution`, `one_to_one`, `online`, `no_preference`, `unclear` | The setting format the user is most willing and able to repeat. | `unclear` |

### Time and structure

| Concept | Id | Type | Allowed values | Meaning of each value | Default when absent |
|---|---|---|---|---|---|
| Realistic weekly capacity | `relationships.capacity` | signal | `small_slot`, `one_or_two_slots`, `several_slots`, `variable`, `unclear` | A small bounded action, one or two meaningful opportunities, several opportunities, unstable capacity, or unknown. | `unclear` |
| Preferred Journey structure | `relationships.structure` | signal | `staged`, `simple_recurring`, `no_preference` | A Milestone arc, one recurring practice, or no preference. | `no_preference` |

### Safety and scope

| Concept | Id | Type | Allowed values | Meaning of each value | Default when absent |
|---|---|---|---|---|---|
| Coaching scope status | `relationships.scope` | verdict | `ordinary_coaching`, `professional_referral`, `safety_override`, `unclear` | Coaching remains appropriate, professional assessment/support is needed, immediate safety logic overrides, or the scope is not yet clear. | `unclear` — never assume safety. |

### Consultation result

| Concept | Id | Type | Allowed values | Meaning of each value | Default when absent |
|---|---|---|---|---|---|
| Expert routing result | `relationships.result` | verdict | `recommendations`, `missing_information`, `clarification_journey`, `no_match`, `professional_referral`, `safety_override` | Return existing Journeys, request one discriminating signal, collect real-life evidence, library lacks content, refer, or stop for safety. | `missing_information` |

## 3. Adaptive question bank

Every question allows a short free-text response through “Something else.” The free text remains with
the Coach; the Expert receives only an allowlisted value when the Coach can map it confidently.

| Question id | Intent | Coach prompt | Closed options / stored ids | Multi-select? | Rules in | Rules out | Skippable when |
|---|---|---|---|---|---|---|---|
| `relationships.foundation` | foundation | What would feel most different if your relationships were better right now? | Regular people in my life → `reduce_isolation`; meet fitting people → `meet_new_people`; romantic opportunity → `dating_initiation`; feel closer → `deepen_connection`; protect an important relationship → `maintain_existing_relationship`; express needs/limits → `assertiveness_boundaries`; understand what I need → `relationship_clarity`; not sure → `unclear` | no | Goal family | Adjacent goal families when answer is clear | Opening message already states an unambiguous aspiration. |
| `relationships.current_landscape` | baseline | Which description is closest to what exists today? | Very little regular contact → `structure_gap`; I meet people but the settings rarely fit → `opportunity_fit_gap`; opportunities exist but I hesitate → `initiation_friction`; contact starts but fades → `follow_through_gap`; people exist but I do not feel known/supported → `quality_responsiveness_gap`; an important relationship has lost consistency → `relationship_maintenance_gap`; I struggle to say what I need → `boundary_clarity_gap`; I cannot yet tell → `unclear` | no | Primary bottleneck | Bottlenecks contradicted by the current pattern | Opening message already states where the process breaks. |
| `relationships.context` | baseline | Where is the connection you want mainly situated? | Friendship → `friendship`; community → `community`; dating → `dating`; existing partnership → `partnership`; family → `family`; more than one → `mixed`; not sure → `unclear` | no | Context-specific Journeys and guardrails | Incompatible context routes | Context is explicit in the user's opening. |
| `relationships.existing_tie` | baseline | Is there already someone in your life who might be relevant to this change? | Someone I may want to know more deeply → `deepen_candidate`; someone I would consider reconnecting with → `reconnect_candidate`; a relationship I want to maintain → `maintenance_candidate`; no one comes to mind → `none_identified`; I am unsure → `unsure` | no | Existing-tie Journeys | New-people Journeys when a suitable candidate is clear | Goal is already about a named safe relationship, or the user clearly has none in mind. |
| `relationships.loneliness_pattern` | baseline | Think about times you feel connected and times you feel alone. What seems most missing? | People being present regularly → `presence`; being part of something → `belonging`; feeling truly known → `depth`; someone to turn to → `support`; romantic connection → `romantic_connection`; being able to be myself and speak up → `voice_and_boundaries`; it changes → `varies`; I do not know yet → `unclear` | no | The functional need behind the goal | “More people” as a default when quality is the gap | The need is already explicit and consistent with the landscape. |
| `relationships.pipeline` | obstacles | When a promising connection is possible, where does it most often stop? | Finding a fitting place → `opportunity_fit_gap`; starting → `initiation_friction`; reaching out again → `follow_through_gap`; becoming meaningful → `quality_responsiveness_gap`; maintaining contact → `relationship_maintenance_gap`; I focus on whether they choose me → `outcome_fixation`; it varies / unsure → `unclear` | no | One primary bottleneck | Other pipeline stages | The current-landscape answer already isolates one bottleneck. |
| `relationships.setting_fit` | variant | What kind of setting would feel most natural to return to? | Small group → `small_group`; guided activity → `structured_activity`; shared interest → `shared_interest`; shared identity/experience → `shared_identity`; contributing/helping → `contribution`; one-to-one → `one_to_one`; online → `online`; no preference → `no_preference`; unsure → `unclear` | no | Variants of opportunity Journeys | Settings the user rejects | An existing-tie Journey is chosen, or setting does not distinguish remaining candidates. |
| `relationships.capacity` | time | What can you realistically give this in an ordinary week? | One small slot → `small_slot`; one or two meaningful slots → `one_or_two_slots`; several opportunities → `several_slots`; varies a lot → `variable`; unsure → `unclear` | no | Feasibility and Step size | Arcs that exceed capacity | A reliable capacity signal already exists. |
| `relationships.structure` | milestones | Would you prefer a few clear stages or one simple practice to repeat? | Clear stages → `staged`; one practice → `simple_recurring`; no preference → `no_preference` | no | Shape/variant only | Nothing at goal level | Remaining Journeys do not differ on structure. |

## 4. Stop rule

The Coach should normally ask **two to four** question cards, never the whole bank.

Stop and consult when:

- `relationships.goal` is not `unclear`;
- `relationships.bottleneck` is not `unclear`;
- `relationships.context` is not `unclear`;
- `relationships.scope` is `ordinary_coaching`;
- at least one authored Journey matches the exact diagnosis.

Ask one more question only if its answer can change the remaining Journey set or recommended
variant. Do not ask for setting preference when the recommendation concerns an existing tie. Do not
ask capacity when all remaining candidates fit the known capacity.

After four questions, prefer declared uncertainty over interrogation. A fifth question is allowed
only for a necessary safety/scope distinction or a single tie between otherwise valid Journeys.

## 5. Routing rules

1. Existing safe tie + depth gap → prefer `relationships.intentional_friendship` or
   `relationships.mutual_support`, not a meet-new-people Journey.
2. Existing dormant safe tie + user interest in reconnecting → consider
   `relationships.reconnect_safe_ties` before expanding the network.
3. No existing candidate + structure gap → use `setting_fit` to choose a variant of
   `relationships.connection_rhythm`.
4. Existing opportunities + initiation friction → do not prescribe more opportunities.
5. Initial contact + follow-through gap → prefer `relationships.continue_contact`.
6. Existing safe relationship + maintenance gap → prefer a maintenance Journey; do not prescribe
   disclosure as the default.
7. Boundary need + fear, coercion or retaliation → `safety_override`, not a boundary Journey.
8. Several inconsistent `unclear` signals → `clarification_journey`.
9. Clear diagnosis with no authored Journey → `no_match`; do not disguise a content gap as user
   uncertainty.

## 6. Negative tests

- `lonely` is not a subtype; it is a user experience that still requires a goal and bottleneck.
- `more_friends` is not a bottleneck.
- `social_anxiety` is not an accepted coaching diagnosis.
- `attachment_style` is not an accepted signal or subtype.
- `partner_problem` is not a bottleneck.
- `make_them_reply` is not a controllable target.
- `clarification_journey` and `no_match` are not interchangeable.
- Raw names, messages, transcript text and free-text answers are not Expert inputs.

