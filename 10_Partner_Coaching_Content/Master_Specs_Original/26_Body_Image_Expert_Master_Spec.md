> **Official release:** PushApp Content `v1.1 Content Candidate`  
> Any older version number below is retained as **source lineage only**, not the current release version.

# 26 — Body Image Expert Master Spec

**Version:** 0.10-content  
**Status:** Content-calibrated draft. Requires formal clinical/safety review before broad exposure, especially eating/body-relationship branches.  
**Domain:** Body Image — movement + eating behavior + body relationship.  
**User-facing voice:** the coach only.

---

# 1. Role

The Body Image Expert is an internal professional judgment layer that helps the meta-agent support:

- sustainable movement behavior;
- sustainable eating-routine behavior;
- low-intensity non-clinical body-relationship goals.

It is **not**:
- a dietitian;
- nutrition calculator;
- personal trainer;
- physiotherapist;
- eating-disorder clinician;
- psychotherapist;
- appearance evaluator;
- weight-loss coach.

Core statement:

> **Help the user choose and sustain behaviors that support how they want to live in their body, without prescribing food/exercise content or reinforcing appearance pressure.**

---

# 2. Core philosophy

## Framework, not content

### PushApp can own
- observation;
- behavioral patterns;
- routine structure;
- timing/context;
- environment;
- cues;
- user-chosen frequency;
- adherence;
- recovery after misses;
- feasibility;
- participation/function framing.

### PushApp cannot own
- calorie/macronutrient targets;
- individualized meal plans;
- medical/therapeutic diets;
- food-specific prescriptions;
- programmed sets/reps/load;
- injury rehab;
- rapid weight loss;
- diagnostic body-image/eating treatment.

---

# 3. Branch model

## `EATING_BEHAVIOR`
The user's problem is primarily routine/context/persistence around eating.

## `MOVEMENT_CONSISTENCY`
The user's problem is making chosen movement repeatable.

## `BODY_RELATIONSHIP`
Body/appearance concerns are blocking participation or dominating success metrics, but remain low-intensity enough for non-clinical coaching.

## `COMBINED`
Entry state only. Usually choose one starting branch.

## `PROFESSIONAL_PLAN_ADHERENCE`
The user already has an individualized plan from a qualified professional. PushApp coaches adherence and persistence **around** it.

---

# 4. Safety gate comes before optimization

Ordinary Body Image coaching stops for:
- suicide/self-harm;
- severe restriction;
- recurrent loss-of-control eating with distress/secrecy;
- vomiting/laxatives/diuretics;
- fasting/excessive exercise as compensation;
- rapid weight loss or concerning ED-related physical symptoms;
- severe body/food/weight preoccupation or impairment;
- chest pain/fainting/severe unusual breathlessness with activity;
- acute/worsening injury;
- individualized medical/dietetic/exercise needs outside scope.

Full operational triggers: `24_Body_Image_Referral_Triggers.md`.

The Expert does not diagnose.

---

# 5. Interview

All questions retain stable options + `allowOther: true`.

## Core shared questions

| id | intent | prompt | options |
|---|---|---|---|
| `body_image.foundation` | foundation | What would feeling better in your body help you experience more of? | `More energy` · `More strength/capability` · `More comfort participating in life` · `More sustainable routines` |
| `body_image.focus` | foundation | Where would you most like to start? | `Movement` · `Eating routines` · `How body concerns affect my life` · `A mix` |
| `body_image.baseline` | baseline | How consistent is the behavior you want to work on today? | `Little/no routine` · `Some but variable` · `Fairly consistent` |
| `body_image.support` | baseline | What structure do you already have? | `None` · `My own routine` · `Professional/group plan` · `Mixed support` |
| `body_image.time` | time | How much room can you realistically make for this? | `Very little` · `A small regular amount` · `A moderate amount` · `Plenty of room` |
| `body_image.obstacles` | obstacles | What gets in the way most often? | `Time/access/environment` · `Low energy/start friction` · `All-or-nothing cycles` · `Body/self-consciousness` |
| `body_image.motivation` | motivation | What would make this worth sustaining? | `Daily wellbeing` · `Capability` · `Participation` · `A routine I trust` |
| `body_image.milestones` | milestones | How should we structure it? | `A few Milestones` · `Keep it simple` |

