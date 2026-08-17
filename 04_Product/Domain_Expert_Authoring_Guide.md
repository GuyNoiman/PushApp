# Domain-Expert Authoring Guide — onboarding for the characterization (אפיון) owner

> **▶ Direction update 2026-08-05 (founder).** Two refinements now govern this guide and are baked
> into every section below:
> 1. **Two-layer model** — a **meta-agent (סוכן-על)** owns *user communication*; the **experts** own
>    *professional knowledge*. See §0.1.
> 2. **Framework-not-content philosophy** — experts ask great QUESTIONS, build a light adapted
>    FRAMEWORK, and push to ACTION + persistence; they do **NOT** prescribe detailed professional
>    content (training plans, meal plans, clinical treatment). See §0.2 — it is the most important
>    idea in this guide.
> 3. **Revised domain set** — the four domains are now **Addiction · Relationships/Loneliness · Body
>    image (nutrition+fitness) · Career**. The code still uses the old first-cut names
>    (`recovery/self_confidence/nutrition/sport`) pending realignment; the contract is unchanged.
>    See §0.3.

> **Who this is for.** The new collaborator who will do the full **characterization (אפיון)** of
> PushApp's professional **domain-expert agents** — authoring their interview questions, the right
> initial Journeys, Milestone arcs, light Step framing, feasibility logic and risk signals. You should
> **not** start from zero: this doc gives you the product context **and** the exact technical contract
> so you can be productive on day one.
>
> **Status of the content you'll author.** Every arc/step/question you write is **Open Question**
> until it graduates through product-guardian (terminology/philosophy) and — for the sensitive
> domains — a clinical/safety review, then lands in `06_Decisions/Decision_Log.md`. Authoring is
> allowed and encouraged; **shipping to real users is gated** (see §4 and §6).
>
> **Terminology is canonical and non-negotiable:** **Dream · Journey · Milestone · Step · Buddy ·
> Ally · Support Circle · Grace Token · XP · Coins.** Never "Phase / Program / Plan / Challenge".
> Source of truth: `09_Product_Philosophy/Product_Terminology.md`.

---

## 0. Read this first — the two-layer model, the core philosophy, the four domains

### 0.1 Two layers: the meta-agent talks, the experts know

PushApp's coach is **two layers with a clean split of responsibility**. Hold both in your head — you
author for the **expert** layer, but you must know what the meta-agent does so you don't duplicate it.

