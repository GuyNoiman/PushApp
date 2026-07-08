# POC / MVP Scope

Status: **POC + MVP + roadmap staging defined 2026-07-08** (jointly with founder). Resolves D4.

> Per Decision_Log D4, this scope is defined **jointly with the founder**, not authored
> independently. It builds on the staging framework in `Product_Roadmap_and_Scope.md`
> (Vision → POC → MVP → Commercial → Future).

---

# 1. Proof of Concept (POC)

## 1.1 The single hypothesis (locked 2026-07-08)

> **"Do people follow through and *complete* their Journeys more when a chosen circle of
> friends can see and cheer their progress *and* an evolving Buddy companion reacts to it?"**

The POC tests the founder's core bet: that the **combination of social support + the Buddy
companion (and its reward loop)** drives **persistence** — not the goal-tracking alone.
A plain habit-tracker loop is table stakes; the POC exists to prove the *combination* is
what makes people keep going.

## 1.2 Success signal

- A meaningful share of POC users keep **checking in across ~4 weeks** and **complete (or
  substantially progress)** at least one Journey.
- When asked *"what kept you going?"*, users point to the **friends and/or the Buddy** (and
  its rewards) — not merely the reminders.
- Quantitative + qualitative together; the POC answers *"would people actually use it, and
  does the combination drive persistence?"* — not the full product.

## 1.3 In scope (thin version of each pillar)

- **Journey loop** — user creates a Journey (name · duration/rhythm · a few Steps · a
  **Starter Step** · their **"why"**) → checks in → progress updates. Home shows "what to do now."
- **Buddy** — an evolving companion that **reacts to check-ins**, **evolves by progress**
  (egg → stages), and **celebrates** completions. The emotional anchor.
- **Social / support** — add friends; choose some as **Allies** who see your active Journeys
  + progress and can **cheer / nudge**; you see theirs too. (Support Circle = friends only.)
- **Coin economy + Shop** — earn coins from check-ins / missions → spend on **Buddy
  cosmetics / customization**. This is how the Buddy loop becomes rewarding and pulls users back.
- **Missions + Login rewards** — daily / weekly missions and a daily-login reward that grant
  coins (the return loop).
- **Basic reminders** — time / day. No adaptive AI.

## 1.4 Explicitly out of scope (defer to MVP / Commercial)

Adaptive / AI **Intervention Engine** (basic reminders only) · **Explore / Marketplace /
templates / creators / brands** · **Achievements** wall · **Weekly-planning** flow ·
**Phases** complexity · **public / creator** Journeys · rich onboarding.

## 1.5 Guardrails

- **Shallow economy.** A small cosmetic set, a handful of mission types, **one currency
  (coins; no gems)**. Enough to make the Buddy loop feel alive — not a full game economy.
- **Attribution caveat.** A combined POC **cannot** cleanly separate whether *social* or
  *Buddy* did the work — only that the combination does (or doesn't). This is an accepted
  trade for testing the real bet. Mitigation: **instrument both** (cheer interactions, Buddy
  interactions, coin/shop actions) and correlate with who persists. Cleanly isolating the two
  levers is an **A/B in the MVP**, not the POC.
- **Vision intact.** Nothing here shrinks the long-term vision; out-of-scope items are
  *staged later*, not cut (per `Product_Roadmap_and_Scope.md`).

---

# 2. MVP (delta from POC) — defined 2026-07-08

**MVP job:** the smallest product a young adult could **adopt on their own and keep getting
value from over *months*** (not just the 4-week POC), that visibly shows why PushApp beats
"a habit tracker + a group chat." Per Decision_Log **D2**, AI is part of the MVP but **no
core flow depends on it** — AI only enhances.

## 2.1 MVP = POC + these additions (locked)

- **Explore + a starter Journey library** — browse and **adopt** existing Journeys, not only
  build from scratch. Solves the cold-start "blank page" that would otherwise block activation.
- **Proper onboarding** — a real first-run, including the **egg → hatch** Buddy moment.
- **Journey Phases + the full Journey types** (frequency · completion · avoidance ·
  critical-compliance · hybrid) — for Journeys that aren't trivially simple.
- **Light AI (enhancement only):** **personalized encouragement** generated from the user's
  **"why"** answers, plus **smarter-timed reminders**. Everything still works if AI is down.

## 2.2 Explicitly deferred to Commercial (chosen 2026-07-08)

- **Adaptive Intervention Engine** (even the light multi-signal version) — MVP keeps
  smarter reminders only.
- **Weekly-planning flow.**
- **AI Buddy-drafts-your-Journey** (the paid tier / conversational drafting).
- **Achievements wall.**
- **Marketplace / creators / brands**, and **broader Ally types** beyond friends.

## 2.3 Why this is still a differentiated MVP

The differentiation is the **integrated loop proven in the POC** — social support + evolving
Buddy + its reward economy driving persistence — now made **adoptable** (library +
onboarding + real Journey types) and **lightly personalized** (AI encouragement/reminders).
AI is a garnish, not the meal (D2).

---

# 3. Roadmap staging (2026-07-08)

Framework: `Product_Roadmap_and_Scope.md` (Stage 0 Vision → 1 POC → 2 MVP → 3 Commercial → Future).

- **Stage 1 — POC:** §1 above. Validate social + Buddy (+ reward loop) → persistence.
- **Stage 2 — MVP:** POC + Explore/library + onboarding (egg→hatch) + Phases/full Journey
  types + light AI encouragement & smarter reminders.
- **Stage 3 — Commercial:** adaptive Intervention Engine · weekly planning · AI
  Journey-drafting (paid) · Achievements · Marketplace/creators/brands · broader Ally types ·
  deeper economy (e.g. second currency) · Buddy customization depth.
- **Long-term / Vision:** Buddy voice & conversations, Interactive Journey Experiences,
  AI-generated personal roadmaps, the full dynamic Intervention Engine, Business Journeys,
  advanced psychological personalization (`Product_Roadmap_and_Scope.md` Long-Term Vision).

Going forward, features added to the repo should carry a `Stage:` field.

---

# Provenance

- POC hypothesis + scope defined jointly with the founder on 2026-07-08 (session decision;
  see `06_Decisions/Decision_Log.md`). Supersedes the "Known inputs / tentative direction"
  placeholder.
