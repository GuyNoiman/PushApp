# PRD — Step types

Status: **Task defined, design not started.** The founder is building the design with Codex.
Stage: **MVP delta** for the app; the creator half moves with the creator platform.
Owner: founder + Codex. This file is the brief they start from, not the design.
Related: `Creator_Platform_PRD.md` (`C-03` — the structure builder, which this is part of),
`04_Product/Backlog.md` §7a S-22 and S-13, `04_Product/Domain_Expert_Authoring_Guide.md`,
`04_Product/Tool_Addition_Protocol.md`, Decision D95 (`Step.appLink`).

---

## 1. The problem

A Step today is a title, an optional description, and a cadence. It is always an instruction to go
and do something in the world, and the app's job ends at reminding you it exists.

A great deal of what a coach or a content creator actually wants to hand somebody is **material**:
watch this three-minute video · listen to this on the way to work · answer these six questions ·
look at these images in this order. Today the only way to express any of that is to write it into a
Step's title and hope the person finds the thing somewhere else.

That cap is felt in three places at once:

- **Creators.** The whole value of the creator platform is that somebody who knows a subject can
  author a Journey worth taking. Text-only Steps cap what they can make at "a list of instructions",
  which is the one thing a person can already write for themselves.
- **Domain experts.** The nine profile questions are exactly a questionnaire Step, and they live
  outside Journeys entirely because a Journey has nowhere to put them. Every expert we write will
  want the same shape.
- **The product's own evidence.** The Tools tab is fourteen in-app exercises that people do and come
  out of knowing something. A Step that IS one of those closes a loop the app has already proved.

There is also a smaller, sharper reason to do this now. `Step.appLink` shipped on 2026-09-03: a Step
that opens a screen instead of asking whether it is done. That is the first instance of "a Step can
be more than text", it was added for one Journey, and it will look like an accident unless it
becomes the first case of a general model.

## 2. What a Step type is, roughly

The types named by the founder, 2026-09-03:

| Type | The Step is… |
|---|---|
| **Action** (today) | Something to do in the world. Unchanged, and stays the default. |
| **Questionnaire** | A set of questions answered in the app. |
| **Video** | Something to watch. |
| **Audio** | Something to listen to. |
| **Image sequence** | An ordered set of images to look through. |
| **In-app destination** | Opens a screen (`Step.appLink`, already built). Folded in if it fits. |

## 3. What this changes, surface by surface

**The Step model** (`core/types/domain.ts`) — a Step gains a type and a content payload. Additive:
every existing Step is an Action Step with no payload and must stay byte-identical.

**Reporting.** The hardest question in the whole feature, and §5 opens it rather than answering it.

**The app's Step surfaces** — Home's rows, the Journey detail list, the report sheet, reminders. A
Step that has content needs somewhere to open, which is a screen that does not exist yet.

**The creator platform** — explicitly in scope on the founder's instruction. The Journey Studio must
let a creator attach media and build a questionnaire, and `journey_templates` deliberately has no
structure column at all so that nothing is guessed at before this design exists (`C-03` / `S-13`).
**This PRD and the structure builder are one design, not two.**

**Domain-expert authoring** — `Domain_Expert_Authoring_Guide.md` defines four files per domain and
no way to declare a Step type. Whatever this design lands on, the guide gains it, or experts can
only ever author Action Steps.

**Storage and delivery** — video, audio and images have to live somewhere, be paid for, be reachable
offline or honestly not be, and be removed when a creator withdraws a Journey or a user deletes an
account.

**Accessibility and localisation** — video needs captions and audio needs a transcript, per language.
A creator who uploaded only Hebrew has produced a Journey an English speaker cannot take.

## 4. Why it fits the product

It fits, but only if it is held to one line: **the Step is still the thing the person does, and the
media is in service of it.** A Journey that is six videos is a course, and this product is not a
course platform. The test to hold every type against is whether the Step still ends with the person
having *done* something, rather than having *consumed* something.

Growth before engagement (CLAUDE.md §3.4) has real teeth here. Watch-time, completion rates and
"you finished 80% of the video" are exactly the metrics a media feature invites, and exactly the
metrics this product refuses.

## 5. The open questions — the design starts here

1. **Is a type a presentation of a Step, or a different kind of object?** Does a video Step still
   carry a cadence, a `plannedFor`, a postponement, a streak? The cheap answer is yes to all and it
   may well be wrong for a questionnaire.
2. **What does "done" mean per type, and who decides it?** Every Step in PushApp is self-reported,
   deliberately. Measuring whether somebody watched to the end is tracking, and this product does not
   measure people. But "mark as done" on a video nobody opened is a Step that taught nothing.
3. **Where does the media live, and what does it cost?** See §6.
4. **What happens offline?** The app is offline-first and media is not. Is a media Step simply
   unavailable without a connection, is it pre-fetched, and what does a Journey look like when half
   its Steps cannot be opened on a train?
5. **Does a questionnaire Step reuse the existing question engine** (`core/onboarding/questions.ts`
   plus the Tools' own flows), or is it a new authored format? Reusing it means one place to be right
   about; a new one means creators are not limited to our nine axes.
6. **What comes back from a questionnaire Step, and who may read it?** It is the most personal thing
   in the feature. The `Tool_Addition_Protocol` already requires every tool to declare what it
   teaches us, the smallest summary that carries it, who may read it with a reason each, and when it
   goes stale. A questionnaire Step needs the same contract, and a CREATOR's questionnaire raises the
   further question of whether the creator ever sees any of it (default answer: no).
7. **Per-locale media.** Is media per-language, and what does a Journey do when a language is missing?
8. **Review.** Moderating video and audio is a different problem from moderating text, and a much
   larger one (`S-14`). Nothing with media may be publishable before that has an answer.
9. **Does `appLink` become one of the types**, or stay a separate property?

## 6. Cost — flag before anything is uploaded

⚠️ **This is the first feature in the product that would spend money per user.** Everything so far is
on-device or a metered LLM call. Hosting and serving video and audio is storage plus egress, and
egress is the part that scales with how many people watch rather than with how much was uploaded.

Nothing here spends anything yet — this is a brief. But **no media may be uploaded to any hosted
bucket before the founder has approved a number**, per CLAUDE.md §10. The design must state, before
it is built: where files live, the per-file size cap, the per-creator quota, what happens at the
quota, and a rough monthly figure at a stated number of users. `cost-guardian` should be run against
the design before implementation, not after.

## 7. What this PRD is not

It is not the design. The founder is writing that with Codex. This file exists so that the design
starts from a stated problem, a known list of affected surfaces, and the nine questions above —
rather than from a table of file formats.

When the design lands, it replaces §2 and §5 of this file in place. Do not open a second document.