- **Meta-agent (סוכן-על) — owns USER COMMUNICATION.** It is the single voice the user hears. Its
  personality:
  - **professional, accepting, non-judgmental** — the user should always feel safe and unjudged;
  - **pleasant but to-the-point** — warm, not chatty; it is here to *build a work plan*, not to fill
    silence;
  - **explicitly NOT a psychologist / therapist** — it does not do therapy, interpretation, or
    emotional processing. It orients the whole conversation toward **building a work plan and getting
    to action.**
  - Its two jobs: **(a)** from the very first free-text goal, run **one "understanding" call** that
    returns a structured list of the user's goals — each `{ title, kind: 'recurring' | 'process',
    domain }` — from which it decides **which professional expert(s) to activate** and **which flow
    each goal takes** (see §1.1, updated 2026-08-06); and **(b)** choose the communication **TONE**,
    which **adapts as the app learns the user over time**.
  - **OPEN QUESTION (to be designed):** *how* and *when* the meta-agent switches tone, and *how many*
    tones exist. Do not assume an answer — flag it, don't author it.
- **Experts — own PROFESSIONAL KNOWLEDGE.** Each expert supplies the knowledge needed to *build the
  user's framework*: the **right initial questions**, a read of the user's **zero-state** (baseline),
  and how the app **profiles the user's character** → from which it decides **what is relevant for
  them**. The expert does not "speak" to the user in its own voice — it feeds the meta-agent the
  questions, structure and reality-checks. (In today's code the interview text lives in the expert's
  config; the meta-agent/expert split is the target the wiring is moving toward — see §6.)

### 0.2 THE CORE PHILOSOPHY — framework, not content (most important)

> **PushApp is NOT a nutritionist, a sports coach, a matchmaker, or a therapist.**
> The experts **ask the right questions, build an adapted work FRAMEWORK, and push the user to
> ACTION + persistence — WITHOUT prescribing the detailed professional content.**

You are authoring **great questions + a light framework + persistence hooks** — **not** deep
clinical/training protocols, not knowledge dumps, not prescriptions. This is the whole product: we
help people *become who they choose to be* by getting them to **act and persist**, and we leave the
detailed professional "how" to them (and to real professionals).

**The founder's SPORT example — the model of the intended flow (author to THIS shape):**

> Ask if they do sport today; why it matters to them; what they want to achieve; what **they** would
> count as success; do they know which sport they want; do they want to try a specific type; offer to
> **build a plan OR brainstorm together** which fields suit them and are near their home; check if
> they have the needed equipment; ask if they already have a group / training plan; ask what
> **frequency** they want to sustain — then simply **ensure they persist**, WITHOUT going into the
> details of the training plan.

Notice what that flow does and does *not* do: it **elicits, adapts, commits, and sustains** — it
never hands over sets/reps, macros, a clinical protocol, or a diagnosis. Author every domain to this
standard. Practically, when you fill the template in §3.8: pour your effort into the **interview
questions** and the **persistence framing**; keep Step titles **light and non-directive** (a prompt to
act, not an instruction sheet). *This framework-not-content stance also materially lowers our
clinical/liability risk* — but it does **not** remove the safety gate on the sensitive domains (§4/§6).

### 0.3 The four domains (revised 2026-08-05) — and how they map to the code

The domain set is now these four (Hebrew names are the founder's; repo copy is English):

| # | Domain (EN) | Domain (HE) | Scope notes |
|---|-------------|-------------|-------------|
| 1 | **Addiction** | **גמילה** | drugs, parties, casual flings (סטוצים), smoking, etc. — behavioural + substance |
| 2 | **Relationships / Loneliness** | **זוגיות / בדידות** | connection, dating, sustaining relationships, reducing isolation |
| 3 | **Body image** | **דימוי גוף** | **one expert that absorbs BOTH nutrition AND fitness** |
| 4 | **Career** | **קריירה** | direction, skills, job search, growth at work |

**Code reality (mapping).** The code today still ships the earlier first-cut experts —
`recovery` · `self_confidence` · `nutrition` · `sport` — in `experts/registry.ts`. They are **to be
realigned** to the four above. The realignment is not a rewrite of the seam: the `DomainExpert`
interface, all types, the closed-options + "Other" model, `expertKit`, the tests and the registry
wiring are **all unchanged** — only the *domain identities and their content* change. A reasonable
first mapping (confirm with the founder before renaming ids):

| New domain | Nearest existing code expert | Action |
|------------|------------------------------|--------|
| Addiction | `recovery` | rename/realign id + content |
| Body image | `nutrition` **+** `sport` | **merge two experts into one** |
| Relationships / Loneliness | (none) | new expert (nearest tone: `self_confidence`) |
| Career | (none) | new expert |

Until the ids are formally renamed in `registry.ts` (a change to coordinate — see §2.4), you may
**author against the new four in your working template** while the code still carries the old ids.
Everything else in this guide (the exact interface, the recipe, testing, privacy) applies verbatim.

---

## 1. Context — what PushApp is now, and where experts fit

**PushApp is an AI adaptive coach** (Decision Log **D23**, 2026-08-01). The mission is unchanged:
*help people become who they choose to be* — closing the gap between intention and action. Optimize
for **real-life transformation, never time-in-app** (growth before engagement).

The product has three layers you need to hold in your head:

1. **A domain-agnostic engine + closed loop (built, do not touch).** A deterministic **Planner**
   turns a goal into a **Journey** of **Milestones → Steps**, lays the Steps across the calendar,
   tracks behaviour, and **adaptively re-plans** (reschedule / resize / refrequency / add / remove).
   Same input → same output; no LLM, no randomness. This is finished and stable.
2. **The pluggable `DomainExpert` seam (where you work).** The Planner is deliberately
   *domain-ignorant*. Everything field-specific — the Milestone arc, the Step library, the interview,
   the feasibility check, the risk signals — is injected through **one interface**, `DomainExpert`.
   Adding or deepening an expert never touches the Planner.
3. **The conversational coach (in progress).** The **meta-agent (סוכן-על)** talks to the user (§0.1),
   and the **domain expert owns the professional interview content**. See the conversation model below.

### 1.1 The conversation model (the important mental model)

> **▶ Flow update 2026-08-06 (shipped).** The meta-agent triage is now **understanding-based, not a
> single-domain classify.** The opening asks for the goal in **free text**; the meta-agent makes **one
> "understanding" call** returning a structured list of goals, each `{ title, kind: 'recurring' |
> 'process', domain }`. This changed *which* flow runs and *how many* goals are handled at once — but
> **nothing in the expert contract (§2) changed.** The two author take-aways are in §1.1a below.

- The **meta-agent (סוכן-על)** opens the conversation with a **free-text** ask for the goal, holds the
  single user-facing voice, and runs **one "understanding" call** that returns a structured list of
  goals — each `{ title, kind: 'recurring' | 'process', domain }`. From that it figures out **which
  expert(s) to activate** (the `domain` on each goal) and **which flow each goal runs** (its `kind`).
  It also owns the communication **tone** (which adapts over time — OPEN QUESTION, §0.1).
- **Multi-goal detection lives ABOVE the expert layer — experts don't handle it.** If the
  understanding call finds **several** goals, the coach reflects them back and asks the user to
  **FOCUS on one first**, labelling each by kind ("a simple weekly habit" vs "a step-by-step plan").
  The deferred goals are **stored on-device** and built next, one at a time. Your expert only ever
  sees the single focused goal it is asked to build — you never write multi-goal logic.
- **The goal's KIND drives the flow through YOUR question set:**
  - a **`recurring`** goal (a fixed weekly action — e.g. "protein daily") takes the **LIGHTER** path:
    the staging/`milestones` question is **skipped** (a fixed repeated action has no build-up), and the
    rest of your questions run.
  - a **`process`** goal (a step-by-step build-up — e.g. "run a 10K") takes the **FULL staged
    interview**, including the `milestones` question.
  - So **the same `interviewQuestions` array serves both paths** — the recurring path simply omits the
    question you tag `intent: 'milestones'`. Author accordingly (see §1.1a and §3.1).
- The old opening **closed process-type question** is now only a **FALLBACK** — used when the
  understanding call yields no usable goal.
- Once an expert is chosen, **the expert owns its interview questions + framework**. Each interview
  question offers a set of common **CLOSED answer-options** *plus* an always-present **"Other"
  free-text escape** (`allowOther: true`). The meta-agent renders these to the user in its own voice;
  the expert supplies the professional substance.
- **Why closed options + an "Other" escape?** Structured answers are stable categories that are
  **cheap and fast to analyse in aggregate** (a future "80% completed this and found it useful"
  recommendation layer groups answers by `intent`). Free text is the fallback for the user who needs
  their own words — but it is **on-device-only** and never feeds aggregate analytics (see §4, privacy
  G1). So: **prefer closed options; keep them as durable categories; always leave the "Other" door
  open.**

### 1.1a What the 2026-08-06 flow change means for YOU (two take-aways)

1. **Your `interviewQuestions` are consumed by BOTH paths — the recurring (lighter) one and the
   process (full) one.** Two authoring consequences:
   - **Tag the staging/milestones question with `intent: 'milestones'`.** That is the single question
     the recurring path drops. Everything hinges on the tag — if you mislabel it, the recurring path
     will skip the wrong question.
   - **Keep every *other* question meaningful for a simple recurring action, too.** Don't write
     foundation/baseline/time/obstacles/motivation questions that only make sense for a big staged
     build-up. A user setting "protein daily" should still get sensible, answerable questions once the
     milestones one is removed.
2. **Multi-goal detection and the "focus on one first" step happen in the meta-agent, above you.**
   Experts do **not** detect, split, reflect back, or defer goals — the coach hands your expert exactly
   one focused goal. Author only for that single goal.

### 1.1b Upcoming (Future / not yet built) — the Dream layer will GROUP related Journeys

**Do not build for this yet — know it's coming.** Today each goal becomes one Journey, and Journeys
already carry a `dreamId` field. The planned **Dream layer** (canonical hierarchy **Dream → Journey →
Milestone → Step**) will let a user-defined **Dream/category** group several related Journeys — e.g. a
"get fitter" Dream grouping "protein daily" (recurring) + "gym 3×/week" (process). The coach will
**establish or link the shared Dream** when a user's goals share a theme (exactly the multi-goal case
in §1.1). This sits **above** the expert layer, like multi-goal focus — experts stay single-goal. It is
**upcoming, not shipped**; author your single-goal content to today's contract and don't design around
a Dream API that doesn't exist yet.

### 1.2 What already exists vs what you'll author

**Exists today (first-cut, "SX.1"):** four working experts under the **old** ids — **RecoveryExpert**,
**SelfConfidenceExpert**, **NutritionExpert**, **SportExpert** — plus a reference **GeneralExpert**
fallback. Each already implements the full interface (arc, steps, risks, and the four interview
methods) at a *sensible-defaults* depth, with **no external knowledge base**. They pass tests and run
end-to-end through the Planner and the dev harness. These will be **realigned to the four domains in
§0.3** (Addiction · Relationships/Loneliness · Body image · Career).

**What you'll do:** author the four domains to the **framework-not-content** standard (§0.2) — the
**right interview questions** with stable option taxonomies; a **light** Milestone arc; **light,
non-directive** Step framing; honest feasibility wording; advisory risk signals; and (author now,
backend deferred) **linked-media references**. **Do NOT** author deep clinical/training protocols — the
6-stage arcs and KB source lists in the blueprint are scaffolding for *good questions and a light
framework*, not a mandate to write treatment content. The per-domain blueprint (arcs, step patterns,
risk→response, safety boundaries, personalization hooks) is a reference:
**`04_Product/Strategy_WIP_2026-07/08_domain_experts_deepening.md`** — read its top "Architecture
update 2026-08-05" note first; the older per-domain detail is *prior detail* superseded where it
conflicts with the framework-not-content stance and the new domain set.

---

## 2. The `DomainExpert` contract (exact)

**File:** `app/src/core/learning/DomainExpert.ts`. Pure TypeScript — no React, no UI, no vendor
imports, **no LLM** in this layer. Everything is deterministic config + rules.

### 2.1 The interface (verbatim)

```ts
export interface DomainExpert {
  /** The ordered Milestones this goal breaks into, given the user's constraints. */
  proposeMilestones(goal: GoalInput, constraints: PlanConstraints): ProposedMilestone[];
  /** The Step templates that make up one Milestone of this goal. */
  stepTemplatesFor(milestone: ProposedMilestone, goal: GoalInput): StepTemplate[];
  /** Optional advisory risks in the goal/constraints (e.g. no time set aside). */
  riskSignals?(goal: GoalInput, constraints: PlanConstraints): RiskSignal[];

