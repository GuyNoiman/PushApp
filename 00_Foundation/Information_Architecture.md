# Information Architecture

Status: Approved (2026-07-05 product-architecture decisions merged 2026-07-06)

## Information Architecture Direction

PushApp should be designed around behavioral loops rather than a simple list of screens.

The main navigation should remain focused and avoid unnecessary tabs. The current preferred structure is:

1. **Home** — the daily action hub.
2. **Journeys** — the user's active, future, paused, completed and archived journeys.
3. **Explore** — discovery and creation of new journeys.
4. **Friends** — social graph, support and helping others.
5. **Buddy** — the user's game companion, customization and game identity.
6. **Profile** — account, statistics, achievements, settings and integrations.

**Inbox** should exist, but should not be a main tab. It should be accessible as an entry point, likely from the top navigation.

## Home

Home exists to answer, within a few seconds:

- What should I do today?
- What is urgent?
- Which of my journeys needs attention?
- Which friends need help?
- How close am I to the next reward, level or meaningful game milestone?

Home should not become a generic dashboard. It should feel like a guided daily surface.

Home should likely include:

- Level, XP progress and coins.
- Daily and weekly missions.
- Journey-related steps for today or this week.
- Clear indication of urgency.
- Friends who need help.
- Buddy presence or Buddy message.
- Reward proximity.

A key unresolved design question is how strongly to separate:
- **Journey Steps** — actions that move the user forward in real life.
- **Daily Missions** — game/system missions such as helping a friend, sending gifts, inviting friends or spinning a reward wheel.

The current direction is to separate them conceptually while presenting them in a way that still feels simple.

## Journeys

The Journeys tab should show the user's relationship with growth over time.

It should include:

- Active Journeys.
- Future Journeys.
- Paused Journeys.
- Completed Journeys.
- Archived Journeys.

Future Journeys are important. They represent things the user wants to do later, such as after completing a current journey or at a scheduled future date.

When entering a specific Journey, the user should be able to see:

- The full plan.
- What has already been completed.
- Upcoming steps.
- Expected completion date.
- Rules and flexibility.
- Progress.
- Associated Dream tags.
- Support or Ally configuration.

Journeys are finite and should generally be achievable within approximately 2–3 months. Long-term aspirations are represented as Dreams, not as endless Journeys.

## Dreams vs Journeys

Users think in Dreams.

The product operates in Journeys.

### Dreams

Dreams describe who the user wants to become or what broad aspiration they want to move toward.

Examples:

- Become healthier.
- Become financially independent.
- Become fluent in Spanish.
- Become a better leader.
- Become more consistent.

Dreams do not have deadlines, XP, completion state or rewards. Their purpose is direction.

### Journeys

Journeys are achievable, finite units of progress that move the user toward one or more Dreams.

Examples:

- Run 10km.
- Complete Spanish A1.
- 90 Days Smoke Free.
- Complete a 12-week strength program.

A single Dream can contain many Journeys. A single Journey can contribute to multiple Dreams through tags.

Technically, Dreams can be represented by tags or categories connected to Journeys.

## Explore

Explore should be discovery-first, not merely search.

Explore should help users decide what they might want to achieve and what Journey to start next.

It should include:

- Recommended Journeys.
- Trending Journeys.
- Categories.
- Journeys completed by friends.
- Search.
- Create new Journey.
- Future Buddy-assisted creation.

The preferred flow for creation is:

1. The user types what they want to achieve in natural language.
2. PushApp shows similar existing Journeys ranked by quality/relevance.
3. The user can choose an existing Journey or select "Create a new Journey".
4. If creating a new Journey, the user chooses between guided creation with Buddy or manual creation.

Future AI/Buddy functionality may allow the user to describe an ambitious Dream, and Buddy will suggest a roadmap of smaller achievable Journeys.

## Friends

Friends is not only a social list. Its purpose is to let users help others and receive support.

It should include:

- Friends list.
- Friends who need help.
- Allies.
- Support relationships.
- Gifts.
- Chat shortcuts.
- Friend profile cards.
- Ability to send a poke/nudge.
- Ability for the user to report that a friend helped them.

Friend cards should show the friend's Buddy, level and possibly quick actions.

The top of the Friends area may show the number of friends in order to encourage users to invite more people.

## Inbox

Inbox should likely follow a structure inspired by Instagram's message separation, but adapted to PushApp.

Current preferred Inbox sections:

- **Allies** — highest priority support-related communication.
- **Friends** — standard friend messages and interactions.
- **Groups** — only if the user belongs to groups.

Inbox may include:

- Friend requests.
- Ally invitations.
- Gifts.
- Support requests.
- Journey updates.
- Buddy messages.
- System messages.
- Reward claims.

## Buddy

Buddy is a major product area.

Buddy is not simply the user's avatar. Buddy is the user's companion and the face of PushApp.

The user's profile image across the app should be the Buddy, including level and outfit/customization if selected.

Buddy should support:

