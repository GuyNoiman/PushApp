# Tools Documentation — Master Index and Product Impact Map

Status: **Living documentation hub — individual tools remain drafts until their PRD says otherwise.**
Updated: **2026-08-21**.
Scope: Tools-tab reflections, exercises, assessments, and rights-constrained workshop concepts.

---

## 1. Purpose

This folder is the single documentation home for PushApp's interactive personal-growth tools. Every Tool has
one PRD and one responsibility. A Tool must create a useful user-owned result and connect to the wider product
only through explicit, bounded rules; it must not exist merely to increase time in the app.

The intended product chain is:

`Tool experience → private result → optional user-approved Coach context → Dream clarification → optional Journey proposal`

A Tool never silently creates a Dream, changes a Journey, sends information to a friend or Ally, or turns a
reflection result into a permanent identity label.

## 2. Shared impact contract

Every Tool PRD must state:

1. **What becomes knowable:** the smallest confirmed insight the Tool produces that the app did not know before;
2. **Who may consume it:** result screen, Coach, Dream conversation, Journey proposal, or another Tool;
3. **What requires approval:** especially Coach sharing, Dream exploration, and any proposed action;
4. **What it may never do:** prohibited automatic decisions and visibility;
5. **Freshness:** whether the result is current, dated, revisable, or context-dependent;
6. **Deletion/export:** how the user can remove it and how it leaves with account export/deletion;
7. **Stage and dependencies:** so an exploratory Tool is never mistaken for approved MVP scope.

Raw free text remains private Tool data. General analytics may receive structural events and count buckets,
never the user's answers, theme names, stories, ratings, or inferred sensitive traits.

## 3. Product impact table

| Tool | Type | What it adds to the user model | Primary product impact | Permitted consumers | Must never happen automatically | Sensitivity | Stage |
|---|---|---|---|---|---|---|---|
| [Life Wheel](Life_Wheel_PRD.md) | Reflection | Dated pressing-area gap and strongest area; the user's chosen priority stays in the private result | Gives the Coach coarse whole-life context and helps the user choose what deserves discussion | Tool result; approved coarse Coach context; Coach-led Dream exploration only | Turn a life-area label into a Dream, create a Journey, diagnose wellbeing, or treat a low rating as failure | Medium | MVP candidate |
| [Values Sort](Values_Sort_PRD.md) | Reflection | Five user-defined core values, their order, meaning, and optional lived-alignment rating | Gives the user language for what matters; downstream influence remains unapproved | Tool result only until the influence contract is approved; explicit import/share is proposed | Infer morality/personality, rank the user, or rewrite a Dream/Journey | High | MVP candidate |
| [Passion Map](Passion_Map_PRD.md) | Living reflection | Confirmed passion themes; future Live Discovery may add Energy/Pull evidence | Helps the user recognize what draws them and may later support more specific Dream exploration | Tool result only until a version-bound sharing/import contract is approved | Declare a purpose, silently revise themes, or equate passion with skill/career | High | Commercial candidate; Live Discovery separately gated Future subfeature |
| [Strength Evidence](Strength_Evidence_PRD.md) | Evidence-led reflection | User-confirmed strengths tied to concrete examples and useful contexts | Gives the user evidence-led language for strengths; downstream influence remains unapproved | Tool result only; explicit Coach share is proposed | Claim a validated assessment, score ability, or infer a strength without evidence | High | Commercial candidate |
| [Best Possible Year](Best_Possible_Year_PRD.md) | Guided private reflection | Nothing from the letter; only a separate aspiration deliberately typed into the Dream box may leave the Tool | Gives the user a private future-writing ritual and optional scheduled return | User only; separately authored Dream-box text may enter explicit Dream exploration | Read, mine, summarize, classify, or extract aspirations/resources/barriers from the letter—even after completion | High | MVP candidate |
| [Mirror Feedback](Mirror_Feedback_PRD.md) | Social reflection | Named visible perspectives or a de-identified synthesis, plus a separate user-confirmed reflection | Adds external evidence without exposing confidential raw responses | Tool result only; sharing a version-bound confirmed reflection is proposed after contract approval | Expose confidential raw answers/statuses, publish feedback, rank the user, or treat abuse as insight | Very high | Future / sensitive |
| [Original Visual Check-In](Original_Visual_Check_In_PRD.md) | Conversation opener | The user's own meaning for a selected scene/position and current emotional context | Offers a low-language entry into private reflection or a Coach conversation | Tool result; explicit Coach share | Apply a psychological interpretation, diagnosis, or copy the Blob Tree artwork | Very high | Future / rights and safety gated |

