# Product_Bible

Status: Draft / Recovery Version

---

# Purpose

This document is the central product knowledge base for PushApp.

Its purpose is to preserve the current product thinking, decisions, architecture, terminology, future ideas, and open questions that have emerged during discovery.

This version is intentionally written as a **Recovery Version**: it prioritizes capturing as much approved and semi-approved knowledge as possible, even when some sections will later require deeper refinement.

---

# 1. Product Summary

PushApp is a personal growth platform designed to help people move from aspiration to achievement.

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

# 3. Core Object: Quest

## 3.1 Definition

A Quest is a structured personal growth journey designed to help a person achieve a meaningful outcome through consistent action over time.

A Quest is not:

- A one-time task
- A simple reminder
- A generic habit
- A to-do item

A Quest is used when a user wants to go through a process that requires persistence, repetition, milestones, or sustained effort.

## 3.2 Examples of Quests

Potential Quests include:

- Take antibiotics correctly
- Use a derma roller consistently for beard or hair growth
- Complete a digital course
- Talk to parents twice a week
- Define a weekly goal
- Read two book chapters each week and finish within two months
- Avoid eating sweets beyond a defined weekly limit
- Quit smoking
- Train toward an 80kg deadlift
- Learn a new language
- Learn to surf
- Improve relationship habits
- Stay consistent with workouts
- Complete NLP exercises
- Build a new professional habit

## 3.3 Why Quest Instead of Goal

A goal is an outcome.

A Quest is the structured journey toward that outcome.

For example:

- Goal: Deadlift 80kg
- Quest: Train consistently for 12 weeks, check in after workouts, hit milestones, receive support, track progress, and adjust when needed.

The Quest is the container for the system that helps the user succeed.

## 3.4 Quest as Unit of Growth

PushApp may evolve into a broader personal growth platform, but Quest remains the basic unit of structured growth.

Courses, challenges, programs, coaching plans, NLP exercises, and guided processes may all eventually be represented as Quests or Quest-like journeys.

## 3.5 Quest Requirements

A Quest usually includes:

- A meaningful outcome
- Duration or target date
- Repeated action or progress mechanism
- Reporting mechanism
- Success policy
- Progress tracking
- Optional milestones
- Optional support system
- Optional reflection
- Optional rewards
- Optional community knowledge
- Optional creator content

---

# 4. Quest Types

Different Quests require different mechanics.

## 4.1 Frequency Quest

A Quest based on repetition or cadence.

Examples:

- Talk to parents twice a week
- Workout three times a week
- Use a roller five times a week
- Write gratitude entries daily

Measured by whether the user meets the required frequency.

## 4.2 Completion Quest

A Quest based on completing units of content or tasks.

Examples:

- Complete a course
- Read a book
- Finish modules
- Complete weekly assignments

Measured by completion of content or milestones.

## 4.3 Avoidance Quest

A Quest based on avoiding or limiting behavior.

Examples:

- Quit smoking
- Avoid sweets
- Eat no more than a defined amount of chocolate weekly
- Limit time in specific apps

Measured by staying within limits or reporting exceptions.

## 4.4 Critical Compliance Quest

A Quest where consistency is medically or practically important.

Example:

- Take antibiotics

The system should be stricter and less playful around this type.

## 4.5 Hybrid Quest

A Quest that combines multiple mechanisms.

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

# 5. Quest Creation

## 5.1 Core Principle

Quest creation must be simple.

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

## 5.3 Quest Definition vs Quest Configuration

Quest creation has two layers:

## Quest Definition

The minimal commitment.

Examples:

- Goal
- Duration
- Basic type

## Quest Configuration

Optional settings that improve the chance of success:

- Milestones
- Reporting mechanism
- Support Circle
- Allies
- Quest Partner
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

For many Quests, milestones are useful.

Example:

Deadlift 80kg in 12 weeks.

The system may suggest milestones based on similar successful Quests, but the user must confirm or edit each milestone.

The system should not silently invent values that only the user can validate.

## 5.6 Data-Driven Recommendations

As PushApp grows, it can learn from successful Quests.

Possible future examples:

- Users who successfully reached similar fitness goals usually defined milestones every two weeks.
- Users who completed this course were more successful when they committed to three sessions per week.
- Users trying to quit smoking benefited from adding a Support Circle.

This creates a learning loop:

More Quests → More data → Better recommendations → Higher success → More Quests.

---

# 6. Quest Queue / Future Quests

Users may want to save Quests they are interested in but not ready to start immediately.

This creates a future Quest backlog.

Examples:

