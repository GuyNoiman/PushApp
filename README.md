# PushApp

> PushApp helps people **become who they choose to be** — closing the gap between intention and
> action. It is not a habit tracker, a task manager or a productivity app.

This repository is the source of truth for the product: the vision, the decisions, the
specifications, and the app itself. Not only what we build, but **why**.

---

## Start here

**→ [`AI_Start_Here.md`](./AI_Start_Here.md)** — the reading order and the source-of-truth priority.
Then [`Current_Context.md`](./Current_Context.md), which says where things stand today.

That is the whole answer for a person or an AI joining the project. Everything below is the map.

*(Until 2026-09-03 this file carried its own, different reading order, which had drifted out of
agreement with the constitution. There is now one of them.)*

---

## The three files that govern the work

| File | What it is |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md) | The working constitution — the rules every session obeys. The same document twice: Claude Code reads one, Codex the other. Edit both together. |
| [`Repository_Workflow.md`](./Repository_Workflow.md) | Context and token discipline — how to work without re-reading the repo. |
| [`Repository_Guidelines.md`](./Repository_Guidelines.md) | Documentation conventions — how to write and organise what is here. |

---

## The four files you will actually open most days

| File | Answers |
|---|---|
| [`Current_Context.md`](./Current_Context.md) | Where are we, right now? |
| [`04_Product/Backlog.md`](./04_Product/Backlog.md) | What is left? Including §1a, every decision waiting on the founder. |
| [`06_Decisions/Decision_Log.md`](./06_Decisions/Decision_Log.md) | What was decided, and why? |
| [`00_Foundation/CHANGELOG.md`](./00_Foundation/CHANGELOG.md) | What happened? |

---

## The map

```text
00_Foundation/            Terminology, IA, CHANGELOG, conventions
01_Vision/                The long-range picture
02_Product_Principles/    Product principles
03_Pitch/                 Investor and external material
04_Product/               PRDs, UX specs, scope, roadmap, the Backlog
05_Research/              Behavioural and market research
06_Decisions/             The Decision Log
07_Assets/                Brand and visual assets
08_Archive/               Superseded documents, kept for their reasoning. Nothing here is current
09_Product_Philosophy/    Philosophy, AI product principles, terminology
10_Partner_Coaching_Content/  Externally authored coaching content + its manifest
11_Engineering_Bible/     Architecture decisions and engineering rules
12_Future_Assets/         Built but archived screens and assets
app/                      The Expo/React Native application
```

---

## How we keep it usable

- **One subject, one file.** When two documents describe the same thing, they get merged and the
  older one goes to `08_Archive/` with a note saying what it contributed. Two files describing one
  subject means somebody is reading the wrong one.
- **Nothing is deleted.** Superseded documents keep their text and their reasoning; what they lose
  is the claim to be current.
- **Improve the existing document** rather than adding another. A new file needs a reason a section
  could not do.
- **Intentional overlap is allowed** only when each document serves a genuinely different reader —
  and each one says so at the top.
- **If it is not written here, it is not part of PushApp.** Conversations are temporary.

---

## The app

Everything under `app/` is an Expo (React Native) + TypeScript application with an engine-based
architecture: pure-TypeScript engines over an event bus, configuration before code, offline-first.
The rationale is in [`11_Engineering_Bible/Engineering_Decisions.md`](./11_Engineering_Bible/Engineering_Decisions.md) §E1.
