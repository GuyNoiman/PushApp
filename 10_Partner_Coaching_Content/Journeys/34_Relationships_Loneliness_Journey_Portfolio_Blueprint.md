# 34 — Relationships / Loneliness Journey Portfolio Blueprint

**Version:** 0.1 authoring blueprint  
**Status:** Candidate portfolio; not executable content and not approved for users.  
**Input:** `Research/33_Relationships_Loneliness_Goals_and_Methods_Review.md`  
**Stage:** MVP content foundation.

## 1. Portfolio rule

A Journey is organised around a transformation the user wants, not around the name of a method.
Several methods may support one Journey. A method becomes a variant only when the Journey keeps the
same Milestones; when the arc changes materially, it is a different Journey.

## 2. Proposed portfolio

The initial portfolio contains fourteen candidates across all seven goal families. This breadth is
intentional: a Relationships Expert with only social-activity Journeys would misroute users whose
actual need is depth, maintenance, boundaries or clarity.

| Priority | Goal family | Candidate Journey id | Candidate title | Primary bottleneck | Shape |
|---:|---|---|---|---|---|
| 1 | `REDUCE_ISOLATION` | `relationships.connection_rhythm` | Build a Regular Connection Rhythm | `STRUCTURE_GAP` | process |
| 2 | `DEEPEN_CONNECTION` | `relationships.intentional_friendship` | Make One Friendship More Intentional | `QUALITY_RESPONSIVENESS_GAP` | process |
| 3 | `MAINTAIN_EXISTING_RELATIONSHIP` | `relationships.restore_rhythm` | Restore a Connection Rhythm | `RELATIONSHIP_MAINTENANCE_GAP` | process + recurring maintenance |
| 4 | `ASSERTIVENESS_BOUNDARIES` | `relationships.clear_need` | Say What I Need Clearly | `BOUNDARY_CLARITY_GAP` | process |
| 5 | `REDUCE_ISOLATION` | `relationships.reconnect_safe_ties` | Reconnect With People Already in My Life | `STRUCTURE_GAP` or `FOLLOW_THROUGH_GAP` | process |
| 6 | `MEET_NEW_PEOPLE` | `relationships.find_community` | Find My Kind of Community | `OPPORTUNITY_FIT_GAP` | process |
| 7 | `MEET_NEW_PEOPLE` | `relationships.continue_contact` | Turn a First Meeting Into Continued Contact | `FOLLOW_THROUGH_GAP` | process |
| 8 | `DATING_INITIATION` | `relationships.dating_opportunities` | Create Respectful Dating Opportunities | `STRUCTURE_GAP` or `OPPORTUNITY_FIT_GAP` | process |
| 9 | `DATING_INITIATION` | `relationships.express_interest` | Express Interest Without Pressure | `INITIATION_FRICTION` or `OUTCOME_FIXATION` | process |
| 10 | `DEEPEN_CONNECTION` | `relationships.mutual_support` | Build More Mutual Support | `QUALITY_RESPONSIVENESS_GAP` | process |
| 11 | `MAINTAIN_EXISTING_RELATIONSHIP` | `relationships.shared_freshness` | Bring Freshness Back to a Safe Relationship | `RELATIONSHIP_MAINTENANCE_GAP` | process |
| 12 | `ASSERTIVENESS_BOUNDARIES` | `relationships.hold_boundary` | Hold One Boundary Consistently | `BOUNDARY_CLARITY_GAP` | process + situation-triggered practice |
| 13 | `RELATIONSHIP_CLARITY` | `relationships.observe_clearly` | Understand What Is Actually Happening | `OUTCOME_FIXATION` | process |
| 14 | `RELATIONSHIP_CLARITY` | `relationships.name_needs` | Decide What I Need Before I Decide What to Do | `BOUNDARY_CLARITY_GAP` or `OUTCOME_FIXATION` | process |

## 3. First executable vertical: `relationships.connection_rhythm`

This is the recommended first implementation, not because isolation is more important than other
goals, but because the arc is user-controlled, testable and comparatively low-risk.

### Core promise

Help a user create one sustainable source of repeated real-world connection that fits their life.
Do not promise friendship, belonging by a deadline, or a reduction in loneliness.

