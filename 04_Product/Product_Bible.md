# Product_Bible

Status: Draft / Recovery Version

---

# Purpose

This document is the central product knowledge base for PushApp.

Its purpose is to preserve the current product thinking, decisions, architecture, terminology, future ideas, and open questions that have emerged during discovery.

This version is intentionally written as a **Recovery Version**: it prioritizes capturing as much approved and semi-approved knowledge as possible, even when some sections will later require deeper refinement.

---

# 1. Product Summary

PushApp is a personal growth platform designed to help people become who they choose to be by moving from aspiration to achievable Journeys and consistent action.

The product helps users define meaningful personal journeys, structure them into actionable processes, stay consistent over time, and receive meaningful support from people, creators, coaches, communities, and eventually AI.

PushApp is not a productivity app, habit tracker, reminder app, or generic social network.

Its purpose is to help people live more intentionally and become closer to the person they choose to be.

The core product insight is that people often know what they want to become, or at least feel that they want to grow, but they struggle to convert that desire into sustained action.

PushApp provides the system around that journey.

---

# 2. Core Product Philosophy

## 2.1 Growth Before Engagement

PushApp should never optimize for screen time.

The product succeeds when users spend more time living the life they intentionally choose, not when they spend more time inside the app.

The app should invite users back into real life.

## 2.2 The System Around Change

People often fail to change not because they lack potential, but because they lack a supporting system.

That system may include:

- Clear goals
- Structured journeys
- Reminders
- Progress tracking
- Accountability
- Social support
- Motivation
- Context-aware interventions
- Expert guidance
- Community knowledge

PushApp connects these into one coherent experience.

## 2.3 From Aspiration to Achievement

PushApp exists to reduce the distance between aspiration and achievement.

This means helping users move through multiple stages:

1. Reflection: Who do I want to become?
2. Intention: What do I want to improve?
3. Commitment: What am I choosing to pursue?
4. Structure: What is the path?
5. Action: What do I do now?
6. Consistency: How do I continue?
7. Recovery: How do I get back on track?
8. Achievement: How do I complete the journey?
9. Growth: What becomes possible next?

The MVP begins primarily around the middle of this chain: users who already know what they want to achieve.

Future versions may help users discover what matters to them before they define goals.

---

# 3. Core Product Language: Dreams, Journeys and Steps

## 3.1 Why This Language Matters

PushApp should use the same language internally that users see in the product.

The core product language is:

- **Dream** — who the user wants to become.
- **Journey** — an achievable personal-growth process that moves the user toward a Dream.
- **Step** — a concrete action or experience inside a Journey.
- **Daily Mission** — a game-system action that rewards engagement with the PushApp ecosystem.

This language intentionally avoids generic productivity words such as "tasks" because PushApp should feel like a guided growth experience rather than a to-do list.

---

## 3.2 Dreams

A Dream represents a long-term aspiration or direction.

Examples:

- Become healthier
- Become financially organized
- Become conversational in Spanish
- Become a better leader
- Become smoke-free

Dreams are intentionally broad.

They are not completed, scored, rewarded or given strict deadlines.

Their purpose is to give meaning and direction to the user's Journeys.

At the technical level, Dreams can be represented through tags on Journeys. A single Journey may contribute to one or more Dreams.

Principle:

**The user thinks in Dreams. The product operates in Journeys.**

---

## 3.3 Journeys

A Journey is the central unit of personal growth in PushApp.

A Journey must be achievable within a reasonable time frame, usually a few weeks up to about two months. The default maximum is approximately **2 months**, and it is configurable like any other Journey parameter (it may be revisited in future based on data).

The reason is emotional as much as operational: users need to experience completion, celebration, rewards and achievement through the product.

Examples:

- Run 10km
- Finish Spanish A1
- 90 Days Smoke Free
- Complete a 12-week strength program
- Build a weekly planning habit for 8 weeks

A Journey should not be an endless aspiration such as "Exercise forever" or "Become healthy forever."

Long-term Dreams are broken into multiple finite Journeys.

Example:

Dream: Become a marathon runner

Recommended Journey roadmap:

1. Run 5km
2. Run 10km
3. Complete a half marathon
4. Run a marathon

Each of those is its own Journey, with its own completion moment.

---

## 3.4 Steps

A Step is the unit of action inside a Journey.

"Step" is preferred over "Task" because it feels like progress inside a path rather than work to complete.

Steps may take different forms:

- External action: run, practice, call, attend, read
- Learning: watch a lesson, complete a module
- Reflection: write a response, review progress
- Decision: choose a plan, select the next direction
- Interactive in-app experience: gratitude, journaling, NLP exercise, guided reflection

Steps can be sequential, parallel, repeating or optional depending on the Journey configuration.

The user should be able to open a Journey and see the full plan: what has been completed, what is coming next, and the expected completion date.

---

## 3.4A Phases (Optional Grouping of Steps)

Between a Journey and its Steps there may be an optional middle layer called a **Phase** (working name — not yet finalized; candidates: Phase, Chapter, Part).

A Phase groups Steps into a stage of a Journey. Phases are:

- **Optional** — a simple Journey may attach Steps directly, with no Phases.
- **Sequential** — when present, Phases run in order (finish Phase A before Phase B).

Example:

- Dream: Lose 20kg
- Journey: a 2-month training plan
  - Phase A: Full-body workouts
  - Phase B: Targeted-area workouts
  - Phase C: Intense workouts

Each Phase contains Steps (e.g. ~3 workouts per week), and each workout is a Step the user performs and reports.

The full object hierarchy is therefore: **Dream → Journey → Phase (optional) → Step.**

---

## 3.5 Daily Missions

Daily Missions are game-system actions that exist outside the user's personal Journeys.

Examples:

- Help one friend
- Send one gift
- Spin the reward wheel
- Complete two Journey Steps
- Invite a friend

Daily Missions should be clearly distinguished from Journey Steps.

Journey Steps move the user forward in life.

Daily Missions move the game loop forward.

---

## 3.6 Roadmaps

A Roadmap is a future concept that connects a user's Dream to a sequence of recommended Journeys.

