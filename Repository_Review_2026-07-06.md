# Repository Review — Pre-Series-A

Status: Draft for founder review · Prepared 2026-07-06

> Scope: a critical review of the PushApp knowledge repository "as if reviewing the
> product before Series A funding." This document **identifies** issues — product
> inconsistencies, missing systems/documentation, UX risks, scalability and naming
> concerns. It intentionally does **not** redesign or implement. Each finding has a
> severity and a location, and the end lists decisions that need the founder.
>
> Severity: **P0** = blocks clarity / a funding conversation · **P1** = resolve before
> build · **P2** = hygiene / polish.

---

## Executive Summary

The repository is unusually strong for day-zero: a coherent philosophy, precise
terminology, an honest evidence base, and a clear competitive thesis. The biggest
risks are not the vision — they are **unmade decisions repeated across many
documents**, a **product surface that is very wide for a first build**, and
**investor-readiness gaps the deck itself already flags**.

The five things most worth resolving first:

1. **Pick a beachhead market.** (P0) Eight candidates, zero chosen — repeated in ~6 docs.
2. **Resolve "how much AI is in the MVP."** (P0) The docs actively contradict each other.
3. **Decide the product name.** (P0) "PushApp" contradicts the positioning; the deck flags it.
4. **Define the POC / MVP scope as one page.** (P0) Currently scattered and undecided.
5. **Document the object model** — including the unnamed Journey→Step middle layer. (P1)

---

## Strengths (worth protecting)

- **Philosophical coherence.** Every doc traces back to one mission; `Product_Philosophy.md` and `AI_Product_Principles.md` are genuinely usable decision tools.
- **Terminology discipline.** Dream / Journey / Step / Buddy / Ally / Support Circle are precise and now consistent across live docs.
- **Honest evidence base.** `Research_Foundation.md` excludes weak citations and marks what is *not* yet proven — rare and credible.
- **Clear competitive thesis.** `Competitive_Landscape.md` makes a defensible "no direct competitor / we combine categories" case.
- **A refreshingly self-critical deck.** `PushApp_Deck_Content.md` already names its own gaps.

---

## 1. Product Inconsistencies

- **[P0] Beachhead market is undecided everywhere.** Vision, `Product_Bible.md` §24/§32, `Open_Questions.md`, `Investor_Questions.md` Q3, and the deck all list candidates (coaching clients, smoking cessation, fitness, courses, support groups, medical adherence, self-dev/NLP) but commit to none. The deck (slide 12) recommends *coaching clients*; nothing else does. This one unmade decision cascades into GTM, ICP, and MVP scope.
- **[P0] "How much AI is in the MVP" contradicts itself.** `Product_Bible.md` §15.1 ("AI Is Optional, Not Core MVP") and §27 ("MVP should not depend on AI") vs the 2026-07-05 update / `Product_Roadmap_and_Scope.md` ("MVP may already include premium AI"). Already flagged in the Roadmap doc; needs a ruling.
- **[P1] Home model decision not reflected in the Bible.** Home is now decided as **action-based**, but `Product_Bible.md` §11.2 still presents "Journeys vs Actions" as an open question. Update needed so the Bible matches the decision.
- **[P1] The Journey→Step middle layer ("Phase") is undocumented.** Confirmed to exist (optional, sequential grouping of Steps), but every doc still shows only Dream→Journey→Step. No doc names or defines it.
- **[P2] Max Journey duration.** Decided as "2 months, configurable," but `Product_Bible.md` still says "2–3 months" / "~2 or 3 months" in places (§3.3). Minor, but it's a defined parameter.
- **[P2] "Avatar" vs "Buddy" legacy overlap.** `Product_Bible.md` §21.1–21.2 still frames an "Avatar," then §21.5 says the avatar "should evolve into Buddy." The avatar-era framing should be folded into Buddy to avoid a dual concept.
- **[P2] Mission naming drift.** "Daily Mission" (Bible), "Mission" (Terminology), "Global Missions" (Screen_Bible) refer to the same object.

## 2. Naming Problems

- **[P0] "PushApp" fights the positioning.** The name evokes *push notifications* — precisely the attention-economy behavior the product opposes ("return attention to life"). The deck flags this directly (slide 7). For a consumer brand this is a real go-to-market liability.
- **[P1] The middle layer is unnamed** (Phase / Chapter / Part — undecided).
- **[P1] Ally sub-types are unnamed** (chosen friend vs stranger on the same Journey vs support-group member).
- **[P2] Overlapping discovery nouns.** "Growth Library," "Marketplace," "Journey Marketplace," and "Explore" describe adjacent concepts without a crisp boundary.

## 3. Missing Systems & Documentation

