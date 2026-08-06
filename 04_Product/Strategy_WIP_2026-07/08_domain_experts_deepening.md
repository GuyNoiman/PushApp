# Domain Experts — Deepening Blueprint (SX phase spec)

> ## ▶ Architecture update 2026-08-05 (founder direction — supersedes where it conflicts)
> Two changes reshape this blueprint. **The per-domain detail below is retained as prior detail;
> where the two points below conflict with it, these supersede.**
>
> **1. Framework-not-content philosophy (the core stance).** PushApp is **not** a nutritionist,
> sports coach, matchmaker, or therapist. Each expert's job is to **ask the right questions, build
> an adapted work FRAMEWORK, and push the user to ACTION + persistence — WITHOUT prescribing the
> detailed professional content** (no training protocols, meal plans, clinical treatment, dosing).
> The evidence-informed 6-stage arcs, KB source lists and Step libraries below are still useful as
> *scaffolding for good questions and a light framework* — **not** as a mandate to author deep
> clinical/training material. This stance also **lowers clinical/liability risk** (we no longer
> author treatment content), though the sensitive domains still need the safety gate in §7.
>
> **2. Revised domain set (4 domains).** The old list (recovery · self-confidence · nutrition ·
> sport) is replaced by:
> 1. **Addiction / גמילה** — drugs, parties, casual flings (סטוצים), smoking, etc.
> 2. **Relationships / Loneliness — זוגיות/בדידות**
> 3. **Body image — דימוי גוף** (absorbs BOTH nutrition AND fitness into one expert)
> 4. **Career — קריירה**
> The **code** still ships first-cut experts named `recovery / self_confidence / nutrition / sport`
> (to be realigned to these four). Read the mapping + the two-layer meta-agent/expert model in
> `04_Product/Domain_Expert_Authoring_Guide.md`, which is the authoritative handoff.
>
> ---
>
> ## ⚠️ WORK IN PROGRESS — research + design only, nothing here is approved. (prior detail below)
> This is the PM blueprint for turning the four **first-cut** `DomainExpert` plug-ins
> (recovery/addiction · self-confidence · nutrition · sport) into **credible, knowledgeable
> experts** — the "next phase" the founder described ("later we'll build for each a relevant
> knowledge base + a tailored work plan"). It is **not** clinical guidance and it is **not** a
> shipped decision. Per CLAUDE.md §3.6 every item is **Open Question** until it graduates to
> `06_Decisions/Decision_Log.md`.
>
> **Status:** thinking-in-progress · **Owner:** product-manager · **Do not cite as decided.**
> **New-collaborator onboarding:** if you are authoring this content, start with
> `04_Product/Domain_Expert_Authoring_Guide.md` (context + the exact `DomainExpert` technical contract).
> **Hard gate:** the two mental-health-adjacent domains (recovery, self-confidence) MUST pass a
> formal safety/clinical review AND the app must have a working crisis-escalation path before
> either is exposed to a single real user. See §7.

The core engine is **done and stays untouched**: a domain-agnostic Planner builds a Journey of
Milestones→Steps, tracks behaviour, and re-plans adaptively (reschedule / resize / refrequency /
add / remove). Experts only *inject domain knowledge* through the `DomainExpert` seam
(`app/src/core/learning/DomainExpert.ts`): `proposeMilestones`, `stepTemplatesFor`, optional
`riskSignals`. This doc specifies what each of the four experts should *know*.

Terminology is canonical throughout: **Journey · Milestone · Step · Buddy · Ally · Grace Token**.

---

## 0. How each blueprint section maps to the seam

| Blueprint section | Seam surface today | Gap flagged in §6 |
|---|---|---|
| Milestone arc | `proposeMilestones()` | — |
| Step patterns | `stepTemplatesFor()` (title, estimatedMinutes, difficulty) | — |
| Risk → response | `riskSignals()` + Planner replan (resize/reschedule/refrequency) | enum too small; **no crisis/escalation channel** |
| Personalization hooks | `GoalInput` + `PlanConstraints` only | **no domain-intake input** |
| Safety boundaries | (nothing today) | **no pre-plan safety gate** |

Two responses recur in every domain that the current seam **cannot express**: *"surface a coping
resource / crisis hotline now"* and *"refer to a human Ally or a professional."* Those are
**Interventions**, not plan adjustments — see §6, gap #2. This is the single most important
finding for the sensitive domains.

---

## 1. Recovery / Addiction — גמילות  · **HIGHEST liability**

**Framing (non-negotiable):** PushApp supports a *recovery-supportive lifestyle and behaviour
change*. It is **not** treatment, detox, or medical care and must position itself as a *complement*
to professional treatment / mutual-aid, never a replacement.

### 1.1 Milestone arc (6 stages — relapse-prevention / stages-of-change informed)
1. **Stabilise & commit** — get grounded, reduce immediate access/exposure, set an explicit
   reduction/abstinence intention, connect to at least one support. *Intent: safety before effort.*
2. **Know your triggers & cravings** — self-monitor high-risk situations, urges, HALT
   (hungry/angry/lonely/tired). *Intent: awareness.*
3. **Build coping skills** — urge-surfing, delay/distract, refusal scripts, replacement routines.
   *Intent: alternative responses to cravings.*
4. **Restructure environment & routine** — daily structure, avoid people/places/things cues, fill
   the void with healthy replacements. *Intent: reduce exposure.*
5. **Strengthen support & meaning** — deepen the network (sponsor/Ally/meetings), repair
   relationships, reconnect to purpose. *Intent: recovery capital.*
6. **Relapse-prevention & maintenance** — plan for lapses, monitor warning signs, hold a
   recovery identity. *Intent: durability.*

### 1.2 Step patterns
- **Daily craving/mood check-in** (interactive, 1–3 min, difficulty 1, recurring) — the backbone.
- **Trigger/urge log** (2–5 min, event-driven).
- **Coping-skill practice** (urge-surf, breathing) (5–10 min, recurring, difficulty 2).
- **Reach an Ally / attend a meeting** (30–60 min, weekly, difficulty 3–4).
- **Environmental one-off** (remove the substance, change a route) (one-time, high difficulty early).
- **Post-craving / post-lapse reflection** (interactive).
- *Scaling:* early = frequent short check-ins + environment one-offs; later = fewer check-ins, more
  meaning/relationship work. Difficulty rises by **planned exposure** to high-risk situations.

### 1.3 Risk → response playbook
| Signal | Response | Engine-supported? |
|---|---|---|
| Craving spike reported | Surface a coping Step **now**, shed the day's other load, offer Ally contact | resize/refrequency = yes; "surface now" + Ally = **Intervention (gap #2)** |
| Lapse / relapse | **Non-punitive** reframe (data, not failure — counter the abstinence-violation shame spiral), re-plan back toward *Stabilise*, prompt Ally/professional | replan yes; escalation = **Intervention** |
| Missed check-ins / disengagement | Low-friction re-engage, Ally outreach | refrequency yes; outreach = Intervention |
| **Crisis** (withdrawal danger, overdose risk, self-harm) | **STOP coaching**, show emergency/hotline resources, do not coach | **NOT in seam — hard gap #2** |

### 1.4 Knowledge base — source categories & contents
- **Sources:** national addiction authorities (SAMHSA, NIDA/NIAAA), CBT relapse-prevention
  (Marlatt), motivational interviewing, community-reinforcement, mutual-aid models (12-step / SMART
  Recovery — offered as *options, never prescribed*), and a **localised crisis directory** (Israel:
  ERAN and national hotlines).
- **KB holds:** trigger taxonomy, coping-skill library, craving-management scripts, refusal scripts,
  warning-sign checklists, crisis-escalation decision tree, resource directory.
- **KB must NOT hold:** detox/withdrawal medical protocols, tapering/dosing, moderation-vs-abstinence
  determinations — all clinical.

### 1.5 Safety boundaries (must NEVER)
- Give medical advice on withdrawal/detox/tapering (alcohol & benzo withdrawal can be **lethal**).
- Diagnose severity or decide moderation vs abstinence for the user.
- Discourage or substitute professional treatment or medication (MAT).
- Frame the sober streak so a lapse feels catastrophic (shame → relapse). Protect with **Grace
  Tokens** and the non-punitive lapse reframe.
- Ship without crisis detection + escalation.
**→ Requires formal clinical/safety review before ANY real user. Highest liability.**

### 1.6 Personalisation hooks
Substance/behaviour type (drives trigger set *and* medical danger); abstinence vs moderation goal;
current stage (active use / early sobriety / long-term); existing treatment (program? sponsor?
meds?); primary triggers; Ally availability; prior-relapse history.

---

## 2. Self-confidence — ביטחון עצמי  · **HIGH liability (mental-health-adjacent)**

**Framing:** building confidence through *behavioural practice + cognitive reframing*
(CBT/exposure-*informed* self-help). **Not** treatment for social anxiety, depression, or any
disorder.

### 2.1 Milestone arc (6 stages — CBT / graded-exposure / self-efficacy informed)
1. **Self-awareness & baseline** — where confidence is low, self-talk patterns, values. *Intent:
   map the terrain.*
2. **Cognitive foundations** — catch & reframe self-critical thoughts; self-compassion basics.
   *Intent: internal shift.*
3. **Small wins / mastery** — tiny achievable challenges that build self-efficacy. *Intent:
   evidence you can.*
4. **Graded real-world exposure** — progressively harder social/performance situations. *Intent:
   face avoidance.*
5. **Assertiveness & voice** — express needs, set boundaries, speak up. *Intent: agency.*
6. **Identity & consolidation** — internalise "I am capable," build setback resilience. *Intent:
   durable self-concept.*

### 2.2 Step patterns
- **Self-compassion / evidence-based journaling** (interactive, 3–5 min, recurring).
- **Thought record** (catch → challenge → reframe) (interactive, 5–10 min).
- **"Small win" challenge** (one-off, escalating).
- **Graded exposure Step** (10–30 min, high difficulty, laddered).
- **Post-challenge reflection** (feared vs actual outcome).
- *Scaling:* an explicit **exposure hierarchy** — safe/private → public/high-stakes, **user-paced,
  never flooded**.

### 2.3 Risk → response playbook
| Signal | Response | Engine-supported? |
|---|---|---|
| Challenge too hard / avoided | Drop to an **easier rung**, never push | resize down = yes |
| Repeated avoidance / self-critical spiral | Shift to cognitive/self-compassion Steps, lower exposure load, encourage Ally | refrequency yes; Ally = Intervention |
| Clinical-distress signals (panic, hopelessness, worthlessness, self-harm ideation) | **STOP escalation**, surface professional resources | **NOT in seam — gap #2** |

### 2.4 Knowledge base
- **Sources:** CBT self-help; evidence-based social-anxiety/graded-exposure self-help; self-efficacy
  (Bandura); self-compassion (Neff); assertiveness training; positive psychology.
- **KB holds:** cognitive-distortion taxonomy + reframe scripts, exposure-hierarchy templates by
  situation, assertiveness scripts, self-compassion exercises, distress warning-sign checklist.
- **KB must NOT hold:** anxiety/depression treatment protocols; any diagnosis.

### 2.5 Safety boundaries (must NEVER)
- Diagnose or treat anxiety/depression/social phobia.
- Push exposure that overwhelms (flooding) — always graded and consented.
- Use empty affirmations: **affirmations without evidence can backfire for people with low
  self-esteem** — tie every affirmation to real evidence.
- Ship without distress detection + referral copy.
**→ Requires a real (lighter than recovery) safety review + crisis-referral copy before real users.**

### 2.6 Personalisation hooks
Confidence domain (social / work / romantic / performance / body); baseline severity; specific
feared situations (build the hierarchy); introvert/extravert pacing; currently in therapy?; triggers
of self-criticism.

---

## 3. Nutrition — תזונה  · **MODERATE liability**

**Framing:** sustainable *eating-behaviour* change. **Not** diet prescription, meal plans, or
medical nutrition therapy.

### 3.1 Milestone arc (6 stages — behaviour-change / non-diet informed)
1. **Awareness & baseline** — observe eating patterns without judgment. *Intent: see reality.*
2. **Foundational habits** — hydration, regular meals, one keystone swap. *Intent: easy anchors.*
3. **Add, don't restrict** — more protein/veg/fibre/whole foods rather than bans. *Intent:
   crowd-out, avoid restriction backlash.*
4. **Triggers & environment** — kitchen setup, planning, emotional-eating awareness. *Intent:
   environment design.*
5. **Consistency & flexibility** — meal rhythm, eating out, 80/20 balance. *Intent: real-life
   durability.*
6. **Sustain & self-regulation** — internal hunger/fullness cues, long-term identity. *Intent:
   autonomy.*

### 3.2 Step patterns
- **Food/context log** (not calorie counting by default) (2–3 min/meal, recurring).
- **Hydration check** (passive/short).
- **One-swap challenge** (recurring habit).
- **Meal-prep / planning** (weekly, 30–60 min).
- **Add-a-veg / protein-target** (recurring).
- **Emotional-eating reflection** (interactive).
- *Scaling:* one keystone habit first, add **one at a time**; difficulty rises with planning/prep
  and social-eating situations.

### 3.3 Risk → response playbook
| Signal | Response | Engine-supported? |
|---|---|---|
| Overload (too many food rules) | Cut back to one habit | refrequency/remove = yes |
| Missed logging | Reduce friction, no guilt | resize/refrequency = yes |
| Disordered-eating signals (obsessive counting, guilt, purging, extreme restriction) | **STOP optimisation**, pull back, surface professional resources | **Intervention — gap #2** |
| Slow progress | Reconnect to non-scale wins (energy, mood); avoid weight-fixation | narrative |

### 3.4 Knowledge base
- **Sources:** national dietary guidelines; registered-dietitian / academy-of-nutrition sources;
  intuitive-eating / non-diet evidence; behaviour-change science.
- **KB holds:** habit-swap library, simple food-group guidance, portion heuristics, hydration
  guidance, emotional-eating coping, disordered-eating warning signs.
- **KB must NOT hold:** calorie/macro prescriptions, therapeutic diets for medical conditions
  (diabetes/renal/pregnancy), supplement dosing, weight-loss guarantees.

### 3.5 Safety boundaries (must NEVER)
- Prescribe calorie/macro targets or medical/therapeutic diets.
- Promote extreme restriction or rapid weight loss.
- Worsen disordered eating — screen and refer.
- Use weight-centric framing; focus on behaviours/health.
- Override doctor/dietitian for medical conditions, pregnancy, allergies.
**→ Needs a moderate safety review (ED screening + medical-condition disclaimers).**

### 3.6 Personalisation hooks
Goal type (energy / health-marker / performance — avoid weight obsession); **dietary
restrictions/allergies/medical conditions (must capture to stay safe)**; current eating pattern;
cooking ability/time; cultural/food preferences; ED-history screen.

---

## 4. Sport / Fitness — ספורט  · **LOWEST liability**

**Framing:** progressive fitness habit-building. The cleanest fit for the deterministic Planner —
essentially a real training plan.

### 4.1 Milestone arc (6 stages — exercise-science / progressive-overload informed)
1. **Readiness & baseline** — health screen (PAR-Q style), current fitness, realistic goal.
   *Intent: safe start.*
2. **Build the habit** — consistency over intensity, small frequent sessions. *Intent: adherence
   first.*
3. **Foundational fitness** — general conditioning, form/technique, mobility. *Intent: base.*
4. **Progressive overload** — increase volume/intensity toward the goal. *Intent: adaptation.*
5. **Specialise / peak** — goal-specific training (5K, strength target, event). *Intent:
   performance.*
6. **Sustain & recover** — deload, recovery, injury prevention. *Intent: durability.*

### 4.2 Step patterns
- **Structured workout** (20–60 min, recurring, difficulty scales with overload).
- **Movement snack / walk** (5–15 min, low difficulty, high frequency early).
- **Mobility / warm-up** (short recurring).
- **Explicit rest/recovery day** (scheduled — a feature, not a gap).
- **Benchmark / progress test** (periodic one-off).
- **Workout log** (short).
- *Scaling:* classic progressive overload (volume then intensity) with **built-in deload/rest**.

### 4.3 Risk → response playbook
| Signal | Response | Engine-supported? |
|---|---|---|
| Missed sessions | Reschedule / reduce week's load / shrink session | **all engine-supported — cleanest fit** |
| Overtraining / soreness / fatigue | Insert rest, reduce intensity | resize down = yes |
| **Pain / injury** | **STOP that exercise**, do not coach through pain, advise rest / physio | **Intervention — gap #2** |
| Plateau | Progress / vary | add/resize up = yes |
| Medical symptoms (chest pain, dizziness) | Emergency resources, stop | **gap #2** |

### 4.4 Knowledge base
- **Sources:** ACSM / national physical-activity guidelines; exercise-physiology; PAR-Q readiness
  screening; recognised methodologies (couch-to-5K, standard strength progressions).
- **KB holds:** exercise library by goal, progression schemes, warm-up/mobility routines, deload
  logic, injury-vs-soreness guidance, readiness-screen questions.
- **KB must NOT hold:** injury-rehab protocols, medical-clearance decisions, PED/supplement advice.

### 4.5 Safety boundaries (must NEVER)
- Coach through pain or diagnose injuries — refer to physio/doctor.
- Skip readiness screening; flag heart conditions/pregnancy for clearance.
- Push injury-risking intensity on beginners.
- Give supplement/PED advice.
**→ Lightest safety review (readiness screen + injury/medical disclaimer). Can reach users soonest.**

### 4.6 Personalisation hooks
Goal (habit / event / strength / weight-health); current fitness level; injuries/limitations;
equipment/gym access; time per session; age/health flags (readiness screen).

---

## 5. Cross-cutting — COMMON (engine, built) vs DOMAIN-SPECIFIC (expert)

**COMMON — already built, stays in the engine/config, experts must NOT re-implement:**
- Milestone→Step object model and sequential arc.
- Scheduling Steps across weekly availability / preferred days / daypart.
- Adaptive re-plan primitives: reschedule · resize · refrequency · add · remove.
- Behaviour-signal tracking, InsightModel, NudgeHint, at-risk honesty.
- Non-punitive stance, **Grace Tokens**, reminders, miss-recovery reason→lever funnel.
- The deterministic, config-backed contract (same input → same plan).

**DOMAIN-SPECIFIC — lives in each expert:**
- The named Milestone arc (the 6 evidence-informed stages).
- Step-template library + difficulty/duration curves + scaling logic.
- Domain risk codes and their mapping to an engine adjustment **or** an Intervention.
- KB content (taxonomies, coping/exposure/habit/exercise libraries, scripts).
- Safety boundaries, crisis-detection triggers, referral resources.
- Personalisation hooks (which intake inputs reshape the arc).

---

## 6. Seam gaps the deepening surfaces (for architect / the parallel experts agent)

1. **RiskSignal enum is too small and severity-blind.** Today: `no_time | overloaded |
   tight_deadline`. Domains need domain risk codes **tagged with severity** (advisory / urgent /
   crisis). Recommend adding a `severity` field rather than exploding the enum. *Seam change —
   coordinate with the agent editing `experts/`.*
2. **No crisis/escalation channel — the #1 safety gap.** A `DomainExpert` can propose
   Milestones/Steps/advisory risks but **cannot** emit *"show crisis resources now"* or *"refer to
   an Ally/professional."* These are **Interventions** with no home in `ReplanResult`. Every domain
   needs this; recovery and self-confidence **cannot ship to real users without it.** Recommend a
   distinct **safety/triage seam** (or an escalation action on RiskSignal) — architect's call.
3. **No domain-intake input.** Personalisation hooks (substance type, feared situations, dietary
   restrictions/allergies, injuries) have nowhere to go — `GoalInput` is title/isHabit/
   description/cadence only. Recommend an optional **domain-answers bag** the expert defines and
   consumes (a short expert-declared questionnaire). Keep it **on-device-only** (same G1 invariant
   as `GoalInput`).
4. **No pre-plan safety gate.** An expert that detects a crisis signal at intake should be able to
   **refuse/redirect** instead of producing a plan. No such hook exists today.

---

## 7. Recommended build order & effort (SX deepening)

**Guiding principle — liability-ascending:** prove the deepening pattern on the safest domain, then
add safety machinery before the dangerous ones. Growth-before-engagement holds: all four are
pro-growth, but recovery/self-confidence **streaks can become shame traps** — guard with Grace
Tokens and non-punitive framing.

| Order | Work | Effort | Gate |
|---|---|---|---|
| 0 | Seam extensions: RiskSignal `severity`, domain-intake bag, **escalation/safety seam** (gaps #1–#4) | **M** — foundational, do first, coordinate with parallel agent | — |
| 1 | **Sport** expert deepening (cleanest engine fit, lightest safety) | **S–M** (mostly config libraries) | readiness screen + injury disclaimer |
| 2 | **Nutrition** expert deepening | **M** (libraries + ED screening) | ED screening + medical disclaimers |
| 3 | **Recovery** expert (build KB + arc now, **do NOT ship to users**) | **L** (KB depth, crisis content, localised resources) | **formal clinical/safety review + escalation seam live** |
| 4 | **Self-confidence** expert (same gate) | **L** (exposure hierarchies + CBT content + distress detection) | **safety review + distress detection + referral copy** |

Recovery and self-confidence can be **built in parallel as internal/shadow experts** while Sport and
Nutrition validate the pattern — but they are **hard-gated** behind step 0's escalation seam **and**
a professional safety review (ties to the Wysa-style guardrail + no-treatment-claims work already
flagged in `07 Open Questions §4` of the strategy WIP and `05_Research`).

**Next step to graduate any of this:** take steps 0–2 to architect for a plan and product-guardian
for a terminology/philosophy pass; route steps 3–4 additionally through security-privacy (intake
data) and a named clinical reviewer before any real-user exposure. Log approvals in
`06_Decisions/Decision_Log.md`.
