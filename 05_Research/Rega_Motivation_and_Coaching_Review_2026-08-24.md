# Rega — Motivation and Coaching Product Review

Date: 2026-08-24  
Status: Product research based on founder-supplied screen recordings and public store material.  
Scope: Product behavior only. The test answers entered in the recordings were deliberately ignored.

## Sources

- Founder-supplied recordings:
  - `ScreenRecording_08-24-2026 00-40-43_1.MP4`
  - `ScreenRecording_08-24-2026 00-52-16_1.MP4`
- [Rega official website](https://rega.co.il/)
- [Rega on the Apple App Store](https://apps.apple.com/il/app/rega-%D7%A8%D7%92%D7%A2/id1549517842)
- [Rega on Google Play](https://play.google.com/store/apps/details?hl=he&id=com.rega.regaapp)

The store listings describe guided meditation, breathing exercises, sleep content, personalized content,
daily reminders, progress tracking, challenges, and Numa, an AI companion. The recordings provide primary
evidence for the flows described below but do not establish how the underlying recommendation model works.

## Observed product model

Rega combines five distinct surfaces into one wellbeing loop:

1. **A content library** organized around needs such as focus, stress, body and mind, anxiety, and sleep.
2. **A daily plan** with small tasks and a completion state.
3. **Personalized recommendations** that lead directly into an audio exercise or another concrete activity.
4. **An AI companion** that greets the user, accepts conversation, and can generate a short summary or
   tailored next steps.
5. **An SOS entry point** that first asks what feels strongest now and then directs the person toward an
   appropriate immediate-support path.

The product also asks the user to choose a daily reminder time. A short multi-question check-in uses a
visible progress indicator and closed answers before presenting a tailored summary and proposed activities.

## How motivation appears

Motivation is mostly embedded in context rather than presented as an isolated quotation feed:

- a warm greeting from the companion;
- acknowledgement when daily tasks are complete;
- a recommendation tied to the person's reported state;
- a concrete exercise that can be started immediately;
- a summary that reflects back what was heard;
- a small next-step plan;
- an immediate-help route when the user is distressed.

This creates a useful sequence: **recognize the moment → make the message personally relevant → offer one
action**. The motivational value comes from relevance and reduced decision effort, not only from the wording.

The reviewed recordings did not show an explicit Helpful / Not helpful control on motivational content, a
transparent explanation of why a specific recommendation was chosen, or a computed progress fact such as
money saved. Absence from the recordings is not proof that these capabilities do not exist elsewhere.

## What Rega does well

- Keeps immediate help continuously reachable without making it the entire Home experience.
- Turns encouragement into an executable recommendation instead of leaving the user with text alone.
- Uses short closed-answer flows when speed matters.
- Shows progress through questionnaires, which reduces uncertainty about length.
- Separates browsing content from receiving tailored guidance while keeping both close together.
- Uses a calm, coherent visual language across content, companion, and check-in surfaces.
- Lets the companion produce a compact synthesis and practical next actions after a conversation.

## Limitations and opportunities for PushApp

### 1. Motivation can be grounded in transformation, not only current mood

Rega is primarily organized around wellbeing states and content consumption. PushApp can connect motivation
to a Dream, a Journey, verified behavior, and support from real people. This makes the message evidence of
movement toward a chosen identity rather than merely a suggestion to feel better now.

### 2. A sentence should usually carry a next useful door

When context permits, a motivational item should lead to one relevant destination: today's Step, verified
progress, a Tool, the Coach, or a safe immediate-support surface. The sentence remains useful on its own; the
action is optional and should not be added merely to generate engagement.

### 3. Computed evidence is a meaningful differentiator

Truthful statements such as estimated money saved, units reduced, consistency achieved, or time reclaimed
can make invisible progress tangible. PushApp should expose the baseline and formula and must never invent
missing data.

### 4. Explicit helpfulness can improve the catalog

PushApp's proposed Helpful / Not helpful control can distinguish content quality from notification opening.
Rega's captured flow does not visibly provide this signal. PushApp should use it to personalize conservatively
and to improve reviewed content across users without copying sensitive context into a shared dataset.

### 5. The Coach should not own every runtime message

Rega demonstrates the appeal of one companion voice, but generating every motivational interaction through
an AI conversation would add latency, cost, and safety variability. PushApp should retain one user-facing
voice while selecting from a reviewed, versioned catalog and computed facts; the Coach can explain or discuss
the selected item when useful.

### 6. Immediate support and ordinary motivation require different safety contracts

An SOS route should not be ranked or optimized like ordinary encouragement. Crisis and high-distress support
needs a separate reviewed behavior, escalation language, and measurement model.

## Recommended PushApp pattern

Each motivational candidate should contain:

- a **reason**: the eligible moment and source of truth;
- a **meaning**: what the user should understand or feel;
- an optional **door**: one relevant action or destination;
- a **surface-safe version**: especially for lock-screen privacy;
- one or more approved **Communication Style** formulations;
- a **feedback contract**: Helpful / Not helpful and optional reason in a later stage;
- eligibility, cooldown, language, safety, and retirement rules.

Selection should be allowed to return **silence**. A message is successful when it helps movement or restores
agency, not merely when it causes an app open.

## Product decisions supported by this review

- Retain the Personalized Motivation Engine as a separate Future / Commercial feature.
- Treat computed progress, reviewed authored messages, and relevant quotations as different content families.
- Prefer motivation that is tied to real progress or a next useful action.
- Keep explicit helpfulness separate from notification-open timing signals.
- Keep SOS/high-risk behavior outside ordinary motivation ranking.
- Use one coherent Coach voice without requiring free-form generation for every message.

## Questions still requiring founder approval

1. Which first slice should launch: an in-app motivation card, computed progress, or a user-invoked
   “encourage me now” surface?
2. Should every motivational item offer a destination, or only when a genuinely relevant action exists?
3. Should the first feedback control stay binary, or optionally ask why an item was not helpful?
4. Which computed metrics are permitted in the first domain pack?