- **[P1] No object / data model.** For a configurable Journey Engine (rules, phases, steps, reporting mechanisms, visibility, rewards), the absence of a formal object model is the biggest structural documentation gap. `Product_Bible.md` §29 already lists it as needed. The unnamed Phase layer is a symptom.
- **[P1] No onboarding / first-run flow.** How a new user gets their first Journey, meets Buddy, and reaches the "magic moment" is undocumented — arguably the highest-leverage flow in the product.
- **[P1] Intervention Engine has philosophy but no MVP spec.** Strong "why," but no first-version definition: which signals, what triggers, how success is measured. `Open_Questions.md` acknowledges this.
- **[P1] No metrics / analytics framework.** Only candidate North Stars exist (`Investor_Questions.md` Q17). No activation/retention/completion instrumentation plan.
- **[P1] No privacy / data model / security posture.** The moat depends on behavioral data; features touch geofencing, app-usage, mood, and (adjacent) health. This needs an explicit stance well before build.
- **[P2] Research docs are mostly empty stubs.** `05_Research/Research.md` and `04_Product/Roadmap/Research.md` are near-duplicate TODO skeletons; real evidence lives only in `Research_Foundation.md`.
- **[P2] No explicit monetization/pricing model** beyond hypotheses.

## 4. UX Risks

- **[P1] Gamification vs anti-engagement is an unresolved core tension.** The product wants XP, Coins, streaks, and Buddy attachment *and* "success = the user leaves the app." Streaks in particular can create the shame/pressure the philosophy forbids. This needs explicit design guardrails, not just principle statements.
- **[P1] First-build surface is very wide.** Journey Engine + Buddy + gamification + Support Circle + Interventions + (later) Marketplace is a lot to make feel simple. "One screen, one job" is the right instinct, but the number of systems is itself the risk. Ties directly to the undefined POC/MVP scope.
- **[P1] Cold-start / empty states.** Marketplace, Community Insights, and Friends all need critical mass; a solo new user could see a hollow product. Partially mitigated (Community Insight unlock threshold), but not addressed holistically (e.g., friendless first week).
- **[P2] Buddy "quieter when drifting" may still read as guilt** despite the no-shame intent — worth explicit copy/testing guardrails.

## 5. Scalability & Architecture Concerns

*(Deep technical design is correctly deferred to the future Engineering Bible; these are product-level flags.)*

- **[P1] The moat is chicken-and-egg.** The Intervention Engine's "learning system" advantage only appears at data scale, but early users are exactly when there's no data. The early-value story must not depend on the mature-data story.
- **[P1] Marketplace is a two-sided cold-start** (creators + users) with a real seeding problem, plus real-money coach flows (payments/regulatory). Correctly marked "future," but the dependency should be explicit.
- **[P2] Context features carry platform friction.** Geofencing / app-usage monitoring face iOS permission, battery, and privacy constraints that may limit the intervention vision on the most valuable platform.
- **[P2] AI cost at scale** is flagged but unquantified; it bounds the free tier.

## 6. Investor / Series-A Readiness

The deck (`PushApp_Deck_Content.md`) is candid; its own TODO list is accurate. The gaps that matter most for a raise:

- **[P0] No traction / validation.** No prototype data, waitlist, or pilot. The deck rightly calls a concierge test (manual interventions, 50–100 people, completion X%→Y%) the single highest-impact missing artifact.
- **[P0] No team / founder-market-fit slide.** Cannot be blank in the room.
- **[P1] No market sizing** (TAM/SAM/SOM, bottom-up).
- **[P1] No defined ask** (amount + the one milestone it de-risks).
- **[P1] "Why now" lacks a proprietary, quantified wedge.**

## 7. Repository Hygiene (meta)

- **[P2] Redundant research docs.** Two `Research.md` files + a `Competitive_Analysis.md` stub that overlaps `Competitive_Landscape.md`. Consolidate.
- **[P2] Two terminology sources.** `Glossary.md` (a near-empty stub) overlaps and can drift from `Product_Terminology.md`. Pick one home (recommend folding Glossary into Terminology).
- **[P2] IA file naming/location.** `00_Foundation/Information_Architecture(1).md` — the `(1)` is a download artifact and it arguably belongs in `04_Product/`.
- **[P2] Empty placeholder folders.** `04_Product/{AI,Community,Marketplace,Quests,Recommendation_Engine,Support_System}` (note the legacy `Quests/` name), plus empty `06_Decisions/` and `07_Assets/`.
- **[P2] Transient docs linger.** `Batch_1_Update_Summary.md` is a process artifact that could move to `08_Archive/`. `Product_Bible.md` §26/§29 duplicate `Open_Questions.md`.

---

## Decisions that need the founder

These are strategy calls, not cleanup — I will not make them unilaterally:

1. **Beachhead market** — pick one (deck recommends coaching clients).
2. **MVP × AI** — is basic personalization in the MVP, or is AI strictly post-MVP?
3. **Product name** — keep "PushApp" or rename?
4. **POC scope** — lock the one-page definition (we started this; it's still open).
5. **Middle-layer name** — Phase / Chapter / Part?

## Suggested sequence after approval (not yet executed)

1. Founder decisions above → record in the Bible + a new `06_Decisions/` log.
2. Reflect decided items into the Bible (Home = action-based; duration; Phase layer).
3. Write the missing core docs: **object model**, **onboarding flow**, **POC/MVP one-pager**.
4. Repository hygiene (consolidate research/terminology; fix IA filename; prune empty folders).
5. Then proceed to Phase 4 (UX design), which depends on the object model + POC scope.

---

*This review is a critique only. No product decisions were changed and no documents
were redesigned in producing it.*
