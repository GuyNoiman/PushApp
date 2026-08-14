# Product_Terminology.md

# Purpose

This document defines the official terminology used throughout PushApp.

The terminology is part of the product architecture.

These terms should be used consistently across documentation, UX, product discussions and AI-generated content.

Changing terminology changes the way people think about the product.

For this reason, new terms should only be introduced when they provide significantly better clarity.

---

# Dream

A long-term aspiration.

A Dream represents the person the user wants to become.

Examples:

- Become healthier.
- Become financially independent.
- Become confident speaking in public.
- Become fluent in Spanish.

Characteristics:

- Long-term.
- Inspirational.
- Never truly completed.
- Not rewarded directly.
- May contain multiple Journeys.

A Dream provides direction.

It is not something the user completes.

---

# Journey

A Journey is a finite transformation.

It is the core object of PushApp.

Every Journey should eventually end with either:

- Completion
- Adaptation
- Restart
- Abandonment

A Journey should generally be achievable within approximately two to three months.

Examples:

- Run 10km.
- Finish Spanish A1.
- Complete a gratitude challenge.
- Save ₪10,000.
- Read 12 books.

A Journey exists to create momentum and meaningful completion.

---

# Journey Template

A reusable definition of a Journey.

Templates may be created by:

- PushApp
- Individual users
- Coaches
- Businesses
- Marketplace creators

A Journey Template describes:

- structure
- rules
- frequency
- flexibility
- default Steps
- recommended duration

A user never modifies the template itself.

Instead, the user creates a Journey Instance.

---

# Journey Instance

A personal copy of a Journey.

Each user owns their own Journey Instance.

It may include:

- personal schedule
- progress
- Allies
- reminders
- AI adaptations
- completion history

Even when many users start from the same Journey Template, every Journey Instance becomes unique over time.

---

# Step

The smallest unit of progress inside a Journey.

Examples:

Run.

Lesson 5.

Practice chords.

Complete today's reflection.

Submit assignment.

Steps may be:

- one-time
- repeating
- sequential
- interactive

A Step always belongs to exactly one Journey.

---

# Interactive Step

A special Step completed entirely inside PushApp.

Examples:

Daily gratitude.

Reflection.

NLP exercise.

Guided breathing.

Weekly planning.

Unlike ordinary Steps, PushApp can automatically verify completion because the experience happens inside the application.

These Journeys may provide richer user experiences than simple checklists.

---

# Milestone

**Canonical mid-layer term — renamed from "Phase" on 2026-08-01 (founder decision).** This is
part of the AI-adaptive-coach pivot follow-up (`06_Decisions/Decision_Log.md` **D23**, task
S0.2, docs updated 2026-08-03). The object model itself is unchanged — only the name of this
layer changes.

An optional, sequential grouping of Steps inside a Journey.

- Optional: a Journey may attach Steps directly, without Milestones.
- Sequential: when present, Milestones are completed in order.

Example: a "2-month training plan" Journey may contain Milestone A (full-body), Milestone B
(targeted area) and Milestone C (intense), each holding several Steps.

Object hierarchy: Dream → Journey → **Milestone** (optional) → Step.

**Lineage of this name (preserved for history, not deleted):**
- **D5** (2026-07-06) introduced the layer as a **working name**: "Phase" (candidates considered:
  Phase, Chapter, Part).
- **D22** (2026-07-14) closed that naming question and **kept "Phase"** as the permanent display
  name — no rename, at the time.
- **2026-08-01** (founder decision, recorded here per the D23 follow-up, task S0.2): **renamed
  again, from "Phase" to "Milestone."** This supersedes D22's "no rename" conclusion. The
  reasoning below (from the original "Phase" entry) is preserved verbatim, since it still explains
  *why the layer itself exists* — only the label changed.

