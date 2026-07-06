## Journey Engine

One of the biggest architectural changes is that PushApp should not support only one Journey type.

Instead, it should provide a configurable Journey Engine capable of representing many different personal-growth experiences.

Each Journey is essentially a configuration.

Potential Journey configuration fields:

- Duration
- Frequency
- Rules
- Visibility
- Flexibility
- Editing permissions
- Step structure
- Rewards
- Completion behaviour

Examples

### Repeating Journey

Goal:
Run 3 times every week.

Structure:

Step:
Run

Frequency:
3x per week

Rules:

- Up to 2 misses allowed.
- Pause allowed.
- Restart after long inactivity.

---

### Sequential Journey

Goal:
Complete Spanish A1.

Structure:

Lesson 1

↓

Lesson 2

↓

Lesson 3

↓

...

↓

Lesson 20

The complete learning plan is visible from day one.

The user should always be able to open the Journey page and see:

- completed steps
- upcoming steps
- estimated completion date

---

### Hybrid Journey

Some Journeys contain repeating actions while also introducing sequential milestones.

Example:

Learn Piano

Weekly practice:
3 times

Lesson progression:
Lesson 1 → Lesson 16

Both systems should coexist.

---

## Journey Templates

Users rarely want to start from an empty page.

The preferred creation flow is:

The user writes what they would like to achieve.

Example:

"I want to learn Spanish."

PushApp immediately searches existing Journey Templates.

Results are ordered by quality and popularity.

The user can then:

- Start an existing Journey.
- Create a completely new Journey.

If the user creates a new Journey they are asked:

How would you like to create it?

Options:

- Build with Buddy.
- Build manually.

Buddy-assisted creation is a future AI capability.

Initially it may simply ask several questions before generating the Journey.

---

## Editable vs Locked Journeys

Not every Journey should behave the same.

When a user creates a Journey:

The Journey is fully editable.

---

When joining an existing Journey:

The creator may decide whether it is:

Editable

or

Locked.

Editable means:

The user may change:

- schedule
- reminders
- rules
- frequency
- steps

Locked means:

The original Journey remains unchanged.

Only personal scheduling preferences may be modified.

This is especially important for:

- coaches
- educators
- business-created Journeys

where maintaining consistency is valuable.

---

## Journey Rules

Rules became a central concept.

Rather than assuming every Journey behaves the same, each Journey defines its own success conditions.

Examples:

Maximum misses.

Pause allowed.

Restart after X days.

Required weekly consistency.

Minimum sessions.

Grace period.

This allows very different Journey behaviours.

Example:

Daily gratitude

can tolerate several missed days.

---

Quit Smoking

may allow no restart once broken.

---

30-day challenge

may restart completely.

The product should never frame this as user failure.

Instead:

"The Journey rules were no longer met."

The Buddy can then offer:

- Try again.
- Adjust the Journey.
- Pause.
- Choose a more realistic version.

The system adapts.

It does not judge.

---

## Future Journeys

A new concept introduced during these sessions.

Users should be able to save Journeys for later.

These are called Future Journeys.

Examples:

After finishing Spanish A1:

Spanish A2 already waits.

Or:

After Marathon:

Ironman preparation.

Future Journeys help users think beyond the current Journey while remaining focused today.

---

## Repeating Journeys

Journeys are never infinite.

If a behaviour should continue forever, it should be divided into finite Journeys.

Instead of:

Exercise forever.

Use:

Complete a 12-week strength program.

The user may then choose to restart it.

This creates repeated feelings of accomplishment.

Repeated Journeys should preserve history.

Example:

30-Day Meditation

✓ January 2026

✓ August 2026

⏳ Active

History should never be lost.

It becomes part of the user's growth story.

---

## Journey Completion

Journey completion is one of the most important emotional moments in PushApp.

Completion is not merely a green checkmark.

It is a celebration.

Preferred completion flow:

1. Buddy celebrates.
2. XP awarded.
3. Coins awarded.
4. Cosmetic rewards if applicable.
5. Allies are notified.
6. Reflection begins.
7. User rates the Journey.
8. User can recommend it.
9. PushApp suggests the next Journey.

Reflection questions may include:

- What helped you most?
- What was hardest?
- Would you recommend this Journey?
- Would you change anything?

The goal is both emotional closure and product learning.