Roadmaps may eventually be created through a conversation with Buddy.

Example:

User: I want to become healthier.

Buddy may recommend:

1. Complete a sleep-improvement Journey
2. Complete a beginner fitness Journey
3. Complete a healthy cooking Journey
4. Complete a 10km running Journey

Roadmaps are a future capability and should not be confused with the MVP Journey model.


# 4. Journey Types

Different Journeys require different mechanics.

## 4.1 Frequency Journey

A Journey based on repetition or cadence.

Examples:

- Talk to parents twice a week
- Workout three times a week
- Use a roller five times a week
- Write gratitude entries daily

Measured by whether the user meets the required frequency.

## 4.2 Completion Journey

A Journey based on completing units of content or tasks.

Examples:

- Complete a course
- Read a book
- Finish modules
- Complete weekly assignments

Measured by completion of content or milestones.

## 4.3 Avoidance Journey

A Journey based on avoiding or limiting behavior.

Examples:

- Quit smoking
- Avoid sweets
- Eat no more than a defined amount of chocolate weekly
- Limit time in specific apps

Measured by staying within limits or reporting exceptions.

## 4.4 Critical Compliance Journey

A Journey where consistency is medically or practically important.

Example:

- Take antibiotics

The system should be stricter and less playful around this type.

## 4.5 Hybrid Journey

A Journey that combines multiple mechanisms.

Example:

Quit smoking may include:

- Avoidance
- Daily reporting
- Support partner
- Educational content
- Community insight
- Milestones
- Relapse handling

---

# 5. Journey Creation

## 5.1 Core Principle

Journey creation must be simple.

The engine can be complex, but the user experience should not expose unnecessary complexity.

Principle:

**Complexity belongs to the system, not to the user.**

## 5.2 Required Creation Fields

At the simplest level, the user should only need to define:

- What they want to achieve
- When or for how long
- Basic frequency or progress expectation when relevant

Example:

“I want to deadlift 80kg in three months.”

## 5.2A Creation and Discovery Flow

When a user wants to start something new, the first interaction should be natural language.

The user types what they want to achieve.

Example:

> I want to learn piano.

PushApp should first show similar existing Journeys ranked by relevance and quality.

The user can then:

1. Use an existing Journey.
2. Create a new Journey.

If the user chooses to create a new Journey, they should choose between:

- Build with Buddy
- Build manually

Build with Buddy may ask a small number of questions and create a recommended plan.

Manual creation gives the user full control.

This flow avoids forcing the user to start from a blank page while still allowing full customization.

---

## 5.3 Journey Definition vs Journey Configuration

Journey creation has two layers:

## Journey Definition

The minimal commitment.

Examples:

- Goal
- Duration
- Basic type

## Journey Configuration

Optional settings that improve the chance of success:

- Milestones
- Reporting mechanism
- Support Circle
- Allies
- Journey Partner
- Coach
- Notifications
- Privacy
- Reflection modules
- Rewards
- Premium modules

The user should be able to start simple and add complexity later.

## 5.4 System Recommendations

The system should recommend proven patterns rather than forcing the user to configure everything manually.

The system may suggest:

- Milestone frequency
- Reporting method
- Cadence
- Support setup
- Difficulty level
- Expected duration
- Common success strategies

But the user must always approve.

Principle:

**The system recommends. The user decides.**

## 5.5 Milestones

For many Journeys, milestones are useful.

Example:

Deadlift 80kg in 12 weeks.

The system may suggest milestones based on similar successful Journeys, but the user must confirm or edit each milestone.

The system should not silently invent values that only the user can validate.

## 5.6 Data-Driven Recommendations

As PushApp grows, it can learn from successful Journeys.

Possible future examples:

- Users who successfully reached similar fitness goals usually defined milestones every two weeks.
- Users who completed this course were more successful when they committed to three sessions per week.
- Users trying to quit smoking benefited from adding a Support Circle.

This creates a learning loop:

More Journeys → More data → Better recommendations → Higher success → More Journeys.

---

# 5A. Journey Engine

## 5A.1 Definition

PushApp is not limited to one type of Journey.

It is built around a configurable Journey Engine.

Each Journey is defined by a set of rules and structures rather than hardcoded behavior.

Possible Journey definition fields include:

- Duration
- Step structure
- Frequency
- Flexibility rules
- Pause policy
- Restart policy
- Editing permissions
- Visibility
- Rewards
- Reporting mechanism
- Interactive Step types

This allows PushApp to support many kinds of Journeys without rebuilding the product for every use case.

---

## 5A.2 Journey Structures

PushApp should support several Journey structures.

### Repeating Journey

A single Step repeats according to frequency.

Example:

Practice piano twice per week for eight weeks.

### Sequential Journey

Steps occur in a defined order.

Example:

Complete 16 lessons in a course.

### Flexible Journey

Several Steps may be completed in parallel or in any order.

Example:

Complete any three wellness activities this week.

### Interactive Journey

Some Steps happen fully inside PushApp.

Example:

Write five things you are grateful for today.

---

## 5A.3 Editing Permissions

When a user creates their own Journey, they should usually have full editing control.

When a user subscribes to an existing Journey template, the creator may decide whether the Journey is:

- Editable
- Partially editable
- Locked

This matters for creators, coaches, courses and business Journeys.

---

## 5A.4 Journey Flexibility

Flexibility is part of the Journey rules.

Some Journeys can be paused or adjusted.

Other Journeys cannot.

Examples:

A language-learning Journey may allow pauses.

A medication-adherence Journey may not.

A smoking-cessation Journey may have stricter restart rules.

The system should not assume one universal rule for all Journeys.

---

## 5A.5 Finite Journeys

Journeys should not be infinite.

They may be repeated, restarted or followed by another Journey, but each Journey should have a defined end.

This creates emotional completion, rewards, achievements and motivation to continue.

Repeated runs of the same Journey must preserve their history. Each completed run is kept as a dated record rather than overwritten, so the user accumulates a visible growth story over time.

Example:

30-Day Meditation

✓ January 2026

✓ August 2026

⏳ Active

