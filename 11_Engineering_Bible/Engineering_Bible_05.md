# Engineering Bible — Part 05
## Cross-Cutting Principles, Anti-Patterns, Engineering Checklist

This section applies to every engineering decision regardless of domain.

If any principle in this section conflicts with an implementation, the implementation should be reconsidered.

---

# Cross-Cutting Engineering Principles

## Build Systems, Not Features

Every user-facing feature should be powered by a reusable system.

Examples:

Journey Screen → Journey Engine

Buddy Screen → Buddy Platform

Marketplace Screen → Commerce Platform

Notifications → Reminder & Delivery Platform

Avatar → Companion Platform

Features evolve.

Systems remain.

---

## Configuration Before Code

Whenever business behavior may change in the future, it should be configurable rather than implemented directly in source code.

Examples include:

- XP rules
- Coins
- Reward logic
- Reminder timing
- Journey templates
- Difficulty levels
- AI prompts
- Feature availability
- Seasonal events

Product teams should be able to evolve the application without requiring engineering changes whenever technically reasonable.

---

## Event-Driven By Default

Systems should communicate through events rather than direct calls whenever practical.

This minimizes coupling and maximizes future flexibility.

Example:

Journey Completed

↓

Platform Event

↓

Reward Engine

↓

Buddy Engine

↓

Analytics

↓

Notification Engine

↓

Future Systems

The Journey Engine never needs to know which systems reacted.

---

## One Responsibility Per System

Every platform component should answer one question:

"If this responsibility disappeared tomorrow, would this system still exist?"

If the answer is no, it probably belongs elsewhere.

---

## Independent Evolution

Every major system should be replaceable independently.

Future engineers should be able to redesign:

- Buddy
- Rewards
- Marketplace
- Analytics
- AI
- Notifications

without rewriting the rest of the platform.

---

## Business Logic Lives In Engines

Business rules should never be implemented inside:

- Screens
- Widgets
- Views
- Components

The UI should consume business capabilities rather than create them.

---

## Repository Before Memory

If knowledge matters, it belongs inside the repository.

Important engineering knowledge should never exist only inside:

- Slack
- Email
- AI conversations
- Pull Requests
- Individual engineers

The repository is the company's memory.

---

## Engineering Supports Product

Engineering decisions should always support the intended user experience.

Architecture exists to enable product evolution—not restrict it.

If engineering and product goals conflict, first challenge the architecture rather than the product.

---

# Common Anti-Patterns

The following patterns should be actively avoided.

---

## Tight Coupling

Bad

Journey directly depends on Buddy implementation.

Good

Journey publishes events.

Buddy subscribes.

---

## Business Logic Inside UI

Bad

Journey Screen calculates XP.

Good

Reward Engine calculates XP.

Journey Screen displays results.

---

## Hardcoded Product Rules

Bad

Reminder every day at 8:00.

Good

Reminder configuration stored in configurable business rules.

---

## Vendor Lock-In

Bad

Every system calls a specific AI provider directly.

Good

Every AI interaction passes through AI Platform abstraction.

---

## Shared Ownership

Bad

Reward logic spread across:

Journey

Buddy

Marketplace

Analytics

Good

Reward Engine owns reward logic.

Everyone else consumes it.

---

## Hidden Dependencies

Bad

Changing one module unexpectedly breaks another.

Good

Dependencies are explicit, documented and minimal.

---

## Background Processing Without Value

Bad

Constant polling.

Permanent location tracking.

Frequent synchronization.

Good

Every background task creates measurable user value.

---

## Collecting Data "Just In Case"

Bad

Store everything.

Good

Store only information with a defined purpose.

---

## Feature Before Architecture

Bad

"We need this screen tomorrow."

Good

"What reusable capability does this screen require?"

---

# Engineering Review Checklist

Before approving any significant implementation, verify:

Architecture

☐ Does it belong to the correct system?

☐ Is the responsibility clear?

☐ Can it evolve independently?

☐ Is coupling minimized?

☐ Can another provider replace the current implementation?

---

Product

☐ Does it improve the user experience?

☐ Does it support long-term product goals?

☐ Does it align with Product Philosophy?

☐ Does it simplify rather than complicate?

---

Privacy

☐ Is every collected data point justified?

☐ Is sensitive information protected?

☐ Are permissions requested only when valuable?

---

Performance

☐ Is battery impact acceptable?

☐ Is memory usage efficient?

☐ Is synchronization optimized?

☐ Is network traffic minimized?

---

Scalability

☐ Will this design still work with millions of users?

☐ Does scaling require redesign?

☐ Can this system scale independently?

---

Documentation

☐ Was documentation updated?

☐ Was the decision recorded?

☐ Can another engineer understand the reasoning?

---

Testing

☐ Unit Tests

☐ Integration Tests

☐ Analytics

☐ Monitoring

☐ Feature Flags

☐ Rollback Strategy

---

# Definition of Engineering Quality

A feature is considered complete only when it satisfies all of the following:

✓ Product requirements approved

✓ UX approved

✓ Architecture follows Engineering Bible

✓ Business logic belongs to the correct engine

✓ Analytics implemented

✓ Monitoring implemented

✓ Documentation updated

✓ Decision Log updated (when required)

✓ Feature Flags added (when appropriate)

✓ Automated tests added

✓ Performance validated

✓ Security reviewed

✓ Privacy reviewed

✓ No unnecessary coupling introduced

---

# Final Engineering Statement

PushApp should never become difficult to evolve.

Every architectural decision should make future engineering easier rather than harder.

Good engineering is measured not only by how well the current feature works, but by how easily the next hundred features can be built on top of it.

The goal of this Engineering Bible is not to produce elegant code.

Its goal is to ensure that PushApp can continue growing, adapting and improving for many years without losing the qualities that make it valuable to its users.
