# Repository Conventions

Status: Approved

---

# Purpose

This document defines the conventions used throughout the PushApp Knowledge Repository.

Its goal is to ensure that every document remains consistent, easy to maintain, and easy to understand for both humans and AI assistants.

Whenever uncertainty exists, these conventions take precedence.

---

# Repository Philosophy

The repository is the official knowledge base of PushApp.

It is not a conversation log.

It is not a brainstorming notebook.

It is a curated representation of the current state of the company.

The repository should always be easier to understand than the conversations that created it.

---

# AI-First Design

The repository is intentionally optimized for AI collaboration.

Documents should therefore be:

- self-contained
- logically structured
- easy to navigate
- free of unnecessary duplication within each document

Future repository structures may evolve as AI capabilities improve.

---

# Single Source of Truth

Every approved decision should eventually appear in one primary location.

Within a document, avoid duplicating information.

Across different documents, intentional overlap is acceptable when it helps present the same concept from a different perspective or makes a document more self-contained for its intended audience.

---

# Continuous Improvement

Documents are living documents.

When new information becomes available:

- update existing sections
- reorganize information when needed
- improve wording
- remove obsolete content

Avoid continuously appending new information to the end of documents.

Git already preserves history.

---

# Repository Language

The official repository language is English.

Conversations may happen in any language.

Repository documents should always be written in English unless explicitly decided otherwise.

---

# Naming Convention

Every document must have a unique filename.

Prefer descriptive names.

Examples:

- Vision.md
- Product_Principles.md
- Product_Bible.md
- Research.md

Git already provides version history.

---

# Document Status

Documents may have one of the following statuses:

- Draft
- Reviewed
- Approved

---

# Commits

Each Git commit should represent one completed topic rather than one modified file.

Prefer commit messages that describe the knowledge that was added.

Examples:

- docs(vision): complete first vision draft
- docs(product): define quest lifecycle
- research: add behavior change studies

---

# Long-Term Objective

The repository should eventually become comprehensive enough that a new employee—or an AI assistant—can understand PushApp without relying on historical conversations.

The repository is expected to evolve together with the company.
