# PushApp — Product, Experience & Screen Design Brief

> **What this is.** A self-contained brief for designing PushApp's experience — hand it to an external
> AI design tool or a human designer to get a **second visual-design proposal**. It describes the
> product, what makes it different, the **feeling** we want the user to have, the **people & support
> layer** (which is half the product), and each screen in depth. You need no other file.
>
> **What we want back.** Screen designs and flows for the screens in §6, that *feel* like §2 and §5 and
> honour the requirements throughout. Propose layout, hierarchy, colour, motion — but stay inside the
> product's spirit and vocabulary defined here.

---

## 1. What PushApp is — the full picture

**PushApp is an AI adaptive coach that helps people become who they choose to be** — it closes the gap
between **intention and action**. People rarely fail because they don't know *what* to do. They fail
because life pulls them off the path, motivation dips, they miss once and never restart, and they try
to do it **alone**. PushApp exists to close that gap.

You tell the coach, in your own words, what you want to change. It **understands you**, builds a
**personal, realistic plan**, **adapts** that plan to how you actually behave, keeps pushing you gently
toward action — and **brings the right people in** so you don't quit. That combination — a plan that
adapts *and* people who hold you — is the whole product.

North-star essence (the design should *feel* like this one sentence):

> **"Building personal plans, and helping / being helped by one another in order to persist in them."**

**It is deliberately NOT:** a habit tracker, a to-do/task manager, a content library of courses, or a
**childish game**. It is a **calm, mature companion** for adults who want real change.

### Why now (the AI-era bet)
Generic habit trackers and rigid programs are commoditized and feel juvenile. PushApp's bet is that a
coach which genuinely **adapts to the individual** and **mobilizes real human support** is what
actually changes behavior — and that this is hard to copy. (An earlier version of PushApp leaned on
game mechanics and a dress-up avatar; we deliberately matured it into this adaptive-coach direction.)

### How the coaching works (two layers, one voice)
- A **meta-agent** is the single voice the user talks to. Its personality: **professional, warm,
  accepting, non-judgmental, pleasant but to-the-point, and plan-oriented.** It is **explicitly not a
  therapist** — no therapy or emotional processing; it orients everything toward building a work plan
  and getting to action. It **understands** the user's free-text goals, notices when there are several,
  and focuses on one at a time.
- Behind it sit four **domain experts** — **Addiction · Relationships & Loneliness · Body Image
  (nutrition + fitness) · Career** — supplying the professional questions and framing. The user never
  sees "which expert"; they experience **one coach**.

### Framework, not content (important to the feel)
PushApp asks the **right questions**, builds a **light adapted framework**, and pushes the user to
**act and persist**. It is **not** a nutritionist, trainer, matchmaker, or therapist — it does not hand
out meal plans, training protocols, or clinical advice. It helps you **organize and keep going**;
it never lectures.