History should never be lost. It becomes part of the user's growth story.

---

## 5A.6 Optional Steps

Optional Steps are a valuable future capability.

They allow Journey creators to include bonus actions without making the user feel that they failed if those actions are skipped.

Optional Steps are not required for the first version but should remain part of the product vision.

---

## 5A.7 Interactive Journey Experiences

Future PushApp Journeys may include in-app Step experiences rather than simple external check-ins.

Examples:

- Gratitude journal
- Weekly planning
- Daily reflection
- NLP exercise
- Breathing exercise
- Mood check-in
- Guided writing
- AI conversation

In these cases, completing the in-app experience automatically completes the Step.

This is strategically important because it allows PushApp to become a platform for guided personal-growth experiences, not only a place to report external actions.

---


# 6. Journey Queue / Future Journeys

Users may want to save Journeys they are interested in but not ready to start immediately.

This creates a future Journey backlog.

Examples:

- “After I finish my current course, I want to start this next one.”
- “I want to begin this fitness program next month.”
- “I want to save this NLP exercise for later.”

Possible triggers:

- Manual start
- Scheduled start date
- Completion of another Journey
- Reminder when ready

This feature is not core MVP but should remain on the roadmap.

---

# 7. Growth Library and Marketplace

## 7.1 Growth Library

PushApp may eventually provide a library of journeys people can browse when they want to grow but do not know exactly what to start.

This library may include:

- Journeys
- Courses
- Programs
- Challenges
- How-to guides
- NLP exercises
- Coaching plans
- Expert-designed growth journeys

## 7.2 Marketplace

Businesses, coaches, creators, NLP practitioners, course creators, and experts may eventually publish Journeys or programs.

The marketplace becomes a source of structured growth journeys.

Users can adopt existing Journeys instead of creating everything from scratch.

## 7.3 Why Marketplace Matters

Many users do not know how to design a good path.

The Marketplace helps them start with proven structures.

## 7.4 Marketplace Metadata

Marketplace Journeys may eventually display:

- Rating
- Completion rate
- Difficulty
- Estimated duration
- Number of users
- Creator information
- Reviews
- Success stories
- Recommended support setup

## 7.5 Journey Reviews

When a user adopts an existing Journey, they may later review it.

The compact marketplace view may include a star rating or score.

Inside the Journey detail page, feedback should be more granular:

- Was it clear?
- Were milestones realistic?
- Did reminders help?
- Was content useful?
- Was the difficulty accurate?
- Would the user recommend it?

The overall rating may be computed from multiple factors, not only a simple star average.

---

# 8. Community Insights

## 8.1 Definition

Community Insights are comments, reflections, or advice left by users who successfully completed a Journey.

They are meant to help future users feel less alone and learn from people who were at a similar stage.

## 8.2 Only Completed Users

Only users who completed the Journey may contribute Community Insights.

This improves trust.

## 8.3 Anonymous by Default

Community Insights are anonymous by default.

Users may choose to reveal their identity, but the default should encourage honesty.

## 8.4 Helpful and Report

Community Insight interactions:

- Helpful
- Report

There should be no dislike button.

Dislike may create unnecessary social negativity. Report is for spam, abuse, irrelevant content, or misleading content.

## 8.5 Unlock Threshold

Community Insights should only appear after enough validated insight exists.

Initial idea:

At least 5 comments from completed users before the feature is visible for that Journey.

This prevents empty states and low-value experiences.

## 8.6 Ranking

Comments should be ranked by:

- Helpfulness
- Relevance to the user's current stage
- Proximity in days / milestone
- Report score
- Possibly recency
- Possibly creator highlighting

## 8.7 Explainability

If the system surfaces a specific insight, it should explain why.

Examples:

- “Shown because it was written by someone who completed this Journey and was at a similar stage.”
- “Most helpful insight from successful users.”
- “Relevant to your current milestone.”

## 8.8 Community Wisdom

Community Insights become part of the Journey’s accumulated knowledge.

Three knowledge sources exist:

1. Expert Knowledge: creator content and structure
2. Behavioral Intelligence: platform data
3. Community Wisdom: insights from people who completed the journey

---

# 9. Reporting and Check-in

## 9.1 Check-in

A Check-in is the user's interaction with a Journey to indicate progress, completion, failure, or status.

Check-in is central to PushApp because it updates:

- Progress
- Score
- Forecast
- Streaks
- Support visibility
- Reflection
- Future recommendations

## 9.2 Reporting Mechanism

Every Journey defines its Reporting Mechanism.

Examples:

- Checkbox
- Numeric value
- Counter
- Text
- Percentage
- Multiple choice
- Completion unit
- Time spent
- Future device/API integration

## 9.3 Examples

Antibiotics:

- Checkbox: Took / did not take

Deadlift:

- Numeric: weight lifted

Course:

- Completion unit: lesson or module

Book:

- Chapters completed

Avoid sweets:

- Within limit / exceeded / amount consumed

Smoking:

- Did not smoke / smoked / craving level

## 9.4 Reflection Layer

After the required Check-in, optional reflection modules may appear.

Examples:

- Private note
- Mood
- Difficulty
- Time invested
- Ask for support
- Share with Support Circle
- Future Community Insight
- Motivation feedback

These are optional and configurable.

## 9.5 Private Notes

Private notes can act like a personal journal.

Later, after completing the Journey, the user may choose to share a past note anonymously as a Community Insight.

## 9.6 Mood

Mood can help the user and Support Circle understand emotional state.

For example, if a user reports low mood, selected supporters may be prompted to check in.

## 9.7 Difficulty

Difficulty ratings can help:

- Users understand their patterns
- Creators improve Journeys
- PushApp identify abandonment risks
- The system improve recommendations

## 9.8 Photos

Photos are intentionally excluded from MVP.

Reasons:

- Storage cost
- Privacy
- Risk of becoming social-media-like
- Not essential to the core product

This may be revisited later only if a clear use case exists.

## 9.9 Premium Reflection Modules

Some advanced reporting or reflection modules may be part of premium Journeys.

The core Check-in should remain available to all users.

Premium may unlock depth, not basic functionality.