### Reading the table

- **MVP candidate** means potentially valuable for MVP, not approved implementation scope.
- **Commercial candidate** preserves a proposed placement without approving implementation; sequencing is
  written separately because `Next` is not a canonical Stage.
- **Future / sensitive** means privacy, safety, social, moderation, or rights work must be intentionally funded
  and approved before implementation.
- A permitted consumer receives only the minimum user-confirmed result, never unrestricted access to all raw
  answers.

## 4. Documentation index

### Standalone Tools

- [Life Wheel](Life_Wheel_PRD.md)
- [Values Sort](Values_Sort_PRD.md)
- [Passion Map](Passion_Map_PRD.md)
- [Strength Evidence](Strength_Evidence_PRD.md)
- [Best Possible Year](Best_Possible_Year_PRD.md)

### Future and sensitive concepts

- [Mirror Feedback](Mirror_Feedback_PRD.md)
- [Original Visual Check-In](Original_Visual_Check_In_PRD.md)

### Not planned

The founder removed these concepts from the product plan on 2026-08-21. Their documents remain only to
preserve research, design provenance, and the reason they should not be picked up for development:

- [Direction Statement](Not_Planned/Direction_Statement_PRD.md)
- [Goal Clarity Check](Not_Planned/Goal_Clarity_Check_PRD.md)
- [Six-stage creator workshop concept](Not_Planned/Licensed_Creator_Workshop_Journey_PRD.md)

Values Summary is the result screen of Values Sort, not a separate Tool.

## 5. Shared UX rules

- Show Tool type and estimated time before starting.
- One cognitive operation per screen; save progress and allow exit/resume.
- Returning users see their current result before being asked to repeat or edit.
- Every repeatable Tool distinguishes **Edit current result** from **Start over**.
- Light and dark modes are first-class; Hebrew and all RTL interactions are designed, not mirrored blindly.
- Generated suggestions are labelled, explainable, editable, and never saved without confirmation.
- Results are private by default and have explicit delete/reset behavior.
- No Tool awards XP merely for opening, answering quickly, or returning daily.
- No missed-day punishment, shame copy, or false urgency.
- Drag interactions always have a tap/keyboard/screen-reader alternative.

## 6. Shared result states

Every Tool should support, where relevant:

- no result / first run;
- autosaved draft;
- current confirmed result;
- edit draft while the current result remains safe;
- restart draft while the current result remains safe;
- partial result when honest synthesis is possible;
- insufficient information without fabricated output;
- offline saved / sync pending;
- analysis unavailable with manual completion path;
- scoped deletion and full reset.

## 7. Cross-tool boundaries

- Passion Map answers **what draws me**; Strength Evidence answers **what I have evidence I can bring**. The
  removed Direction Statement concept is not required to combine or use those insights.
- Values Sort answers **what matters to me**, not what energizes me or what I am good at.
- Life Wheel answers **where life currently feels stronger or weaker**, not what the user should prioritize.
- Best Possible Year may surface candidate aspirations; it does not convert prose into Dreams automatically.
- Mirror Feedback adds others' observations; it never overrules the user's own interpretation.

## 8. Shared unresolved platform decisions

These are platform questions, not reasons to leave individual PRDs vague:

1. Whether every result requires a fresh **Share with Coach** action or users may create a revocable standing
   permission for selected Tools;
2. the default retention period for raw answers and superseded results;
3. the shared account-sync and offline conflict policy for Tool drafts;
4. whether optional reminders are owned by each Tool or one Tools reminder preference;
5. the common result/export schema and typed Coach-context envelope;
6. which MVP candidate will be implemented first.

Until decided, use the privacy-preserving defaults: private result, explicit Coach sharing, current result plus
one safe active draft, no silent automation, and user-controlled deletion.
