# Repository Workflow & Context Management

This repository is expected to evolve over many months.

To ensure consistency, reduce token consumption and maintain long-term knowledge, the repository—not the conversation—must always be treated as the single source of truth.

## General Principle

Do not rely on conversation history.

Continuously move important knowledge from the conversation into the repository.

The goal is that any future conversation can resume work by reading the repository rather than depending on previous chat context.

---

# Starting a New Conversation

If this is the first conversation for a new repository version:

1. Read `AI_Start_Here.md`.
2. Read `Current_Context.md`.
3. Read only the documents referenced by `Current_Context.md`.
4. Read additional documents only if the current task requires them.

Do **not** automatically reread the entire repository if it has already been processed and no major structural changes have occurred.

---

# During a Conversation

Avoid repeatedly reading documents that have not changed.

Before opening any document ask yourself:

- Has this document changed?
- Is this document directly relevant to the current task?
- Is another updated document referencing it?

If the answer is no, do not reread it.

Repository reads should be intentional rather than exhaustive.

---

# Updating Knowledge

Whenever important product or engineering decisions are made:

- Update the appropriate permanent document whenever possible.
- Avoid leaving important knowledge only inside the conversation.
- Minimize duplicated information.
- Keep one authoritative source for every decision.

---

# Current_Context.md

As the conversation grows (typically around 80–90% context usage), prepare a handoff before starting a new chat.

Update `Current_Context.md`.

This document should remain short (preferably one page) and contain only information needed to immediately continue working.

It should include:

- Current sprint objective
- Work completed
- Repository files modified
- Decisions finalized
- Open questions
- Current priorities
- Recommended next steps
- Files that should be read next

Do not duplicate permanent documentation.

Only summarize work that has not yet become obvious from the repository itself.

---

# Sprint Workflow

Treat each conversation as one engineering sprint.

At the end of every sprint:

- Ensure documentation is updated.
- Ensure repository changes are complete.
- Update `Current_Context.md`.
- Recommend the first task for the next conversation.

The next conversation should begin by reading `Current_Context.md` instead of reconstructing previous discussions.

---

# Token Efficiency

Repository reads are one of the largest sources of token consumption.

Always minimize unnecessary reading.

Prefer reading one updated document instead of reading the entire repository.
Prefer reading only dependent documents instead of unrelated sections.

Never reread documents simply because they exist. Read them only when:

- They changed.
- The current task depends on them.
- Another updated document explicitly references them.

---

# Repository Dependency Awareness

Treat the repository like a software system. Every document has dependencies.

Whenever possible, read only the documents required for the current task, and avoid loading unrelated knowledge into context.

---

# End Goal

The ideal workflow is:

Repository → `Current_Context.md` → only required documents → work → update documentation → update `Current_Context.md` → start next conversation.

The repository should become the permanent memory of PushApp. Conversations are temporary. The repository is not.
