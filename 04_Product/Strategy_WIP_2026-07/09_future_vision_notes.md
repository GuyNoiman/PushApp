# Future-Vision Notes — Journey Templates + Aggregate Outcomes, Goal-Linked Communities, App-Essence North Star

> ## ⚠️ WORK IN PROGRESS — characterization (אפיון) in progress, nothing here is approved-built.
> This doc records **three founder product ideas** raised during the ongoing AI-adaptive-coach
> characterization, refined to buildable-spec quality **so we can resume the thinking** — not so we
> can present them as shipped. Per CLAUDE.md §3.6 every item below is **Future Vision** or **Open
> Question**; **none is Approved-built.** When one graduates to a real decision it moves to
> `06_Decisions/Decision_Log.md` and this note is updated to point at it.
>
> **Status:** thinking-in-progress · **Owner:** product-manager · **Do not cite as decided.**
> **Additive only:** this extends the strategy WIP; it does not rewrite any prior doc.

**Context.** PushApp is an **AI adaptive coach** (Decision Log **D23**, 2026-08-01): a
**domain-agnostic engine** builds a **Journey** (**Milestones → Steps**) from a goal, tracks
behaviour, and **adaptively re-plans** (reschedule / resize / refrequency / add / remove). The
mission is unchanged — *help people become who they choose to be*. These three ideas sit **on top of**
that engine; none of them changes the engine or the mission.

Canonical terminology throughout: **Dream · Journey · Milestone · Step · Buddy · Ally · Support
Circle · Grace Token · XP · Coins.**

**Cross-references:**
- `06_Decisions/Decision_Log.md` **D23** — the AI-adaptive-coach pivot these ideas build on (mission
  unchanged; domain-agnostic engine; local-first privacy split).
- `08_domain_experts_deepening.md` (this folder) — the `DomainExpert` seam that supplies the
  *knowledge* a Journey Template encodes; Idea 1's "template skeleton" is exactly what an expert's
  `proposeMilestones` / `stepTemplatesFor` produce, frozen and made shareable.
