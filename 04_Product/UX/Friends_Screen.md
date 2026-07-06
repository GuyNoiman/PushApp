# Friends Screen — UX Design

Status: Draft for approval · Phase 4, screen 5 · 2026-07-06

> UX specification. Builds on `Screen_Bible.md` (FRIENDS), `Information_Architecture.md`
> (Friends), `Product_Bible.md` §12 (Support System).

---

## Purpose

Friends is a **support network, not a social network**: it answers *"who can help me, and
who can I help?"* Emotional goal: connection, belonging, mutual support.

## Primary User Question

> **"Who can I help — and who's helping me?"**

## Primary CTA

Help a friend who needs it. (Secondary: encourage a friend · chat · gift · invite.)

## Information Hierarchy — help-first

- **Top:** friend **count** + **Invite** (encourage growing the network).
- **Section 1 — Friends who need help (always first).** Friends flagged **automatically**
  via **missed check-ins / forecast risk** (the user cannot yet *explicitly* ask for help —
  that's future). Card actions: **Help** · Chat · Gift.
  - Empty state: "Everyone's on track — invite a friend" (no shame; drives growth).
- **Section 2 — Your friends.** Everyone else. Card action is an **encouraging, poke-like
  nudge** — **"Cheer"** — **not** "Help": **Cheer** · Chat · Gift.

**Friend card:**
- Buddy portrait, with the friend's **level shown as a badge on the picture** (not a separate line).
- Current status.
- Quick actions (per section, above).
- **Tapping the card opens the friend's page.**

**Allies are not shown on this screen.** Ally communication lives in **Inbox**, and Ally
assignment is per-Journey (managed from a **Journey's settings** / the friend's page).

## Friend Page (profile — opens on card tap)

- Buddy · statistics · completed Journeys · achievements · visible Journeys (per the
  friend's privacy permissions) · support history.
- **"Add as Ally to a Journey"** action (also available from a Journey's settings page).

## Interaction Flow

Open Friends → **needs-help** section first → Help / Chat / Gift; or **tap a friend** →
friend page → encourage / chat / gift / add as Ally. Invite from the top.

## Empty / Cold-start States

- **No friends yet** → prominent **Invite** + a short line on the support value.
- **No one needs help** → the needs-help section becomes an invite / encouragement prompt.

## Edge Cases

- A friend's **visible Journeys** depend on their privacy setting (Private / Progress-only / Ally).
- **"Needs help"** is derived automatically (missed check-ins / forecast risk) — no explicit ask yet.

## Future Ideas

Explicit **ask-for-help** · support streaks · Group Journeys · community events.

## Decisions (2026-07-06)

- **Help-first** layout; **Allies not shown here** (they live in Inbox + Journeys).
- **v1:** friends list + friends-needing-help + quick actions + invite; defer groups / community / streaks.
- Your-friends card action is **"Cheer"** (an encouraging, poke-like nudge), not "Help"; needs-help cards keep **Help**.
- Friend's **level is a badge on the Buddy portrait**; **tapping a card opens the friend page**.
- **"Add as Ally"** is done from the friend page or a Journey's settings.
- **"Needs help" signal = missed check-ins / forecast risk** (no explicit ask yet).

## Naming (resolved 2026-07-06)

The *your-friends* card action is **"Cheer"** — an encouraging, poke-like nudge (chosen over Encourage / Boost / Hype / Root for).