---

## 9.10 Missing Reports

PushApp should not assume failure when the user does not report.

Lack of reporting is missing information.

The product should ask the user what happened and give them a low-friction way to clarify whether the Step was completed.

Possible reasons for not completing a Step may include:

- Something came up
- I forgot to check in
- I was tired
- This no longer interests me
- Other

If the user selects "Other," they may write a free-text explanation that can later be analyzed.

The tone should remain supportive and non-judgmental.

---


# 10. Quick Check-in

## 10.1 Principle

Every Journey should support Quick Check-in.

The interaction must be consistent across Journeys, even if the content differs by Reporting Mechanism.

## 10.2 Long Press Candidate

A leading UX direction:

Long press on a Journey card opens a Quick Check-in sheet.

Examples:

- Checkbox Journey: simple done/not done
- Numeric Journey: quick number entry
- Course Journey: select completed module
- Avoidance Journey: report within limit / exceeded
- Reading Journey: chapters completed

## 10.3 Consistency

Users should not need to remember which Journeys support quick reporting.

All Journeys should support it.

The system adapts the UI to the Journey’s reporting type.

---

# 11. Home Screen

## 11.1 Current Direction

Home is the main daily entry point.

It should show active Journeys and allow quick access to reporting.

## 11.2 Home Model: Action-Based (decided 2026-07-06)

Home is **action-based**, not Journey-based. It shows today's prioritized actions generated from the user's active Journeys, rather than a list of Journeys.

Example:

- Check in for Deadlift
- Call parents
- Read Chapter 6
- Support a friend

The Journeys tab (§11A.2) remains the place to see and manage Journeys as whole units.

## 11.3 Home as Return to Life

The Home screen should not become a dashboard full of vanity metrics.

It should answer:

- What matters today?
- What should I do next?
- Who needs my support?
- Am I drifting away from something important?

---

## 11.4 Home as Daily Command Center

Home should show what matters now without becoming a cluttered dashboard.

It should include:

- Level, XP progress and coins
- Daily Missions
- Weekly Missions
- Urgent Journey Steps
- Friends who need help
- Upcoming rewards

Journey Steps and Daily Missions should be visually distinct.

Journey Steps advance the user's real-life Journeys.

Daily Missions advance the game loop.

Journey Step cards should show which Journey they belong to, so the user understands the larger context behind each action.

Urgency should be visible. A delayed or critical Step may appear in a stronger visual state.

---


# 11A. Information Architecture

## 11A.1 Main Tabs

Current proposed main navigation:

1. Home
2. Journeys
3. Explore
4. Friends
5. Buddy
6. Profile

Inbox should be accessible but not necessarily a main tab.

---

## 11A.2 Journeys Tab

The Journeys tab is where the user sees the complete picture of their current and future personal growth work.

It should include:

- Active Journeys
- Future Journeys
- Paused Journeys
- Completed Journeys
- Archived Journeys

Opening a Journey shows:

- Full plan
- Completed Steps
- Upcoming Steps
- Estimated completion date
- Rules and flexibility
- Progress

Future Journeys are saved Journeys the user intends to start later.

---

## 11A.3 Explore Tab

Explore is discovery-first, not search-first.

It may include:

- Recommended Journeys
- Trending Journeys
- Journeys friends completed
- Categories
- Search
- Business Journeys
- Seasonal Journeys

Future capability:

The user may tell Buddy what they want to improve, and PushApp will recommend relevant Journeys using semantic understanding and Dream tags.

This should begin as discovery and search, and evolve into AI-guided journey recommendation.

---

## 11A.4 Friends Tab

Friends is for helping and being helped.

It may include:

- Friends list
- Allies
- Friends who need help
- Gifts
- Chat shortcuts
- Challenges

The screen should encourage users to add friends, because the social layer is both a retention loop and a growth loop.

---

## 11A.5 Inbox

Inbox is not necessarily a main tab.

It should collect:

- Ally messages
- Friend requests
- Group messages, if groups exist
- Gift notifications
- Journey updates
- Buddy messages
- Reward claims

Possible inbox categories:

- Allies
- Friends
- Groups, only if not empty

Allies should have high priority because they are directly connected to the user's Journeys.

---


# 12. Support System

## 12.1 Core Idea

PushApp uses human support as a structured part of personal growth.

People often want support but avoid asking for it.

People often want to help but do not know when or how.

PushApp lowers both barriers.

## 12.2 Ally

An Ally is a person who supports the user.

Ally is not just a friend.

A friend is a relationship.

An Ally is a role inside a growth journey.

## 12.3 Support Circle

A Support Circle is the set of people connected to a specific Journey.

Support is Journey-specific rather than global.

A user may have:

- Private Journey with no supporters
- Journey visible to selected Allies
- Journey with Coach
- Journey with Partner
- Journey with Group

## 12.4 Asking for Support

When a user adds someone as a supporter, the supporter should approve.

It should function like an invitation.

Possible default:

If someone is already an Ally, auto-approve support requests unless disabled.

This needs further validation.

## 12.5 Private Support Without Revealing Journey

Some users may want accountability without exposing the content of the Journey.

Example:

A user may want friends to know they are trying to stay consistent, without revealing the specific goal.

Open question:

How much should Allies see in private-support mode?

## 12.6 Support Styles

Some users may not want strict accountability.

Possible future setting:

- Gentle
- Balanced
- Strict
- No automatic contact

The system should avoid annoying users.

## 12.7 Helping the Helper

PushApp is not only for people trying to grow.

It is also for people who want to help people they care about grow.

This creates a second value proposition:

“I can be a better friend, partner, family member or coach.”

---

## 12.8 Journey Privacy and Sharing Levels

Journeys are private by default.

At the point of saving a Journey, PushApp should strongly recommend adding at least one Ally, while still allowing the user to continue alone.

Sharing should be controlled per Journey.

Suggested visibility modes:

### Private

No one can see the Journey.

### Progress Only

An Ally can see progress status without seeing the Journey name or content.

Example:

Guy has not progressed this week.

This allows support without exposing sensitive personal goals.

### Ally