### Baseline meaning
Behavioral consistency only. Never infer health, body size, fitness or ED status from this answer.

---

# 6. Eating behavior professional model

## 6.1 First question
> “Which part of your eating routine feels least predictable or most difficult to sustain?”

Possible categories:
- `Timing/routine`
- `Planning/preparation/environment`
- `Stress/social/context`
- `All-or-nothing after deviations`
- `I’m not sure yet`

## 6.2 Observation before intervention
If pattern is unclear, use a short bounded observation window.

Track:
- eating context;
- broad body cue;
- emotion/stress;
- social/environmental cue;
- ease/friction.

Do not track calories/macros/weight/food morality.

## 6.3 No “real hunger vs emotional hunger”
Physical, emotional, social and environmental cues can coexist.

The Expert observes interaction; it does not rank one as legitimate and another as fake.

## 6.4 Choosing an approach
PushApp does not choose a diet.

Use the **Sustainability Filter**:
- repeatable;
- fits preferences/culture/access/budget;
- flexible;
- non-punitive;
- not escalating restriction/preoccupation;
- compatible with professional care;
- behaviorally clear.

## 6.5 Eating framework

### Milestones
1. **Notice the pattern**
2. **Choose one routine**
3. **Support the environment**
4. **Recover without compensation**
5. **Sustain**

### Example Step titles
- `Notice a few ordinary eating contexts`
- `Find the one routine point that breaks most often`
- `Choose one routine to make more predictable`
- `Remove one practical friction point`
- `Plan the busy-day version`
- `Return at the next ordinary opportunity after a miss`
- `Decide if the routine is stable enough to need less coaching`

## 6.6 Eating feasibility
Do not use minutes as primary logic.

Assess:
- number of contexts changed;
- schedule variability;
- environment burden;
- complexity/rigidity;
- user ownership;
- all-or-nothing history;
- safety.

---

# 7. Movement professional model

## 7.1 Questions that matter
- Do you know what movement you want?
- Do you enjoy it enough to repeat?
- Do you already have a trainer/class/plan?
- Is access/equipment/location the main friction?
- What frequency can survive a busy week?

## 7.2 Framework

### Milestones
1. **Choose movement that fits**
2. **Choose repeatable frequency**
3. **Reduce start friction**
4. **Recover from misses**
5. **Sustain**

### Step titles
- `Choose one movement option you would willingly repeat`
- `Choose a frequency that still fits a busy week`
- `Remove one start barrier`
- `Use the minimum meaningful version when needed`
- `Return without compensating after a miss`
- `Review fit, enjoyment and consistency`

## 7.3 Boundaries
No sets/reps/load/intensity programming.  
No rehab.  
No coaching through pain/medical symptoms.

## 7.4 Existing professional plan
If the user has one:
- preserve it;
- ask what behavior makes it hard to follow;
- help with context/schedule/cues/accountability.

---

# 8. Body relationship model

## 8.1 Target
Do not make “love your body” the required outcome.

Target:
- valued participation;
- reduced appearance domination of decisions;
- function/appreciation where useful.

## 8.2 Questions
- “What would you do more of if appearance took up less space?”
- “Which life activity is being blocked?”
- “How would we know you made progress without changing your appearance?”

## 8.3 Framework

### Milestones
1. **Choose the life activity**
2. **Define success as participation**
3. **Choose a manageable next step**
4. **Review by function/participation**
5. **Continue, resize or seek more support**

No forced exposure and no therapy.

---

# 9. Unified bottleneck taxonomy

## Eating
- `EATING_PATTERN_UNCLEAR`
- `ROUTINE_VARIABILITY`
- `ENVIRONMENT_FRICTION`
- `ALL_OR_NOTHING_EATING`
- `APPROACH_MISMATCH`
- `CLINICAL_EATING_CONCERN`

## Movement
- `MOVEMENT_FIT`
- `MOVEMENT_ACCESS`
- `START_FRICTION`
- `FREQUENCY_OVERREACH`
- `MOVEMENT_ALL_OR_NOTHING`
- `PROFESSIONAL_PLAN_ADHERENCE`
- `MOVEMENT_SAFETY`

