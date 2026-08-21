# Strength Evidence — Product Requirements Document

Status: **Draft proposal — not founder-approved**  
Stage: **Next / Commercial candidate; not an MVP dependency**  
Tool type: **Evidence-led reflection, not a validated assessment**  
Estimated time: **10–15 minutes; resumable**  
Last updated: 2026-08-21

![Strength Evidence concept in dark and light themes](../../UX/Tools_Concepts_2026-08-20/Strength_Evidence_Dark_Light.png)

## Purpose and problem

People often describe strengths with flattering labels but cannot connect those labels to real behaviour. Conversely, useful abilities can feel ordinary precisely because they recur naturally. Strength Evidence helps a person collect concrete moments from different parts of life, identify recurring capabilities, and choose language that feels true.

The user walks away with **five editable strengths, each grounded in their own examples and described in their own words**. PushApp does not claim to measure, rank, diagnose, or scientifically validate talent.

This fits PushApp because believable self-knowledge can improve how a person chooses and pursues a Dream. Complexity comes from clustering evidence, optional Coach suggestions, private storage, editing, and downstream permissions—not from scoring.

## Goals

- Replace abstract self-rating with specific behavioural evidence.
- Surface strengths across childhood, work or learning, relationships, recurring requests for help, and difficult moments.
- Let the user—not the system—confirm, rename, order, and remove candidate strengths.
- Preserve a useful result that can later support reflection or a Coach conversation with explicit permission.

## Non-goals

- Producing a psychometric profile, score, percentile, type, diagnosis, or comparison.
- Recreating CliftonStrengths, VIA, HIGH5, or the supplied worksheet wording.
- Proving that a strength is permanent.
- Automatically creating or changing a Dream, Journey, Milestone, Step, reminder, or Coach agenda.
- Treating frequency of evidence as objective strength magnitude.

## User stories

- As a user who struggles to name strengths, I want prompts tied to real moments so my answer feels earned.
- As a user who dislikes a suggested label, I want to rename it without losing its evidence.
- As a returning user, I want to see my current result or resume an unfinished reflection.
- As a user, I want to delete an example or the complete result and understand what downstream context is removed.

## Entry and return

### First entry

The Tools card states the outcome, reflection status, estimated time, privacy summary, and that progress is saved. `Begin` opens a short orientation: examples matter more than polished writing; voice is optional; no answer is right or wrong.

### Return with a draft

Open a return screen showing progress, last-edited time, and three actions: `Continue`, `Review what I added`, and `Start again`. Starting again requires confirmation and explains that it replaces the draft only.

### Return after completion

Open the current five-strength summary, with `Add evidence`, `Edit strengths`, `Talk to Coach`, `Delete result`, and `Start again`. A new run must not silently overwrite the current completed result; it remains active until the replacement is confirmed.

## Detailed flow

1. **Orientation and consent.** Explain reflection status, local-first privacy, optional Coach sharing, estimated time, and save/resume.
2. **Evidence prompts.** One cognitive operation per screen. Prompt across: an early memory; work or learning; relationships; something people seek help with; a hard situation; and an accomplishment that felt natural. The user may type or dictate a short story, skip a prompt, and tag its life context.
3. **Evidence review.** Show editable evidence cards. Each card contains the user's wording, optional context, and date added. The user can add, edit, delete, or reorder. Require at least five concrete examples to continue; recommend diversity but do not block it.
4. **Candidate grouping.** Let the user place evidence under candidate strength labels or leave it ungrouped. Draft Coach suggestions may propose editable working labels and must show which evidence led to each suggestion.
5. **Choose up to five.** The user confirms one to five strengths, renames each, assigns relevant evidence, and orders them. A strength requires at least one attached example.
6. **Meaning and application.** For each chosen strength ask, `When does this help you?` and optionally `When can too much of it get in the way?` These are reflection fields, not judgments.
7. **Review and confirm.** Show all five cards and their evidence. The user confirms the result and separately chooses whether to make the minimal summary available to the Coach.
8. **Result.** Present a quiet, editable evidence map—not a reveal, grade, or celebration for “being strong.”

## Result and downstream use

The result contains up to five user-confirmed strength labels, supporting example references, and optional user-written application notes. Raw stories remain private by default.

### Draft influence contract

- **Unique knowledge:** capabilities the user recognises because they recur in lived examples, not merely interests or onboarding claims.
- **Smallest derived summary:** `{ takenAt, strengths: [{ userLabel, evidenceCount }], expiresAt }`; no story text or context detail.
- **Permitted reader proposed:** Coach, only after explicit share, to frame questions around capabilities the user already claimed. It is context, never an agenda or authority.
- **Proposed staleness:** 180 days; the completed result remains visible, but the summary stops informing Coach context until reconfirmed.
- **Never:** raw-answer transmission, silent Dream/Journey/Step creation, notifications, Buddy reactions, scoring, or claims of assessment validity.

This influence contract is **Open Question / draft** until founder approval under the Tool Addition Protocol. The tool must not ship without a written, approved contract.

## UX requirements — light and dark

- Follow the current display voice: Fraunces for English headings, Frank Ruhl Libre for Hebrew headings, Inter for body and controls, with fixed role line heights.
- Use one screen/one job, generous whitespace, one subject per card, and hairlines within cards rather than nested boxes.
- Teal indicates selection and real growth; evidence categories use restrained secondary accents with text/icon labels so colour is never the only meaning.
- The dark theme uses deep ink surfaces and readable muted copy; the light theme uses near-white canvas and white cards with visible edges. Both must meet WCAG AA.
- Provide 44px minimum targets, Dynamic Type, screen-reader labels, keyboard-safe layouts, RTL mirroring, reduced-motion support, and non-colour progress semantics.
- Voice capture must always have an equivalent text path and clear recording state.