> **Note for whoever reconciles usage:** the word "milestone" (lowercase) is already used
> generically elsewhere in this document — in **Achievement** ("A predefined milestone available
> to every user") and **Reflection** ("Major milestones"). Those are generic-English uses, not
> the proper-noun mid-layer object. Watch for ambiguity in copy/UI when both meanings could appear
> in the same sentence; disambiguate with capitalization/context, not a synonym.

---

## Superseded — former name "Phase" (kept for history; do not use going forward)

*The following is the original entry, preserved verbatim for the reasoning it carries. As of
2026-08-01 the mid-layer term is **Milestone** (above), not Phase.*

Working name — not yet finalized (candidates: Phase, Chapter, Part).

An optional, sequential grouping of Steps inside a Journey.

- Optional: a Journey may attach Steps directly, without Phases.
- Sequential: when present, Phases are completed in order.

Example: a "2-month training plan" Journey may contain Phase A (full-body), Phase B (targeted area) and Phase C (intense), each holding several Steps.

Object hierarchy: Dream → Journey → Phase (optional) → Step.

---

# Buddy

> **Stage: Future — deferred from the MVP (Decision Log D45, 2026-08-13).** The MVP user-facing
> entity is the coach (meta-agent); there is no avatar/Buddy in the current app. The definition below
> is preserved in full and may be reintroduced post-MVP. "Buddy" remains the canonical term for this
> concept — do not rename it or substitute another term while it is dormant.

Buddy is the user's companion.

Buddy is not the user.

Buddy is not merely an avatar.

Buddy represents the supportive presence accompanying the user's personal growth.

Buddy:

- communicates
- celebrates
- encourages
- adapts
- grows

Buddy should never punish or shame users.

Buddy becomes the emotional face of PushApp.

---

# Meta-agent (the coach)

The single entity the user talks to.

**"The coach" is the user-facing name. "Meta-agent" is the internal, architectural name.** Both are
official — they are the same thing described at two levels. Use "the coach" in anything a user reads,
"meta-agent" in specs, PRDs and code.

The meta-agent:

- owns all user communication — it is the **only** user-facing voice;
- owns the user's language and form of address (Decision Log **D30**, **D31**);
- consults **domain experts** as internal tools and integrates their judgement with the user's goals,
  constraints and safety boundaries;
- decides what to ask, what to propose, and what to leave alone.

A **domain expert** (Addiction · Relationships & Loneliness · Body Image · Career — **D24**) is an
internal professional-judgment tool. An expert never speaks to the user, never becomes a second
personality, and carries no language requirement of its own: the meta-agent re-voices everything it
returns (**D30**).

Do not introduce synonyms. Not "Meta-Coach", not "assistant", not "bot", not "AI Coach" as a third name.

Stage: **MVP** — the coach is the MVP's central user-facing entity (**D45**; Buddy is deferred to
Future, above).

(Added 2026-08-14, **D49**. The term was decided in **D30** on 2026-08-09 and used throughout
`04_Product/Domain_Expert_Authoring_Guide.md`, but it was never written into *this* document — which is
where an outside author looks. External coaching content consequently drifted to its own name,
"Meta-Coach". The rule this closes: a term is not canonical until it is defined here.)

---

# Ally

An Ally is someone chosen to support a specific Journey.

An Ally relationship is contextual.

A user may choose different Allies for different Journeys.

Allies may:

- encourage
- celebrate
- check in
- send gifts
- receive progress updates

Support permissions may differ between Journeys.

Examples:

- Full visibility.
- Progress only.
- Private Journey with anonymous progress.

An Ally is only ever someone the user chose to add to a Journey's Support Circle. Nothing else.

A sponsor, a clinician, or a family member is not an Ally, and is not currently modeled as any in-app
concept. When the coach refers to real-world support, it speaks in plain language ("someone you trust",
"a professional") and never points the user to the in-app Ally list as if it were crisis support.

(Founder decision, 2026-08-13, D47 — settles an ambiguity found in third-party coaching content, which
used "Ally" loosely to also mean a sponsor/clinician/family member. Whether real-world supporters should
ever become their own modeled concept is left open.)

---

# Mission

A Mission is a game-generated activity.

Missions exist independently of Journeys.

Examples:

- Help three friends.
- Send a gift.
- Invite a friend.
- Spin today's reward wheel.
- Complete three Journey Steps this week.

Missions primarily reward Coins.

Not personal growth.

---

# XP

Experience Points.

XP represents meaningful personal growth.

XP should be awarded only for behaviours directly connected to transformation.

Examples:

Completing Steps.

Completing Journeys.

Helping Allies.

Maintaining consistency.

XP determines Buddy Level.

---

