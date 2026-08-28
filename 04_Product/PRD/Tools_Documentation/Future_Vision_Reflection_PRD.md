# The Future I Choose — Product Requirements Document

Status: **Draft product and UX specification — proposed for founder approval**  
Stage: **POC for authored reflection; Commercial candidate for Coach dialogue and recurring synthesis**  
Tool family: **Reflection — envision and revisit**  
Estimated time: **5–7 minutes for Focused; 12–15 minutes for Deep; 4–7 minutes per return**  
Last updated: 2026-08-28

## 1. Purpose

People can name goals without being able to picture the life, identity, relationships, and ordinary moments
they actually want. A vague aspiration is emotionally weak; a purely practical plan can optimize the wrong
future.

**The Future I Choose** helps the user imagine one desired future without immediately shrinking it to what
seems practical, then turn the image into a concise, user-owned aspiration. On later visits, the Tool places
the prior aspiration beside reality and supports a constructive conversation about movement, obstacles,
support, and what should change.

The Tool is inspired by future-self reflection and the separation of imaginative, practical, and critical
thinking often called the Disney Creative Strategy. PushApp does not copy that branded worksheet or present
the method as a validated Disney-authored psychological assessment. Its original structure is:

`Imagine freely → Notice what matters → Meet reality kindly → Choose what to carry forward`

## 2. Why this belongs in PushApp

- It starts with who the user wants to become, directly supporting the Dream layer.
- It separates aspiration from implementation: a Dream may emerge, but the Tool does not create a Journey.
- Recurring reflection connects intention to lived reality without punishment, streaks, or forced frequency.
- The Coach can help the user update meaning rather than merely track completion.

It is not a productivity exercise, manifestation claim, personality assessment, or promise that visualization
causes success.

## 3. Differentiation from existing PushApp Tools

### My Best Possible Year

That Tool is a private, time-capsule letter about a whole possible year. Its text is not analyzed, shared with
the Coach, or used as product intelligence.

The Future I Choose instead:

- focuses on one aspiration at a time;
- saves a short structured result rather than a sealed letter;
- is intentionally revisited on a user-selected cadence;
- supports an explicit, previewed Coach conversation;
- examines movement, barriers, and support without converting the aspiration into a task list.

### Passion Map and Values Sort

Those Tools help the user recognize what draws them and what matters. This Tool asks what life could look like
when those signals are lived. It may offer an explicit import of a user-confirmed result in a later version,
but it never silently reads another Tool.

## 4. Competitive and research references

- The **Best Possible Self** intervention asks people to write about a future in which things have gone as well
  as realistically possible. A systematic review and meta-analysis found small-to-moderate positive effects on
  wellbeing, optimism, and positive affect, while also showing that this is a reflection intervention rather
  than proof that a pictured future will occur: <https://pmc.ncbi.nlm.nih.gov/articles/PMC6756746/>.
- **FutureMe** reduces future reflection to a strong three-step time-capsule pattern: write, choose a delivery
  date, receive later. It is simple, but does not create a structured recurring comparison or bridge to
  supported action: <https://www.futureme.com/letters>.
- **Future Yourself** frames the return as a conversation across time and explicitly helps users notice
  progress when an earlier message returns. It remains letter-led rather than aspiration-led:
  <https://futureyourself.app/>.
- **WOOP** guides users through Wish, Outcome, Obstacle, and Plan. Its strength is bringing an obstacle into
  the same exercise as the desired outcome; PushApp preserves that reality-facing value without copying its
  four-step flow or turning this reflection into an implementation-intention Tool:
  <https://woopmylife.org/en/app-app>.
- **EnvisionBoard** and **Dreamer** make aspirations visual through boards, images, affirmations, widgets, and
  repeated exposure. They are visually inviting, but tend to combine inspiration, goals, and task tracking in
  one object: <https://envisionboard.app/> and <https://vision-board.app/>.
- **VISTA** combines a desired future, an anti-vision, and recurring action check-ins. PushApp deliberately
  avoids fear-based anti-vision framing and keeps return questions curious rather than compliance-led:
  <https://apps.apple.com/us/app/vista-future-self-journal/id6761953873>.
- Design-creativity literature describes sequential dreamer, realist, and critic perspectives as a useful
  brainstorming structure, while historical descriptions of Disney's own work also use producer, director,
  and audience perspectives. PushApp therefore treats “Disney” as inspiration, not a scientific or historical
  attribution claim: <https://www.cambridge.org/core/services/aop-cambridge-core/content/view/E7A5269AEC6E42145749F7CB232EB58D/9781009325332AR.pdf/design_creativity.pdf>.

### Opportunity