## Data and privacy

- Store drafts, raw evidence, user labels, notes, and result locally by default through the Repository abstraction.
- Raw evidence must never be included in analytics, logs, notification copy, or derived signals.
- Coach access requires an explicit result-level choice; withdrawing it removes the derived Coach context.
- Support per-example deletion, full-result deletion, draft reset, and account deletion/export obligations.
- If AI clustering is used later, no raw story leaves the device without a separate privacy decision and clear consent; on-device/manual grouping is the MVP-safe default.

## Edge cases

- Fewer than five credible strengths: allow one to four; never add filler.
- One example supports several labels: allow linking without duplicating raw text.
- Several labels mean the same thing: suggest merge, never auto-merge.
- User disputes every suggestion: permit manual labels and completion without Coach suggestions.
- Voice permission denied or transcription fails: retain no unusable audio and offer text immediately.
- RTL mixed with numbers or English strength labels: preserve logical reading order.
- App closes mid-entry or storage fails: recover the last durable draft and explain any unsaved content.
- A shared result is edited or deleted: recompute or revoke the derived summary immediately.

## Success metrics and instrumentation

Success means users produce evidence-backed language they retain or deliberately use—not that they spend more time in the tool.

- Completion among starts; draft-resume success; proportion of selected strengths with at least two examples; label-edit rate; voluntary Coach-share rate; result revisit or purposeful downstream use within 30 days.
- Guardrails: reset/delete rate, abandonment by step, voice failure rate, and share withdrawal rate.

Events (never include answer text): `tool_strength_evidence_viewed`, `tool_strength_evidence_started`, `tool_strength_evidence_draft_saved`, `tool_strength_evidence_resumed`, `strength_evidence_added`, `strength_evidence_edited`, `strength_evidence_deleted`, `strength_candidate_suggested`, `strength_candidate_renamed`, `strength_selected`, `tool_strength_evidence_completed`, `tool_strength_evidence_result_viewed`, `tool_strength_evidence_coach_share_set`, `tool_strength_evidence_reset`, `tool_strength_evidence_deleted`, `tool_strength_evidence_error`.

Allowed properties are coarse: step number, entry source, input mode, evidence count bucket, selected-strength count, suggestion accepted/edited/rejected, share state, duration bucket, theme, language, and error code.

## Acceptance criteria

- The card identifies this as a reflection, gives an estimated time, and says it is resumable.
- The user can type, dictate, skip, save, exit, and resume without losing confirmed content.
- Completion supports one to five strengths, each with at least one user-owned example.
- Suggested labels are explained, editable, removable, and never presented as validated findings.
- The result is editable and private by default; Coach sharing is separate and reversible.
- No raw answer appears in analytics or downstream signals.
- Light, dark, English, Hebrew/RTL, Dynamic Type, VoiceOver/TalkBack, reduced motion, and offline use pass QA.
- Reset and deletion behave as described, including revocation of derived context.

## Test scenarios

1. Complete manually with five diverse examples and rename all suggested labels.
2. Complete with no Coach suggestions and only three confirmed strengths.
3. Save at every step, force-close, relaunch, and resume exactly where left.
4. Deny microphone permission, fail transcription, and finish by typing.
5. Share result with Coach, edit a label, then withdraw sharing and verify derived context updates/removes.
6. Delete one linked example and verify affected strengths remain truthful or request repair.
7. Run offline in both themes and both directions with large text and screen reader.
8. Inspect analytics payloads and logs to confirm no raw stories, labels, or notes are emitted.

## Competitors and references

- [Gallup CliftonStrengths](https://support.gallup.com/hc/en-us/articles/44814767818643-What-is-the-CliftonStrengths-assessment): strong validated talent-theme model; not a model PushApp should imitate without licensing and validation.
- [VIA assessments](https://www.viacharacter.org/researchers/assessments): useful benchmark for transparent research status and instrument boundaries.
- [HIGH5](https://high5test.com/features/): useful pattern of connecting strengths to stories, peer evidence, and application rather than stopping at labels.
- Internal research: `05_Research/Coaching_Tools_Digitization_Competitive_Research_2026-08-20.md` §3.4.
- Governing rules: `04_Product/Tool_Addition_Protocol.md`; `04_Product/Design_System.md`.

## Related tasks

- **Draft / unassigned:** approve the influence contract and staleness window.
- **Draft / unassigned:** write original English and Hebrew prompts and accessibility labels.
- **Draft / unassigned:** design the local model, Repository storage, result deletion, and signals audit.
- **Draft / unassigned:** implement and QA analytics events listed above.
- No synthesis Tool depends on this result. Any future consumer requires a new explicit influence decision.

## Product decisions

- **Approved, repository-wide:** a Tool must give user value and declare an influence contract; it never creates product objects or nags by itself.
- **Approved, repository-wide:** raw Tool answers are on-device by default and Tools do not score, grade, or compare.
- **Research recommendation, not founder-approved:** Strength Evidence should be evidence-led reflection rather than a pseudo-validated assessment.

## Future Vision

- A separately licensed validated assessment, clearly distinguished from this reflection.
- On-device clustering assistance with transparent evidence links.
- User-requested comparison between dated maps, framed as change rather than improvement or decline.

## Open Questions

- Is MVP manual-only, or may the Coach propose labels during the run?
- Is explicit per-result Coach sharing required, or can the user set a standing Tools permission?
- Is 180 days the right staleness window?
- Should one or five strengths be required for a “complete” result?
- What character and word limits best preserve useful evidence without turning this into long-form journaling?
