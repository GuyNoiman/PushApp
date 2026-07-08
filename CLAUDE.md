# CLAUDE.md — PushApp Working Constitution

This file is auto-loaded into every session and every sub-agent. It is the shared
**constitution** for the PushApp team (human + AI). Keep it short; link out, don't duplicate.

> **PushApp** helps people **become who they choose to be** — closing the gap between
> intention and action. It is *not* a habit tracker, task manager, or productivity app.
> Optimize for real-life transformation, never for time-in-app.

---

## 1. How to start any session (repo-first, token-efficient)

1. Read `AI_Start_Here.md` → `Current_Context.md` → then **only** the docs those reference.
2. Do **not** re-read the whole repo. Before opening a doc ask: *did it change? is it needed
   for this task? does an updated doc point to it?* If no — don't read it.
3. The **repository is the single source of truth — not the conversation.** Continuously move
   important knowledge out of chat and into the right permanent doc.

Full rules: `Repository_Workflow.md` (context/token discipline) and
`Repository_Guidelines.md` (documentation conventions). These govern all work.

## 2. Source-of-truth priority (when docs conflict)

`START_HERE` → `Product_Philosophy` → `AI_Product_Principles` → `Product_Terminology` →
`Product_Bible` → `Information_Architecture` → everything else. A current *Repository Update*
doc temporarily overrides files until merged.

## 3. The rules every agent obeys

1. **Never overwrite or silently rewrite.** Prefer small, incremental edits. Preserve prior
   content and the **reasoning** behind decisions (why chosen, what was rejected). Git holds
   history — don't blindly append, but never destroy meaning. If unsure, leave a note, don't guess.
2. **Protect the terminology.** Use official terms exactly (Dream · Journey · Phase · Step ·
   Buddy · Ally · Support Circle · Mission · XP · Coins · Grace Tokens …). Never introduce
   synonyms (no "Challenge / Program / Plan" for Journey). Canonical: `09_Product_Philosophy/Product_Terminology.md`.
3. **The vision never shrinks.** If something is hard, move it *later* in the roadmap — never
   delete it. Tag every feature with a `Stage:` (Vision → POC → MVP → Commercial → Future).
   Staging: `04_Product/POC_and_MVP_Scope.md`, `04_Product/Version_Roadmap.md`.
4. **Growth before engagement.** Never add a feature just because it drives usage or is
   technically possible. Ask: *does this help people become who they choose to be?*
5. **Feature proposals must answer:** what problem · why needed · what it improves · what
   complexity it adds · does it fit Product Philosophy · which roadmap stage. If you can't
   answer these, it needs more thought.
6. **Categorize decisions** as Approved / Future Vision / Open Question — never present an open
   question as a shipped feature. Log approved product decisions in `06_Decisions/Decision_Log.md`.
7. **Repository language is English.** Conversations may be any language; repo docs are English.
8. **Escalate sparingly.** The team solves problems autonomously. Bring the founder in **only**
   when a decision is genuinely his to make, or a blocker truly needs him. Otherwise, fix it and
   report the outcome.
9. **End every sprint** by updating `Current_Context.md` + `00_Foundation/CHANGELOG.md` and
   recommending the next task. Commit per completed topic (see §6).
10. **Never spend the founder's money silently.** Before any action that could incur a real charge
    or approach a paid quota (Git/LFS storage, CI minutes, a paid dependency/SDK/service/metered API,
    cloud/deploy), **stop, warn in Hebrew with an estimate and a cheaper alternative, and get
    approval first.** For deeper analysis, invoke **cost-guardian**. No cost risk → no need to ask.

## 4. The team (sub-agents in `.claude/agents/`)

Delegate scoped work to specialists; each runs in its own context and reports back a conclusion.

| Agent | Use it to… |
|-------|-----------|
| **product-manager** | Own the Feature Book + PRDs; research competitors (who does X best, ideas to improve). |
| **product-guardian** | Gate any change against the vision, philosophy & terminology before it lands. |
| **ux-designer** | Design screens against `Design_System.md` + UX specs; render visual options. |
| **explorer** | Read-only fan-out search across code/docs — "where is X / how does Y work." |
| **architect** | Turn a feature/PRD into a step-by-step implementation plan (no code). |
| **implementer** | Write the code for a scoped, planned task following our conventions. |
| **code-reviewer** | Adversarially review a diff for bugs, simplification, correctness. |
| **qa-engineer** | Test each feature; run periodic full-regression of common use-cases; diagnose breakage. |
| **store-compliance** | Keep us compliant with App Store / Play requirements; surface required files. |
| **security-privacy** | Continuously guard privacy & data-security across everything we build. |
| **content-writer** | Write user-facing support/marketing copy for every feature (light, non-technical). |
| **repo-steward** | Keep the repo updated & consistent; enforce never-overwrite, terminology, `Current_Context`. |
| **cost-guardian** | Warn BEFORE any action that could cost real money or approach a paid quota (storage/LFS, CI minutes, paid deps/APIs, cloud/deploy); on-demand cost audits. |

## 5. Orchestration — invoke only what the task needs (token discipline)

The main session is the orchestrator. **Never run the whole team on every change** — pick the
smallest set of agents the task actually requires. Defined-but-idle agents cost nothing; only an
*invoked* agent spends tokens. Match the tier:

- **Trivial change** (copy tweak, tiny fix, doc edit): the main session does it directly — often
  **zero** sub-agents.
- **Standard feature:** product-manager (PRD) → product-guardian (quick gate) → ux-designer (if UI)
  → architect (plan) → implementer → code-reviewer + qa-engineer → content-writer → repo-steward.
- **Sensitive feature** (user data / social / AI / billing): add security-privacy and/or
  store-compliance to the standard path.

Invoke a specialist **only when its trigger fires** — otherwise it stays idle (and free):

| Invoke… | only when… |
|---------|-----------|
| ux-designer | the change has a UI/UX surface |
| security-privacy | it stores, sends, or exposes user data (auth, social, AI, analytics) |
| store-compliance | it touches billing, permissions, data collection, or a release |
| explorer | you must locate/understand code across many files (keeps search out of main context) |
| content-writer | a user-facing feature shipped and needs support copy |
| repo-steward | knowledge must move into the repo, or at sprint end |
| cost-guardian | an action may incur a real charge or approach a paid quota (large files/LFS, CI minutes, paid deps/APIs, cloud/deploy) — consult it *before* acting |

Prefer running independent agents in **parallel**; use a barrier only when you truly need all
results together. You (founder) approve plans and review results.

## 6. Engineering & commits

- **Stack:** *TBD — to be decided with the founder and captured in `11_Engineering_Bible/`.*
  Until then, coding agents must not assume a stack. Once chosen, its conventions live in the
  Engineering Bible and are summarized back here.
- **Commits:** one completed topic per commit (not per file). Describe the knowledge/change added,
  e.g. `feat(buddy): egg→hatch reveal`, `docs(pitch): investor deck`. Work on a branch, not `main`.
- Never commit or push unless asked. When asked, follow the founder's instruction.

## 7. Scratchpad

Temporary/working files go in the session scratchpad, never in the repo, unless they are a
deliverable. Rendered artifacts that ARE deliverables belong in the appropriate repo folder.
