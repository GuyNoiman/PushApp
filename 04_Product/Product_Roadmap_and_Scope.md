# Product Roadmap and Scope

Status: Approved framework — stage assignments evolve over time

---

# Purpose

Product discussions kept getting confused because ideas from different delivery
stages were mixed together. This document defines the **staging framework** used
across the repository so every feature can be classified by *when* it is intended
to ship — without ever shrinking the long-term vision.

The governing rule: **never reduce the product vision because implementation is
difficult. Move a feature to a later stage instead of deleting it.**

(The Vision → POC → MVP → Commercial → Future ladder is also referenced in
`AI_Product_Principles.md` Principle 2 and `Repository_Guidelines.md`; this document
is the place where each stage is actually *defined*.)

---

# The Five Stages

## Stage 0 — Vision

Purpose: describe the ultimate product, ignoring implementation complexity.

Questions it answers:

- What do we want PushApp to become in five years?
- What emotional experience should users have?
- What makes PushApp unique?

No technical limitation should influence this stage. (See `01_Vision/Vision.md`.)

## Stage 1 — Proof of Concept (POC)

Purpose: validate that people actually want the product.

The POC answers only one question:

> "If this existed today, would people actually use it?"

It is not expected to validate the entire product — only the core hypothesis. The
POC must not be allowed to shrink the long-term vision; it is only an experiment.

## Stage 2 — MVP

Purpose: deliver the smallest product capable of providing meaningful value.

Important clarification: the MVP should **not** simply be the cheapest thing to
build. It should already demonstrate why PushApp is fundamentally different.

> RESOLVED (2026-07-06 founder decision): **AI is part of the MVP, but the MVP must
> not depend on AI in order to provide value.** AI enhances the experience,
> personalizes the product, and improves guidance; every core user flow must remain
> functional if AI is temporarily unavailable. (Product Bible §15.1 and §27 were
> updated to match. See `06_Decisions/Decision_Log.md` D2.)

## Stage 3 — First Commercial Version

Purpose: launch a product people are willing to pay for. It should already feel
polished.

Functionality likely expected by this stage: Journey Templates, Marketplace
foundations, Buddy customization, AI personalization, Achievements, Coins, XP,
Friends, Support system, and Journey completion celebrations.

## Long-Term Vision

Ideas that intentionally belong here (documented even if years away): Buddy voice,
Buddy conversations, egg onboarding, Interactive Journey Experiences, Creator
Marketplace, Business Journeys, adaptive coaching, AI-generated personal roadmaps,
the dynamic Intervention Engine, and advanced psychological personalization.

---

# Product Complexity

PushApp is deliberately an ambitious platform (Journey Engine, Buddy, gamification,
Marketplace, AI, adaptive interventions, community, interactive experiences). This
breadth once caused concern about over-scoping.

The decision made: keep the vision intact and **deliver it gradually.** Complexity
is managed by staging, not by cutting the vision.

---

# Documentation Rule — the `Stage:` field

Every feature added to the repository should carry a stage classification:

`Stage: Vision | POC | MVP | Commercial | Future`

This single field dramatically reduces planning confusion by making explicit when a
given idea is expected to ship.

---

# Provenance

Migrated from the 2026-07-05 Repository Update (`Product_Updates7.md`) during the
2026-07-06 Phase 2 cleanup. The raw source is preserved in `08_Archive/`.