- Character customization.
- Equipment/clothing.
- Emotional state.
- Progress expression.
- Shop/inventory.
- Future personality or communication style.
- Future AI conversations.

Buddy can include non-human characters and should be allowed to feel more original, playful and game-like than a realistic human avatar.

A future concept is that the Buddy may begin as an egg or mystery character that is revealed after initial progress. This is a promising future feature but not required immediately.

## Profile

Profile is distinct from Buddy.

Profile is the user's account and history area.

It may include:

- User profile.
- Statistics.
- Achievements.
- Settings.
- Integrations.
- Subscription.
- Privacy.
- Historical progress.

Buddy is the playful/game identity. Profile is the user's account and record.

## Journey Privacy and Sharing

Default Journey visibility should be private.

PushApp should recommend adding at least one Ally when saving a Journey, but the user can explicitly choose not to.

Preferred sharing levels:

1. **Private** — no one sees anything.
2. **Progress Only** — selected Ally sees progress status without seeing the Journey name or details.
3. **Ally / Full Support** — Ally sees Journey name, steps, progress and can provide support.

This allows users to get accountability even when the Journey itself is sensitive.

## Journey Completion

Completing a Journey should be a major emotional product moment.

Completion should include:

- Celebration.
- Buddy reaction.
- XP.
- Coins or rewards.
- Possible gifts/items.
- Notification to relevant Allies.
- Reflection.
- Rating/review if the Journey came from an external template.
- Option to share with friends.
- Recommendation for the next Journey.

Completion is not just an ending. It should become the bridge to the next Journey.

## Failure and Adaptation

PushApp should avoid framing the user as failing.

If a Journey no longer fits the user's reality, the product should communicate that the Journey may need to adapt.

Possible framing:

- "This Journey no longer matches your current reality."
- "It looks like this Journey needs to adapt."
- "We did not meet the Journey rules this time. Would you like to try again or adjust the rules?"

The system should distinguish between:

- Missing report.
- Step not completed.
- Journey rules not met.
- Journey paused.
- Journey restarted.
- Journey adapted.

## XP, Coins and Achievements

XP should be given for meaningful behaviours, mainly:

- Completing Journey Steps.
- Consistency.
- Helping friends.
- Honest reporting.
- Reflection where relevant.

Coins should support the game economy and can be given for:

- Daily Missions.
- Lucky wheel.
- Gifts.
- Events.
- System/game activities.

Achievements are separate from Journey completion. They should be predefined across the system and available to all users.

Examples:

- Complete 3 Journeys.
- Help 50 friends.
- Maintain a streak.
- Invite 10 friends.
- Create a Journey used by many users.

Achievements are not automatically created for every specific Journey type.

## Journey Engine

PushApp should support different types of Journeys rather than forcing every Journey into one structure.

Journey configuration may include:

- Duration.
- Step structure.
- Frequency.
- Rules.
- Flexibility.
- Pause policy.
- Restart policy.
- Editing permissions.
- Visibility.
- Rewards.

Possible Journey structures:

- Repeating action.
- Sequential program.
- Flexible weekly commitment.
- Interactive in-app experience.

There may also be an optional **Phase** layer between a Journey and its Steps: a sequential grouping of Steps (e.g. a training plan's Phase A → Phase B → Phase C). Phases are optional — simple Journeys attach Steps directly. Full hierarchy: Dream → Journey → Phase (optional) → Step. ("Phase" is a working name.)

Existing Journey templates may be editable or locked by their creator.

When a user joins an existing Journey, they create their own instance of that Journey. The original template remains unchanged.

## Step Types

Steps are not always simple physical actions.

Possible Step types include:

- Action.
- Learning.
- Reflection.
- Decision.
- Journal entry.
- Gratitude exercise.
- Timer.
- Breathing exercise.
- Meditation.
- Quiz.
- Video.
- Audio.
- Photo.
- GPS/location.
- Upload.
- AI conversation.

Some Step types happen outside PushApp and rely on reporting.
Some Step types happen fully inside PushApp and can be completed automatically when the in-app experience is finished.

## Interactive Journey Experiences

Future PushApp-created Journeys may include customized in-app experiences.

Examples:

- "Write 5 things you're grateful for today."
- "Define your goals for the upcoming week."
- NLP-style exercises.
- Reflection prompts.
- Guided journaling.
- Mood check-ins.
- Planning exercises.

These differ from standard external steps because the action happens inside PushApp.

This creates a future direction where PushApp becomes a platform for guided personal-growth experiences, not only a tracker of external activities.

## Open / Future Decisions

The following topics are promising but not finalized:

- Exact maximum Journey duration: 2 months vs 3 months.
- Whether Buddy starts as an egg/mystery character.
- Whether optional Steps are supported in V1 or later.
- Exact structure of the Shop and Coins economy.
- Whether Explore remains a main tab in the first version.
- How advanced AI/Buddy journey creation should become.
- How to price AI-powered personalization.
- Whether groups are part of the first version or future roadmap.