  /** The ORDERED (general → specific) interview this expert asks for the goal. */
  interviewQuestions?(goal: GoalInput): DomainQuestion[];
  /** An honest reality-check on the goal given the collected answers + constraints. */
  assessFeasibility?(answers: InterviewAnswers, constraints: PlanConstraints): FeasibilityAssessment;
  /** Whether intermediate Milestones genuinely help this goal (not always). */
  usesMilestones?(answers: InterviewAnswers): boolean;
  /** Build the answer-aware Milestone + Step structure (no scheduling — that's the Planner). */
  buildStructure?(goal: GoalInput, answers: InterviewAnswers, constraints: PlanConstraints): PlanStructure;
}
```

Two groups of methods:

- **The structure path (required):** `proposeMilestones` + `stepTemplatesFor` — a **fixed** generic
  arc, used by the current Planner directly. Keep these working.
- **The interview path (optional but the whole point of the deepening):**
  `interviewQuestions` / `assessFeasibility` / `usesMilestones` / `buildStructure`. These let the
  expert own its interview and build an **answer-aware** plan (a beginner gets an easier, shorter
  start than an advanced user). All four first-cut experts already implement all four.

### 2.2 The supporting types (verbatim)

```ts
interface ProposedMilestone { title: string; weight?: number; }        // weight sizes the arc / difficulty

interface StepTemplate {
  title: string;
  estimatedMinutes: number;    // Planner packs Steps into weekly availability by this
  difficulty: number;          // 1..5
}

interface RiskSignal {
  code:                          // ADVISORY only — the Planner never reads these; they surface as
    | 'no_time' | 'overloaded' | 'tight_deadline'        // generic planning risks (any domain)
    | 'high_risk_time' | 'trigger_exposure' | 'isolation'         // recovery
    | 'avoidance' | 'harsh_self_talk' | 'all_or_nothing'          // self-confidence
    | 'skipping_meals' | 'late_night'                             // nutrition
    | 'overtraining' | 'injury_risk' | 'missed_sessions';         // sport
  message: string;             // gentle, NON-CLINICAL caution
}

type QuestionIntent =          // the funnel an interview walks, general → specific (STABLE enum)
  | 'foundation'   // why this matters / what it means to you
  | 'baseline'     // the zero-state — where you are right now
  | 'time'         // how much time you can allocate
  | 'obstacles'    // what has gotten in the way before
  | 'motivation'   // what keeps you going when it is hard
  | 'milestones';  // whether to break the goal into intermediate Milestones (CONDITIONAL)

interface DomainQuestion {
  id: string;                  // stable, domain-scoped, e.g. "sport.baseline"; keys into InterviewAnswers
  intent: QuestionIntent;
  prompt: string;              // shown to the user
  options: string[];           // common CLOSED options — stable categories (>= 2)
  allowOther: boolean;         // ALWAYS true — the "Other" free-text escape
}

