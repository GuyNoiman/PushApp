> **Official release:** PushApp Content `v1.1 Content Candidate`  
> Any older version number below is retained as **source lineage only**, not the current release version.

# 23 — Body Image On-Call Coaching

**Version:** 0.10-content  
**Purpose:** define safe, non-clinical moment-of-difficulty support.  
**Rule:** on-call help is for **one immediate behavioral decision**, not therapy, nutrition prescription, exercise programming or crisis care.

## 1. Shared on-call flow

1. **Safety check first**
2. **Identify the moment type**
3. **Use one prepared low-risk comment**
4. **Ask whether it helped enough to choose the next action**
5. If not, one short Expert re-consult
6. Choose **one** next action
7. If the same problem repeats, return to the meta-agent for Journey adaptation

> Do not open a new body-image session every time the user says “this is hard.”

---

# 2. Eating on-call states

## E-OC1 — `ALL_OR_NOTHING_AFTER_DEVIATION`

**User:** “I went off my plan, so today is ruined.”

### Expert read
Possible all-or-nothing pattern.

### First response direction
Separate one event from the rest of the day.

### Recommended move
> Return to the **next ordinary behavior in the user's own chosen approach**.

### Do not
- compensate;
- restrict later;
- prescribe exercise to “undo” eating;
- calculate anything.

### Escalate if
The user reports recurrent binge/loss of control, purging, fasting or excessive exercise used as compensation.

---

## E-OC2 — `COMPENSATION_REQUEST`

**User:** “I ate too much; should I skip the next meal / work it off?”

### Response
PushApp should **not support compensatory restriction or exercise**.

Suggested meta-agent direction:
> “I don’t want to turn one eating event into punishment. Let’s return to the next normal step in the approach you chose.”

### Safety
If compensation is recurrent/compulsive or includes vomiting, laxatives, fasting or excessive exercise → stop ordinary coaching and refer.

---

## E-OC3 — `STRESS_CONTEXT`

**User:** “I’m stressed and I keep wanting to eat.”

### Expert read
Do not decide whether the hunger is “real.”

### Prepared comment
Brief context check:
- physical hunger present / unsure / not especially;
- stress/emotion;
- what is available;
- what usually happens next.

Then ask:
> “What would help you stay aligned with the approach you chose **without turning this into a fight with yourself**?”

Potential framework options:
- preserve a chosen routine;
- change immediate environment;
- use a non-food stress support **if the user also wants one**;
- do nothing extra if eating is appropriate within their own plan.

### Do not
Teach appetite suppression or shame emotional eating.

---

## E-OC4 — `ROUTINE_COLLAPSE`

**User:** “Work blew up and none of my routine happened.”

### Prepared comment
Choose **one** routine point worth protecting next, not a total restart.

### If repeated
Return to Journey adaptation: the routine may be incompatible with the user's schedule.

---

## E-OC5 — `SOCIAL_CONTEXT_PRESSURE`

**User:** “I have a social event and I’m already stressed about food.”

### Prepared comment
Do not create event-specific diet rules.

Ask:
- what does the user want the event to be about?;
- what part of their existing approach is most important to preserve?;
- what flexibility do they want to allow?

### Safety
If the user expresses intense fear of eating, escalating restriction, purging/compensation or avoidance of social life due to food/weight → professional assessment path.

---

# 3. Movement on-call states

## M-OC1 — `START_RESISTANCE`

**User:** “I don’t feel like doing it.”

### Expert read
Check whether:
- activity is still user-chosen;
- start friction is practical;
- frequency is too high.

### Prepared comment
Offer:
- the minimum meaningful version;
- a lower-friction user-preferred alternative;
- reschedule if the timing is the actual problem.

Do not give a motivational speech first.

---

## M-OC2 — `MISSED_SESSION`

**User:** “I missed yesterday, so I’ll do double today.”

### Prepared comment
No compensatory exercise.

Return to:
- chosen schedule;
- safe minimum version;
- friction diagnosis.

If “making up” exercise is tied to eating/weight compensation, evaluate eating-disorder risk.

---

## M-OC3 — `PAIN_OR_CONCERNING_SYMPTOM`

**User:** reports pain/injury, chest discomfort, fainting/near-fainting or unusual severe breathlessness.

### Action
**STOP_NORMAL_COACHING.**

Do not:
- modify form;
- suggest pushing through;
- prescribe rehabilitation;
- decide that symptoms are harmless.

Route to appropriate medical/qualified professional assessment.

---

## M-OC4 — `SELF_CONSCIOUS_MOVEMENT`

**User:** “I want to move, but I’m embarrassed being seen.”

### Prepared comment
Do not diagnose anxiety or force exposure.

Offer user-owned format options:
- private/at-home option;
- low-pressure environment;
- movement with one trusted person;
- another accessible activity.

Goal: preserve movement ownership, not “cure” self-consciousness.

---

# 4. Body-relationship on-call states

## B-OC1 — `COMPARISON_SPIKE`

**User:** “I saw photos / social media and now I feel awful about my body.”

### Prepared comment
Do not reassure appearance.

Move:
1. identify that comparison is active;
2. step away from appearance evaluation for the moment;
3. reconnect to the next valued activity/function.

Example direction:
> “I’m not going to judge whether your body looks good or bad. What did you want to be doing before the comparison took over?”

Environment adjustment is optional and user-owned.

---

## B-OC2 — `BODY_HATE_MOMENT`

**User:** “I hate my body today.”

### Prepared comment
Acknowledge without debating.

Then:
> “What is this feeling trying to stop you from doing today?”

If there is one controllable activity, coach that.

Do not:
- say “you look great”;
- debate whether they should love their body;
- start therapy.

---

## B-OC3 — `PARTICIPATION_BLOCK`

**User:** “I’m not going because of how I look.”

### Prepared comment
Ask what matters about the activity and whether there is a **manageable user-chosen level of participation**.

No forced exposure.

If avoidance is broad/severe or body preoccupation is highly impairing → recommend professional support.

---

# 5. On-call safety overrides

Ordinary on-call coaching stops for:
- self-harm/suicidal thoughts or planning;
- severe restriction;
- recurrent loss-of-control eating with significant distress/secrecy;
- vomiting/laxative/diuretic misuse;
- fasting/excessive exercise as compensation;
- rapid weight loss / marked food-weight-shape preoccupation suggesting possible ED;
- fainting, significant dizziness/palpitations, chest pain, severe/unusual breathlessness;
- acute/worsening injury;
- any other situation requiring medical/dietetic/mental-health judgment.

Technical escalation is owned by engineering; content must clearly output `STOP_NORMAL_COACHING`.

---

# 6. On-call success criterion

On-call support succeeds when:
- the user is safe;
- the moment is de-escalated enough to make **one ordinary next decision**;
- the Journey remains intact unless the evidence says it needs adaptation.

It does **not** succeed by keeping the user chatting.
