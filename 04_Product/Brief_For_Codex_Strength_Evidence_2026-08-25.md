# Brief for Codex — Strength Evidence: what it is for, and what is waiting for it

Status: **A brief, not a PRD.** Written 2026-08-25 so the founder can hand the question over without
re-explaining it. The existing draft is `PRD/Tools_Documentation/Strength_Evidence_PRD.md` (never
approved). Nothing here decides anything.

---

## The one-sentence version

Two things that are already built have a hole shaped like this tool, and both of them are visible to a
user today.

## Hole one — the Direction Statement's second drawer is empty by design

The Direction Statement builds one sentence about where somebody is pointed, out of two drawers:

- **"What draws me"** fills itself from the Values Clarification: the five values that person already
  chose and ranked. Strong material, already confirmed by them, nothing inferred.
- **"What I bring"** returns **nothing at all**, deliberately. `core/tools/direction/contributors.ts`
  says so in the code: it stays empty until Strength Evidence exists.

It is empty rather than guessed for a reason worth preserving: filling it from what somebody VALUES
would be the app telling a person what they are good at, and that is the one thing this drawer must
never do. So today the tool works, one drawer arrives full, the other is a blank box they type into.

## Hole two — a Mirror result has nowhere to live

A confidential Mirror round produces de-identified paragraphs: "people see you steadiest when things
are hard." They are shown on the round's screen and that is the end of them. There is no place where
evidence about a strength ACCUMULATES — what somebody notices about themselves, and what other people
reflected back.

## What the tool is therefore for

A place where a claimed strength collects its evidence over time, from two sources that already exist:
the person's own noticing, and what a Mirror round said. Then "what I bring" has something honest to
offer, and a Mirror result has somewhere to go instead of being read once.

## The questions the PRD has to answer

1. **What is a piece of evidence?** A moment they describe? A Mirror paragraph? A completed Journey?
2. **Who names the strength — them or us?** Naming it for them is the same mistake as filling the
   drawer from their values.
3. **How much evidence before it is offered into the Direction Statement**, and does the person
   confirm it there or is it offered pre-filled?
4. **What happens to a strength the evidence stops supporting?** Nothing in PushApp should quietly
   take something away from somebody, and nothing should flatter them either.
5. **Does a Mirror paragraph arrive automatically, or does the person put it there?** It is
   de-identified, but it is still other people's reading of them.
6. **Privacy:** a strength and its evidence are private on-device data by default (Tool Protocol
   §2.3). What, if anything, may ever be shared — and does the coach get to read it?

## What is NOT in question

That the tool is wanted. The founder approved the direction; the draft exists; two built features are
waiting for it. What is missing is a spec that answers the six above.