type InterviewAnswers = Record<string, string>;   // keyed by DomainQuestion.id; value = a chosen option OR free text

type FeasibilityVerdict = 'reasonable' | 'ambitious' | 'tooAmbitious';
interface FeasibilityAssessment { verdict: FeasibilityVerdict; note: string; }  // honest, supportive, NON-CLINICAL

interface PlanStructure {
  milestones: ProposedMilestone[];
  stepsByMilestone: StepTemplate[][];   // ALIGNED BY INDEX to milestones (same length)
}
```

The Planner's inputs (`app/src/core/learning/types.ts`):

```ts
interface GoalInput { title: string; isHabit: boolean; description?: string; cadence?: Cadence; }  // Cadence = 'once'|'daily'|'weekly'
interface PlanConstraints {
  targetDate?: number;                 // epoch ms; present ⇒ back-solve to hit it; absent ⇒ open-ended
  weeklyAvailabilityMinutes: number;   // 0 ⇒ minimum, one Step/day
  preferredDays: number[];             // JS getDay 0=Sun…6=Sat; empty = all days
  daypart: DayPart;                    // 'morning' | 'evening' | 'either'
}
```

`Milestone` is the canonical mid-layer term (never "Phase"). The Planner materializes each
`ProposedMilestone` into a `Milestone` (assigns `id` + `order`).

### 2.3 Worked example — the SportExpert (your reference implementation)

`app/src/core/learning/experts/SportExpert.ts` is the cleanest read. Its shape (all EDITABLE config
at the top of the file, thin methods below):

- **Milestone arc** — a `readonly ProposedMilestone[]` with rising `weight`:
  `Build your base` (1) → `Add progressive load` (2) → `Balance rest and recovery` (2) →
  `Reach your peak` (3). Rest is a first-class Milestone, not an afterthought.
- **Step library** — `STEP_TITLES: Record<string, readonly string[]>` maps each Milestone title to
  its Step titles, plus a `DEFAULT_TITLES` fallback for the collapsed single-Milestone case.
- **Interview** — a `readonly DomainQuestion[]` (`QUESTIONS`) ordered
  foundation → baseline → time → obstacles → motivation → milestones. The `sport.baseline` options are
  ordered **novice → experienced** (`"I'm mostly inactive right now"` → `"I already train
  regularly"`); the `sport.milestones` option `[1]` is the "keep it simple" (no-stages) choice.
- **Feasibility** — `COMFORTABLE_MINUTES = 120` (sport needs a bigger weekly block than the gentler
  domains) + three `FEASIBILITY_NOTES` strings, one per verdict.
- **The methods** delegate to `expertKit` helpers (below): `copyMilestones`, `stepsFrom`,
  `minutesFor`, `difficultyFor`, `levelFromOrderedOptions`, `assessFrom`, `usesMilestonesFrom`,
  `buildStructureFromArc`. **You almost never write materialization logic by hand — you write CONTENT
  and let the kit assemble it.**

### 2.4 File / folder layout + registry wiring

```
app/src/core/learning/
  DomainExpert.ts          # the interface + all types + the reference GeneralExpert
  types.ts                 # GoalInput, PlanConstraints, Cadence/DayPart re-use
  Planner.ts               # domain-ignorant scheduler (do not touch)
  experts/
    expertKit.ts           # shared helpers — use these, don't re-derive materialization
    registry.ts            # DomainId union, DOMAIN_IDS, DomainExpertRegistry, getExpert, isDomainId
    index.ts               # barrel (re-exports registry + the four experts)
    RecoveryExpert.ts
    SelfConfidenceExpert.ts
    NutritionExpert.ts
    SportExpert.ts
    __tests__/
      experts.test.ts      # structure + registry + end-to-end-through-Planner
      interview.test.ts    # the four interview methods, funnel order, beginner-vs-advanced
```

**Registry (`experts/registry.ts`) — the single source of truth for which domains exist:**

```ts
export type DomainId = 'recovery' | 'self_confidence' | 'nutrition' | 'sport' | 'general';
export const DOMAIN_IDS: readonly DomainId[] = ['recovery','self_confidence','nutrition','sport','general'];
export const DomainExpertRegistry: Readonly<Record<DomainId, DomainExpert>> = { … };
export function isDomainId(id: unknown): id is DomainId
export function getExpert(domain?: string | null): DomainExpert   // unknown/absent → GeneralExpert
```

> **These are the CURRENT (old) ids.** Per §0.3 they realign to the four domains — Addiction,
> Relationships/Loneliness, Body image (nutrition **+** sport merged), Career. Renaming the `DomainId`
> union / `DOMAIN_IDS` / registry keys is a **coordinated seam change** (also touches the classifier
> that emits the id and every test array); confirm with the founder and coordinate with whoever else
> edits `experts/` before renaming. Until then, author against the new four in your working template
> (§3.8) and map to the existing files.

**To DEEPEN an existing expert:** edit only its file (its config constants + methods). Nothing else
changes.

**To ADD a new expert:** (1) create `experts/YourExpert.ts` implementing `DomainExpert` (copy Sport's
skeleton); (2) add its id to the `DomainId` union **and** `DOMAIN_IDS` **and** `DomainExpertRegistry`
in `registry.ts`; (3) export it from `experts/index.ts`; (4) add it to the test arrays. Because
`getExpert` falls back to `GeneralExpert`, a missing registration degrades gracefully rather than
crashing — but the classifier won't route to an unregistered id, so registry wiring is required for
the coach to reach your expert.

---

## 3. How to author a domain's content — step-by-step recipe

Do this **per domain**, grounded in that domain's section of
`08_domain_experts_deepening.md`. A copy-paste template is in §3.8.

### 3.1 (a) The question set — ordered general → specific

- Write an ordered `DomainQuestion[]`. **Intents must be non-decreasing** in the funnel order:
  `foundation → baseline → time → obstacles → motivation → milestones`. (The test enforces this.)
- **Must include at minimum** a `foundation`, a `baseline`, and a `time` question. (Enforced.)
- Each question: a stable domain-scoped `id` (`"nutrition.baseline"`), a clear `prompt`,
  **≥2 closed `options`**, and `allowOther: true`. (All enforced.)
