# Body Image / Eating — Daily Consistency & Progression Mechanism

**Release:** PushApp Content `v1.1 Content Candidate`  
**Status:** Behavioral content mechanism; not a nutrition prescription.  
**Purpose:** Make an eating-behavior Journey concrete enough to sustain day-to-day without calories, macros, food rules or diet design.

---

# 1. What the mechanism is for

The Eating branch already used:

**Observation → Sustainability Filter → routine/environment → recovery → sustain**

What was missing was a repeatable answer to:

> “What does the user actually try to keep today, and how does that target progress over time?”

This mechanism fills that gap.

It is an **adherence mechanism around a user-chosen routine**, not a measure of dietary quality.

---

# 2. Safety precondition

Do not start or escalate daily adherence tracking when there are active signals of:

- purging or compensatory behavior;
- severe/escalating restriction;
- recurrent loss-of-control eating that needs assessment;
- rapid/unexplained weight loss or concerning medical symptoms;
- eating/body tracking that is becoming compulsive or significantly distressing;
- a medical/dietetic situation requiring individualized professional content.

In those cases, use the Body Image safety/referral flow instead of optimizing adherence.

---

# 3. Stage A — Observe before setting a target

If the pattern is not already clear, run a short, bounded observation period.

Observe only:
- broad eating context;
- rough timing/context;
- body cue if noticed;
- emotion/stress;
- social/environmental cue;
- practical friction.

Do not record:
- calories;
- macros;
- body weight;
- “good/bad” food scores;
- compensatory targets.

The observation period ends when there is enough information to choose **one leverage point**. It is not extended just to collect more data.

---

# 4. Stage B — Choose ONE daily behavior anchor

Use the existing **Sustainability Filter**.

The selected anchor must be:
- chosen by the user;
- behaviorally clear;
- flexible;
- compatible with their own eating approach or professional plan;
- possible on an ordinary busy day;
- non-punitive;
- not a restriction/compensation rule.

Examples:
- `Protect one eating opportunity I already chose on workdays`
- `Sit down for one selected eating occasion instead of eating while working`
- `Prepare the environment for the eating routine I chose before the busy part of the day`
- `Use the busy-day version of my existing eating routine`
- `Return to my normal chosen routine at the next ordinary opportunity after a miss`

PushApp does **not** choose what the user eats.

---

# 5. Stage C — Define the target in four fields

The recurring Step has four content fields:

## `behavior`
What exactly is the routine action?

## `context`
When/where does it apply?

## `plannedFrequency`
On how many relevant days/occasions does the user want to protect it this review window?

## `busyDayVersion`
What is the smallest flexible version that still counts as preserving the routine when the day becomes difficult?

Example:

```text
behavior: Protect my chosen mid-workday eating opportunity
context: Workdays
plannedFrequency: 4 workdays this week
busyDayVersion: Keep the eating opportunity even if timing/location shifts
```

The frequency is a **user-owned behavioral commitment**, not a nutrition standard.

---

# 6. Stage D — Daily check-in

On a relevant day, ask only:

> “How did the routine go today?”

Closed options:
- `Kept it`
- `Partly`
- `Didn’t happen`

Optional friction follow-up only when useful:
- `Schedule/timing`
- `Environment/access`
- `Stress/emotion`
- `Social context`
- `The target felt too rigid`
- `Other`

No score, moral grade or “perfect day.”

Do not ask the user to compensate tomorrow.

---

# 7. Stage E — Weekly review

**Product heuristic:** review roughly every 7 days because most eating routines encounter both ordinary and busy-day variation across a week.

This is a product cadence, **not a clinical nutrition standard**.

At review, decide between only three outcomes:

## `STABILIZE`
Keep the same target.

Use when:
- behavior is working but still effortful;
- one recurring friction point remains;
- the user wants more time before expanding.

## `ADAPT`
Keep the same overall behavior but change the context/environment/busy-day version.

Use when:
- misses cluster around the same friction;
- target was unrealistic;
- schedule changed;
- all-or-nothing thinking is appearing.

## `PROGRESS`
Expand slightly.

Only when:
- target feels mostly sustainable;
- the user is not relying on compensation or rigid control;
- the routine survives at least some imperfect/busy days;
- the user actually wants the expansion.

---

# 8. Progression rule

When progressing, change **one dimension only**:

### Option A — frequency
Increase the number of planned days/occasions slightly.

**OR**

### Option B — context
Keep the same frequency and apply the same routine to one additional relevant context.

Do **not** increase frequency and add a second behavior at the same time.

Do not automatically progress to `7/7`.

The endpoint is:
> **the level the user wants and can sustain**, not maximum adherence.

---

# 9. Example progression — Maya

Initial observation finds the weak point is the mid-workday eating opportunity.

## Review window 1
Maya chooses:
`4 workdays/week`

Daily outcomes:
- Mon — kept
- Tue — kept
- Wed — didn’t happen; late meetings
- Thu — kept

Result:
**3/4, with one clear schedule friction.**

Coach decision:
`ADAPT`, not `PROGRESS`.

Change:
Improve the busy-day version around late meetings.

## Review window 2
Maya keeps the same target:
`4 workdays/week`

Outcome:
The routine now feels workable and survives a busy day.

Coach asks:
> “Do you want to keep this exactly where it is for another week, or would adding one more workday make it more useful without making it rigid?”

If she chooses to keep 4:
→ **STABILIZE is a valid success.**

If she chooses 5:
→ increase **frequency only**.

## Later
If the routine is stable and already serves the user's goal:
→ fade coaching.

Do not invent a second food-related target just to keep engagement.

---

# 10. What happens after a miss

Default:

> **Return at the next ordinary opportunity.**

Do not:
- skip a later eating occasion to “make up for it”;
- add exercise as compensation;
- tighten the rule;
- restart the whole Journey;
- call the day ruined.

If compensation/restriction emerges:
→ safety/referral logic, not adherence optimization.

---

# 11. When daily tracking itself is the problem

If the user says the check-ins are:
- making them preoccupied;
- increasing anxiety/guilt;
- creating compulsive checking;
- turning eating into a score;

the Expert should reduce/stop daily tracking and reassess.

A measurement tool that worsens rigidity is not a successful intervention.

---

# 12. Evidence / design basis

The mechanism uses established behavior-change components such as:
- goal setting;
- action planning;
- feedback/monitoring;
- review and adaptation.

NICE behavior-change guidance supports use of goals/planning and feedback/monitoring in individual behavior-change interventions.

Evidence around dietary self-monitoring is heterogeneous and much of it comes from weight-management contexts, so PushApp does **not** infer that calorie/food logging is required. The product intentionally monitors the chosen **behavioral routine only**.

The specific cadence and progression rule above are **PushApp product heuristics**, not clinical dietary prescriptions.

Sources:
- NICE PH49 — Behaviour change: individual approaches  
  https://www.nice.org.uk/guidance/ph49
- NICE PH49 recommendations  
  https://www.nice.org.uk/guidance/ph49/chapter/recommendations
- Burke et al. — Self-monitoring in weight loss: systematic review  
  https://pubmed.ncbi.nlm.nih.gov/21185970/
- Raber et al. — Dietary self-monitoring systematic review  
  https://pubmed.ncbi.nlm.nih.gov/34412727/