The Ally can see the Journey, Steps and progress, and can actively support the user.

This is the full support mode.

---

## 12.9 Helping a Friend

Helping a friend should be simple and contextual.

Initial supported actions:

- Send a message
- Poke / nudge
- The receiving user can report that a friend helped

Future capability:

Buddy may suggest what kind of message to send, but this should be treated as a future feature because meaningful recommendations require behavioral context and data.

---


# 13. Journey Partner and Shared Journeys

## 13.1 Journey Partner

A Journey Partner joins the user in the same or similar Journey.

This can help users feel accompanied.

## 13.2 Shared Journey

A Shared Journey is a Journey that multiple users pursue together.

Initial participant limit idea:

Up to 3 participants.

## 13.3 Individual and Group Success

Failure of one partner should not harm another user's individual success.

However, group rewards may depend on collective performance.

## 13.4 Leaving a Shared Journey

If a partner leaves:

- The remaining user keeps their progress
- If no partners remain, the Journey becomes solo
- Shared rewards may no longer apply

## 13.5 Invite Links

Users may invite others into a Shared Journey using a link.

This can support organic growth.

---

# 14. Coach and Professional Support

## 14.1 Coach Use Case

A coach gives users assignments between sessions.

Today these may sit in files, chats, or notes and disappear.

PushApp can help translate coach assignments into structured Journeys.

## 14.2 Coach Visibility

Coaches may need visibility into client progress.

This may include:

- Task completion
- Mood
- Difficulty
- Notes
- Missed reports
- Trends

## 14.3 Coach Sessions and Coins

Coach sessions involve real human labor.

They should likely not be purchasable with free in-app coins if that creates financial risk.

Real-money flow may be required.

## 14.4 NLP and Coaching Content

NLP exercises, coaching practices, weekly reflection tasks, gratitude journaling, and similar content may become structured Journeys.

This could support coaches and create a new content category.

---

# 15. AI

## 15.1 AI Is Part of the MVP, but the MVP Does Not Depend on It

AI is part of the MVP: it enhances the experience, personalizes the product, and improves user guidance.

However, the MVP must not depend on AI in order to provide value. Every core user flow — creating and adopting Journeys, reporting, support, progress — must remain fully functional even if AI is temporarily unavailable.

AI should be treated as an enhancement layer over a product that already works without it.

## 15.2 Future AI Discovery

Paid users may eventually use AI conversations to explore:

- Who they want to become
- Which life areas they want to improve
- What goals matter to them
- How to break aspirations into Journeys
- Which motivational phrases or reflections should appear
- Which people might support them

## 15.3 AI Principle

AI should help users think.

It should not decide who they should become.

The user remains in control.

## 15.4 AI Cost

AI costs money.

Therefore advanced AI features may be premium.

## 15.5 AI and Context

AI may eventually help personalize:

- Motivation
- Journey recommendations
- Interventions
- Milestones
- Reflection prompts
- Support suggestions

---

## 15.6 AI as Personalization

PushApp should not sell "AI" as the core value.

The user value is personalization.

AI should be used where it creates meaningful improvement:

- Adapting communication style
- Learning preferred times
- Recommending Journey templates
- Helping build a Journey
- Future roadmap planning with Buddy

Core product value should exist without AI, but the first customer-facing paid version should include AI-based personalization because it represents the premium value of PushApp.

---


# 16. Interventions

## 16.1 Definition

An Intervention is a system action intended to help the user return to or stay on their path.

PushApp is not merely a reminder app.

It intervenes when the user is drifting from what they chose.

## 16.2 Examples

- “Now may be a good time to work on this.”
- “You are close to a place connected to your goal.”
- “You have used an app longer than you intended.”
- “You missed your planned check-in.”
- “Your forecast is dropping.”
- “A friend might need support today.”

## 16.3 Context-Aware Interventions

Future signals may include:

- Location / geofencing
- Calendar availability
- App usage
- Time of day
- Routine patterns
- Missed Check-ins
- Mood
- Support activity

## 16.4 Geofencing

Geofencing may allow users to define important locations:

- Home
- Work
- Gym
- Shopping center
- Friend's house
- Parents' house

This enables contextual prompts.

Geofencing should strengthen the core idea of returning users to intentional living, not become a generic reminders feature.

## 16.5 App Usage Awareness

Users may want to limit use of certain apps.

Future interventions may say:

“You have been using this app longer than you intended.”

This expands PushApp toward intentional digital behavior.

---

# 17. Forecast

## 17.1 Definition

Forecast estimates whether the user is likely to complete the Journey based on current behavior.

It is separate from Progress and Score.

## 17.2 Purpose

Forecast allows PushApp to intervene before failure.

Example:

If a user is still technically able to complete a Journey but one more missed day would make success unlikely, the system should respond early.

## 17.3 Forecast vs Progress vs Score

Progress:

How much has been completed?

Score:

How well is the user performing according to the Success Policy?

Forecast:

What is the predicted likelihood of success?

---

# 18. Progress and Score

## 18.1 Progress

Progress measures movement through the Journey.

Examples:

- Days completed
- Lessons completed
- Chapters read
- Milestones achieved
- Percent of journey completed

## 18.2 Score

Score measures performance quality according to the Journey's Success Policy.

Different Journeys may score differently.

## 18.3 Avoid Shame

Progress and Score should help users understand reality without creating unnecessary shame.

The system should help users recover.

---

# 19. Success Policy

## 19.1 Definition

Success Policy defines what it means to succeed in a Journey.

Different Journeys need different Success Policies.

## 19.2 Examples

- Complete 80% of daily actions
- Take medication every required day
- Read 16 chapters in 8 weeks
- Stay under a weekly limit
- Complete all milestones
- Achieve target weight / performance
- Attend X sessions

## 19.3 Partial Completion

Some Journeys can allow partial success.

Some cannot.

This must be configurable.

## 19.4 Critical Journeys

Medical or high-stakes Journeys may require strict compliance.

---

## 19.5 Journey Completion Flow

Completing a Journey should be one of the most emotional moments in PushApp.

The completion flow should include:

- Celebration animation
- Buddy reaction
- XP
- Coins or gifts
- Reflection
- Sharing
- Thanking Allies
- Rating or recommending the Journey
- Suggesting the next Journey

Buddy should frame completion as something the user and Buddy achieved together.

Example:

> We did it.

This moment should also collect useful product data:

- What was easy?
- What was hard?
- Would the user recommend this Journey?
- What helped most?
- Should it be shared with friends?

---

## 19.6 When a Journey No Longer Fits

PushApp should avoid framing the user as a failure.

If a Journey can no longer reasonably succeed under its current rules, the product can say something like:

> It looks like this Journey needs to adapt.

The user may be offered options:

- Try again
- Restart
- Adjust the rules
- Pause, if allowed
- Archive and choose a better fit

The product should preserve accountability without shame.

---


# 20. Rewards, XP, Coins and Achievements

## 20.1 XP

XP reflects user activity and engagement with growth.

It contributes to level.

## 20.2 Coins

Coins are virtual currency.

They may be used for cosmetics, themes, gifts, and non-real-cost rewards.

Coins should not create financial liabilities with real-world coaches unless carefully designed.

## 20.3 Achievements

Achievements are identity markers.

They are not currency.

They appear on the user's profile and represent meaningful milestones.

## 20.4 Achievement Tiers

Achievements may have levels:

- Bronze
- Silver
- Gold
- Diamond
- Multiple diamonds
- Platinum

Example:

Login 10 days → Bronze  
50 days → Silver  
100 days → Gold

## 20.5 Achievement Categories

Potential categories:

- Personal Journeys
- Shared Journeys
- Helping friends
- Daily / weekly activity
- Group leadership
- Coach activity
- Creator achievements
- Seasonal achievements

## 20.6 Seasonal and Limited Rewards

Seasonal events may include limited cosmetics or achievements.

Example:

Christmas outfit available only during Christmas period.

---

## 20.7 XP vs Coins

XP and coins should represent different things.

XP represents personal growth and meaningful contribution.

XP should be awarded for behaviors PushApp truly wants to encourage, such as:

- Completing Journey Steps
- Staying consistent with Journeys
- Helping friends
- Honest reporting
- Reflection when relevant

Coins represent the game economy.

Coins may be awarded through:

- Daily Missions
- Events
- Lucky wheel
- Gifts
- Promotions

This distinction prevents the game economy from diluting the meaning of XP.

---

## 20.8 Achievements

Achievements are not created for every Journey.

They are predefined global accomplishments available to all users.

Examples:

- Complete 3 Journeys
- Complete 10 Journeys
- Help 100 friends
- Maintain a 30-day streak
- Invite 10 friends
- Create a Journey used by 100 people

Journey completion is still celebrated, but it does not automatically create a unique Achievement for that Journey type.

---


# 21. Avatar and Profile

## 21.1 Avatar

The user has an avatar with cosmetic customization.

This is part of identity and progression.

## 21.2 Profile

Profile may include:

- Avatar
- Level
- Achievements
- Completed Journey count
- Active Journey count
- Friends / Allies count
- Friendship / support metric
- Personal motto
- Current focus if user chooses to show it
- Theme

## 21.3 Privacy

Private Journeys should not appear on the profile unless explicitly allowed.

## 21.4 Personal Motto

The profile may include a short Personal Motto.

Initially text only.

Future versions may allow more customization.

---

## 21.5 Buddy

The avatar concept should evolve into **Buddy**.

Buddy is the user's companion, not the user's representation of themselves.

The user's visible profile image across the app should be their Buddy, including its level, style and equipped items.

Buddy represents the relationship between the user and PushApp:

- It reminds the user of what matters.
- It celebrates wins.
- It grows with the user.
- It learns alongside the user.
- It may eventually become the AI interface.

Buddy can be human-like, creature-like or something more original, similar in spirit to collectible game companions rather than realistic human avatars.

Buddy customization is intended to become one of PushApp's strongest long-term retention systems. It may include outfits, accessories, hairstyles (where applicable), colors, animations, emotes, and rare or seasonal cosmetics. Future directions include different Buddy species — robotic companions, fantasy creatures, or original "cute monster" characters — without imitating any existing franchise.

Because Buddy is the user's public identity, it should appear consistently across every surface that would otherwise show a profile picture: friend lists, inbox, Journey participants, leaderboards, support requests, Ally cards, and chat.

Over time, Buddy should adapt its communication style to the user (for example: supportive, challenging, friendly, playful, minimal, or professional). This adaptation should be learned gradually from the user's behavior rather than set through explicit configuration whenever possible.

---

## 21.6 Buddy Emotional State

Buddy should be able to reflect emotional state and progress without creating guilt.

When the user is progressing, Buddy can feel energetic, proud or bright.

When the user is drifting, Buddy should not look sad or punishing. It may feel quieter, waiting or less energetic.

The goal is emotional feedback without shame.

Buddy's affirmative messages should reinforce attachment rather than pressure. Examples of the intended tone:

- "I'm proud of us."
- "I've missed working together."
- "I'm glad you're back."
- "We can always continue."

---

## 21.7 Buddy as Memory

Buddy grows because the user grows.

Over time, Buddy becomes the memory of the user's development.

Future examples:

- "This is the seventh Journey we completed together."
- "Remember when you almost quit running last year?"
- "You've helped three friends this month."

This makes Buddy more than a cosmetic feature. It becomes the emotional continuity of the product.

---


# 22. Gifts and Social Economy

## 22.1 Daily Free Gift

Users may be able to send a limited number of free coins daily to friends.

Example:

Free daily coins to up to three friends.

This may encourage daily app opening and positive social behavior.

## 22.2 Item Gifts

Users may send items to friends with limits.

Example:

One item gift per day.

## 22.3 Purpose

Gifting should strengthen meaningful support, not become spam.

---

# 23. Business Model

## 23.1 Premium Journeys

Some Journeys may unlock enhanced capabilities:

- More reflection modules
- Rich content
- Advanced analytics
- Advanced interventions
- Creator content
- Community Insights
- Coach visibility

Core growth functionality should still work without premium.

