# 2026-07-05_Product_Updates.md

# Purpose

This document contains every product decision made after the previous repository backup.

It should be treated as the authoritative source for all new product decisions.

When this document conflicts with the existing repository, the information here is considered newer and should overwrite the older documentation.

The purpose of this document is not to replace the repository but to help another AI (Claude) merge these decisions into the appropriate files.

---

# File
04_Product/Information_Architecture.md

## Overview

The previous Information Architecture defined the main navigation and a few high-level concepts.

During the latest design sessions we significantly expanded the product architecture.

The main philosophy shifted from thinking about screens to thinking about product objects and behavioral loops.

The user should never feel they are using a task manager.

Instead they should feel that PushApp is continuously helping them move toward becoming the person they choose to be.

---

## Dreams vs Journeys

This is one of the biggest architectural decisions made.

The user naturally thinks in Dreams.

Examples:

- Become healthier
- Become financially independent
- Become fluent in Spanish
- Become more confident

Dreams are intentionally ambitious.

Dreams never finish.

Dreams have no XP.

Dreams have no rewards.

Dreams are simply direction.

---

The product itself operates using Journeys.

A Journey is:

- Achievable
- Finite
- Rewarded
- Celebrated
- Usually completed within roughly 2–3 months

Examples:

- Run 10km
- Complete Spanish A1
- Finish a 12 week strength program
- Quit smoking for 90 days

The reason for limiting Journey duration is psychological.

The user should frequently experience success.

PushApp should generate many completion moments rather than one endless goal.

One Dream can contain many Journeys.

Technically this will probably be represented using tags.

---

## Journey Structure

Current preferred hierarchy

Dream
    ↓
Journey
    ↓
Step

A Journey may contain many Steps.

Steps may be:

- sequential
- repeating
- interactive

Not every Journey uses the same structure.

Some Journeys contain only one repeating Step.

Others contain dozens of sequential Steps.

The Journey Engine must support multiple Journey structures.
