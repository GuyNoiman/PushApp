# PRD — Challenges

Status: **Future Vision** — captured at the founder's request so it is not lost; **not approved for
implementation and not scoped into the MVP.**
Stage: **Future** (candidate for V3 alongside the Achievements wall).
Owner: founder + AI product team.
Captured: 2026-08-20, from the founder.
Related: `Achievements_Engine_PRD.md`, `Missions_PRD.md`, `Points_and_Leveling_PRD.md`,
`../../Version_Roadmap.md` V3, `11_Engineering_Bible/Engineering_Decisions.md` E6 (media capture),
`09_Product_Philosophy/Product_Philosophy.md`.

---

## 1. What the founder described

> Challenges — like a challenge on TikTok that you have to do and then can upload a photo of it, like
> a sport challenge or a nutrition challenge. There will be challenges, possibly bounded in time,
> that you can join, and at the end you get a completion prize — and that prize is something we could
> add to the achievements area. We will specify it more precisely later; I just do not want it to get
> lost.

The shape, as stated:

- a **catalogue of challenges** somebody can browse and JOIN;
- some are **time-boxed** — they open, they run, they close;
- doing one produces **proof**, and the founder's example of proof is a photo;
- finishing earns a **prize**, which lands in an **Achievements** area.

## 2. Why it is worth having, honestly

The strongest thing here is not the badge. It is that **a time-boxed commitment other people are also
making is one of the few devices that reliably changes behaviour** — the same argument that justifies
the Support Circle pillar. A Journey is a private arc at your own pace; a challenge is a public arc at
everybody's pace, and some people can only start when there is a shared start line.

It also gives the app something it currently lacks: **a way in that is not a conversation.** Somebody
who is not ready to tell a coach what they want can still join "seven days of walking".

## 3. The question that decides whether this is a PushApp feature

**CLAUDE.md §4: growth before engagement. Never add a feature because it drives usage.**

A challenge is, in most products, an engagement mechanic — it exists to produce activity, streaks and
shareable content. The TikTok reference in the founder's own description is exactly that lineage, and
it is worth naming rather than glossing. So the decision this PRD is really waiting on is:

> **Is the challenge a container for real change, or a container for participation?**

Two tests that separate them, and both should be applied before anything is built:

1. **Does it survive being unshared?** If a challenge with no photo, no feed and no visible
   participants is still worth doing, it is real. If it collapses without the audience, it was the
   audience.
2. **Does finishing it leave anything behind?** A prize is not something left behind. A habit that
   outlasts the seven days is. A challenge that reliably ends the day it ends is a very good way to
   make people feel they are changing without changing.

The honest version of this feature is probably: **a challenge is a short, shared Journey with a start
date** — which means it reuses the Journey model rather than becoming a parallel object, and it ends
by asking whether to keep going, not by handing out a medal.

## 4. What it would depend on

| Depends on | State |
|---|---|
| **Media capture** — a photo as proof | Not built. `expo-image-picker` is native; see E6. This is a hard dependency on that build. |
| **Achievements** area | Future (`Achievements_Engine_PRD.md`), on the V3 roadmap. A prize with nowhere to go is not a prize. |
| **Social surface** — who else is in it | The Support Circle exists; a challenge with strangers in it is a different privacy and moderation problem entirely, and is NOT implied by anything built today. |
| **Time-boxed content** — challenges that open and close | Nothing in the library has a calendar. Journeys start when a person starts them. |
| **Moderation** | The moment a user-supplied photo is visible to anyone else, this needs a policy and a store-compliance review. |

## 5. Open questions, none of them answered

1. **Who authors a challenge?** Us, the coaching partner, creators (V4), or users?
2. **Are they social at all in the first version?** A solo, private challenge is far cheaper and tests
   the mechanic without the moderation problem.
3. **Is the photo for the person or for other people?** These are different features that look alike.
4. **What is a "prize"?** Coins and XP already exist. A new currency or a medal wall is a decision
   about the economy, not a detail of this feature.
5. **What happens when somebody misses a day?** The app's whole promise is no penalty for a life that
   got in the way, and a time-boxed challenge is the easiest place in the product to break it.
6. **Does a completed challenge become a Journey?** If it does, this is a funnel into the core loop.
   If it does not, it is a side activity, and side activities compete with the thing they sit beside.

## 6. What is NOT being decided here

Nothing. This document exists so the idea survives with its reasoning intact, per CLAUDE.md §3: the
vision never shrinks, hard things move later on the roadmap rather than being deleted. It is not an
approval, and it should not be read as one.