### Candidate Milestone arc

| Milestone # | Title | Weight | Ordered Step intentions | Cadence | Minutes / Step | Done when |
|---:|---|---:|---|---|---:|---|
| 1 | Define the connection that would help | 2 | describe the desired connection; name what fit would feel like; identify one practical constraint | once | 10–20 | The user can name the kind of regular connection sought and one constraint. |
| 2 | Find repeated contexts that fit | 2 | generate three contexts; check recurrence/access; shortlist one or two | once | 15–30 | At least one realistic repeated context is selected for a real test. |
| 3 | Make the first visit easy enough | 2 | choose date; remove one friction; define a learning-only goal | once | 10–20 | A concrete attendance attempt is prepared without a friendship outcome target. |
| 4 | Test the context | 3 | attend once; notice energy/fit/access; record one observation | weekly as needed | 30–120 | The user attended or produced a specific constraint that justifies a different context. |
| 5 | Create continuity where there is fit | 3 | return or follow up; make one low-pressure contact; choose a repeat rhythm | weekly | 10–120 | One fitting context/contact has a user-owned next occurrence, or the context is intentionally rejected with learning. |

### Candidate variants that preserve the arc

| Variant id | Designed for | What changes | What does not change |
|---|---|---|---|
| `community_context` | Interest or identity-led belonging | Context generation favours recurring groups/classes/communities. | Milestones and completion conditions. |
| `contribution_context` | User gains energy from helping or shared purpose | Context generation favours bounded volunteering/contribution. | Milestones and completion conditions. |
| `peer_support_context` | User wants mutual lived-experience support | Context generation favours legitimate peer-support settings and adds scope checks. | Milestones and completion conditions. |

### Explicit non-fit

Do not recommend this Journey when:

- regular relationships already exist and the central gap is depth;
- the user repeatedly meets fitting people but never follows up;
- severe persistent social fear controls daily life;
- depression-related impairment or a safety signal changes the problem class;
- the desired outcome is to make one particular person respond or return.

## 4. Central-library integration contract

There must be one global Journey repository. Relationships content may live in a domain folder for
authoring and maintainability, but that folder is not an independent runtime registry.

The required shape mirrors Career:

```text
app/src/core/learning/library/
  definitions.ts                 ← the single runtime registry
  career/                        ← domain-owned definitions exported upward
  relationships/                 ← domain-owned definitions exported upward
```

`relationships/index.ts` will export `RELATIONSHIPS_JOURNEYS` and
`RELATIONSHIPS_FAMILIES`. `definitions.ts` will import and spread them into the existing
`JOURNEY_DEFINITIONS` and `GOAL_FAMILIES` arrays. All global lookup, validation, matching, learning
and analytics continue to resolve through those two arrays.

### Invariant tests required when the first Journey is implemented

1. every Relationships Journey export appears by object identity in `JOURNEY_DEFINITIONS`;
2. every Relationships goal family appears in `GOAL_FAMILIES`;
3. every id is globally unique across all domains;
4. `journeyDefinition(id)` resolves every Relationships Journey;
5. `journeyDefinitionsFor(shape, 'relationships')` includes Relationships and generic candidates,
   but never Career candidates;
6. `goalFamilyForDiagnosis` resolves only an exact domain + subtype + bottleneck pair;
7. validation iterates the global registry, so no domain can bypass shared content rules.

## 5. Next authoring sequence

1. Approve the seven goal families and the fourteen-candidate portfolio.
2. Write the Relationships value-id appendix with exact closed values and negative tests.
3. Fully author the first four priority Journeys, not all fourteen at once.
4. Write consultation calibration cases that force correct selection among them.
5. Implement the first vertical through the single global registry.
6. Run clinical/safety review before any real-user exposure.

## 6. Routing and clarification layer

The adaptive question contract and the optional evidence-gathering Journey are specified in:

- `Master_Specs_Original/35_Relationships_Loneliness_Value_Ids.md`
- `Journeys/36_Relationships_Routing_and_Clarification_Journey.md`

The Clarification Journey is offered only when time-based observation can distinguish otherwise
plausible Journeys. It must not hide a library content gap, delay a safety response, or add friction
when the user's goal and bottleneck are already clear.