### The object model (use these exact words)
**Dream → Journey → Milestone → Step.**
- **Dream** — a user-defined, long-term aspiration that **groups related Journeys** (the Dream "get
  fitter" groups the Journeys "protein shake daily" + "gym 3×/week"). A Dream inspires; it is never
  "completed."
- **Journey** — a finite transformation, roughly 2–3 months. The core object.
- **Milestone** — an optional, sequential grouping of Steps inside a Journey.
- **Step** — the smallest unit of progress.

### Plans are frequency-based and weekly
Plans are a **weekly frequency** — e.g. **"≈3×/week, flexible days"** — **not** a rigid calendar grid,
unless the user names specific days. Design should feel comfortable with "about this many times a
week."

### Terminology — non-negotiable
**Dream · Journey · Milestone · Step · Buddy · Ally · Support Circle · Community · Mission · XP ·
Streak.** Never use "Challenge / Program / Plan / Phase" as a name for a Journey or Milestone.

---

## 2. What makes it unique (the "this gets me / I'm not alone" feeling)

The design should make the user *feel* these four things:

1. **It adapts to me.** The coach watches what I actually do and **reshapes the plan** — compresses when
   I'm behind, eases when I'm overwhelmed, re-paces around my life — instead of a rigid program that
   generates a plan and abandons me. When I slip, it doesn't shame me; it adjusts and helps me restart.
2. **It's a coach, not a course.** It asks me the right questions and builds a doable framework, then
   pushes me to *act*. It doesn't drown me in content.
3. **I'm not doing this alone.** Real people — an **Ally**, a **Support Circle**, and a **Community** of
   others chasing the same goal — are built into the experience, not bolted on. (Evidence backs this:
   people with human support stay far more consistent and set more ambitious goals.) **This human layer
   is the single hardest thing for a competitor to copy — treat it as first-class, see §4.**
4. **It respects me.** Adult, calm, encouraging — made for people who found gamified apps juvenile.

The deep moat is the **combination**: an adaptive personal plan **fused with** real human support, in
one warm loop. Design must express *both* — the intelligent, responsive plan **and** the people around
it — never one at the expense of the other.

---

## 3. The people & support layer — *half the product* (design this richly)

This is the part the first draft under-served. **PushApp is as much about people helping people as it
is about the plan.** The core belief: **you persist because someone is in it with you.**

### 3.1 The one-to-one backbone — the Ally
- Every Journey can have an **Ally** — a real person (friend, partner, peer) who **sees the user's
  progress** and is **brought in at the right moment** by the coach: when the user slips, hits a hard
  Step, or a Milestone is reached. The coach decides *when* and *how* to involve the Ally — nudges are
  routed **through a person**, not just an app notification.
- Roles vary: an **Accountability Partner** (checks in, nudges on a miss), a **Journey Partner**
  (someone doing the *same* Journey alongside you). Design a warm, low-friction way to **invite** an
  Ally and to **reach out / respond**.

### 3.2 The small group — Support Circle
- A **Support Circle** is a handful of people backing a user across their Dreams/Journeys — the people
  who cheer, check in, and get pulled in when needed. Design should make having a Circle feel
  supportive and safe, never like an audience judging you.

### 3.3 Reciprocity on Home — "who can I lift, who deserves a cheer"
- On Home, surface **3 friends who most NEED HELP** and **3 who most DESERVE ENCOURAGEMENT.** The
  framing is **mutual**: I both receive and give support. A one-tap way to send a nudge or a cheer.
  This reciprocity is central — giving support is part of how the user stays engaged and grows.

### 3.4 Communities — people chasing the same goal (a growing pillar)
- We want **Communities**: spaces where people pursuing the **same goal / Dream** gather — a
  **chat-like environment** to talk, support each other, share what works, celebrate wins, and where
  **relevant content** is delivered. (E.g. everyone working on "quit smoking," or "run a 5K," or "find
  a partner.")
- This is where **"helping and being helped by one another"** scales beyond a single Ally. Design
  should anticipate it as a **first-class part of the vision** (even if it ships after the 1:1 Ally):
  warm, safe, moderated, non-competitive, encouraging.
- Communities also feed a future ability to recommend the Journeys that actually work ("**80% of people
  completed this Journey and found it useful**") — social proof from real outcomes.

### 3.5 The emotional tone of the whole social layer
Warm, safe, **reciprocal**, non-judgmental. **Never competitive leaderboards, never public shaming.**
Support here is about lifting each other, not ranking. Someone who is struggling should feel **held**,
not exposed.

---

## 4. The feeling / atmosphere (the most important non-functional requirement)

- **Calm, modern, adult, warm, encouraging, mature, hopeful.** "A thoughtful coach and a supportive
  circle in your pocket," not a game.
- **Deliberately NOT cartoonish or childish.** No mascot-driven, toy-like UI; no dress-up avatar; no
  coin shop.
- **Supportive, never guilt-based.** Motivate through encouragement, accountability, human warmth and
  celebration — **never shame.** A missed task should feel like *"tomorrow is another chance,"* and a
  hard week should feel *held*, not punished.
- **Progress over perfection.** Missing one session never erases progress; the visual language
  reinforces **momentum**, not punishment.
- **The AI should feel invisible.** The user should feel **understood**, not like they're "talking to a
  bot."
- **People are present.** The design should make the user constantly, gently aware that **they're not
  alone** — allies, circle, community — without it feeling noisy.
- **Simplicity is a feature.** Every screen answers **one primary question**. Don't overload.

---

## 5. Global UI notes

- **Navigation:** a bottom tab bar. Implied core tabs, in priority: **Home · Coach (or reached from
  Home) · Friends/Community · Journeys.** *(The founder's stated Home priority order is: weekly tasks →
  coach → friends → my journeys.)* **No avatar tab, no shop.** *Open / to confirm: exact final tab set,
  and whether Coach is its own tab or only the central Home CTA.*
- **Persistent reward indicators** (replacing the old currency display), top of Home:
  - a **Streak** (prominent day-count, Duolingo-style) — see §6 Home;
  - a **Level / XP** indicator that rewards **breadth** — see §6 Home.
- **Bilingual:** ships in **English and Hebrew (RTL)** — tolerate both directions and variable text
  length. *Open / to confirm: whether the proposal should include RTL mockups.*

---

## 6. The screens

### Screen 1 — Home (the richest screen)
**One job:** *"What should I do now — and who around me needs me?"*
Priority order, top → down:

**(a) Weekly tasks — with an URGENT / "today's focus" block at the top.**
- Plans are weekly/frequency-based, but a task becomes **URGENT** when *the remaining days in the week
  equal the remaining required sessions* — it **must** be done today or the weekly target breaks.
  - *Worked example:* target = 3 gym sessions/week; by Wednesday none done → Thursday, Friday, Saturday
    each show the workout as **urgent** (3 sessions, 3 days left).
- Show urgent items as a distinct, attention-drawing "today's focus" block; the rest of the week's
  tasks sit below in a calmer treatment.

**(b) Talk to your coach — INVITING, VISUAL, CENTRAL.** The primary entry to the coach conversation;
the heart of the screen, an inviting visual call-to-action — never a small text link.

**(c) Friends — mutual support.** **3 friends who most NEED HELP** and **3 who most DESERVE
ENCOURAGEMENT** (see §3.3). Compact, warm, one-tap to reach out. This is the on-Home doorway into the
bigger social/Community layer (§3, Screen 5).

**(d) My Journeys** — brief summary or a clear link into the Journeys screen.

**Persistent Home elements:**
- **Streak** — prominent day-count, in the **very prominent spot where currency used to live**.
  Duolingo-style. **Breaks if an URGENT task is missed.**
- **Level / XP** — a level-up mechanism whose **special purpose is to reward BREADTH**: taking on and
  sustaining **multiple parallel Journeys** (up to a cap), to discourage single-Journey use. Feel: a
  **mature progression indicator**, not a game score. *Open / to confirm: exact cap + how breadth reads
  numerically.*

---

### Screen 2 — Coach conversation (runs fully on the phone; the core experience)
**One job:** *"What do I want to work on, and what's my plan?"*

- **Opening:** free-text *"What would you like to work on?"* with a **voice-input** option (speak
  instead of type, now). *Future (mention, don't build): a full spoken, back-and-forth voice
  conversation.*
- **Multi-goal focus:** when the user names several goals, the coach **reflects them back** and the
  user **picks ONE to start**; the rest are **"saved for later."** Design a calm "here's what I heard —
  which first?" moment and a pleasant "saved for later" state.
- **Dream linking:** when goals share a theme, the coach **suggests linking them under a Dream** and the
  user must **approve** (never auto-linked). Design the suggestion + approval.
- **One question at a time** — conversational, never a big multi-field form.
- **Answers = closed chips + "Other" (type or speak).** **Critical visual rule:** the **ANSWER chips
  must look clearly, visually DISTINCT from the QUESTION bubbles** — the user must never confuse "the
  coach is asking" with "these are my options" (differ by shape, colour, alignment, side of screen…).
  Some questions allow **multiple** selections.
- **A feasibility / reality-check line** at the right moment — supportive, never discouraging.
- **No redundant "coach" label** in a corner — the whole screen *is* the coach.

---

### Screen 3 — My Journeys
**One job:** *"What am I trying to accomplish?"*
Journeys by **STATE: active · frozen · past · future**, **grouped by Dream** where a Dream exists
(Journeys "protein shake daily" + "gym 3×/week" nested under "get fitter"). Each row shows state and a
light sense of weekly rhythm / progress. *Open / to confirm: tabs vs sections vs filters, and sort.*

---

### Screen 4 — Journey detail
**One job:** *"How is this structured, and how do I keep going?"*
**Milestones → Steps** with the **frequency-based schedule** ("≈4×/week · flexible days").
- **Dream context** if it belongs to a Dream.
- **Ally presence:** show who (if anyone) is backing this Journey, and an easy way to invite/reach an
  Ally (ties into §3).
- **Editing is primarily via the COACH** — an affordance like **"talk & edit with your coach here"** as
  the main way to change the Journey (not raw form fields).
- **Freeze / Resume** — an accessible, obvious control to pause/resume, with room for a few more
  quick-actions. *Open / to confirm: the other quick-actions.*
- **Reporting a Step** must be **smaller, more VISUAL and EMOTIONAL** than a plain dialog: a **happier**
  feel for **"Done,"** a **sadder** feel for **"Couldn't,"** plus **Partial** and **Postpone.** A quick
  emotional check-in, not a form — and a "Couldn't" must **never** feel like punishment.

---

### Screen 5 — Friends & Community (the social home)
**One job:** *"Who am I on this journey with — and who can I help?"*
The deeper social space behind the Home "Friends" module:
- **My people:** Allies and Support Circle — who's backing me, who I'm backing, with warm one-tap ways
  to nudge, cheer, or check in (the reciprocal "need help / deserve encouragement" framing).
- **Communities:** spaces for people chasing the **same goal / Dream** — a **chat-like** feed to share,
  support, and receive relevant content and celebrate wins (§3.4). Warm, safe, moderated,
  non-competitive.
- *Open / to confirm: how much of Community ships first vs. the 1:1 Ally, and the moderation model.*

---

## 7. Key mechanics (so the design reflects real behavior)
- **Frequency-based weekly plans** (no fixed dates unless the user names days).
- **Urgent / today's-focus** derived as in §6 Home (must-do-today to hold the weekly target).
- **Streak** — day-count; **breaks on a missed urgent task**; grace/recovery representation is open.
- **Levels / XP** — reward **breadth** (multiple parallel Journeys, capped).
- **The adaptive loop:** report a Step → the coach re-plans (re-paces, eases, or nudges) → optionally
  pulls in an Ally. The design should make the plan feel **alive and responsive**, not static.

---

## 8. Where this is going (future vision — for context, don't design yet)
- **Communities** deepen (the §3.4 pillar grows).
- **Journey-Template recommendations** from real aggregate outcomes ("80% completed this & found it
  useful").
- **Dynamic / learned answer chips** from aggregate data (for now, chips are authored sets + "Other").
- A **personalized "who I'm becoming" avatar** (a future likeness that matures with progress) — *not*
  the old dress-up avatar, which is removed.

---

## 9. Open questions / to confirm with founder
1. **Final tab set** — and whether Coach is its own tab or only the Home CTA.
2. **Level/XP breadth mechanic** — the Journey cap and how breadth reads visually.
3. **My Journeys** — tabs vs sections vs filters for active/frozen/past/future; default sort.
4. **Journey-detail quick-actions** — beyond Freeze/Resume.
5. **Streak rules** — confirm it breaks only on a missed urgent task; how grace/recovery shows.
6. **Community scope** — how much ships first vs the 1:1 Ally; moderation model.
7. **RTL** — whether the proposal should include Hebrew / right-to-left mockups.
8. **Buddy's presence** — whether Buddy appears subtly anywhere (e.g. in the coach screen) or is fully
   out of this pass.