# Coins

The virtual currency of PushApp.

Coins primarily reward engagement with the game layer.

Examples:

Daily rewards.

Missions.

Events.

Marketplace promotions.

Coins purchase cosmetic items.

Coins should never replace meaningful growth.

---

# Buddy Level

Represents long-term growth.

Buddy Levels increase only through XP.

Levels communicate accumulated experience.

Levels should never be purchasable.

---

# Achievement

A predefined milestone available to every user.

Achievements are global.

They are not Journey-specific.

Examples:

Complete your first Journey.

Help 50 Allies.

Reach Level 20.

Finish 10 Journeys.

Achievements exist permanently.

They become part of the user's history.

---

# Reflection

A structured conversation occurring after meaningful events.

Reflection may happen after:

Journey completion.

Journey failure.

Long inactivity.

Major milestones.

Reflection exists to improve future Journeys while increasing user self-awareness.

---

# Explore

The discovery area of PushApp.

Explore helps users discover:

- Journeys
- Dreams
- creators
- communities
- recommendations
- trending content

Explore is designed around inspiration rather than search alone.

---

# Intervention

A proactive action initiated by PushApp.

Examples:

Notification.

Buddy message.

Recommendation.

Question.

Reminder.

Reflection prompt.

Interventions should always have a clear behavioural purpose.

**Proactive only (sharpened 2026-08-14, Decision Log D48).** The defining property is *who starts the
moment*: an Intervention is something **PushApp initiates**, reaching a user who was not in the app.
That is why every Intervention carries a scheduling, permission and quiet-hours dimension (see **D21**,
the Communication Scheduler and its privacy red-lines).

Something the coach says **inside a conversation the user opened** is *not* an Intervention. It is a
**comment** — a reactive coaching move, with no scheduling, permission or quiet-hours dimension. The
distinction decides which engine owns the behaviour, so the two words must not be swapped.

`comment` is currently a term of the **external coaching content** in `10_Partner_Coaching_Content/`
(which used "intervention" for the reactive sense, the exact opposite of ours). It is not yet a modeled
in-app object; it is recorded here so the two vocabularies cannot silently collide.

---

# Future Journey

A Journey intentionally saved for later.

Future Journeys help users maintain long-term direction without overwhelming the present.

Examples:

Spanish A2.

Marathon training.

Career transition.

Future Journeys are inactive until started.

---

# Journey Rules

A configurable set of conditions defining how a Journey behaves.

Possible rules include:

- maximum misses
- pause allowed
- restart conditions
- flexibility
- completion criteria
- editing permissions

Different Journey Templates may define different rules.

---

# Marketplace

The ecosystem where reusable Journeys are published.

Future contributors may include:

Individuals.

Coaches.

Businesses.

Communities.

Marketplace content should inspire users rather than overwhelm them.

---

# Terms Still To Define

The following concepts (migrated from the former Glossary) are official PushApp vocabulary that should receive full definitions here over time:

- Creator
- User
- Report
- Progress
- Recommendation
- Growth Library

**Note (2026-08-03):** "Milestone" was removed from this to-define list because it is now the
canonical mid-layer term (see the **Milestone** section above, renamed from "Phase" on
2026-08-01) — it already has a full definition, it is not still-to-define. If a *different*,
generic sense of "milestone" (e.g. a celebratory checkpoint distinct from the mid-layer object)
is ever wanted, it must not fork the term — see the disambiguation note in the Milestone section.

**Note (2026-08-14):** "AI Coach" was removed from this to-define list for the same reason — the entity
now has a full definition, see **Meta-agent (the coach)** above. "The coach" is its user-facing name and
"meta-agent" its architectural one; "AI Coach" was an informal early label and must not be revived as a
third synonym.

(Support Circle, Ally, Check-in, Reflection, Intervention, Community Insight and Marketplace — plus the core Dream / Journey / Milestone / Step / Buddy / Mission / XP / Coins terms — are already defined here or in the Product Bible.)

---

# Repository Convention

Throughout the repository these terms should be treated as official vocabulary.

Future documentation should avoid introducing synonyms unless absolutely necessary.

Consistency of language improves both human understanding and AI reasoning.

Whenever uncertainty exists, prefer the terminology defined in this document.
