# PRD — Original Visual Check-In

Status: **DECLINED by the founder, 2026-08-25** — "אני לא מעוניין בזה". Moved to `Not_Planned/` and kept
in full, because a declined idea with its reasoning is worth more than a deleted one: if the same need
comes back (a low-language way to open a conversation), this is what was already thought through and
what it would have cost — original artwork and a licensing question before it could be anything.

**Where it came from, since it was never asked for:** the tools competitive research of 2026-08-20
(§3.10), not from the founder. It reached a PRD because the research pass wrote one for every
candidate it found. That is worth noticing as a process point: a document existing is not the same as
somebody wanting the thing.

Previous status: **Draft concept; not approved for implementation.**
Stage: **Future / rights and emotional-safety gated.**
Type: **Conversation opener**, not an assessment.
Research: `../../../05_Research/Coaching_Tools_Digitization_Competitive_Research_2026-08-20.md` §3.10.

---

## Design reference

![Original Visual Check-In — dark and light concept](../../UX/Tools_Concepts_2026-08-20/Original_Visual_Check_In_Dark_Light.png)

The concept image demonstrates the interaction direction only. Final artwork must be independently created and
legally reviewed; it may not reproduce the supplied Character Tree / Blob Tree.

## 1. Purpose and problem

Give users a low-language, visual way to begin describing how life feels right now. Some experiences are easier
to approach through a scene than through a blank text box. The value comes from the user's explanation of their
choice, not from PushApp assigning psychological meaning to a character or position.

## 2. Hard rights boundary

The supplied character-tree image is associated with the commercial Blob Tree catalog. PushApp must not trace,
recolor, relabel, animate, reconstruct, or algorithmically interpret it without a license. The default product
direction is an original setting, characters, composition, visual language, and interaction designed from
scratch. A license decision remains separate.

## 3. Intended impact

The Tool may save one private, dated check-in containing:

- the original scene version;
- the user's selected figure/position;
- the user's own explanation of what it represents;
- optional words for the feeling and what support would help now;
- an explicitly confirmed summary for a Coach conversation.

The selected image coordinate alone has no psychological meaning and must never enter the user model.

## 4. Proposed flow

1. **Orientation:** “Choose the figure or place that feels closest to where you are today. There is no correct
   meaning — only yours.”
2. **Explore scene:** zoom/pan or use an accessible structured list of illustrated moments.
3. **Choose:** select one figure/position; optionally select a second that represents where the user would like
   to be.
4. **Explain:** “What about this choice feels like you right now?” Free text is optional but required before
   any insight may be shared or synthesized.
5. **Support prompt:** optional “What might help you move or feel supported?”
6. **Result:** show the scene selection beside the user's own words and date.
7. **Next actions:** Save privately, Talk with the Coach, or delete. No Dream or Journey is created directly.

Returning users see the latest result and may **Reflect on this**, **Check in again**, or view a simple dated
history. A new check-in never claims improvement or decline based on visual position.

## 5. UX and artwork direction

- Commission an original PushApp world distinct in setting, silhouette, character count, arrangement, palette,
  and illustrative style from Blob Tree.
- The scene should contain varied but non-ranked experiences: connection, rest, uncertainty, exploration,
  effort, distance, support, and observation.
- Avoid a simple bottom-to-top ladder that implies a universal success hierarchy.
- Light and dark variants share composition but are authored for contrast and mood, not mechanically inverted.
- Selection uses highlight + outline + label; never color alone.
- Every visual option has concise accessible alt text that describes visible action without interpretation.
- A list/grid alternative makes the complete flow usable without seeing, dragging, or precisely tapping art.

## 6. Privacy and safety

- Results are private by default; general analytics receive no selected position, explanation, feeling, or
  inferred state.
- The Tool never diagnoses depression, anxiety, trauma, attachment, personality, or risk from a selection.
- If the user's own text triggers the approved crisis/safety policy, use that policy; do not infer crisis from
  artwork alone.
- AI, if used to summarize, quotes or paraphrases only user-provided meaning and clearly labels the suggestion.
- Export/delete includes artwork version, selection, text, summary, and history.
- Coach sharing is explicit per result and sends the user's confirmed meaning, not a hidden interpretation.

## 7. Edge cases

- Nothing feels right: allow “None of these” and a text-only check-in.
- Several choices fit: allow up to two with a distinct “now” and “wish” meaning chosen by the user.
- User selects but adds no meaning: save only as a private visual bookmark; block synthesis/Coach context.
- Artwork version changes: preserve the original rendered asset/version with historical results.
- Visual impairment: use equivalent descriptive choices and user-authored meaning; no loss of capability.
- Motor impairment: structured list replaces hotspots.
- Offline: selection and writing save locally; Coach handoff waits for connection.
- Distressing scene: user can exit/delete immediately; no forced follow-up.
- RTL and long localization must not cover scene hotspots or reorder meaning.

## 8. Acceptance criteria and tests

1. Final artwork passes documented rights review and is meaningfully original.
2. The orientation explicitly rejects universal/diagnostic interpretation.
3. Selection alone cannot generate insight, Coach memory, or notification.
4. The user's explanation is the only semantic source for a saved/shareable summary.
5. “None of these,” text-only, two-choice, screen-reader, keyboard/switch, zoom, RTL, and reduced-motion paths
   work.
6. Historical results retain the correct artwork version.
7. Offline, sync conflict, reset, scoped deletion, export, AI failure, and crisis-text scenarios are tested.

## 9. Competitive and rights references

- [Blob Tree creators](https://www.blobtree.com/pages/pip)
- [Official Blob Tree catalog](https://www.blobtree.com/pages/blob-links)

These sources are rights warnings and adjacent interaction references, not permission to copy.

## 10. Blocking decisions

1. Commission an original scene or pursue a license?
2. What visual world and accessibility description system will be meaningfully distinct?
3. Is dated history valuable enough to justify retention, or should only the latest check-in remain?
4. Should a shared Coach result expire because it represents a momentary state?

Product-guardian, security/privacy, store-compliance, accessibility, and legal/rights review are release gates.