## 23.2 Creator Marketplace

Creators may publish paid Journeys or programs.

Potential creators:

- Coaches
- NLP practitioners
- Course creators
- Fitness trainers
- Therapists / support professionals where appropriate
- Experts

## 23.3 AI Premium

AI-guided discovery and planning may be premium due to usage cost.

## 23.4 Cosmetics

Themes, avatar items, frames and other cosmetics may be monetized.

## 23.5 Coach Marketplace

A future marketplace may connect users with coaches.

Requires careful design due to real money flow.

---

# 24. Target Users and Go-To-Market

## 24.1 Not Everyone at First

The decided initial positioning is young adults building meaningful habits and goals across different areas of life (see §32) — positioning, not a vertical.

PushApp is not initially for everyone.

Many people do not actively define goals or seek growth tools.

The beachhead market should likely be people already trying to change.

## 24.2 Potential Early Users

- People working with coaches
- People in NLP / self-development communities
- People trying to quit smoking or change habits
- People taking courses
- People in support groups
- Fitness / health goal users
- People already using habit trackers or productivity tools
- People who like helping friends

## 24.3 Coaches as Distribution

Coaches may introduce PushApp to clients.

This makes PushApp a tool that extends coaching between sessions.

## 24.4 Communities

Support groups and growth communities may use PushApp to continue support between meetings.

---

# 25. Risks

## 25.1 Users May Not Connect

The biggest current fear:

Users may not understand why they need the app.

This must be tested.

## 25.2 Too Broad

PushApp risks becoming too general if it adds:

- Courses
- Geofencing
- App blockers
- AI coach
- Marketplace
- Social network

The core must remain intentional personal growth.

## 25.3 Support May Annoy Users

If accountability becomes nagging, users may leave.

Support must be configurable and respectful.

## 25.4 Privacy

Users may not want to share goals.

PushApp must support private journeys.

## 25.5 Empty Marketplace / Community

Community Insights and Marketplace features require critical mass.

They should unlock only when meaningful data exists.

---

# 26. Open Product Questions

- What is the exact minimum Journey creation flow?
- Which Reporting Mechanisms are MVP?
- Should Support Circle be part of MVP?
- Which go-to-market segment(s) to acquire first? (Positioning decided — see §32; specifics deferred to a GTM doc.)
- How should AI Discovery be priced?
- How should private support work?
- What is the initial business model?
- Should Marketplace exist in MVP or later?
- How much gamification is healthy?
- How should Progress, Score and Forecast be visually represented?
- What is the first POC scope?

---

# 27. Current MVP Direction

The MVP should probably focus on:

- Create or adopt a Journey
- Define simple Reporting Mechanism
- Daily / periodic Check-in
- Progress tracking
- Basic Forecast or risk indicator
- Basic Support Circle or Ally support
- Quick Check-in
- Simple Home screen
- Private mode
- Maybe basic marketplace/templates

The MVP may include AI as an enhancement layer, but no core flow should depend on it (see §15.1). Beyond that, the MVP should not depend on:

- Full Marketplace
- Community Insights
- Complex economy
- Full avatar system
- Geofencing
- App usage monitoring

---

# 28. Product North Stars

Potential statements:

- PushApp helps people stop living by default and start living by design.
- PushApp transforms aspirations into achievements.
- PushApp helps people return from their phone to the life they intentionally chose.
- People define where they want to go. PushApp helps them stay on the journey.
- PushApp exists so people can become closer to the person they choose to be.

These are not yet final slogans, but they represent the current direction.

---

# 29. Next Documentation Work

This Product Bible must be expanded further into:

- Detailed Journey specification
- Detailed Reporting specification
- Support Circle specification
- Marketplace specification
- Home screen UX
- Object model
- Data model
- MVP requirements
- POC scope
- Investor story alignment

This version is intentionally broad and designed to preserve current knowledge.

---

# 30. Intervention Engine

Status: Strategic Direction / Needs Validation

## 30.1 From Notifications to Interventions

PushApp should not be understood as a reminder app.

A traditional reminder system asks:

**When should we send a notification?**

PushApp should ask a more important question:

**What action has the highest probability of helping this specific user progress right now?**

This is the difference between a Notification Engine and an Intervention Engine.

## 30.2 Intervention as a Product Object

An Intervention is not the same as a push notification.

Possible interventions include:

- Push notification
- Message from an Ally
- Coach reminder
- AI reflection
- Widget update
- Calendar suggestion
- Location-based prompt
- Progress warning
- Forecast risk alert
- Competition update
- No intervention

Sometimes the best intervention is silence.

## 30.3 Possible Signals

The Intervention Engine may eventually learn from:

- Calendar availability
- Location
- Journey type
- Reporting history
- Current progress
- Forecast
- Past intervention success
- Preferred tone
- Time of day
- User motivation patterns
- Ally activity
- Coach activity
- Competition status
- App usage patterns

## 30.4 Optimization Goal

The Intervention Engine should optimize for:

**Increasing the user’s probability of long-term success.**

It should not optimize for:

- Notification open rate
- Screen time
- Daily active usage for its own sake
- Short-term engagement without meaningful progress

## 30.5 Strategic Importance

This may become one of PushApp’s most important differentiators.

Large platforms may provide smart reminders, but PushApp’s advantage is the combination of:

- Journey context
- User progress
- Social support
- Forecast
- Historical behavior
- Personal motivation patterns
- Growth-specific intent

The system does not merely know when to remind a user. It learns how that user succeeds.

---

# 31. Competition Mode

Status: New Idea / Needs Validation

## 31.1 Definition

Competition Mode allows a user to challenge a friend or another user in a time-bound motivational comparison.

The users may each have their own Journey, but the competition requires a comparable time frame and comparable progress model.

## 31.2 Purpose

Competition is not intended to turn PushApp into a leaderboard-driven product.

The purpose is to create an additional motivation mechanism for users who are energized by friendly challenge.

Competition should increase consistency, not replace the deeper goal of personal growth.

## 31.3 Possible Models

Possible competition models include:

