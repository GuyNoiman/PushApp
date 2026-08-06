# Strategy — Work In Progress (Finch, "Ignition", Miss-Recovery, Categories)

> ## ⚠️ THIS IS NOT FINAL. WE ARE STILL THINKING.
> This document captures an in-progress strategy conversation between the founder and the AI team
> (session of **2026-07-20**). **Nothing here is an approved decision.** Every strategic claim below
> is an **Open Question** per CLAUDE.md §3.6 — recorded so we can resume the thinking, not so we can
> present it as shipped. When something here graduates to a real decision, it moves to
> `06_Decisions/Decision_Log.md` and this note is updated to point at it.
>
> **Status:** thinking-in-progress · **Owner:** founder · **Do not cite as decided.**

Visual aids referenced below live next to this file:
- `01_categories.html` — proposed Journey category system (Option A vs Option B)
- `02_ignition_vs_finch.html` — the stages-of-change positioning map
- `03_miss_recovery_flow.html` — the miss-recovery funnel + reason→lever mapping

---

## 0. Why this conversation happened

The founder played with **Finch: Self-Care Pet** and realised it is far closer to PushApp than
expected (evolving avatar, quests/missions, categories, avatar dress-up + shop, motivational lines,
reminders, victory celebrations, a light friends mechanic). The core question that drove everything
below: **what actually differentiates PushApp from Finch, and is it enough?**

---

## 1. Finch — competitive findings (verified 2026-07-20)

Full research brief is in the session transcript; the load-bearing facts:

- **Finch is a serious, hard-to-beat incumbent.** Bootstrapped, **$0 VC raised**, **~$30M ARR**
  (analyst estimate), **~4.9★ with ~500k ratings**, a **Public Benefit Corporation**. Founders
  **Stephanie Yuan + Thomas "Nino" Budi** (ex-Quora) — *not* the names we had before; correct
  wherever recorded. A profitable, beloved, mission-aligned competitor is harder to displace than a
  VC-funded one.
- **Finch has NO creator marketplace.** Searched hard; well-corroborated absence. All structured
  content (Journeys/quests/exercises) is **first-party**, authored by Finch's internal team,
  CBT/positive-psychology-*informed* (not clinically validated). Users can create private custom
  goals and share a *single* goal with a friend — they **cannot** author a multi-step Journey and
  publish it to strangers. No coach tooling. No announced plans.
- **Finch positions as self-care / mental-wellbeing**, ~75% women, 25–35, TikTok-native. Core
  self-care is free forever; the paywall is mostly cosmetics. Deliberately **non-punitive** —
  the bird never dies, never guilts, missing days isn't punished.
- **What Finch users are literally asking for and Finch won't build:** photo-proof that a task was
  actually done. Finch won't add it because "proof" reintroduces the pressure their brand fled.

### Differentiation verdict (honest)
- At the **feature layer today**, PushApp is dangerously close to "Finch again, with a different
  animal." Acknowledge this; don't ship the cosmetic/avatar/quest layer as the headline.
