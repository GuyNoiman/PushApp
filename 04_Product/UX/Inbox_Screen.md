# Inbox — Screen (brief)

Status: Draft · Phase 4 · 2026-07-06

> Not a main tab (accessible from Home's Inbox button). Builds on `Information_Architecture.md` (Inbox).

---

## Purpose

Centralize conversations, separated by relationship type.

## Structure

- Divided into **Friends · Allies · Groups** (Groups only **if** the user has groups).
  Presented as **tabs** (or Instagram-style separation).
- **Allies** are the highest-priority support communication.
- **Unread indicator** on individual messages; **unread messages sort to the top**.
- **Unread indicator on a category/tab** when it contains an unread message underneath.

## Interaction

- Tapping the person you're chatting with opens their **friend card**, **ally card**, or
  **group page**.
  - **Group page** is a concept **not yet discussed** and **likely not in the initial version.**

## MVP scope

- v1: **Friends + Allies** tabs, with unread indicators (message-level and category-level).
- **Groups + group pages = future** (only appear once groups exist).

## Decisions (2026-07-06)

- Split by **Friends / Allies / Groups(if any)** — tabs or Instagram-style.
- Unread indicator on messages (unread sorted to top) **and** on categories with unread underneath.
- Tap a person → friend / ally card (group page = future, likely not in v1).