- `README.md` §3.1 (first-party Journeys + authoring templates) and §3.2/§7 Q8 (the "approving
  friend" / same-goal social ideas) — Ideas 1 and 2 are the larger-scope continuation of both.
- `04_Product/Version_Roadmap.md` — V3 "Journey Template foundations / Community Insights", V4
  Marketplace and "Broader Ally types"; Ideas 1 and 2 extend these.

---

## The app essence — north star (record verbatim) · **Open Question (positioning refinement)**

The founder's crisp framing of the app's current essence, to record **verbatim** as the north star:

> **"Building personal plans, and helping / being helped by one another in order to persist in them."**

**What it is.** A one-sentence compression of the whole product surface into its two load-bearing
halves:
1. **"Building personal plans"** — the adaptive engine (Dream → Journey → Milestone → Step,
   personalized and re-planned per user).
2. **"Helping / being helped by one another in order to persist in them"** — the social /
   accountability pillar (Ally, Support Circle) as the *persistence mechanism*, not decoration.

**Why it matters (problem it solves).** The pivot (D23) changed the *mechanism* (companion app → AI
coach) but the team still needs a single, sharable sentence that says what the app **is** today, in
the founder's own words. This sentence does that: it names **plans + mutual support for persistence**
as the essence, and it makes the social pillar first-class in the definition rather than an add-on.

**Why it fits the philosophy.** It is mission-aligned by construction — "personal plans" serves
*becoming who you choose to be*, and "helping / being helped … to persist" is **growth-through-
mutual-support**, not engagement-for-its-own-sake. It sharpens (does not replace) the mission
statement in `09_Product_Philosophy/Product_Philosophy.md` ("helping people become who they choose to
be").

**Relationship to the "Ignition, not Maintenance" open question** (`README.md` §2): compatible, not
competing. Ignition is a *stage-of-change* refinement (help the stuck person reach the starting
line); this north star is a *whole-product essence* statement. If both are adopted, ignition sharpens
*who we serve first* and this sentence sharpens *what the app fundamentally does*.

**Stage / categorization:** **Open Question — positioning refinement.** Recorded verbatim as the
working north star; **not** a decided change to the canonical mission statement. Graduating it =
founder confirms whether it (a) becomes an official positioning line alongside the mission, and
(b) gets logged in the Decision Log + reflected (via a small pointer, not a rewrite) in
Product_Philosophy. **Do not rewrite Product_Philosophy on the strength of this note.**

---

## Idea 1 — Journey recommendation from aggregate success data · **Future Vision (V3 → V4)**

### 1.1 What it is
Two coupled layers on top of today's engine:

1. **A "Journey Template" library.** At launch we offer Journeys **built from information sources**
   (first-party / expert-authored). Over time these become a browsable **library of reusable Journey
   Templates** a user can adopt.
2. **An aggregate-outcomes analytics layer.** We accumulate, per Template, **which Journeys succeeded
   more vs. less and were rated useful**, and eventually **recommend the best-performing ones** — e.g.
   surface *"80% completed this Journey successfully and reported it useful."*

### 1.2 The crucial model distinction (founder's framing — the heart of this idea)
A Journey Template splits cleanly into a **stable skeleton** and **dynamic per-user parameters**:

| | **STABLE — defines the Template** | **DYNAMIC — per-user, per-performance** |
|---|---|---|
| Contents | **Step content** + **linked media** (video / audio / text) + **Milestones** + **the goal** | **frequency**, **step duration**, **pacing**, scheduling, difficulty ramp |
| Who owns it | the Template (authored once, shared to many) | the **adaptive engine**, per user |
| Changes when | the author revises the Template | the user's behaviour changes (already handled today) |

**Key consequence:** the dynamic params are **already solved** — the adaptive engine
(reschedule / resize / refrequency) *is* the per-user layer. So this idea is **not** new planning
logic; it is **(a) freezing the skeleton into a shareable Template object** and **(b) an aggregate
analytics layer** measuring outcomes across all users of that skeleton. The `DomainExpert` seam
(`08_domain_experts_deepening.md`) is exactly what *produces* a good skeleton — a Template can be
thought of as a *frozen, curated expert output* plus its linked media.

### 1.3 Problem it solves
- **Cold-start & trust.** New users don't know which plan will actually work for them. Social proof
  from real outcomes ("80% finished and found it useful") beats a marketing blurb — it steers people
  toward plans that demonstrably help real-life change.
- **Quality signal for authors.** Aggregate outcomes tell us (and, later, creators) which Templates
  earn their place and which to retire — a feedback loop on *content quality measured by persistence*,
  not downloads.

### 1.4 Why it fits the philosophy (growth before engagement)
It ranks Templates by **completion + reported usefulness (real-life value)**, **not** by time-in-app,
opens, or streak length. That is *growth-before-engagement instrumented directly*: we surface what
helps people *become who they choose to be*, measured by whether they finished and it mattered.
**Guardrail to watch:** "success %" must reward genuine transformation, not gameable check-in volume —
usefulness rating (did it help my life?) must carry real weight alongside raw completion, or we risk
optimizing for easy Journeys that complete but don't change anyone.

### 1.5 Privacy constraint (state explicitly — non-negotiable)
The success data must be **AGGREGATE / anonymized** — **counts, completion %, usefulness ratings
only** — **never raw personal data.** Raw personal disclosures and per-user behaviour stay
**on-device** per the **local-first split** (D23 point 5; red-line R3, D21). This idea therefore
**introduces a new surface the app does not have today: a server-side aggregate store** (minimal
derived counts, no free text, no PII). That is a genuine addition beyond the current on-device-only
posture and **must route through security-privacy before any build** (what is stored, k-anonymity /
minimum-cohort thresholds before a stat is ever shown, and how usefulness ratings are collected
without leaking identity).

### 1.6 Complexity it adds
- **New object:** `JourneyTemplate` (stable skeleton = goal + Milestones + Step content + linked
  media refs). Adopting a Template instantiates a per-user Journey the engine then personalizes.
- **New backend surface:** an aggregate-outcomes store + ingestion of anonymized completion /
  usefulness signals (the first *analytics* backend; today's data is on-device).
- **Media handling:** linked video / audio introduces hosting, bandwidth, and **cost** (storage +
  egress) — flag for **cost-guardian** before any media backend is provisioned.
- **Recommendation surface:** UI to browse Templates ranked by outcome, with honest, non-manipulative
  stat display.

### 1.7 Stage
**Future Vision.** Foundations already sit at **V3** in the roadmap ("Journey Template foundations",
"Community Insights / Journey reviews"); the **aggregate-outcomes recommendation layer** is **V3 → V4**
(matures into the Marketplace ranking signal at V4). **Deferred, honestly:** no Template object, no
analytics backend, and no media hosting exist today; the engine's per-user layer is the only part
that is real now.

---

## Idea 2 — Goal-linked communities · **Future Vision (V4 Scale)**

### 2.1 What it is
**Every Journey is linked to a goal; each goal has a support group / community** — a **chat-like
environment** where users who chose the **same goal** communicate, support each other, and receive
**relevant pushed content**. This **expands the social / accountability layer beyond the MVP's single
1:1 accountability partner** (one Ally) to a **many-to-many, goal-scoped community**.

### 2.2 Problem it solves
- **Persistence through belonging.** People stick to hard change when others pursuing the *same* goal
  are visibly alongside them — normalizing setbacks, sharing what worked, providing "I'm not alone."
  The 1:1 Ally is powerful but narrow; a same-goal community scales mutual support and covers users
  who don't have a willing friend to pair with.
- **A distribution channel for relevant content.** Goal-scoped communities are the natural place to
  push Template updates, expert tips, and peer wins to exactly the people they're relevant to.

### 2.3 Why it fits the philosophy
It is the **"helping / being helped by one another in order to persist"** half of the north star made
concrete at scale. Mutual support toward real goals is pure growth-before-engagement — **provided**
the community optimizes for *progress and encouragement*, not for chat volume or daily returns.
**Tension to flag:** community chat is the classic place where *engagement metrics* (messages/day,
DAU) start masquerading as success. If we ever tune it for time-in-chat rather than goal progress, it
violates the mission. Keep the success metric on **goal persistence of members**, not chat activity.

### 2.4 Complexity & risk it adds (significant — this is why it's V4)
- **Real-time chat infrastructure** — a large new surface (messaging, presence, notifications,
  history) the app has none of today.
- **Moderation & safety** — the biggest concern. Same-goal communities include **sensitive domains**
  (recovery, self-confidence, nutrition — see `08_domain_experts_deepening.md` §1–3): risk of harmful
  advice, crisis disclosures in a peer channel, harassment, bad actors. Requires a **moderation
  system + a crisis-escalation path** (which the app also still lacks — see the escalation-seam gap in
  `08_domain_experts_deepening.md` §6 #2). **Flag for a later security-privacy + safety pass before
  any build.**
- **Privacy** — joining a goal community reveals *what goal you're pursuing* to strangers; membership,
  visibility, pseudonymity (handle + Buddy identity per D19, never legal name), and consent all need
  design. **security-privacy gate required.**
- **Connection to same-goal matching.** This connects to the **same-goal matching** idea already
  noted in earlier social specs (`README.md` §3.2 / §7 Q8, the "approving friend" thread) — a
  community is the group-scale version of the same matching signal that pairs 1:1 Allies. Design them
  as one coherent social pillar, not two.

### 2.5 Stage
**Future Vision — V4 (Scale / Ecosystem).** Deliberately **bigger scope than the MVP.** The MVP ships
the **single 1:1 accountability Ally**; goal-linked communities are the *expansion* of that pillar and
must not be pulled forward ahead of moderation + crisis-escalation infrastructure. **Deferred,
honestly:** no chat, no moderation, and no crisis-escalation path exist today; all three are
prerequisites, and the sensitive-domain safety review (`08_domain_experts_deepening.md` §7) gates any
community touching those domains.

---

## Idea 3 — Dynamic (learned) closed answer-options · **Future Vision (V3 → V4)**

### 3.1 What it is
Today each **DomainExpert** authors **static** closed answer-options per interview question, plus an
**"Other" free-text escape** (see `08_domain_experts_deepening.md` — the expert seam that authors the
interview). Future: make the options **DYNAMIC**. When the app presents a question it shows the
**expert's SEED options** PLUS the **Top-N most common real answers** to that same question, **learned
from AGGREGATE user data** — including **clustering frequently-typed "Other" answers** and promoting
the common ones into first-class options. The interview keeps getting better at offering people the
answer they were about to type.

### 3.2 Problem it solves
- **Better questions, less typing.** Static option lists are only as good as the author's foresight;
  the most common real answer is often hiding in "Other." Surfacing it as a tap-option lowers friction
  and improves data quality at the exact moment a user is defining their goal.
- **Content quality signal for authors.** A steady stream of "Other" answers clustering around one
  theme tells us (and later, creators) the seed list has a gap — a feedback loop on interview quality.

### 3.3 Why it fits the philosophy
It sharpens the **onboarding-to-plan** path (helping people articulate what they actually want) rather
than driving time-in-app. **Guardrail to watch:** promoted options must reflect genuine common intent,
not steer everyone toward the same "popular" goal — the "Other" escape must always remain, and
promotion must never crowd out a user's real answer. Keep it an *articulation aid*, not a nudge.

### 3.4 Why it is low-cost on the interface (already data-shaped)
The `DomainExpert` interface **already treats answer-options as data**, so options can be sourced from
a **seed list + a dynamic options-provider** with **no interface change**. Concretely: an
`optionsFor(question)` resolver returns `seedOptions ⊕ promotedOptions`, where `promotedOptions` come
from the aggregate store. Bootstrapping is graceful — start from **seed only**, then **promote common
"Other" answers as data accrues**, so the feature degrades cleanly to today's behaviour with zero data.

### 3.5 Privacy constraint (state explicitly — non-negotiable)
Requires a **server-side AGGREGATE store counting answer distributions per question** — **counts /
frequencies only, never raw personal answers.** This is the **same local-first split** as Idea 1
(D23 point 5; red-line R3, D21): aggregate/anonymized derived counts leave the device, raw disclosures
never do. Clustering of "Other" free-text into promoted options is the sensitive part — it must run on
**aggregated, de-identified text** with **minimum-cohort (k-anonymity) thresholds** before any answer
is ever promoted or shown, and must not resurface a rare, identifying free-text answer. **Routes
through security-privacy before any build** (what is stored, clustering method, promotion thresholds).

### 3.6 Relationship to Idea 1
This is the **same aggregate-analytics backend** as Idea 1 (Journey Templates + aggregate outcomes),
applied one layer earlier — to the **interview** instead of to **Journey outcomes**. If Idea 1's
aggregate-outcomes store gets built, Idea 3 is a **second consumer of it** (per-question answer
distributions alongside per-Template completion/usefulness). Design the aggregate store once to serve
both. Ties directly to `08_domain_experts_deepening.md` (the interview/expert seam) and to Idea 1 above.

### 3.7 Stage
**Future Vision — V3 → V4.** Depends on the same aggregate-store surface as Idea 1, which does not
exist today. **Deferred, honestly:** today's options are static seed lists with an "Other" escape;
the dynamic options-provider, the per-question distribution store, and the "Other"-clustering all
require the analytics backend Idea 1 introduces. Ships no earlier than that store.

---

## Idea 4 — Personalized age-progression avatar (user likeness) · **Future Vision (far — NOT initial)**

### 4.1 What it is
An **optional** evolution of the **Buddy**: if the user **uploads photos of themselves**, the avatar
becomes a **stylized likeness of them that ages with progression** — starting as a **baby with hints
of the user**, growing to **resemble them**, and ultimately becoming a **wise "sensei" / elder figure**
("grown in spirit"). It is the **personalized, ambitious version** of the existing **evolving,
level-linked avatar (Buddy)** — same "growth made visible" idea, bound to *the user's own face*
instead of a generic creature.

### 4.2 Problem it solves
- **Identification & meaning.** Seeing *yourself* grow wiser as you persist makes the growth metaphor
  personal — the reward is literally "the person I'm becoming," which is the mission stated as an image.
  It deepens the emotional stake in persistence beyond a generic companion.

### 4.3 Why it fits the philosophy
It is **growth-made-visible tied to real progression** (level → age-stage), not an engagement loop —
the avatar advances only as the user's *real-life* Journey advances. It literally renders *becoming who
you choose to be.* **Tension to flag:** must stay a *reflection of real progress*, never a
manipulation/vanity hook that pulls people back to admire an avatar rather than do the work.

### 4.4 What's needed / risks (why this is far-future, not initial)
- **Identity-preserving generation pipeline.** An identity-preserving **generative image or 3D
  pipeline conditioned on the user's photos**, producing age-stage renderings tied to level. This is a
  substantial new capability beyond today's Buddy pipeline (see `buddy-3d-pipeline` in memory — baked
  GLB creatures; face rendering is *already an open item* even for generic Buddies).
- **SIGNIFICANT privacy / consent weight — the dominant risk.** Face photos are **sensitive /
  biometric personal data (GDPR special category)**. Needs **explicit, separate consent**, secure
  (**ideally on-device / encrypted**) storage, clear deletion, and a hard line against any secondary
  use. This is **heavier than any privacy surface in Ideas 1–3** (which are aggregate-only) — those
  never touch raw personal data; this one touches the *most* sensitive personal data there is.
  **Mandatory security-privacy + store-compliance gate before any exploration.**
- **Per-user / per-stage generation cost.** Generating multiple age-stage renderings per user is a
  real, recurring **compute cost** — **flag for cost-guardian** before any pipeline is provisioned.
- **Quality / consistency across age stages is genuinely hard.** Keeping a recognizable, flattering,
  consistent likeness from baby → adult → elder is an unsolved-in-practice problem; poor results could
  feel uncanny or insulting rather than motivating.

### 4.5 Stage
**Future Vision — far. Explicitly NOT for the initial version** (founder's own note). Recorded so the
ambition is preserved (the vision never shrinks — CLAUDE.md §3.3) without any implication it is near.
**Deferred, honestly:** the generic evolving Buddy is the real, current avatar; this personalized,
face-conditioned, age-progressing version is a distant aspiration gated on generative-pipeline
maturity, heavy consent/biometric handling, and cost — none of which exist today.

---

## Where these graduate

| Idea | Categorization | Stage | Gate before build |
|---|---|---|---|
| App-essence north star | Open Question (positioning) | — | founder confirms; log in Decision Log; pointer into Product_Philosophy (no rewrite) |
| Journey Templates + aggregate outcomes | Future Vision | V3 → V4 | security-privacy (aggregate store, k-anonymity); cost-guardian (media hosting); product-guardian (growth-not-engagement ranking) |
| Goal-linked communities | Future Vision | V4 (Scale) | security-privacy + **safety/moderation + crisis-escalation** pass; product-guardian (persistence-not-chat metric) |
| Dynamic (learned) closed answer-options | Future Vision | V3 → V4 | security-privacy (aggregate answer-distribution store, "Other"-clustering, k-anonymity promotion thresholds); shares Idea 1's backend; product-guardian (articulation-aid-not-nudge) |
| Personalized age-progression avatar (user likeness) | Future Vision (far — **NOT initial**) | — | security-privacy + store-compliance (**biometric / GDPR special-category** consent + secure storage); cost-guardian (per-user/per-stage generation); quality/consistency R&D |

**Nothing above is approved-built.** Resume by taking one item to product-manager for a full PRD and
product-guardian for a philosophy/terminology pass; route Ideas 1–2 additionally through
security-privacy (and cost-guardian for media) before any implementation.
