# Repository_Guidelines.md

# Purpose

This document defines the conventions used throughout the PushApp repository.

It exists to keep the repository understandable and consistent as the product grows.

These guidelines apply to both human contributors and AI assistants.

---

# Repository Philosophy

The repository is the long-term memory of PushApp.

It should explain not only **what** the product is, but also **why** it evolved this way.

Documentation should preserve reasoning whenever possible.

Future contributors should be able to understand past decisions without needing access to previous conversations.

---

# Source of Truth

Not every document has the same authority.

When documentation conflicts, use the following priority:

1. START_HERE.md
2. Product_Philosophy.md
3. AI_Product_Principles.md
4. Product_Terminology.md
5. Product_Bible.md
6. Information_Architecture.md
7. Remaining documentation

Repository Update documents temporarily override repository files until their changes have been merged.

---

# Documentation Principles

Every document should answer a single question.

Examples:

Product Philosophy

Why does PushApp exist?

---

Product Bible

What is PushApp?

---

Information Architecture

How is PushApp organized?

---

Pitch

How do we explain PushApp externally?

Avoid mixing multiple purposes into the same document.

---

# Living Documents

Most repository documents are living documents.

They should evolve over time.

However:

Do not rewrite entire documents when only a small section changes.

Prefer incremental improvements.

Preserve useful historical context when appropriate.

---

# Approved Decisions

Whenever documenting product decisions, distinguish between three categories.

## Approved

Decisions that have been accepted.

These represent the current direction of the product.

---

## Future Vision

Ideas intentionally postponed.

They remain important.

They are simply not scheduled yet.

---

## Open Questions

Topics that require additional discussion.

Avoid presenting them as decided features.

---

# Documentation Style

Prefer explaining concepts before implementation.

Example:

Poor:

"The Home screen contains five cards."

Better:

"The Home screen exists to answer one question:

'What should I do now?'"

Then explain the cards.

Purpose before implementation.

Always.

---

# Product Language

Always use the official terminology.

Avoid introducing synonyms.

Examples

Correct

Journey

Incorrect

Challenge

Program

Plan

unless a distinction is intentionally introduced.

Terminology shapes product thinking.

Protect it.

---

# Repository Structure

When possible:

One document = one responsibility.

Avoid creating documents that partially duplicate existing ones.

Before creating a new document ask:

Can this information naturally belong somewhere else?

If not,

create a new document.

---

# Product Vision

Never modify the long-term vision because implementation becomes difficult.

Instead:

Move ideas between:

Vision

↓

POC

↓

MVP

↓

Commercial Version

↓

Future

The roadmap changes.

The vision should remain stable.

---

# AI Contributions

AI should improve documentation by:

clarifying

organizing

expanding

connecting ideas

AI should not silently change important product decisions.

When uncertain,

leave a note.

Do not invent product direction.

---

# Feature Proposals

Whenever proposing a new feature, answer these questions:

What problem does it solve?

Why is it needed?

What existing system does it improve?

What complexity does it introduce?

Does it align with Product Philosophy?

Which roadmap stage does it belong to?

If these questions cannot be answered,

the feature probably needs more thought.

---

# Repository Updates

Large design sessions should not immediately modify dozens of documents.

Instead:

Create a Repository Update document.

Review it.

Approve it.

Only then merge the information into the repository.

This reduces accidental inconsistencies.

---

# Preserve Context

Never document only conclusions.

Whenever possible also document:

Why was this decision made?

Which alternatives were rejected?

What concern did this solve?

Future contributors will often benefit more from understanding the reasoning than from reading the final decision itself.

---

# Simplicity

The repository should become richer over time.

It should not become harder to understand.

Whenever documentation becomes confusing:

Simplify the structure.

Not the product.

---

# Final Principle

Every document in this repository should make it easier for the next contributor to build PushApp.

If a document increases confusion instead of reducing it,

it should be rewritten.