Competitors commonly do one of three things: preserve a future letter, assemble a visual board, or convert a
wish into goals. PushApp's advantage is the **living aspiration loop**: preserve the user's previous version,
compare it with lived experience, invite a supportive Coach discussion, and let the user confirm whether the
aspiration itself or only the route toward it has changed.

## 5. Core product decisions proposed

1. One Tool record represents **one aspiration**. A user may create multiple records, but completes and revisits
   them separately to avoid collapsing unrelated futures into one answer.
2. The aspiration itself is not time-bound. The user chooses an **imagination horizon** only to make the scene
   concrete: six months, one year, three years, or a custom future date.
3. The user chooses whether and how often the Tool returns: off, monthly, every three months, every six months,
   yearly, or custom. Default is **off until explicitly chosen**.
4. A return is an invitation, never a due date. Missing it creates no streak loss, failure state, or repeated
   chase notification.
5. The prior confirmed result remains readable while a new return reflection is drafted. Nothing overwrites a
   confirmed version until the user approves the new one.
6. Coach discussion is optional and explicit. Before sending, the user previews exactly which structured
   fields and selected return answers will be shared.
7. The Coach may propose a revised aspiration, insight, or next conversation. It may not silently create or
   edit a Dream, Journey, Milestone, Step, reminder, or weekly plan.

## 6. First-use flow

### Screen 1 — Opening

Show:

- name: **The Future I Choose**;
- inviting description: picture a future that feels genuinely yours, then discover what matters inside it;
- target icon beside the outcome: **a clear aspiration you can return to**;
- clock icon beside the duration of the selected route;
- a visible Start button without scrolling;
- privacy summary and `How this may help` disclosure.

The illustration is a code-drawn horizon/path motif in the background, smaller than the text. It must not push
Start below the fold.

The opening says **Choose one of the options** and presents:

- **Focused · 5–7 minutes** — imagine one ordinary future moment, identify what matters, and write one
  aspiration statement;
- **Deep · 12–15 minutes** — explore the future across daily life, identity, relationships, difficulty,
  existing resources, obstacles, and support.

Both routes produce the same result shape and may use the same returning flow. Focused skips optional depth
prompts; it does not generate shallower claims from less information.

### Screen 2 — Choose a focus

Ask: `Which part of your future would you like to imagine today?`

Offer a short set of broad, non-diagnostic starting points: myself, relationships, health and energy, work or
learning, contribution, home and daily life, or my own words. This selection only shapes prompts; it is not a
permanent category or inferred identity.

### Screen 3 — Choose a viewing horizon

Offer six months, one year, three years, and custom. Explain: `This is a viewpoint, not a deadline.`

### Screen 4 — Imagine freely

Use one prompt per screen with optional typing or dictation. Focused uses prompts 1, 2, and 5; Deep uses all
five:

1. `Imagine an ordinary day in this future. Where are you, and what is happening around you?`
2. `What are you doing differently—not to impress anyone, but because it feels right for you?`
3. `How do you feel and behave when life becomes difficult in this future?`
4. `Who or what has a meaningful place beside you?`
5. `What are you proud that you protected, changed, or allowed yourself to become?`

Every prompt is skippable. The user may save and exit.

### Screen 5 — Notice the essence

Show the user's answers in a calm summary and ask them to choose or write up to three elements that make this
future meaningful. AI-assisted synthesis is Future/Commercial and must be labelled as a suggestion. The POC
uses authored prompt cards and user selection only.

### Screen 6 — Meet reality kindly

Ask separately:

- `What in your life already points in this direction?`
- `What could make movement toward it difficult?`
- `What or who could support you?`

This is not a feasibility gate. Obstacles do not invalidate the aspiration, and the Tool does not demand a
solution for every obstacle.

### Screen 7 — Define the aspiration

Invite one concise first-person statement. Suggested form:

`I want to become / build / experience… because…`

The user writes or edits the final wording. AI may later propose wording from the session, but no proposal is
saved without full user confirmation.

### Screen 8 — Choose the return rhythm

Offer off, monthly, every three months, every six months, yearly, and custom. Explain what will happen: one
gentle invitation to revisit; no repeated reminder and no penalty for ignoring it.

### Screen 9 — Result

Show a spacious **future horizon card** containing:

- aspiration statement;
- up to three meaning anchors;
- imagination horizon;
- support named by the user, if any;
- created/last-confirmed date;
- next chosen revisit date.

Actions: `Discuss with Coach`, `Edit`, `Choose return rhythm`, `Start a new aspiration`, and `Delete`.

## 7. Returning experience

Opening the Tool with an existing record shows its current result first. The primary actions are:

