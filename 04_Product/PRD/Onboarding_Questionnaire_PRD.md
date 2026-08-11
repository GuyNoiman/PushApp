# PRD — Initial Onboarding Questionnaire

Status: **Open Questions** — founder vision captured 2026-08-10; not ready for implementation. **PARKED per D40 (2026-08-11): not ready to spec at this stage; when it lands it
will also drive the unified communication-style selection (D40).** The two
cost/privacy flags (voice input + generation gating) were **resolved by the founder 2026-08-10** (§10.1,
§10.2), which removes the cloud-STT cost and audio-upload risk; the remaining spec questions (§10.3–§10.7)
still need a close-the-questions pass before build.
Stage: **MVP** (part of first-run onboarding, task K2; K1 is the onboarding shell).
Owner: founder + AI product team.
Source: founder verbal direction, 2026-08-10.
Related: `../MVP_Task_List.md` K1 (onboarding shell) + K2 (this), F1 (Dream creation + coach-suggested
Dream-linking approval), the Coach (`app/src/core/coach/*`), `Done/Own_Profile_PRD.md` + Decision Log D31
(form-of-address asked at onboarding), and `Future/User_Learning_PRD.md` (long-term learning — distinct).

---

## 1. Purpose

Give a new user a warm, low-friction first-run that does real work: instead of dropping them into an empty
Home, a short questionnaire learns enough about who they want to become to **seed their first Dreams** and
**warm up the first Coach conversation**. It should feel like the start of a relationship, not a form.

This directly serves the mission (help people become who they choose to be): the very first interaction is
about direction and identity, not setup.

## 2. Product principles

- The questionnaire earns its length — every question either personalizes the app or seeds a Dream / the
  Coach. No vanity data.
- Open-ended, in the user's own words, is the richest signal — so open questions accept **typing OR voice**.
- Everything is **skippable**; a user can reach Home and start with the Coach without answering.
- Raw self-disclosure is sensitive. The local-first split (raw on-device; only a minimal derived model may
  ever sync) governs this feature (see §6).
- Generated Dreams are **suggestions the user approves/edits** (F1), never silently created.

## 3. Proposed flow (draft)

First-run (K1 shell): welcome → (sign-in, E1, Apple-gated) → notification-permission ask → **questionnaire
(this PRD)** → generated Dreams review/approve (F1) → land on Home / open the Coach with a warm start.

Questionnaire itself:
1. A few **structured** questions (fast chips): form-of-address (Q1/D31), maybe life areas of interest,
   available time/rhythm. (Exact set is a blocking question.)
2. One or more **open questions** ("What do you wish were different a year from now?", "What have you been
   trying to change?") answered by **typing or voice recording**.
3. From the answers we generate **candidate Dreams** + a **Coach conversation seed** (an opening the Coach
   can start from instead of a cold "tell me your goal").
4. The user reviews, edits, approves, or discards the candidate Dreams (F1).

## 4. Open-question input modes

- **Typing** — a plain multiline field (low-risk; already the pattern used elsewhere).
- **Voice → the OS dictation keyboard (DECIDED, founder 2026-08-10, §10.1).** We do **not** record or upload
  audio and do **not** use a cloud STT. The open-answer field is a normal multiline text field; the user may
  dictate into it with the built-in OS keyboard mic, which inserts text. From our side every open answer is
  just **text** (typed or dictated) — so the audio never leaves the OS layer, there is **no STT cost**, and
  there is no new audio-privacy surface. Cost + audio-privacy flags are therefore resolved for MVP.

## 5. Generation (answers → Dreams + Coach seed)

Turning open answers into candidate Dreams + a Coach seed is an **LLM step** (the Coach already uses Gemini
behind `featureFlags.liveCoach`, founder-device-only today).

- **⚠ COST FLAG:** an LLM call per new user (recurring). cost-guardian estimate required.
- **PRIVACY (G1) — gating DECIDED (founder 2026-08-10, §10.2): founder-device-only at first.** The open
  answers are exactly the "raw disclosures" the architecture keeps on-device. The generation step is gated
  the same way as the live Coach (`featureFlags.liveCoach`, founder device only) until the live-Coach
  prerequisites land (server-side key proxy, consent/disclaimer, crisis-detection safety floor,
  sensitive-domain containment — see `Current_Context`). No real (non-founder) user sends open answers to the
  cloud until then.
- Reuse, don't reinvent: the Coach already detects multiple goals and produces `GoalSpec` (with
  `deferredGoals`, see L1) and `AppCore.createJourneyFromGoalSpec`. Generated Dreams should flow through the
  same GoalSpec → Dream/Journey path and the F1 approval, not a parallel mechanism.

## 6. Privacy (must resolve with security-privacy)

- Structured answers (form-of-address, interests) are low-sensitivity preferences.
- Open answers + any voice/transcript are high-sensitivity raw disclosures → default **on-device only**;
  nothing crosses to a cloud STT/LLM without an explicit decision + consent.
- Whatever is stored lands in the single encrypted `AppState` blob (cascade-deleted via
  `resetToFirstRun()` / account deletion; included in `exportStateJson()`). No new store, no analytics use.
- Never place any of this in a social payload.

## 7. Cost (must resolve with cost-guardian)

Two recurring per-user costs are introduced: **STT** (if we record audio) and the **generation LLM call**.
An estimate + cheaper alternatives (OS dictation instead of cloud STT; reuse the existing Coach call instead
of a second one) are required before build. No cost is taken silently.

## 8. Edge cases

- Microphone permission denied/revoked → typing still works; never block.
- Empty / skipped answers → generate nothing, land on Home / Coach gracefully.
- Very long recording / very long text → cap + graceful handling.
- Non-Hebrew/English speech → STT language handling.
- Offline during the questionnaire → defer generation, or fall back to a cold Coach start.
- Generation produces nothing useful / low confidence → don't force fake Dreams.
- Duplicate/again on reinstall (firstRunFlag) → don't re-run for an existing user.
- RTL + form-of-address in every prompt.

## 9. Out of scope

- The onboarding shell itself (K1: welcome / sign-in / permission ask).
- Real OAuth sign-in (E1, Apple-gated).
- Long-term User Learning (`Future/User_Learning_PRD.md`).
- The Coach's own interview mechanics (this only seeds it).

## 10. Blocking questions

1. **Voice input — RESOLVED (founder 2026-08-10):** the **OS dictation keyboard** (text only; no recording,
   no audio upload, no cloud STT). The open-answer field is a plain text field; audio stays on the OS.
2. **Generation gating — RESOLVED (founder 2026-08-10):** answers→Dreams is **founder-device-only at first**,
   mirroring the live-Coach gating, until the live-Coach safety/consent floor + key proxy land.
3. **Which structured questions** are in the MVP set (beyond form-of-address)?
4. **How many open questions**, and their exact wording?
5. **Dream approval UX:** how do candidate Dreams get reviewed/edited/approved (align with F1)?
6. **Coach seed:** what exactly is handed to the Coach, and does it reuse the existing GoalSpec path?
7. **Retention:** confirm on-device-only for open answers/transcripts; define any consented cloud use.
