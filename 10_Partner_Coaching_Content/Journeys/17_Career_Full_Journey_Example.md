> **Official release:** PushApp Content `v1.1 Content Candidate`  
> Any older version number below is retained as **source lineage only**, not the current release version.

# Career Expert — Full Journey Example

**Version:** 0.8-content  
**Purpose:** end-to-end content test for the Career Expert.  
**Why this example exists:** expose generic or weak expert logic by forcing the content through one realistic user from intake to first actions.

---

## 1. Persona

**Name:** Dana (fictional)  
**Age:** 29  
**Current situation:** 4 years in customer support / customer operations at a software company.  
**User statement:**

> "אני מרגישה שאני תקועה. אני לא רוצה להישאר בתמיכה עוד שנים, אבל אין לי מושג מה הדבר הבא. אני רואה אנשים עוברים ל-product, customer success, operations וכל מיני דברים ואני כבר לא יודעת מה באמת מתאים לי."

**Constraints:**
- works full time;
- can realistically give 2 hours/week to career work;
- does not want to start a long degree before knowing a direction is worth it;
- financially cannot quit before having a next option.

---

## 2. What the meta-agent should understand before consulting Career Expert

This is not yet a job-search problem.

Dana is not saying:
> "I know the role I want; help me get hired."

She is saying:
> "I have several plausible directions and insufficient evidence to choose among them."

Likely domain: `career`  
Likely subtype: `FIND_DIRECTION` with possible later `CAREER_TRANSITION`.

**Important restraint:** do not tell her which career fits based on one paragraph and do not send her to rewrite her CV yet.

---

## 3. Interview answers

### `career.foundation`
**Prompt:** What are you trying to change about your work life?  
**Answer:** `Find direction`

### `career.baseline`
**Prompt:** Where are you today?  
**Answer:** `I have some direction and have started exploring or preparing`

Interpretation: not novice to work/career; novice-to-middle in **target clarity**.

### `career.proof`
**Prompt:** What do you already have that supports the direction you want?  
**Answer:** `Some relevant skills/experience`

Dana has customer communication, troubleshooting, internal coordination and product familiarity, but has not yet mapped these to target roles.

### `career.time`
**Answer:** `1–3 hours`

### `career.obstacles`
**Answer:** `I don't know what direction to choose`

### `career.motivation`
**Answer:** `Growth and mastery`

Free-text clarification kept on device:
> "אני רוצה להרגיש שאני מתפתחת ולומדת, לא רק סוגרת עוד טיקט."

### `career.milestones`
**Answer:** `Build it through a few clear Milestones`

---

## 4. Expert judgment

### Selected subtype
`FIND_DIRECTION`

### Primary bottleneck
**Direction/evidence gap**, not motivation and not application volume.

### Secondary considerations
- she has some transferable experience, so exploration should begin from adjacent plausible directions rather than a total reset;
- she has limited weekly time, so exploration must be cheap and targeted;
- she cannot afford a high-cost commitment before evidence, so training/degree decisions should come later;
- current labour-market facts may matter once she narrows directions, but they are not required to choose the first exploration actions.

### What the Expert should *not* recommend
- “Take a UX/Product course” before deciding what she wants to test;
- a personality test as an answer;
- “apply to 20 jobs and see what happens”;
- “follow your passion”;
- quitting to create urgency.

---

## 5. User-defined success for this Journey

Not:
> "Find my perfect career."

Better:
> **"Within the next few weeks, narrow my options to one or two directions that I understand from real evidence well enough to choose a next move."**

This makes exploration itself a legitimate outcome.

---

## 6. Journey structure

### Dream
**Inferred motivation:** Build a work life where I keep growing and feel that my abilities are being used.

The Coach owns the internal Dream representation; Dana owns whether this is the area she wants to focus on now.

### Journey
**Title:** Choose my next career direction

### Milestone 1 — Clarify what matters in work
**Purpose:** define decision criteria before comparing job titles.

Possible evidence categories:
- learning/growth;
- type of problems;
- interaction with people;
- autonomy/structure;
- stability/risk;
- working conditions;
- compensation constraints;
- realistic transition cost.

### Milestone 2 — Generate a few plausible directions
**Purpose:** create hypotheses, not a list of every career in existence.

For Dana, plausible hypotheses might emerge from her own experience and interests, such as product operations, customer success, product-adjacent operations, or another direction she identifies. PushApp does **not** decide the role for her.

### Milestone 3 — Gather real-world evidence
**Purpose:** replace imagined fit with actual information.

### Milestone 4 — Test one direction
**Purpose:** create a low-cost experience or proof that teaches Dana something about fit and capability.