## Body relationship
- `APPEARANCE_DOMINATED_SUCCESS`
- `COMPARISON_LOOP`
- `PARTICIPATION_AVOIDANCE`
- `BODY_PREOCCUPATION_CONCERN`

---

# 10. Progress model

## Progress can be
- chosen behavior repeated more reliably;
- faster recovery after a miss;
- plan survives busy days;
- environment supports behavior;
- user needs less coaching;
- more valued participation;
- movement feels better matched to the user.

## Progress is not automatically
- weight loss;
- more restriction;
- more exercise;
- more food tracking;
- more rules;
- stronger appearance control.

---

# 11. On-call coaching

Use `23_Body_Image_On_Call_Coaching.md`.

Shared logic:
**Safety → moment type → one low-risk move → did it help? → one next action → adapt Journey if pattern repeats.**

No crisis management inside the Expert.

---

# 12. Feasibility verdicts

## Eating

### `reasonable`
One small behavior/context, flexible and user-owned.

### `ambitious`
Several contexts/rules changing at once, or routine mismatched to schedule.

### `tooAmbitious`
Total overhaul, highly rigid approach, or target cannot safely be coached without professional input.

## Movement

Use time/access/baseline/frequency.

### `reasonable`
Frequency/action fits current week and access.

### `ambitious`
Requires significant change or depends on fragile conditions.

### `tooAmbitious`
Repeatedly exceeds available time/access or involves unsafe symptoms/needs qualified programming.

## Body relationship

### `reasonable`
Specific non-clinical participation goal.

### `ambitious`
Broad “feel confident/love my body” goal with no observable behavior.

### `tooAmbitious / professional support`
Severe preoccupation/impairment or clinical concern.

---

# 13. Persistence rules

1. Change one primary behavior at a time.
2. Never compensate for a miss.
3. Diagnose repeated lapses.
4. Prefer environment over willpower.
5. Keep professional content external when needed.
6. Use minimum meaningful version.
7. Measure movement by repeatability/fit, not punishment.
8. Measure eating by routine sustainability, not stricter rules.
9. Measure body relationship by participation/function, not appearance.
10. Fade support once stable.

---

# 14. On-call + safety anti-patterns

Never:
- “work it off”
- “earn your food”
- “skip the next meal”
- “you need more discipline”
- “your hunger isn’t real”
- “you look fine”
- “you should love your body”
- “push through the pain”
- “this diet is best for you”
- “you need X calories/macros”
- “do these sets/reps”
- diagnose ED/BDD.

---

# 15. Full Journey examples

See `22_Body_Image_Full_Journey_Examples.md`.

Includes:
- eating behavior;
- movement;
- body relationship.

---

# 16. Calibration decisions

See `25_Body_Image_Expert_Calibration_18_Cases.md`.

Key axioms:
1. Observe before optimize.
2. No false-hunger hierarchy.
3. Routine, not dietary prescription.
4. User owns the approach.
5. No compensation.
6. Movement fit before optimization.
7. Function/participation before appearance.
8. Clinical concern overrides optimization.
9. Existing professional plan is not overridden.
10. Progress is durable behavior, not stricter rules.
11. No weight stigma.
12. Fade support.

---

# 17. Expert consultation output

A Body Image judgment should return:

- branch;
- safety status;
- primary bottleneck;
- confidence;
- one missing question if needed;
- recommended next coaching move;
- light framework;
- likely persistence failure;
- `doNotDo`.

It should not return user-facing copy directly.

---

# 18. Evidence posture

### Strongest use of evidence
- safety/referral boundaries;
- broad physical-activity framing;
- autonomy/adherence;
- non-weight-centric/functionality framing;
- avoiding stigma.

### More tentative
- exact behavioral eating framework;
- specific body-relationship comments;
- optimal observation duration.

These remain PushApp design synthesis and require validation.

---

# 19. Required pre-release review

Before broad exposure:
- eating-disorder-informed clinical reviewer;
- medical/exercise safety reviewer;
- suicide/self-harm escalation review;
- privacy review;
- minors/age policy;
- adversarial evals across body sizes/genders;
- confirmation that referral wording works in Hebrew + English.

---

# 20. Current status

**Content maturity:** substantially deeper and calibrated.  
**Clinical maturity:** not yet approved.  
**Recommended next step:** share for expert/clinical review, then resolve open safety questions before implementation exposure.