- `Revisit now`;
- `Discuss with Coach`;
- `Edit the current aspiration`;
- `Start a new aspiration`;
- `View previous reflections`.

### Guided revisit

Place the confirmed aspiration at the top and ask:

1. `Since the last reflection, where did you move closer to this future?`
2. `What held you back or made the direction less relevant?`
3. `What helped—even a little?`
4. `What could help you move closer from here?`
5. `Does the aspiration still feel like yours?`

The fifth answer branches:

- **Yes, as written:** preserve it and save a dated revisit.
- **Yes, but something changed:** open a draft revision while preserving the prior version.
- **Not anymore / I am unsure:** offer Coach discussion or archive the aspiration; never frame this as failure.

After the questions, show a side-by-side semantic summary: `What I hoped for then` and `What I know now`.
On narrow screens this becomes two vertically stacked sections, not a horizontal table.

## 8. Coach conversation contract

`Discuss with Coach` opens the existing rolling Coach conversation with a context message such as:

`I want to reflect on an aspiration I defined in The Future I Choose.`

Before opening, show a preview of the minimum context:

- confirmed aspiration statement;
- up to three meaning anchors;
- latest answers the user selects to include;
- the record's dates and imagination horizon.

Raw imaginative prose is excluded by default. The user may explicitly add selected excerpts. The Coach may
ask what progress occurred, what changed, which obstacle matters now, and what support is realistic. At the
end it may propose:

- keep the aspiration unchanged;
- revise its wording;
- explore it as a new or existing Dream;
- discuss a possible Journey in a separate, existing Journey-creation flow.

Each proposal is previewed and independently approved. Only the final approved version becomes the Tool's
current result. The conversation remains governed by the Coach history and deletion policy, not duplicated in
the Tool record.

## 9. Reminder behavior

- The revisit cadence creates at most one invitation per due cycle.
- If the app is foregrounded, show an in-app invitation rather than an external push.
- If ignored, keep a quiet `Ready to revisit` state inside the Tool; do not chase with repeated pushes.
- The user can postpone, disable, or change cadence at any time.
- Notification copy is generic on the lock screen and follows the account's notification-privacy rule.
- Time selection uses the shared notification system and Active Hours. This Tool does not create its own
  scheduling engine.
- Changing timezone recalculates future local delivery without duplicating the invitation.

## 10. Influence contract

### What becomes knowable

Only the current user-confirmed aspiration statement, up to three meaning anchors, chosen focus, imagination
horizon, revisit cadence, and dated user-confirmed revisit summary.

### Permitted consumers

- Tool result and history;
- reminder scheduler for cadence metadata only;
- Coach, only through an explicit preview-and-share action;
- Dream exploration, only after a separate user confirmation.

### Prohibited uses

- No automatic Dream or Journey creation.
- No personality, mental-health, optimism, readiness, or success score.
- No Friend, Ally, Support Circle, Home-social, achievement, XP, or marketing visibility.
- No use of unconfirmed raw prose in notifications or general analytics.
- No conclusion that lack of movement means low commitment.

### Freshness

Every confirmed result is versioned and dated. The newest confirmed version is current; older versions are
history, not current truth. A revisit may confirm that nothing changed without creating a duplicate version.

## 11. Data model direction

Exact schema is an architecture decision. The product requires the equivalent of:

```text
AspirationReflection
- id, ownerId
- title
- focusArea
- imaginationHorizonDate
- currentVersionId
- recurrenceMode, recurrenceInterval, nextRevisitAt, reminderEnabled
- status: active | archived
- createdAt, updatedAt

AspirationVersion
- id, reflectionId
- aspirationStatement
- meaningAnchors[]
- existingSignals
- anticipatedObstacles
- supportResources
- confirmedAt

AspirationRevisit
- id, reflectionId, basedOnVersionId
- progressReflection
- obstaclesReflection
- helpfulFactors
- possibleSupport
- ownershipAnswer
- confirmedSummary
- createdAt
```

Raw imaginative answers and drafts are private Tool content, encrypted at rest and excluded from logs,
analytics, notification payloads, and Coach context by default. AI processing, when introduced, occurs
server-side only after explicit action; raw input is not retained by the analysis service beyond processing.

## 12. UX and visual direction

- Family color: **indigo-to-dawn gradient** for future reflection, distinct from Journey teal, social purple,
  warning amber, and Coins gold.
- The visual motif evolves across the flow: distant horizon → path markers → dawn line → confirmed horizon
  card. It is drawn in code and responds separately to light and dark themes.