### Milestone 5 — Choose the next path and act
**Purpose:** decide whether to deepen, bridge a gap, or test another hypothesis.

---

## 7. First four Steps

The first Steps deliberately avoid “career-content prescription”. They are actions that improve the quality of Dana's own decision.

### Step 1 — Write your top three work criteria
**Estimated time:** 25 minutes  
**Prompt:** Choose the three things your next work chapter needs to give you more of. Use your actual experience — not what sounds impressive.

**Why this Step:** prevents comparing roles without decision criteria.

---

### Step 2 — Choose three directions worth testing
**Estimated time:** 30 minutes  
**Prompt:** Pick up to three directions that currently look plausible enough to investigate. They are hypotheses, not commitments.

**Why this Step:** Planned Happenstance / exploration logic — action under uncertainty instead of waiting for certainty.

---

### Step 3 — Compare real roles against your criteria
**Estimated time:** 35 minutes  
**Prompt:** Look at a small sample of real role descriptions from one direction. Record what attracts you, what concerns you, and what you still cannot tell from the descriptions.

**External-data note:** use current role descriptions; do not rely on the Expert's static memory of what a role “usually” is.

**Why this Step:** person + current opportunity/context.

---

### Step 4 — Have one reality-check conversation
**Estimated time:** 30 minutes  
**Prompt:** Speak with one person who knows one of the directions you are testing. Go in with 2–3 questions about what the work is actually like and what surprised them about the role.

**Why this Step:** gather experiential evidence and create opportunity exposure.

---

## 8. Cadence

Dana has ~2 hours/week.

Recommended rhythm:
- **2 career blocks/week**, usually 25–45 minutes each;
- no daily career homework;
- one longer real-world exploration action can replace the second block that week.

Example:
- Tuesday evening: 30 minutes;
- Saturday morning: 45–60 minutes.

The Coach should ask Dana to choose the actual timing; this is an example framework, not a prescribed schedule.

---

## 9. Persistence logic

### If Dana completes Steps but still feels uncertain
Do not label the Journey a failure. Ask:
> "What did you learn that makes one direction more or less plausible now?"

If no evidence changed, the exploration action may have been too abstract. Move toward a richer real-world test.

### If she keeps researching but never tests anything
Diagnose **analysis without exposure**.

Coach move:
> "You have enough information to choose one direction to test. We don't need to decide your career yet — just which hypothesis gets the next experiment."

### If she says “I’m not qualified for any of these”
Do not reassure automatically.

Differentiate:
- actual capability gap;
- proof gap;
- low self-efficacy without evidence;
- unrealistic target.

Then act on the correct one.

### If she wants to buy a long course immediately
Ask what uncertainty the course is supposed to resolve. If fit is still unknown, prefer a cheaper test first.

---

## 10. What happens after the first four Steps

### Possible outcome A — one direction clearly becomes more attractive
Move to **Test one direction**, then identify capability/proof gaps.

### Possible outcome B — two directions remain plausible
Design one cheap test for each, then compare evidence using Dana's criteria.

### Possible outcome C — all tested directions look wrong
That is useful evidence. Generate a new hypothesis set rather than forcing one of the old options.

### Possible outcome D — current job can be reshaped enough to meet her need for growth
The Expert may reclassify toward `GROW_CURRENT_ROLE` rather than assuming she must leave.

---

## 11. Feasibility

**Verdict:** `reasonable`

Suggested note:
> "The goal is realistic if we define success as learning enough to choose a stronger next direction, rather than expecting complete career certainty immediately. Two focused hours a week are enough for small exploration actions and real-world tests."

This assessment is about the **Journey we actually built**, not about guaranteeing a career transition.

---

## 12. Risks / cautions

### `career_overanalysis` (proposed content concept)
**Message:** “More research is not always more clarity. At some point, a small real-world test will teach you more than another hour of comparing options.”

### `career_high_cost_commitment_too_early`
**Message:** “Before committing significant time or money, it may help to gather a little more evidence that this direction fits what you want.”

### `career_external_constraint`
**Message:** “Some career options depend on constraints outside motivation alone. Let’s keep those realities visible while choosing the next step.”

These may require future additions to the technical `RiskSignal` union; they are content concepts here, not an instruction to change code.

---

## 13. Why this Journey is not generic

A generic Career Journey would say:
> “Clarify your goals → improve your CV → network → apply.”

This Journey does something different:
- identifies **direction uncertainty** as the current bottleneck;
- delays job-search behavior because it would be premature;
- uses real-world evidence rather than introspection alone;
- respects financial/time constraints;
- treats exploration as progress;
- postpones expensive training until there is evidence it is relevant;
- creates explicit transition conditions for what the Expert does next.

That is the standard future Journey examples should meet.

