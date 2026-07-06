# Open_Questions

Status: Living Document

---

# Purpose

This document tracks product ideas, strategic questions, validation needs, and future opportunities that have not yet been fully approved.

Items remain here until one of the following happens:

- They are approved and moved into an official document.
- They are rejected.
- They become irrelevant.
- They are promoted into Product_Bible.md (as an approved decision, or a clearly-labeled hypothesis under §33).

---

# Strategic Questions

## Beachhead Market

**Positioning decided (2026-07-06):** young adults who want to build and maintain meaningful habits and personal goals across different areas of life — treated as positioning, not a vertical. See `06_Decisions/Decision_Log.md` (D1) and Product_Bible §32.

Still open (deferred to a future Go-To-Market document): which specific segment(s) to acquire first, the distribution channel, and the clearest "I wish this existed" wedge.

Open questions:

- What is the first beachhead market?
- Which group will feel the pain most strongly?
- Which users will say “I wish this existed already”?
- Which group has a clear distribution channel?

Potential candidates:

- Coaching clients
- Smoking cessation users
- People in long-term fitness processes
- People completing paid courses
- People in support groups
- Medical adherence users
- People trying to change addictive behaviors
- Self-development / NLP communities

---

## Why PushApp Over Existing Tools?

PushApp must clearly outperform combinations such as:

- Paper + reminders
- Notes + calendar
- WhatsApp + friend
- ChatGPT + habit tracker
- Coach + Google Doc

Open question:

What is the simplest, clearest explanation of why PushApp meaningfully increases the probability of success compared with these existing workflows?

---

# Product Discovery

## Helping Users Discover Who They Want to Become

Explore future experiences that help users identify meaningful personal goals before creating Journeys.

Potential directions:

- AI-guided reflection conversations
- Guided self-discovery exercises
- Life area assessments
- Personal values mapping
- Suggested growth areas

Priority: Future

---

## Growth Library

A library of curated growth journeys that users can browse even if they do not yet know what to start.

Could include:

- Journeys
- Courses
- Programs
- Challenges
- Expert content
- How-to journeys
- NLP exercises
- Coaching programs

Priority: Future

---

## Journey Marketplace

Allow experts, coaches, creators and businesses to publish high-quality Journeys or growth journeys.

Open questions:

- Review system
- Monetization
- Quality assurance
- Discovery
- Creator incentives
- Paid vs free Journeys
- How to prevent low-quality content

Priority: Future

---

## Context-Aware Interventions

Use context to surface the right action at the right time.

Ideas include:

- Geofencing
- Calendar awareness
- App usage
- Time of day
- Routine detection
- Support Circle activity
- Forecast risk

Priority: Future / Core Innovation Candidate

---

## Intervention Engine

Current hypothesis:

PushApp should optimize interventions rather than notifications.

Open questions:

- What signals are required for MVP?
- How do we measure intervention success?
- What is the first simple version?
- How do we avoid annoying users?
- What interventions should be available beyond push notifications?
- Could this become a defensible advantage?

---

## Competition Mode

A new idea raised after conversations with others.

Users may challenge friends in a competition-style mode.

Potential model:

- Each user may have their own Journey.
- Competition compares status or progress within a shared time window.
- The Journey duration likely needs to be identical or comparable.
- A dedicated competition screen shows progress against the friend.

Open questions:

- What exactly is compared?
- Must both users use the same Journey template?
- Is the goal to win or to stay consistent?
- How do we avoid encouraging easy Journeys?
- What rewards should exist, if any?
- What happens when life circumstances interrupt one participant?
- Can competition remain aligned with PushApp's growth-first philosophy?

Current principle:

Competition should be a motivational mode, not the core philosophy of PushApp.

---

## Private Support

Allow users to receive accountability without exposing the content of their Journey.

Open questions:

- How much information should Allies see?
- Can an Ally support consistency without knowing the exact goal?
- What language should be used when asking for anonymous or private support?

Priority: Open

---

## Future Journey Queue

Allow users to save future Journeys they intend to start later.

Potential triggers:

- Manual start
- Scheduled date
- Completion of another Journey
- Recommendation after current Journey completion

Priority: Medium

---

## Premium AI

Future paid capabilities:

- Goal discovery
- Personalized planning
- Breaking goals into milestones
- Personalized motivation
- Reflection conversations
- Identifying supportive people
- Choosing motivational phrases

Priority: Future

---

# Research Questions

- What creates long-term engagement without becoming addictive?
- How should success be measured?
- What creates the strongest sense of progress?
- Which interventions genuinely increase consistency?
- Which support mechanisms create value without becoming annoying?
- What is the evidence for Just-In-Time Adaptive Interventions?
- How does social accountability affect long-term completion?
- Which users respond positively to competition and which users avoid it?

---

# Product Subsystem Questions

Open questions organized by product subsystem (migrated from the 2026-07-05 update).
These complement the strategic questions above, which are organized by theme.

## Journey Engine

- Optional Steps — supported in V1 or a later version?
- Which Journey types are in scope for the first version?
- Locked vs editable Journeys — default behavior and creator controls.
- (Note: maximum Journey duration is largely decided — default 2 months, configurable — see Product_Bible / Information_Architecture.)

## AI

- Pricing of AI-powered personalization.
- Local vs cloud AI.
- AI running costs and how they bound the free tier.
- Personalization boundaries — how far should adaptation go?
- How much AI belongs in the MVP (see Product_Roadmap_and_Scope.md open question).

## Buddy

- Egg / hatch onboarding — adopt or not?
- Voice — should Buddy eventually speak?
- Animation depth.
- Adaptive personality — how much, and learned vs configured?
- Dynamic Buddy inside push notifications (current lean: probably not).

## Marketplace

- Revenue-sharing model for creators.
- Creator verification and quality assurance.
- Business Journeys — structure and monetization.

## Gamification

- Overall economy design.
- Cosmetics scope.
- XP balancing.
- Coins earning/spending balance.
- Achievement cadence (how often, how rare).

## Social

- Groups — in the first version or later?
- Competitions — scope and safeguards (see Competition Mode above).
- Accountability models.
- Ally permissions — granularity of what each Ally can see/do.

---

# Repository Questions

## AI-first Repository Structure

Decision made:

Prefer fewer, larger AI-friendly documents over many small documents.

Open question:

At what point does a document become too large and require splitting?

---

# Repository Rule

Ideas are cheap.

Approved decisions belong in the official documents.

Evolving ideas belong in Open_Questions.md until validated.