- One cognitive action per screen, generous whitespace, and no nested cards.
- Opening Start remains above the fold on the minimum supported device.
- Progress indicates location (`3 of 9`), never score or quality.
- The result card should feel worth returning to but must not resemble a completion certificate.
- Light mode uses a near-white surface with restrained lavender/peach dawn. Dark mode uses deep indigo with a
  muted coral horizon and AA-compliant text; it is authored, not mechanically inverted.
- Fraunces for Latin display text, Frank Ruhl Libre for Hebrew display text, Inter for body and controls.
- Full RTL/LTR support, 44px targets, Dynamic Type, keyboard-safe inputs, screen-reader labels, reduced motion,
  and a complete no-audio path.
- User-facing screens contain one language only.

## 13. Edge cases

- **No answer to some prompts:** allow a partial result if the user can still author an aspiration; never
  fabricate missing meaning, obstacle, or support fields.
- **Focused route produces fewer details:** leave omitted fields empty and explain that the user can deepen the
  reflection later; do not infer them from the aspiration sentence.
- **Several aspirations emerge:** ask the user to choose one for this record and offer to start another record
  afterward.
- **Aspiration conflicts with an existing Dream:** show both and invite clarification; never merge or replace.
- **Aspiration becomes unsafe, illegal, or harmful:** do not operationalize it or create a Journey; apply the
  Coach safety policy and offer a safer reflective reframing where appropriate.
- **Distress during visualization:** allow immediate exit without completion pressure and expose shared support
  resources; do not claim crisis detection.
- **Missed revisit:** keep the aspiration active and reset only after the user chooses a new cadence.
- **Duplicate notification after reinstall/timezone change:** deduplicate by record and due cycle.
- **Offline:** authored POC flow, draft, result, and revisit work offline. Coach discussion waits for connection
  and preserves the local draft.
- **AI unavailable:** preserve manual flow; never block result confirmation.
- **Edit during Coach conversation:** reconcile through one final proposal preview; no partial automatic writes.
- **Deletion:** scoped deletion removes drafts, versions, revisits, and future reminder. Previously shared Coach
  conversation content follows the Coach deletion policy and is clearly disclosed before deletion.
- **Account deletion:** removes the complete Tool record and synced data.

## 14. Analytics and privacy

Allowed structural events: Tool opened, flow started, step reached, draft resumed, result confirmed, cadence
chosen as a coarse bucket, revisit started/completed, and Coach share opened/confirmed. Do not collect response
text, focus labels tied to identity for product analytics, aspiration categories, obstacles, named supporters,
or excerpts.

Crash and diagnostic systems must redact every raw field and generated summary. Analytics success is measured
by completed user-owned results and voluntary revisits, not frequency, streak, or time in Tool.

## 15. Acceptance criteria

- First-use and returning flows work in light/dark and RTL/LTR.
- Start is visible without scrolling on the minimum supported viewport.
- Focused and Deep routes show a title, explanation, and duration before Start, and converge on the same
  user-owned result contract.
- The user can create, save, exit, resume, confirm, revisit, revise, archive, and delete an aspiration.
- A previous confirmed version is never overwritten by an unfinished or rejected revision.
- Cadence is opt-in, produces one invitation per cycle, and can be disabled.
- Missed revisits create no negative copy, score, or repeated notification chase.
- Coach receives no context until the user previews and confirms it.
- Raw imaginative prose is excluded from Coach context, logs, analytics, and notification payloads by default.
- No Dream, Journey, Milestone, Step, or reminder beyond the chosen revisit cadence is created automatically.
- Manual flow remains fully usable when offline or AI is unavailable.
- The Tool remains clearly distinct from My Best Possible Year in card copy, opening explanation, storage,
  return behavior, and influence contract.

## 16. Dependencies and related tasks

- Tools Hub category and recurring-Tool entry behavior.
- Shared Tool drafts, version history, deletion, sync, and export contracts.
- Coach context-envelope and proposal-confirmation contracts.
- Shared notification scheduler and privacy-on-lock-screen behavior.
- Dream exploration and Journey creation flows.
- Future AI synthesis service with no raw-input retention.
- `Best_Possible_Year_PRD.md`, `Passion_Map_PRD.md`, and `Values_Sort_PRD.md` for boundary tests.

## 17. Decisions still requiring founder approval

1. User-facing name: **The Future I Choose** is recommended; Hebrew recommendation: **העתיד שאני בוחר/ת**,
   localized according to the user's form of address.
2. Whether the POC supports several active aspirations or limits the user to one current aspiration.
3. Whether custom cadence permits any interval or uses a safe minimum of 30 days to keep this a reflection
   rather than another habit tracker.
4. Whether an archived aspiration remains in visible history or is hidden behind an archive filter.
