# Build_Plan_and_Method.md

Status: Living Document — the working method for building the AI-adaptive-coach pivot to
MVP-in-store. Recorded 2026-08-03 (task S0.2), cross-referencing
`06_Decisions/Decision_Log.md` **D23** (the pivot decision, which named this method in its
"Build approach" point but left it undocumented) and
`11_Engineering_Bible/Engineering_Decisions.md` **E5** (the hub-and-loop architecture this method
builds toward).

This doc records *how* we work, not *what* is decided about the product — for product decisions
see the Decision Log; for the architecture, see E5.

---

## The method, in short

**One status-tracked task list, from now to MVP-in-store.** Not a sprint-by-sprint plan re-derived
each session — a single living list, staged **S0 → S7**, plus a parallel **SX** track for domain
experts (Future Vision, not part of the sequential spine).

Rules:

1. **Work strictly in stage order.** Do not start S3 while S1 is incomplete. This keeps the loop's
   core (S1) validated before anything depends on it, and avoids paying for paid stages (S2/S3/S7)
   before the free foundation is solid.
2. **Build each component in isolation, with tests, then integrate and test again.** A stage's
   pieces are built and unit/behavior-tested standalone first; only once they pass do they get
   wired into the rest of the system, followed by an integration check. This mirrors the existing
   engineering convention (framework-free engines, `tsc`/jest-clean before merge — E1, E4) applied
   at the task-list level, not just the code level.
3. **Any partially-done task spawns an explicit follow-up "complete X" task.** Nothing is left
   silently unfinished — if a stage is started and only partly landed (as D23 itself states), the
   remaining work becomes its own tracked task rather than an implicit TODO buried in a snapshot.
   (This entry — S0.2 — is itself one such follow-up, spawned by D23's "terminology/architecture/
   method not yet updated" note.)
4. **Cost gates apply at specific stages**, per CLAUDE.md §3.10 (never spend the founder's money
   silently): a stage that would incur a real charge or approach a paid quota stops for founder
   approval (with a Hebrew cost estimate + cheaper alternative, cost-guardian invoked) *before* the
   spend, not after.
5. **Show the plan and % complete on request.** The list is the single source of truth for "where
   are we" — a status snapshot should be producible from it directly, rather than reconstructed
   from chat history (consistent with `Repository_Workflow.md`'s repo-first principle).

---

## The stages

The spine is **S0 → S7**, sequential. Anchor points that are already fixed (from the task that
established this doc):

| Stage | What it covers | Cost gate? |
|-------|-----------------|------------|
| **S0** | Foundation — pivot groundwork: positioning, terminology, architecture recorded (this doc, `Product_Terminology.md`'s Milestone rename, E5). Docs-only. **This entry is task S0.2.** | No |
| **S1** | Domain-agnostic core engine + **headless simulation** proving the hub-and-loop's quality (see E5 §7) before any UI depends on it. | No |
| **S2** | **Real LLM integration** — the adaptive coach's actual model calls. | **Yes — real-LLM API cost.** |
| **S3** | **Supabase** cloud backend for the pieces that need it (mirrors E2's social-pillar gate, applied to the adaptive-coach data path). | **Yes — cloud/DB quota.** |
| **S4–S6** | Remaining build-out toward MVP (UI/UX for the coach experience, human-ally/Support-Circle integration, onboarding, QA/hardening). Not yet broken into fixed sub-stage definitions — each is scoped as its turn comes, following the same isolate-build-test-integrate rule above, rather than pre-specified here in detail that might not survive contact with the work. | No (unless a sub-task itself trips CLAUDE.md §3.10) |
| **S7** | **Apple Developer Program** (~$99/yr) + store submission — the same unavoidable cost already identified in E3/D19 for native auth, reused here as the store-readiness gate. | **Yes — ~$99/yr.** |

**SX — Domain-expert modules** (sports, professional certification, nutrition, etc.): **not part of
the S0–S7 spine.** Per D23, these are explicitly **Future Vision**, built later as pluggable
add-ons behind the `DomainExpert` seam (E5 §5), only after the domain-agnostic core (S1+) has
proven itself. Tracking them as "SX" (parallel, not numbered into the sequence) keeps them visibly
in the plan — per CLAUDE.md §3 "the vision never shrinks" — without implying they block or are
blocked by the main spine.

**S4–S6 are intentionally not pre-detailed here.** Locking their exact content now would risk
asserting a plan that hasn't been designed yet; each is scoped (PRD → plan → build) when the list
reaches it, following the same order/isolation/test rules as every other stage. This doc should be
updated incrementally (never overwritten) as each stage is scoped and completed, keeping the table
above current.

---

## Why this method (not a different one)

- **Sequential, not parallel-everything** — the adaptive-coach pivot's core bet is the loop (E5);
  building UI or paid integrations before the loop is proven risks investing in the wrong shape.
  Strict ordering makes that risk explicit and enforced by the task list itself, not by memory.
- **Isolation + tests before integration** — mirrors the existing engine-boundary discipline (E1,
  E4: each engine framework-free and independently testable) at the project-management level, so a
  broken component is caught before it's wired into everything else.
- **Explicit follow-up tasks for partial work** — the alternative (silent partial completion) is
  exactly what produced the gap this very doc is closing (D23 shipped with terminology/architecture
  /method explicitly marked "not yet updated"). Making the follow-up an explicit task prevents that
  gap from being forgotten.
- **Cost gates at named stages** — rather than re-deciding "is this a cost risk?" ad hoc each time,
  pinning the three known paid steps (S2 real-LLM, S3 Supabase, S7 Apple) to the plan up front means
  everyone already knows where the founder-approval checkpoints are.

## Reflected in / relates to
- `06_Decisions/Decision_Log.md` **D23** (names this method's principles; this doc is the promised
  follow-up documentation).
- `11_Engineering_Bible/Engineering_Decisions.md` **E5** (the hub-and-loop architecture S1 is built
  to validate).
- `CLAUDE.md` §3.10 (cost-approval rule the S2/S3/S7 gates implement) and §6 (commit-per-topic,
  which applies per completed task on this list).
- `Current_Context.md` (should point here once a task from this list is actively in progress).