- **Options are STABLE categories, not throwaway phrasings.** They double as the aggregate-trend
  buckets, so choose durable, mutually-distinct categories you'd be happy to report on across
  thousands of users. Tune wording freely later; avoid churning the *set* of categories.
- **The `baseline` question is special — order its options novice → experienced.** The kit maps the
  chosen option's **index** to a starting level (0 novice · 1 middle · 2 experienced) via
  `levelFromOrderedOptions`. A free-text/"Other" or unmatched answer maps to the safe middle (1).
- **The `milestones` question is special — option `[1]` is the "keep it simple / no stages" choice.**
  The kit's `usesMilestonesFrom(answers, id, keepSimpleOption)` returns `false` only for that exact
  option. Default (unanswered or any other choice) = staged.
- **Tag it `intent: 'milestones'` — the recurring-goal path DROPS exactly this question (flow update
  2026-08-06, §1.1).** A `recurring` goal (a fixed weekly action) takes the lighter path and skips your
  `milestones` question entirely; a `process` goal runs the full set. So write your foundation /
  baseline / time / obstacles / motivation questions to still read sensibly for a simple recurring
  action once the milestones question is removed — don't make them presuppose a staged build-up.

### 3.2 (b) The Milestone arc

- A `readonly ProposedMilestone[]`, ordered, with **rising `weight`** (weight sizes the arc and feeds
  Step difficulty). Use the evidence-informed 6-stage arcs in the blueprint as your target depth
  (e.g. recovery's Stabilise → Triggers → Coping skills → Restructure → Support → Relapse-prevention).
- Keep titles short, human, and canonical (they become **Milestone** titles the user sees).
- The **last** Milestone is reused as the home for the collapsed single-Milestone case (see §3.3), so
  make it a sensible "ongoing/sustain" stage.

### 3.3 (c) Step templates + how baseline reshapes them

- Provide a `STEP_TITLES: Record<string, readonly string[]>` mapping **each Milestone title → its Step
  titles**, plus a `DEFAULT_TITLES` fallback used when a Milestone has no entry or when the arc
  collapses to one Milestone.
- Step titles should be concrete, doable, and **non-directive/non-clinical** (see §4 safety).
- **The baseline answer reshapes the structure automatically** via `buildStructureFromArc`:
  - **Novice (level 0):** shorter Steps (`× 0.7`), easier difficulty, and the gentle intro Milestone
    is kept.
  - **Middle (level 1):** base minutes/difficulty.
  - **Experienced (level 2):** longer Steps (`× 1.2`), harder difficulty, and the **gentlest intro
    Milestone is skipped** (`arc.slice(1)` when the arc has >2 stages).
  - **"Keep it simple" chosen:** the arc collapses to a **single** ongoing-practice Milestone (the
    arc's last stage), Steps from `DEFAULT_TITLES`.
- You set the two anchor lengths: `dailyMinutes` (shorter daily reps) and `weeklyMinutes` (longer
  weekly blocks). Recovery/self-confidence use ~10/20; sport uses ~25/45. Pick what's realistic for
  the domain.

### 3.4 (d) `assessFeasibility` heuristics + honest verdict wording

- Use `assessFrom(level, constraints, comfortableMinutes, notes)`. It scores a novice-with-no-time as
  least likely to hit an ambitious goal, an experienced-user-with-ample-time as most likely, and maps
  the score to `reasonable | ambitious | tooAmbitious`.
- You choose `COMFORTABLE_MINUTES` (the "enough weekly time" threshold for *this* domain) and the
  three `FEASIBILITY_NOTES`.
- **Verdict wording must be honest, supportive, and NON-CLINICAL** — never a directive, never a
  diagnosis. For sensitive domains, `tooAmbitious` should gently encourage extra/human support rather
  than discourage (see RecoveryExpert's note as the model). The coach **never silently fails**; it
  surfaces the honest reality-check.

### 3.5 (e) `usesMilestones` — Milestones are optional

- Delegate to `usesMilestonesFrom(answers, milestonesQuestionId, keepSimpleOption)`. Default is
  staged; the explicit "keep it simple" choice returns `false` and collapses the arc. Some goals
  genuinely don't need stages — respect that.

### 3.6 (f) `riskSignals`

- Return advisory `RiskSignal[]` — **coarse code + gentle NON-CLINICAL message**. These never change
  the plan; they surface as gentle cautions in the coach/UI.
- Reuse an existing `code` where one fits; a new domain may **extend** the `RiskSignal.code` union in
  `DomainExpert.ts` (additive — the Planner ignores it). **Coordinate a union change** with whoever
  else is editing `experts/`.
- **Known limitation you will hit (blueprint §6, gaps #1–#2):** the enum is small and **severity-
  blind**, and there is **no crisis/escalation channel** — an expert cannot yet emit "show crisis
  resources now" or "refer to a professional." Those are **Interventions**, not plan adjustments, and
  they do **not exist in the seam yet**. Author the *advisory* risks now; flag anything that needs
  escalation for the architect (do not fake it through `riskSignals`).

### 3.7 (g) Linked media (author the references now; the backend is deferred)

The future-vision (`09_future_vision_notes.md`, Idea 1) makes **linked media (video / audio / text)**
part of a Journey Template's **stable skeleton** — authored once per Step, shared to many, while the
adaptive engine owns the dynamic per-user params. **Be honest about the state:** `StepTemplate` has
**no media field today**, and there is **no media store / hosting backend** (it is deferred, and
carries storage/egress **cost** — flag for cost-guardian before any provisioning).

**What to do now:** author the media **references** alongside each Step in your per-domain authoring
template (§3.8) as a separate, side-car column — e.g. a short caption + an intended media *type*
(`video` / `audio` / `text`) + a stable slug. Keep them **descriptive placeholders**, not URLs. When
a `JourneyTemplate` object and a media field land, these references attach directly. Do **not** invent
a `media` field on `StepTemplate` or hardcode hosting.

### 3.8 Fill-in-the-blanks TEMPLATE (copy per domain)

Copy this into your working notes for each domain, fill it from the blueprint, then translate it into
the expert's config constants. (This is the *authoring artifact*; the code file mirrors it.)

Remember §0.2: spend your effort on the **interview questions** and **persistence framing**; keep the
arc and Steps **light and non-directive** (a prompt to act, not a protocol). Starter templates for the
four current domains follow in §3.9.

```md
## Domain: <name> (new domain: Addiction | Relationships/Loneliness | Body image | Career)
## Current code file it maps to (§0.3): <recovery | self_confidence | nutrition | sport | new>
Framing (one line, non-clinical, framework-not-content): __________
Liability tier + gate (from blueprint §7): __________

### Interview (ordered general → specific; options = STABLE categories; allowOther = true everywhere)
| id                  | intent      | prompt                          | options (closed)                          |
|---------------------|-------------|---------------------------------|-------------------------------------------|
| <domain>.foundation | foundation  | ______________________________ | A / B / C / D                             |
| <domain>.baseline   | baseline    | ______________________________ | novice → … → experienced  (ORDER MATTERS) |
| <domain>.time       | time        | ______________________________ | Under 1h / 1–3h / 3–5h / >5h              |
| <domain>.obstacles  | obstacles   | ______________________________ | A / B / C / D                             |
| <domain>.motivation | motivation  | ______________________________ | A / B / C / D                             |
| <domain>.milestones | milestones  | ______________________________ | "staged" / "keep it simple"  (option[1] = keep simple) |

### Milestone arc (rising weight; last stage = the "sustain" home for the no-stages case)
1. ______________  (weight 1)
2. ______________  (weight 2)
3. ______________  (weight 2)
4. ______________  (weight 3)
(… up to the blueprint's 6 evidence-informed stages)

### Step library (per Milestone title → Step titles; concrete, doable, non-directive)
- "<Milestone 1 title>": [ "…", "…", "…" ]
- "<Milestone 2 title>": [ "…", "…", "…" ]
- DEFAULT_TITLES (fallback / collapsed single-Milestone): [ "…", "…" ]
- Step lengths: dailyMinutes = __  · weeklyMinutes = __

### Linked media references (author now; no backend yet — placeholders, not URLs)
| Step title              | media type (video/audio/text) | slug              | one-line caption |
|-------------------------|-------------------------------|-------------------|------------------|
| "…"                     | video                         | <domain>-…-intro  | ________________ |

### Feasibility
- COMFORTABLE_MINUTES = __  (this domain's "enough weekly time" threshold)
- notes.reasonable   = "…"  (honest, supportive, non-clinical)
- notes.ambitious    = "…"
- notes.tooAmbitious = "…"  (sensitive domains: gently encourage extra/human support)

### Risk signals (advisory, non-clinical; reuse a code or extend the union additively)
- code: ______  message: "…"
- (Escalation/crisis need? → NOT in the seam yet. Flag for architect, don't fake via riskSignals.)

### Safety boundaries (must NEVER — from blueprint §x.5) + gate before real users
- __________
```

### 3.9 Starter templates — one per current domain (seed, not the finished author)

These are **seeds** at the framework-not-content depth (§0.2), following the founder's SPORT-example
flow. Fill and refine them; keep questions primary and Steps light. `allowOther: true` on every
question; order `baseline` options novice → experienced; `milestones` option `[1]` = "keep it simple".

**1) Addiction — גמילה** (maps to code `recovery`; **HIGHEST liability — hard-gated, §4/§6**)

- Framing: support a *change-supportive lifestyle and persistence* — **not** treatment, detox, or
  medical care; a complement to professional help, never a replacement.
- Interview seed: *foundation* — "What are you looking to change, and why now?"; *baseline* — "Where
  are you with it today?" (options ordered: just deciding → cutting down → mostly stopped, staying
  that way); *time* — weekly time buckets; *obstacles* — "What tends to pull you back?" (certain
  places/people · stress · boredom · social pressure); *motivation* — "What keeps you going when it's
  hard?"; *milestones* — staged vs keep-it-simple.
- Light framework: get grounded → notice what pulls you → build alternatives → lean on support →
  keep it going. **Steps stay non-directive** (a check-in, a reach-out, a swapped routine) — **never**
  withdrawal/detox/tapering guidance.
- Persistence hook: daily 1-tap check-in + an Ally reach; non-punitive lapse reframe + Grace Tokens.
- Feasibility: `COMFORTABLE_MINUTES` low; `tooAmbitious` gently encourages human/professional support.
- Safety: **must NEVER** advise on withdrawal/detox/dosing, diagnose severity, or discourage
  treatment/medication. **Needs crisis-escalation seam + formal clinical review before ANY real user.**

**2) Relationships / Loneliness — זוגיות/בדידות** (new expert; nearest tone `self_confidence`; **HIGH
liability, mental-health-adjacent — gated, §4/§6**)

- Framing: build connection through *small real-world actions* — **not** therapy, matchmaking, or
  relationship diagnosis.
- Interview seed: *foundation* — "What would more connection look like for you?" (a close friendship ·
  a partner · feeling less alone · deepening what I have); *baseline* — "Where are you now?" (ordered:
  mostly on my own → a few loose ties → an active social life I want to deepen); *time* — weekly time;
  *obstacles* — "What gets in the way?" (few chances to meet people · nerves reaching out · past hurt
  · time); *motivation*; *milestones*.
- Light framework: reconnect with existing ties → create small low-stakes chances to meet → reach out
  → sustain the ones that matter. **Steps are gentle, user-paced actions** (send one message, join one
  thing) — **never** flooding, and **no** clinical/attachment interpretation.
- Persistence hook: one small outreach per period; reflect on how it felt, not whether it "worked".
- Safety: **must NEVER** diagnose loneliness/depression/social anxiety, push overwhelming exposure, or
  give relationship "verdicts". **Needs distress-detection + referral copy + safety review before real
  users.**

**3) Body image — דימוי גוף** (maps to code `nutrition` **+** `sport`, merged; **MODERATE liability**)