- The **defensible trio** (all needed together, not any one alone):
  1. **Creator marketplace as a *network*, not a feature.** Finch *could* ship "share a goal-set"
     in a quarter, but becoming a two-sided creator economy is a multi-year identity shift that
     tensions directly against its curated-safe-uniform brand (and its PBC "no dark patterns"
     promise). **Be the platform Finch structurally doesn't want to become.** The moat is the
     network of creators + installs, not the marketplace UI. ⚠️ But two-sided platforms in this
     space *die* (see §1 of `05_Research/PushApp_Competitive_Research_v2_2026-07` — Nudge Coach,
     Practice, Profi all dead). The moat is also the risk; it must be built deliberately, seeding
     first-party content to solve cold-start.
  2. **Real-life-action accountability *without punishment*** — the photo-proof gap Finch won't
     touch, done via *documentation + a human "approving friend"* rather than image verification
     (founder's reframe — see §3). Guard with Grace Tokens so it never becomes a guilt machine.
  3. **Long-horizon transformation** — Dream → Journey → Phase → Step aimed at *becoming who you
     choose to be*, vs Finch's daily self-care loop.

---

## 2. The strategic reframe — **Ignition, not Maintenance** (the biggest idea here)

The founder's real "why", in his words: help people who **don't know how to find interests, have no
energy to start, don't know where to begin, and escape into distraction out of avoidance and fear of
failure** — and this will worsen as AI makes distraction more perfect.

**The insight:** every incumbent (Finch, Habitica, Fabulous) lives in the *action/maintenance* stage
of the transtheoretical **stages-of-change** model. They assume you already have a goal. The people
the founder wants to help are stuck **before the starting line** (pre-contemplation / contemplation)
— the hardest, most avoided, **least-served** stage. See `02_ignition_vs_finch.html`.

- Finch does a **maintenance** job: "feel a bit better today." PushApp's job is **ignition**:
  "become who you choose to be" — get the stuck person from *avoidance → first action → real
  transformation*. Different job-to-be-done, much emptier market space.
- This is **upstream of the current mission statement** ("closing the gap between intention and
  action"). The founder's paragraph is one step earlier: closing the gap between **avoidance and
  intention**. Candidate vision refinement — **Open Question**, not adopted.

Two questions the founder should answer to sharpen this (unresolved):
1. **The first 30 seconds.** A stuck user opens PushApp for the first time — what makes them feel
   "this understands me" instead of "another goals app"? If the answer is the AI coach, that moment
   is the real MVP.
2. **What does the Buddy represent?** Finch's bird = self-care metaphor (you tend it = you tend
   yourself). An ignition Buddy could be something else — *a partner who believes in you when you
   don't* — a different emotion that defines its whole personality. Decide explicitly.

---

## 3. The five product ideas the founder raised (with assessment)

1. **First-party Journeys + authoring templates (video / audio / questionnaire / text-log).**
   **Strong — maybe strongest.** Solves cold-start (we seed content) *and* is the composable
   primitive that makes the marketplace real. Finch's content is monolithic; ours is
   lego-composable — differentiates the *authoring*, not just the content.
2. **Photo upload as *documentation*, not verification, + an "approving friend."**
   **Strong, and better than what Finch users asked for.** Photo-verification is a trap (shallow or
   expensive image-processing, both gameable). The reframe swaps an unsolvable technical problem for
   a proven behavioural mechanism (**social accountability**) — and ties into the Ally / Support
   Circle pillar. Finch won't do it (reintroduces pressure). Real wedge.
3. **AI coach.** Not a separate idea — it's the **mechanism for §2's ignition thesis.** See §4.
4. **Contextual, adaptive communication** (calendar / location / tone) vs Finch's mechanical
   reminders. **Real, but a retention advantage, not an acquisition one.** Infra already exists
   (`CommunicationScheduler`). Don't lead with it.
5. **Cleaner UI than cluttered Finch.** **Table stakes, not a moat.** Switching costs (streaks +
   earned cosmetics) lock Finch users in. Don't lead with it.

---

## 4. AI — economics, architecture, safety (founder was rightly worried about cost)

**Founder's concern:** basing on a paid model could cost more than the subscription → losses; and a
therapy professional is needed to build it; and it should adapt tone.

**Findings (grounded in the current Claude API pricing, checked this session):**
- **You do not train a model.** Even Pi trained its own and Microsoft absorbed the team — training
  is a dead end here. This is a **prompt + content + guardrails** problem, not a model problem. The
  therapy professional designs the *conversation framework* (which becomes a system prompt), exactly
  like **Wysa** (scripted CBT dialogue + NLP intent detection — the safe, cheap pattern).
- **It is cheap if architected right.** Use a small model (**Haiku-class**), and **Prompt Caching**
  for the fixed professional system prompt (~90% cheaper on the cached portion). A realistic
  6-turn coaching conversation ≈ **~$0.02**. A heavy user at 5/month ≈ **~$0.09** — ~1% of an ~$8
  subscription, not 100%.
- **The danger is real but is "open-ended chat," not "AI".** Spectrum:
  - **Level 1** — AI only at high-value, low-frequency moments (onboarding discovery; miss-recovery
    "Other"). Bounded cost, big differentiation.
  - **Level 2** — free chat with the Buddy anytime. *Unbounded* cost; must be gated.
  - **Recommendation:** build the architecture to *support* Level 2, but *ship* Level 1 first,
    behind the paid tier, with a usage cap. ~80% of the value at controllable cost.
- **Tone adaptation is trivial** — pass the user's preferred tone as a variable in the system prompt.
- **Safety is non-negotiable.** Anything therapy-adjacent needs crisis detection + escalation and
  strict no-treatment-claims (ties to the NLP evidence/claims work in `05_Research`). The
  professional is needed for **guardrails**, not just quality. This is why Wysa scripts rather than
  free-chats.

---

## 5. Miss-Recovery Flow (the founder's design — a highlight of this session)

When a Step is missed, the founder's funnel — see `03_miss_recovery_flow.html`:

1. **"What do you want to do with this task?"** — closed list: **Postpone** / **Cancel** (Cancel
   costs **−1 Grace Token** = the built-in forgiveness/no-shame mechanism).
2. If Cancel → **"What happened?"** — closed list; the **last option is "Other."**
3. If "Other" → **AI chat** where the user writes freely and the AI responds.

**The founder's stated goal:** *learn the user* to help better next time, and derive system actions:
what to do with the task, whether to change reminder timing, whether to edit Journey rules, whether
to boost motivation or refer an Ally, etc.

### Why this design is excellent (and the key reframe)
- The funnel solves **cost, safety, and data-quality** simultaneously: AI runs only on the tiny
  "Other" slice; most interaction is scripted; and **closed-list answers are structured data a
  machine can act on** — free text is not. **The closed list is the product; the AI is the fallback.**
- **The decision engine is mostly rules, not AI** (`configuration-before-code`). Proposed mapping
  (hypothesis — *must be validated against research*, see below):

  | Reason (closed list) | Likely cause (behaviour science) | Lever | Rule or AI |
  |---|---|---|---|
  | Forgot | cue / reminder failure | change reminder timing / frequency | rule |
  | No time | planning failure | reschedule / reduce the week's load | rule |
  | Too hard | over-ambitious step | resize the Step / edit Journey rules | rule |
  | Lost motivation | waning "why" | reconnect to the Dream · boost motivation · refer an Ally | rule |
  | Life got in the way | external / legitimate | grace — no change, self-compassion | rule |
  | **Other** (free text) | unknown | AI: respond with empathy **and** classify into a lever above (or surface a new one) | **AI** |

- The **AI at "Other" does double duty**: an empathetic reply **and** a structured classification —
  a perfect fit for **Structured Outputs** (one cheap call returns both a warm message and a machine
  label). It feeds the learning system instead of being lost as free text.
- **"Learn the user" = a per-user reason profile over time** (e.g. always "no time" on Mondays →
  reduce Monday load). **Finch does none of this.** Genuine differentiation, not imitation.

### Cautions
- **Don't let Cancel-then-interrogate become a guilt machine** (the Finch lesson). The Grace-Token
  spend *is* the forgiveness; the "What happened?" copy must be **caring, not accusatory**
  ("Want to tell me what got in the way?" — never "Why didn't you do it?").
- **The reason list is the whole game** — it defines which levers can ever exist. It must be
  designed against research, not guessed. ⬇ open question.

---

## 6. Categories (this one has a decision direction)

Proposed a Journey **category** field: each category has a preset icon + colour; a new Journey
inherits them; an **"Other"** option always exists. See `01_categories.html`.

- **Founder chose Option B** — a *dedicated category palette* (adds green / amber / warm-red) that
  leaves the six brand accents free, because in the Design System **colour encodes meaning** and the
  six accents are already taken (teal = growth, coral = CTA, blue = XP, purple = social, gold =
  coins, pink = streak). Option A (reuse the six accents) collides and caps at 6 categories.
- Proposed starter set (unconfirmed): **Health · Fitness · Mind · Learning · Career · Relationships
  · Hobbies · Finance · Other.**
- **Build note:** `src/core/config/categories.ts` as the single source of truth (id, name, icon,
  colour, tint) — `configuration-before-code`. Add optional `categoryId?: string` to `Journey`
  (optional ⇒ existing Journeys stay valid, fall back to "Other", no migration).
- **Not yet done.** Still needs: final category list, English-vs-Hebrew label decision (repo is
  English; users are Israeli — affects whether a translation layer is needed now), and a
  product-guardian pass (Category is a new product term).

---

## 7. ▶ Open Questions / where to resume

1. **Is "Ignition, not Maintenance" the vision?** (§2) — founder's call. If yes, refine the mission
   statement and log it.
2. **Miss-recovery reason list** — founder to say whether to (a) propose it from research or (b) use
   reasons he already knows his users feel. This defines the levers. Then: focused **research pass**
   on miss-recovery (self-compassion vs guilt, implementation intentions, if-then replanning) + a
   **PRD** for the flow (closed lists, reason→lever mapping, the "Other" AI Structured-Output
   contract, and the per-user reason-profile data model).
3. **AI scope** — confirm Level-1-first, behind paid tier, with cap (§4).
4. **Categories** — finalise list + language + build `categories.ts` (§6). Founder already chose
   **Option B**.
5. **Marketplace cold-start** — who authors the first Journeys, and the authoring templates (§3.1).
6. **The Buddy's meaning** — self-care metaphor vs "partner who believes in you" (§2).
7. **Photo documentation of *doing*** (not verification) — should a Step allow attaching a photo as
   **documentation** it was done, explicitly **never** as image-verification (gameable + expensive)?
   Ties to §3.2. Open: exactly what it stores, on-device vs uploaded, privacy/data-minimization, and
   whether it's opt-in per Journey. **Must route through security-privacy before any build.**
8. **The "approving friend" / human accountability** — pair the documentation with a chosen friend
   who **approves** the done-Step: social accountability *without punishment* (the Finch photo-proof
   gap, reframed — §1, §3.2). Open: the consent flow, what the approver actually sees (minimize —
   a summary, not raw content), how it extends the **Ally / Support Circle** pillar, and the
   **Grace-Token** interaction so it never becomes a guilt machine. Sensitive: security-privacy +
   product-guardian before build.

9. **Milestones layer per Journey** (founder, 2026-07-21) — add a **milestone layer** to each Journey.
   Open: is a "milestone" the existing **Phase** (the Dream→Journey→Phase→Step mid-layer), a
   celebratory checkpoint *distinct* from Phase, or both? Must not fork terminology — route to
   product-guardian + product-manager before building.
10. **Conversation-first Journey creation** (founder, 2026-07-21) — make the **AI conversation the
    primary way to create a Journey**; the wizard becomes the secondary / "edit &amp; advanced" path.
    Directly serves the **Ignition / first-30-seconds** thesis (§2). Needs the AI Coach + the
    authoring templates (§3.1). Likely V2/MVP.
11. **10 canonical use-cases to validate** (founder, 2026-07-21) — founder to define **10 end-to-end
    processes** he wants to be able to test in the app; we write them as **acceptance scenarios**,
    confirm each is well-defined, and check the implementation against them. (The miss-recovery slice
    is presumably one of the 10.)
12. **The "learning machine" — adaptive communication** (founder, 2026-07-21) — refine the model that
    decides **when and how** to reach out. Weigh **successes** (the user acted on a nudge) vs
    **failures** (nudge ignored); track **methods** (Ally outreach · motivation line · plain reminder ·
    firmer nudge · …) and their **per-user success rate**; pick the best-performing method, keep
    exploring. Wants it **effective / fast / flexible / efficient** → lightweight per-user stats
    (bandit-style), **not** a trained model (consistent with §4). Requires a new **notification-outcome
    log** (a second signal source alongside the reason log) and a **philosophy guardrail**: a
    "scolding / rebuking" notification method must stay inside the **no-shame red-line** (route to
    product-guardian). This is the reserved **Intervention + User-Model/Profiling** seams getting real
    logic — security-privacy before build.

**Nothing above is approved.** Resume by picking one and taking it to product-manager /
product-guardian for a real decision.