- “After I finish my current course, I want to start this next one.”
- “I want to begin this fitness program next month.”
- “I want to save this NLP exercise for later.”

Possible triggers:

- Manual start
- Scheduled start date
- Completion of another Quest
- Reminder when ready

This feature is not core MVP but should remain on the roadmap.

---

# 7. Growth Library and Marketplace

## 7.1 Growth Library

PushApp may eventually provide a library of journeys people can browse when they want to grow but do not know exactly what to start.

This library may include:

- Quests
- Courses
- Programs
- Challenges
- How-to guides
- NLP exercises
- Coaching plans
- Expert-designed growth journeys

## 7.2 Marketplace

Businesses, coaches, creators, NLP practitioners, course creators, and experts may eventually publish Quests or programs.

The marketplace becomes a source of structured growth journeys.

Users can adopt existing Quests instead of creating everything from scratch.

## 7.3 Why Marketplace Matters

Many users do not know how to design a good path.

The Marketplace helps them start with proven structures.

## 7.4 Marketplace Metadata

Marketplace Quests may eventually display:

- Rating
- Completion rate
- Difficulty
- Estimated duration
- Number of users
- Creator information
- Reviews
- Success stories
- Recommended support setup

## 7.5 Quest Reviews

When a user adopts an existing Quest, they may later review it.

The compact marketplace view may include a star rating or score.

Inside the Quest detail page, feedback should be more granular:

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

Community Insights are comments, reflections, or advice left by users who successfully completed a Quest.

They are meant to help future users feel less alone and learn from people who were at a similar stage.

## 8.2 Only Completed Users

Only users who completed the Quest may contribute Community Insights.

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

At least 5 comments from completed users before the feature is visible for that Quest.

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

- “Shown because it was written by someone who completed this Quest and was at a similar stage.”
- “Most helpful insight from successful users.”
- “Relevant to your current milestone.”

## 8.8 Community Wisdom

Community Insights become part of the Quest’s accumulated knowledge.

Three knowledge sources exist:

1. Expert Knowledge: creator content and structure
2. Behavioral Intelligence: platform data
3. Community Wisdom: insights from people who completed the journey

---

# 9. Reporting and Check-in

## 9.1 Check-in

A Check-in is the user's interaction with a Quest to indicate progress, completion, failure, or status.

Check-in is central to PushApp because it updates:

- Progress
- Score
- Forecast
- Streaks
- Support visibility
- Reflection
- Future recommendations

## 9.2 Reporting Mechanism

Every Quest defines its Reporting Mechanism.

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

Later, after completing the Quest, the user may choose to share a past note anonymously as a Community Insight.

## 9.6 Mood

Mood can help the user and Support Circle understand emotional state.

For example, if a user reports low mood, selected supporters may be prompted to check in.

## 9.7 Difficulty

Difficulty ratings can help:

- Users understand their patterns
- Creators improve Quests
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

Some advanced reporting or reflection modules may be part of premium Quests.

The core Check-in should remain available to all users.

Premium may unlock depth, not basic functionality.

---

# 10. Quick Check-in

## 10.1 Principle

Every Quest should support Quick Check-in.

The interaction must be consistent across Quests, even if the content differs by Reporting Mechanism.

## 10.2 Long Press Candidate

A leading UX direction:

Long press on a Quest card opens a Quick Check-in sheet.

Examples:

- Checkbox Quest: simple done/not done
- Numeric Quest: quick number entry
- Course Quest: select completed module
- Avoidance Quest: report within limit / exceeded
- Reading Quest: chapters completed

## 10.3 Consistency

Users should not need to remember which Quests support quick reporting.

All Quests should support it.

The system adapts the UI to the Quest’s reporting type.

---

# 11. Home Screen

## 11.1 Current Direction

Home is the main daily entry point.

It should show active Quests and allow quick access to reporting.

## 11.2 Open Question: Quests vs Actions

There are two possible Home models:

### Quest-based Home

Shows active Quests, status, progress, and Check-in actions.

### Action-based Home

Shows today's prioritized actions generated from active Quests.

Example:

- Check in for Deadlift
- Call parents
- Read Chapter 6
- Support a friend

This remains open.

## 11.3 Home as Return to Life

The Home screen should not become a dashboard full of vanity metrics.

It should answer:

- What matters today?
- What should I do next?
- Who needs my support?
- Am I drifting away from something important?

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

A Support Circle is the set of people connected to a specific Quest.

Support is Quest-specific rather than global.

A user may have:

- Private Quest with no supporters
- Quest visible to selected Allies
- Quest with Coach
- Quest with Partner
- Quest with Group

## 12.4 Asking for Support