- Framing: feel better in and about your body through sustainable *movement + eating BEHAVIOUR* —
  **not** diet prescription, meal/macro plans, a training protocol, or medical care. This one expert
  covers **both** fitness and nutrition; let the interview branch on what the user wants to work on.
- Interview seed: *foundation* — "What would feeling good in your body look like?" (energy · strength ·
  health markers · how I feel about myself) **and** "Where do you want to start?" (moving more · eating
  behaviours · both); *baseline* — ordered inactive/irregular → already fairly consistent; *time*;
  *obstacles* (time · motivation · confidence · past all-or-nothing cycles); *motivation*; *milestones*.
- Follow the SPORT-example flow for the movement branch (know which activity? try a type? build a plan
  OR brainstorm what suits you and is near home? equipment? existing group/plan? sustainable
  frequency? → then ensure persistence). Nutrition branch = one keystone behaviour at a time.
- Light framework: build the habit → add (don't restrict) → design the environment → sustain. **Steps
  are light prompts** (a walk, add a veg, a check-in) — **never** calorie/macro targets or programmed
  sets/reps.
- Safety: **must NEVER** prescribe calories/macros/therapeutic diets, coach through pain, promote
  extreme restriction/rapid weight loss, or use weight-centric framing. Readiness/ED screen + medical
  disclaimers; refer for pain/injury/medical conditions/pregnancy/allergies.

**4) Career — קריירה** (new expert; **LOW liability**)