- Same Journey template, same duration
- Different Journeys, same time frame, compared by completion percentage
- Check-in consistency competition
- Weekly challenge
- Streak competition
- Team competition

## 31.4 Risks

Competition can create harmful incentives if designed poorly.

Risks include:

- Users choosing easier Journeys to win
- Overemphasis on comparison
- Reduced intrinsic motivation
- Shame after losing
- Confusing personal growth with beating another person

## 31.5 Product Principle

Competition should be framed as a motivational mode.

It should not become the core philosophy of PushApp.

The system should ask:

**Does this competition help users stay committed to meaningful growth?**

If not, it does not belong in PushApp.

---

# 32. Positioning Insight

Status: Strategic Insight

## Initial Positioning (decided 2026-07-06)

For the initial product, PushApp is positioned for:

> **Young adults who want to build and maintain meaningful habits and personal goals across different areas of life.**

This is **positioning, not a vertical.** PushApp should not be restructured around a single domain (fitness, coaching, education, etc.). The long-term vision remains a general personal-growth platform. Specific go-to-market segments will be defined later in a dedicated Go-To-Market document.

The strategic insight below still holds as the deeper "why this user."

PushApp’s early user is not simply “anyone who wants to improve.”

That is too broad.

The current hypothesis is that PushApp should begin with people who have already decided they want to change something meaningful and are struggling to remain consistent.

The common denominator is not the domain.

The common denominator is a meaningful personal process where failure has a real cost.

Potential examples:

- Coaching clients
- People trying to quit smoking
- People following treatment or adherence processes
- People trying to complete courses
- People pursuing fitness goals
- People in support groups
- People trying to change addictive behaviors

This requires further validation and should inform the first beachhead market.

---

# 33. Founder Notes & Draft Hypotheses

Status: Not Yet Approved — Migrated from Product_Bible_Draft on 2026-07-06

This section preserves product reasoning that had not yet reached the confidence
level of the approved Bible body above. It was migrated here when the separate
Draft documents were consolidated into this single Product Bible. Treat everything
in this section as **hypothesis or founder reasoning**, not final decision. The raw
source documents are preserved in `08_Archive/`.

## 33.1 Founder Interview #1 — Positioning (2026-07-03)

Starting point: "PushApp is for people already in a process who need help staying
consistent." Directionally right but too broad.

Sharper current hypothesis:

> PushApp is initially for people who have already decided they want to change
> something meaningful in their lives, where staying consistent is difficult and
> failure has a meaningful personal cost.

Important distinction: "being in a process" is a shared characteristic, not yet an
ICP. The first beachhead market remains an open question (see §24, §32).

Key insight: the user is not looking for another productivity tool. They are
looking for a **system they genuinely believe will increase their probability of
success.** This is one of the most important positioning insights so far.

## 33.2 The User's Real Competition (Workaround Stack)

PushApp does not only compete with other apps. It competes with the user's existing
do-it-yourself stack:

- Paper
- Notes
- Calendar
- WhatsApp
- ChatGPT
- Habit trackers
- Coaching files
- Memory
- Good intentions

PushApp must make the user believe it offers meaningfully more value than
assembling those tools manually.

## 33.3 Why Existing Tools Feel Insufficient

Founder observation: existing habit/productivity apps did not feel more valuable
than paper, reminders, or lists — and often felt visually uninviting, expensive, or
hard to evaluate before paying.

Strategic implication: PushApp cannot win by being another list, reminder system,
or habit tracker. It must increase the user's **belief that they can actually stay
on track.**

The product question that must be answered in both design and investor storytelling:
why is PushApp fundamentally better than Paper, Calendar, WhatsApp, Notes, ChatGPT,
or a standard habit tracker?

## 33.4 Competitive Advantage / Moat — Current Hypothesis

What the advantage is **not** (each is copyable or approximable by existing
companies): AI, reminders, Journeys, gamification, marketplace, or social features
in isolation.

What it **might** be: the *combination* of structured growth Journeys, progress
context, Support Circle, community knowledge, personal behavior history, adaptive
interventions, and long-term learning about what helps each specific user succeed.
The system becomes more useful as it learns how a specific user progresses, drifts,
recovers, and responds to support. (Expands on §30.5 Strategic Importance.)

## 33.5 Journey Modes (Framing)

A useful framing that unifies several existing systems: a Journey can run in
different **modes** —

- Solo (see §12.8 Private)
- Supported (see §12 Support System, Allies / Support Circle)
- Shared (see §13 Shared Journeys)
- Competitive (see §31 Competition Mode)

Status: Framing hypothesis, not a committed data model.

## 33.6 Business Model Hypotheses

Migrated from Product_Bible_Draft_updated. All items are **Status: Hypothesis** and
should be read together with the approved §23 Business Model and the Pitch documents.

- **Freemium** — free users experience the core product; premium may add unlimited
  Journeys, AI coaching, advanced analytics, premium interventions, premium
  customization.
- **Creator Economy** — creators publish public Journeys; popular creators may
  receive revenue sharing based on usage.
- **Business Journeys** — businesses create branded Journeys around products or
  services. Possible monetization: publishing fee, revenue share, premium placement.
- **Virtual Economy** — Coins, cosmetics, rare Buddy items, seasonal rewards.
- **AI Coach** — future premium: discuss goals, create personalized Journeys,
  adaptive coaching.
- **Go-To-Market Hypothesis** — initial channels: Instagram, TikTok, creator
  partnerships, friend invitations.
- **Beachhead (Under Research)** — young adults already engaged in a meaningful
  personal journey who struggle with consistency.

## 33.7 Related Non-Product Notes (Preserved Elsewhere)

The former Draft also contained repository/process material that does not belong in
the Product Bible and is preserved in its home document:

- **AI-first repository structure** (prefer fewer, larger, self-contained documents
  because AI tools have file-count/context constraints) — see `Repository_Conventions.md`
  and `Open_Questions.md`.
- **Research backlog** (JITAI, behavioral intervention timing, personalized
  motivation, coaching adherence, human accountability, context-aware systems,
  friendly competition in behavior change, social support / help-seeking) — see
  `05_Research/`.