When a user adds someone as a supporter, the supporter should approve.

It should function like an invitation.

Possible default:

If someone is already an Ally, auto-approve support requests unless disabled.

This needs further validation.

## 12.5 Private Support Without Revealing Quest

Some users may want accountability without exposing the content of the Quest.

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

# 13. Quest Partner and Shared Quests

## 13.1 Quest Partner

A Quest Partner joins the user in the same or similar Quest.

This can help users feel accompanied.

## 13.2 Shared Quest

A Shared Quest is a Quest that multiple users pursue together.

Initial participant limit idea:

Up to 3 participants.

## 13.3 Individual and Group Success

Failure of one partner should not harm another user's individual success.

However, group rewards may depend on collective performance.

## 13.4 Leaving a Shared Quest

If a partner leaves:

- The remaining user keeps their progress
- If no partners remain, the Quest becomes solo
- Shared rewards may no longer apply

## 13.5 Invite Links

Users may invite others into a Shared Quest using a link.

This can support organic growth.

---

# 14. Coach and Professional Support

## 14.1 Coach Use Case

A coach gives users assignments between sessions.

Today these may sit in files, chats, or notes and disappear.

PushApp can help translate coach assignments into structured Quests.

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

NLP exercises, coaching practices, weekly reflection tasks, gratitude journaling, and similar content may become structured Quests.

This could support coaches and create a new content category.

---

# 15. AI

## 15.1 AI Is Optional, Not Core MVP

AI should not be required for the product to work.

The MVP should work through structured Quests, reporting, support, and simple recommendations.

## 15.2 Future AI Discovery

Paid users may eventually use AI conversations to explore:

- Who they want to become
- Which life areas they want to improve
- What goals matter to them
- How to break aspirations into Quests
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
- Quest recommendations
- Interventions
- Milestones
- Reflection prompts
- Support suggestions

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

Forecast estimates whether the user is likely to complete the Quest based on current behavior.

It is separate from Progress and Score.

## 17.2 Purpose

Forecast allows PushApp to intervene before failure.

Example:

If a user is still technically able to complete a Quest but one more missed day would make success unlikely, the system should respond early.

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

Progress measures movement through the Quest.

Examples:

- Days completed
- Lessons completed
- Chapters read
- Milestones achieved
- Percent of journey completed

## 18.2 Score

Score measures performance quality according to the Quest's Success Policy.

Different Quests may score differently.

## 18.3 Avoid Shame

Progress and Score should help users understand reality without creating unnecessary shame.

The system should help users recover.

---

# 19. Success Policy

## 19.1 Definition

Success Policy defines what it means to succeed in a Quest.

Different Quests need different Success Policies.

## 19.2 Examples

- Complete 80% of daily actions
- Take medication every required day
- Read 16 chapters in 8 weeks
- Stay under a weekly limit
- Complete all milestones
- Achieve target weight / performance
- Attend X sessions

## 19.3 Partial Completion

Some Quests can allow partial success.

Some cannot.

This must be configurable.

## 19.4 Critical Quests

Medical or high-stakes Quests may require strict compliance.

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

- Personal Quests
- Shared Quests
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

# 21. Avatar and Profile

## 21.1 Avatar

The user has an avatar with cosmetic customization.

This is part of identity and progression.

## 21.2 Profile

Profile may include:

- Avatar
- Level
- Achievements
- Completed Quest count
- Active Quest count
- Friends / Allies count
- Friendship / support metric
- Personal motto
- Current focus if user chooses to show it
- Theme

## 21.3 Privacy

Private Quests should not appear on the profile unless explicitly allowed.

## 21.4 Personal Motto

The profile may include a short Personal Motto.

Initially text only.

Future versions may allow more customization.

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

## 23.1 Premium Quests

Some Quests may unlock enhanced capabilities:

- More reflection modules
- Rich content
- Advanced analytics
- Advanced interventions
- Creator content
- Community Insights
- Coach visibility

Core growth functionality should still work without premium.

## 23.2 Creator Marketplace

Creators may publish paid Quests or programs.

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

- Should Home be Quest-based or Action-based?
- What is the exact minimum Quest creation flow?
- Which Reporting Mechanisms are MVP?
- Should Support Circle be part of MVP?
- What is the first beachhead market?
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

- Create or adopt a Quest
- Define simple Reporting Mechanism
- Daily / periodic Check-in
- Progress tracking
- Basic Forecast or risk indicator
- Basic Support Circle or Ally support
- Quick Check-in
- Simple Home screen
- Private mode
- Maybe basic marketplace/templates

MVP should not depend on:

- AI
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

- Detailed Quest specification
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