- Framing: move toward work that fits you through *direction + consistent action* — **not** career
  counselling, recruiting, or financial/legal advice.
- Interview seed: *foundation* — "What are you trying to change about your work life?" (find direction ·
  land a new role · grow where I am · build a skill); *baseline* — ordered figuring it out → have a
  target, taking steps → actively progressing; *time*; *obstacles* (don't know where to start · time ·
  confidence · unclear market); *motivation*; *milestones*.
- Light framework: clarify direction → build the needed skill/proof → put yourself out there → sustain
  momentum. **Steps are concrete small actions** (one application, one outreach, one hour of a skill) —
  **never** guaranteed outcomes or specific financial/legal advice.
- Persistence hook: a steady weekly rate (X applications / outreach / practice hours) the user chooses.

---

## 4. Conventions & hard constraints

- **Config before code (Engineering Bible §E1).** All user-facing copy — prompts, options, Step
  titles, Milestone titles, feasibility notes, risk messages — lives in **editable config constants**
  at the top of the expert file. Logic stays thin and generic. You should be tuning *content*, not
  rewriting *materialization*. The `expertKit` helpers exist so you never repeat assembly logic.
- **Terminology.** Milestone (never "Phase"), Journey, Step, Ally, Support Circle, Grace Token. Run
  content past product-guardian before it graduates.
- **Determinism.** No LLM, no randomness, no dates/`Date.now`, no network in this layer. Same inputs →
  identical output. (The LLM lives one layer up, in the coach, for *language only*.)
- **Privacy G1 (non-negotiable).** A user's **free-text ("Other") answer**, and the goal
  title/description, are **ON-DEVICE-ONLY raw signal** — the same invariant as a `ReasonEntry.note`.
  They feed the on-device expert/Planner and **must NEVER** be copied into a DomainEvent,
  ProgressSummary, OutreachInsight, a log line, or any sync path. **Only aggregate / anonymized data**
  (counts, completion %, usefulness ratings — grouped by the stable closed `options`/`intent`) may ever
  inform recommendations, and even that server-side aggregate store **does not exist yet** and must
  route through security-privacy before any build. Practical rule for you: **design closed options
  well, because they are the only thing that can ever be aggregated; free text can't.**
- **Safety — non-clinical framing, always.** Experts offer *questions, structure and encouragement*,
  never treatment, diagnosis, directives, or medical claims. The **framework-not-content stance (§0.2)
  is itself the first line of safety** — by not authoring clinical/training content we remove most of
  the risk surface — but it does **not** remove the hard boundaries. Each domain's "must NEVER" list:
  **Addiction** must never advise on withdrawal/detox/tapering (can be lethal) or discourage
  treatment; **Body image** must never prescribe calories/macros/therapeutic diets or coach through
  pain; **Relationships/Loneliness** must never push overwhelming exposure or diagnose; **Career**
  must never guarantee outcomes or give financial/legal advice. Internalize your domain's list.
- **The sensitive domains are GATED — author, but do not expose (D24/D53).** **Addiction** and
  **Relationships/Loneliness** are mental-health-adjacent and **must NOT reach a single real user**
  until: (1) the **crisis-detection / escalation seam** exists (blueprint §6 gap #2 — it does **not**
  today), (2) disclaimers + no-treatment-claims copy exist, and (3) a **formal clinical/safety
  review** has passed. You may author these as **internal/shadow** experts in parallel, but they stay
  behind that gate — this is a **release** gate, not a block on authoring/dev work (D53, 2026-08-18,
  corrected the Decision Log's earlier D24 wording to make that explicit). **Career** is lowest-liability
  and can reach users soonest; **Body image** is
  moderate (readiness/ED screening + medical disclaimers). Build liability-ascending
  (Career → Body image → Relationships/Loneliness → Addiction), per blueprint §7 (reordered for the
  new domain set).
- **Cost.** No paid dependency/service/media-hosting without flagging cost-guardian first (media
  hosting = storage + egress cost). Authoring text costs nothing; provisioning a backend does.

---

## 5. How to test

Run everything from `app/`. Stack is **Expo SDK 57 + TypeScript** — read the versioned docs at
`https://docs.expo.dev/versions/v57.0.0/` before writing app code (see `app/AGENTS.md`).

### 5.1 Jest — the expert test baseline (your fast loop)

- `app/src/core/learning/experts/__tests__/interview.test.ts` — runs against **every** expert (via
  `describe.each`) and asserts the interview contract you must satisfy:
  - all four interview methods exist;
  - the question set is well-formed and **funnel-ordered** (non-decreasing intent), ids unique,
    ≥2 options each, `allowOther` true, includes foundation + baseline + time;
  - `interviewQuestions` returns **fresh copies** (no shared-config mutation);
  - `assessFeasibility` returns one of the three verdicts + a note; an **experienced user with ample
    time grades easier** (`reasonable`) than a **novice with none** (`tooAmbitious`);
  - `usesMilestones` is a boolean, defaults staged, honours the "keep it simple" option;
  - `buildStructure` gives a **beginner an easier, shorter first Step** than an advanced user, and
    **collapses to a single Milestone** when no-stages is chosen.
- `app/src/core/learning/experts/__tests__/experts.test.ts` — asserts non-empty well-formed
  Milestones/Steps, at least one risk signal, correct registry resolution + `GeneralExpert` fallback,
  and that each expert **plans end-to-end through the domain-ignorant Planner**.

Run: `npm --prefix app test` (or target the experts folder). **Any new/deepened expert must keep both
green** — the `describe.each` means your expert is tested automatically once registered. Add
domain-specific assertions for anything unique you introduce.

### 5.2 Dev harness — see an expert drive a real conversation

`npm --prefix app run coach` runs `app/src/core/coach/devHarness.ts` — a standalone `tsx` script (not
a jest test, never imported by the app) that wires the **real** seams end-to-end against **live
Gemini**:

- **Phase 1 — Converse:** the real `CoachOrchestrator` interviews you on stdin/stdout and produces a
  `GoalSpec` (including the classified `domain`).
- **Phase 2 — Build:** `getExpert(spec.domain)` routes to **your** expert, which builds the Journey;
  the harness prints **which DomainExpert built it** and the full Milestones → Steps (dates,
  durations, difficulty).
- **Phase 3 — Report & Adapt:** step through the closed loop day-by-day (report done/partial/couldn't/
  skip) and watch re-plan, nudge, InsightModel and the coach narration.

Requires a `GEMINI_API_KEY` in the git-ignored `app/.env.local` (**never commit it**; the harness
never prints it). It uses the **free tier** (rate-limited; the harness waits out 429s). **Reproducible
mode:** set `COACH_SCRIPT=<path>` (or `--script <path>`) to a file whose first line is the A/B/C branch
pick and each subsequent line an answer — it replays against live Gemini, builds the Journey, prints
the transcript + GoalSpec + Journey, and exits without the interactive loop. A sample lives at
`app/src/core/coach/sample.script.txt`.

> **Cost note:** the harness calls a live LLM. The Gemini free tier is $0 but rate-limited; if you ever
> consider a paid tier or heavy automated runs, flag cost-guardian first (CLAUDE.md §3.10).

---

## 6. What's deferred / in-flight — read this so you don't assume things exist

- **Triage is now understanding-based (SHIPPED 2026-08-06); the expert-driven interview is not yet
  wired into the orchestrator (IN PROGRESS).** The opening triage no longer does a single-domain
  classify — the meta-agent asks for the goal in free text and runs one **understanding** call
  returning a structured goal list (`{ title, kind, domain }`), handling multi-goal focus and the
  recurring-vs-process flow split above the expert layer (§1.1). But the `CoachOrchestrator`
  (`app/src/core/coach/`) still runs its **own** generic interview via `interviewPlaybook.ts` + an LLM
  extraction pass to fill a `GoalSpec`, then routes to your expert **only at build time**
  (`getExpert(spec.domain)` → `buildStructure`/`proposeMilestones`). The expert's **own**
  `interviewQuestions()` (with its closed options + "Other" escape) is **built and tested but not yet
  driving the live conversation.** Wiring the understanding triage → expert-owned interview (recurring
  = lighter set, process = full set) is the active integration work. **Author the questions now;** they
  are ready for that wiring.
- **No crisis / escalation seam (the #1 safety gap).** `RiskSignal` is advisory only and severity-
  blind; there is no way to emit "show crisis resources now" or "refer to a professional." The
  sensitive domains (**Addiction**, **Relationships/Loneliness**) **cannot ship** without it. (A
  `SafetyLayer` exists that softens over-promising
  and blocks medical directives in *coach language*, but that is not the same as crisis escalation.)
- **No domain-intake bag.** Personalization hooks the blueprint wants (substance type, feared
  situations, dietary restrictions/allergies, injuries) have **nowhere to go** yet — `GoalInput` is
  title/isHabit/description/cadence only. Proposed as an on-device-only expert-declared questionnaire;
  not built.
- **No external knowledge base.** All four experts today are *sensible-defaults* config with no KB.
  The blueprint's KB source categories are the target, but the KB itself doesn't exist yet.
- **No media backend / Journey-Template library / aggregate-analytics / multi-expert composition.**
  All Future Vision (`09_future_vision_notes.md`): linked-media hosting, the `JourneyTemplate` object,
  the server-side aggregate-outcomes store, same-goal communities, and activating **multiple** experts
  for one goal are **not built**. Author references and content now where the guide says to; don't
  build against APIs that don't exist.

---

## Sources in the repo (read before authoring)

- **Code (the exact contract):** `app/src/core/learning/DomainExpert.ts`,
  `app/src/core/learning/experts/{registry,expertKit,SportExpert,RecoveryExpert,SelfConfidenceExpert,NutritionExpert}.ts`,
  `app/src/core/learning/{types,Planner}.ts`, `app/src/core/coach/` (orchestrator, interviewPlaybook,
  SafetyLayer, devHarness).
- **Tests:** `app/src/core/learning/experts/__tests__/{interview,experts}.test.ts`.
- **The per-domain blueprint (your primary authoring source):**
  `04_Product/Strategy_WIP_2026-07/08_domain_experts_deepening.md`.
- **Future vision (media / Templates / aggregate outcomes / communities):**
  `04_Product/Strategy_WIP_2026-07/09_future_vision_notes.md`.
- **Constitution + terminology:** `CLAUDE.md`, `09_Product_Philosophy/Product_Terminology.md`,
  `06_Decisions/Decision_Log.md` (D23 — the AI-adaptive-coach pivot).
```
