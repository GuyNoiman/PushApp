# CHANGELOG

Status: Living Document

---

# 2026-08-20 (evening) — the silence is fixed, and the cause turned out to be real

Branch `feat/buddy-3d-and-reminders`. `tsc` clean · **jest 1767 / 178 suites**. Continues the
2026-08-20 entry below, which stays accurate; this is the same day's later session.

## The root cause was found, and it was exactly the suspect

The morning's entry named the prime suspect: the partner's device had no Supabase session at all.
It was confirmed here, not guessed. A real anonymous sign-up request sent to the project came back
`422 anonymous_provider_disabled` — anonymous sign-ins were still switched off, after they were
believed to have been turned on. The founder saved the setting again and the identical request
returned `200` with a genuine anonymous session. One switch explains every symptom: the coach that
invented a Journey out of a message, the Delete account that refused, and a Support Circle that
quietly did nothing.

## What was built so the next silence cannot last days

**The app now says when there is no server** (Open Work §1.2, the founder's own instruction).

- `hooks/useServerConnection.ts` is the single answer to "is there a session", and the single retry.
  Home, the Coach and Settings all read it instead of each deriving it from `useAuth`. A build with
  **no backend at all is deliberately NOT disconnected** — it is local, and it works exactly as
  designed; claiming otherwise would put a permanent false alarm in front of every offline user.
- **Home** carries an honest, dismissible line above the coach card, in the app's amber. The
  dismissal is IN MEMORY ONLY: it clears the line for this run and lets it return next launch if
  nothing has changed. Persisting it would hide the problem for good, which is the bug being fixed.
- **The Coach refuses to start an interview it cannot finish.** `CoachOrchestrator.understand()` used
  to swallow every failure and return an empty list, which put "the model answered with nothing
  usable" and "we never reached a model" in the same box. They are not the same: the first still
  takes the process-type fallback, the second now raises `CoachUnavailableError`, the screen says the
  coach cannot reach the server, and the orchestrator is left retryable — so the retry picks up from
  the person's first sentence instead of asking them to type it again. This is the precise line of
  code that turned the partner's question into the title of a Journey.
- **Settings'** existing "Not connected to the server" row now retries when tapped.

**A Step got its frame back** (founder, on a real device): without a border a Step did not read as an
object, and an object you cannot see is an object you do not try to drag — so the swipe report (Done
/ Postpone / Let go), the fastest path through a day, was invisible. This partly reverses the
2026-08-19 lightness pass, which was right about the fill and wrong about the frame. Everything else
that pass bought is untouched.

**`tools` joined `NAMESPACES`**, so the Tools copy is covered by the en/he parity guard like every
other namespace. It had been shipping unchecked since the tab landed.

## Two things learned about the environment, both worth keeping

**A `.local` hostname is not a working dev URL.** `npm run dev` sets the packager hostname from
`scutil --get LocalHostName`, so the manifest told the phone to fetch the bundle from
`h-MacBook-Air-sl-guy-2.local` — an mDNS name iOS often cannot resolve, which is why the saved entry
in Expo Go simply hung. Starting with `REACT_NATIVE_PACKAGER_HOSTNAME=<LAN IP>` fixes it, and the
proof is in the manifest: the `launchAsset.url` must carry the IP.

**An old development build cannot render new native views.** Three screens showed
`Unimplemented component: ViewManagerAdapter_ExpoLinearGradient` — the Coach card, the week's summary
and the Tools hero. The binary on the device predates 2026-08-19 15:21, when `expo-linear-gradient`
and `expo-blur` were installed. **No graceful fallback was built for it, on purpose:** the only
available check (`UIManager.getViewManagerConfig`) is not reliable under the New Architecture, and a
wrong answer would flatten the whole redesign in real builds. The fix is the runtime — Expo Go (which
bundles the module, at no cost) or a fresh development build.

## Rejected, and kept as history

Four directions for the Tools tab were designed and rendered (rooms · one-thing-for-now · a swipeable
deck · a quiet serif index) and the founder rejected all four; he is producing a designed screen
elsewhere and will bring it back. The observation that produced them still stands and outlives them:
the tab shows eight tiles of equal weight and six of them do not exist, and no styling fixes a page
that is three-quarters roadmap. So does the smaller one: every tool needs a sentence saying what it
does to you. "Breathe" means nothing; "two minutes to get out of your own head" is something a person
chooses.

---

# 2026-08-20 — the redesign lands on every tab, and three bugs the partner found

Branch `feat/buddy-3d-and-reminders`. `tsc` clean · **jest 1750 / 175 suites**. Open list:
`04_Product/Open_Work_2026-08-20.md`. Design rules: `04_Product/Design_System.md` §0.

## Three bugs, all found by a second person using the app

**The app greeted every user by the founder's name.** `coachContent.opening` said "Hi Guy, how can I
help you today?" in English and the same with גיא in Hebrew — a development name written into the
copy and shipped. The partner was greeted as somebody else in his own language, typed "why Guy?" into
the coach to ask about it, and the coach did what it is built to do: understood a goal and helped him
build a Journey out of the question. So he reported an app full of a stranger's things, and he was
right. The greeting is nameless now, and a new test
(`src/i18n/__tests__/noPersonalData.test.ts`) sweeps every shipped resource file for development
identities, because a name in copy renders, translates and passes i18n parity — every other test in
this repo is blind to it.

**Hebrew onboarding ran left-to-right.** React Native applies an LTR↔RTL flip only on a fresh launch,
and in a release build `DevSettings.reload` is stubbed out — so the app could not relaunch itself, the
banner asked politely for something nobody does mid-signup, and the whole questionnaire ran mirrored.
`expo-updates` landed the day before for over-the-air updates, and its `reloadAsync()` is exactly the
production relaunch this path was missing. Onboarding now relaunches on the spot when the choice flips
direction — the cheapest moment in the app's life to do it.

**Delete account refused on behalf of an account that did not exist.** He tried to start over and was
told his data had not been deleted. It had not: the remote delete was called with no session, the
server answered 401, and the strict "remote before local" rule left him holding data he had asked to
be rid of. The rule is intact — a real account is still deleted server-side first, and any failure
there still stops everything — but "nobody is signed in" is now treated as nothing to delete rather
than as a failure. **The 401 is also the best evidence we have that his device had no Supabase
session at all**, which would explain the odd Journey too (the coach's documented fallback uses the
raw text when the understanding call cannot reach the proxy). Checking whether anonymous sign-in is
enabled is the top item on the founder's list.

**And a guarantee, because the question he raised deserves a mechanical answer:** the demo seed and
the simulated identity are now gated on `__DEV__` as well as on their env vars, so a shipped build
cannot invent Journeys or show a developer's name whatever any `.env` file says.

## The redesign reached every tab

Journeys, Circle, Inbox, Settings and the new Tools all speak in the display voice now, and each
carries the line its mockup gives it. Journeys shows the next Step on every active card. Inbox
conversations became cards with teal unread dots (an unread message is something waiting, not
something wrong). Circle's INVITE button does something for the first time since it was added in
August — it shares the user's username through the OS share sheet.

**Circle gained an Allies tab.** The founder's answer to what his mockup's third statistic should
have been: not a number, a second list. An Ally is anyone who accepted a place in at least one of the
user's Support Circles and is not saved as a friend, held as ONE global list rather than per-Journey.

**The Inbox left the tab bar** (his option 1, chosen from rendered options) for a mail button with a
count in Home's status strip, and **TOOLS took the slot**: questionnaires and small in-app
experiences, including the nine onboarding questions as something the user can take again. That
retake reuses the onboarding pages rather than re-implementing them, and writes nothing until the
last question — a retake that saved halfway would leave a profile half old and half new.

## Also today

The week-by-day rule was corrected to the founder's own words (a Step travels because it was
`recommended`, not because the week owes sessions). The founder ran the production build himself and
it is in TestFlight as build 3. The object model was drawn out as a map with an explanation of every
term, and the Inbox placement options were rendered before one was chosen.

---

# 2026-08-20 — the redesign, second round: the founder's notes from the running build

Branch `feat/buddy-3d-and-reminders`. `tsc` clean · **jest 1728 / 171 suites**. Everything here came
from him looking at the real app rather than at a mockup, which is why several of it reverses
something the mockups said. Rules recorded in `04_Product/Design_System.md` §0.4b–§0.5.

## What the first pass got wrong, and the rule that replaced it

**Cards stopped being cards.** The lightness pass had taken the fill off the day's Steps, and on the
web build nothing read as a card any more. A card has a surface and an edge again; the lightness now
lives INSIDE it — no boxes around the rows, hairlines instead of borders, one surface per subject.

**"You could also do today" moved into the day's card**, under its Steps. It is an extension of the
day, not a second subject.

**Every Step glyph is calm.** It used to redden with the hour, which after 8pm turned the whole list
into an alarm about nothing — and said badly what the streak badge says precisely. One urgency
signal, in words, in one place.

## Home, matched to the mockups

The greeting has a monogram avatar (a photo would promise a Phase-2 feature that does not exist) and
the tagline. The coach card is an eyebrow, one short line and a real Talk button. The heading is
**Week's plan**, and the bare count beside it is gone — it counted the selected day's open Steps in a
place where nobody could tell what it counted; the day's own heading sits inside the card instead.
The Journeys card carries overall progress, the Milestone rail, the next Step, and Open Journey.

## Circle: Friends and Allies

The founder's answer to what his mockup's third statistic should have been — not a number, a second
list. **An Ally is anyone who accepted a place in at least one of my Support Circles and is not saved
as a friend**, held as ONE global list rather than per-Journey (`listAllAllies` + the pure
`globalAllies` derivation). Only accepted rows count, a person in three circles is one person, and a
pending friend request does not promote anyone. An Ally row offers one action — add as friend — and
does not open a profile, because Friend Profile is a friends-only surface the server authorizes as
such.

**Invite works.** It had sat in that header since 2026-08-07 with an empty handler; it now shares the
user's username through the OS share sheet, in their own form of address.

## The other tabs

Journeys, Circle, Inbox and Settings took the display voice and the line the mockups give each of
them. Journeys shows the next Step on every active card. Inbox conversations became cards with teal
unread dots, and the title says how much is actually waiting — the design built ahead of the
messaging feature, at the founder's request.

---

# 2026-08-19 (night) — the Home redesign, first pass

Branch `feat/buddy-3d-and-reminders`. `tsc` clean · `eslint` clean on everything touched (the 3
pre-existing errors in two old test files are untouched) · **jest 1715 / 169 suites**. Built from the
founder's two mockups, with his own correction applied on top of them: *"it still feels a bit heavy,
I want it to breathe, lighter and less crowded."* Design rules are recorded in
`04_Product/Design_System.md` §0.

**It all ships over the air.** The fingerprint the partner's build carries is unchanged
(`df6c2127…`) — verified after adding the fonts — so every screen below reaches his phone with no
reinstall. `expo-blur` and `expo-linear-gradient` went in BEFORE that build for exactly this reason.

## A display voice, and a different face in each language

The founder's ruling: English is the display that matters most and must not be held back by what
Hebrew supports. So English speaks in **Fraunces** and Hebrew in **Frank Ruhl Libre**, resolved at
render time per language (`constants/displayFont.ts`).

The rule that came with it is a layout rule, not a typographic one: the font SIZE is corrected per
face so neither language looks smaller, and the LINE HEIGHT is not, so a heading occupies the same
box in both and nothing below it moves. Its test asserts exactly that.

## The lightness pass

- **A Step is a line on the page.** No fill, no border, no icon tile — the glyph carries urgency in
  colour alone, and air does the grouping a card used to do.
- **The Journey and the Milestone position left the row.** Under every Step they were the same fact
  three times on one screen; the Journeys card now says them once.
- **The streak badge stopped being on everything.** The calm side is quiet text; the pill is kept for
  the Step that actually binds the week. A badge on every row is a badge that says nothing.
- **The coach card says "primary" once**, with one soft gradient instead of a tint plus a hard edge
  plus a shadow, and its identity moved into a glowing orb drawn in code.

## Three new modules

- **The week as a chapter** — the three numbers the founder specified (Steps done since the week
  began, the streak, and the share of THIS week's Steps that are done), over a dusk drawn in code so
  it re-tones for the light theme, stays sharp at any size, and weighs nothing. Its sentence reports
  the week back and never flatters: "strong" starts only at three quarters, and a week with nothing
  planned is empty rather than a failure. The mood lives in core beside the numbers, where it can be
  tested without rendering a gradient.
- **The Journeys carousel** — one active Journey per card, swiped through, with a Milestone rail read
  from the SHARED `currentMilestone`, so two surfaces cannot report a different Milestone for one
  Journey. Frozen and Future Journeys are absent by construction.
- **The people carousel** — one person at a time instead of a list of rows. The two tones stay
  separate (a quiet friend gets a nudge, one who moved gets a cheer). **Message** is in the design
  because messaging is coming; until it lands it opens the Inbox, because a button that answers a tap
  with silence teaches people to stop tapping.

`TodayFocusCard`, `WeekDreamGroup` and `SupportBoard` are deleted rather than left orphaned; their
tests were carried over to what replaced them, extended for what the new components added.

## Also this session

The week-by-day rule was corrected to the founder's own words — a Step travels to the next day
because it was `recommended` and not yet `required` — so the condition is now `streakRole` itself and
a binding Step that was missed stays on its day. `04_Product/PRD/Week_By_Day_Home_PRD.md` §6 records
his wording and no longer carries an open question.

---

# 2026-08-19 (evening) — the partner's library is in, and Home is a week of seven days

Branch `feat/buddy-3d-and-reminders`. `tsc` clean · `eslint` clean on everything touched ·
**jest 1693 passing / 167 suites** (from 1631 / 161 earlier the same day). Three topics, one commit
each, plus the docs commit that closed the morning's gap.

## The Journey Library can hold a Journey that brings its own Milestone arc

The partner's package arrived as 18 career Journeys in six goal families, three per family — and the
three in a family do NOT share a Milestone arc. Under the founder's own rule that is not three
versions of one Journey, it is three Journeys for one goal, and the library had nowhere to put that.

- **An AUTHORED ARC is content** (`learning/library/authoredArc.ts`): Milestones, Steps, minutes,
  i18n keys, with a validator for the mistakes that would not crash anything — a Milestone no Step
  belongs to, a dependency that runs backwards or crosses a stage. It reaches the Planner as the
  same `PlanStructure` a domain expert returns, so nothing downstream knows which it was.
- **A GOAL FAMILY** (`learning/library/goalFamily.ts`) holds the several Journeys authored for one
  goal, the diagnosis that lands someone there, and the axis they differ along. The axis is on the
  FAMILY because the dimension belongs to the difference between them, not to any one of them.
- **The choosing moved.** Picking a Journey from a family and picking a version of a Journey are the
  same decision at two rungs — answer, then profile, then rating as a tie-break only, then a named
  default. It is now written once (`learning/library/selectable.ts`) and both callers are thin. Two
  copies is how a fix at one level quietly fails to apply at the other.
- The Planner now carries a Step's **description** and its authored **dependency** through. Both are
  content the arcs actually have, and dropping them would have turned a plan that says what counts
  as done into a list of slogans.

## The eighteen Career Journeys, translated rather than copied

Six families, three Journeys each, Hebrew and English, validated by tests that fail if the content is
wrong. What deliberately did NOT come across, and why:

- **The personas and their Dreams.** A Dream belongs to the person living it; a library Journey that
  arrives holding someone else's is the app telling a user what to want.
- **The persona's particulars inside Step titles.** Two families name her actual two options and her
  target role. Those now read "the first option" and "the direction you are testing", because the
  user's own answer belongs in that sentence. A test asserts none of the four persona strings
  survives anywhere in the content.
- **The English words scattered through the Hebrew** (proof, artifact, skill gap, insight,
  follow-up): a user reading their own language should not have to translate half a sentence.
- His Steps were written to a woman, which was right for his persona. Rather than discard that, it
  became the **feminine form**: every Step exists in both, and the new copy path resolves in the
  user's own form of address (D31).

Two corrections fell out of the ingest. `journeyDefinitionsFor` now FILTERS by domain instead of
merely sorting by it — with domain content in the library, a sort would have offered a career arc to
someone working on their relationships. And `matchVariant` refuses to stamp provenance from a process
Journey: the plan still comes from the expert's own arc, so crediting it to a library Journey whose
content was never used would make every verdict that Journey later earned evidence about something
else.

**What is NOT done, and the tests say so out loud:** nothing routes a real conversation to these
Journeys. Choosing a family needs the Career expert to diagnose which of the six a goal is — unclear
target, missing proof, or no access — and the experts do not diagnose, they return one fixed arc.
`04_Product/Partner_Letter_2026-08-19_Library_Ingest.md` is drafted and asks the partner for that
diagnosis, since it is the part only a domain expert can write. It also explains the three-Journeys
decision, which the founder asked to agree with him rather than announce.

## Home is the week, as seven days

Approved in full by the founder and specified in `04_Product/PRD/Week_By_Day_Home_PRD.md`. It
replaces BOTH "Today's focus" and "This week": they told the same week twice in two shapes, and
neither could show an EMPTY day, which is real information about a week.

- **Seven pills**, letters only, no dates, current week only. One mark under each letter — a dot for
  open Steps, a check for a day whose Steps are all done, nothing for an empty day (whose pill dims)
  — and the check sits in the dot's own box, so the strip does not jump when a day completes.
- **Inside a day, a flat list**, so the Dream moved onto the card.
- **"You could also do today"** at the end of every day (not only a finished one): Steps of later
  days that can be pulled forward, dashed, no side edge, each saying which day it belongs to.
- **A missed Step** moves to the next day only if it was merely `recommended` and not yet `required`
  AND that day does not already carry a Step of the same Journey. The founder answered the open
  clause the same evening in his own words — *"it was recommended and not yet required, so if it was
  not done that day it simply moved to the next day"* — so condition (a) is `streakRole` itself and
  not a paraphrase of it: the badge on the card and the movement of the card now say the same thing.
  A **binding** Step that was missed stays on its day, because the streak rule has already reacted to
  it and letting it reappear would hide the one miss the app is honest about. The second condition is
  his own test case: three workouts a week, today already has one, so yesterday's does not jump onto
  today.
- **It moves nothing.** A carried Step is SHOWN on a later day and never rescheduled, so the record
  of what was planned stays true and the adaptive planner remains the only thing that moves a Step.
- Seeing it run corrected two things: the count beside the heading is the SELECTED day's open Steps,
  and the "recommended / needed today" badge appears only on today's list — on Thursday it would be
  saying something untrue about Thursday.

`WeekDreamGroup` is deleted rather than left orphaned; its design reasoning lives on in the UX doc
and in git.

## The build did NOT go out, and it needs the founder

`eas build --platform ios --profile production --auto-submit` was run and stopped at credentials:
**"Distribution Certificate is not validated for non-interactive builds."** Signing needs an
interactive Apple sign-in with his own Apple ID and its 2FA code, which is his to do and nobody
else's. Two side effects of the attempt, both harmless: the remote `buildNumber` moved 1 → 2, and the
`production` update channel and branch were created (they were needed anyway).

---

# 2026-08-19 (later) — the card ships as an image, the completed card gets its own ground, and the build stops being empty

Branch `feat/buddy-3d-and-reminders`. `tsc` clean · **jest 1631 passing / 161 suites** (from 1610 / 159 earlier
the same day). Seven commits, one per topic. This entry continues the 2026-08-19 entry below it, which is
accurate about the morning and simply stops before this work.

**With this batch, everything the partner build needs is IN.** Three of the seven commits are native
(view capture, media library, expo-updates + iPad), and that was the whole reason they were sequenced
here: after the build goes out, only non-native changes can reach the device without a reinstall.

## §1.4 — a completed Step card gets its own ground

Chosen by the founder from rendered options (option D1): a very light teal wash, a turquoise **outline**
in place of the start-edge bar, and a large check watermarked into the background near the far end of the
progress bar, the end the bar is travelling toward.

- The urgency edge is dropped once the card is done, because a finished Step has no urgency left and the
  outline already carries that role all the way round.
- The watermark sits at 8% opacity and is hidden from screen readers: texture, never a second
  announcement of "done".
- `tealWash` is its own theme token in both palettes rather than a reuse of `tealTint` — a settled card
  and a selected chip are different states and must not drift into one fill by accident.
- The card still says "done" in words, so the new ground is never the only signal, and its width is
  unchanged so a list does not shift when a Step completes.

## §1.3 — the completion card shares as the card, and now saves to the photo library

The founder answered the open question with a yes, and it was built in two commits.

- **Share (`react-native-view-shot`, MIT, free).** Share used to send a sentence about the card; the card
  IS the artifact. Capturing the real view means the image cannot drift from the design by construction,
  which re-authoring it as SVG could not have promised. The gateway loads the native module at CALL time,
  exactly like `core/auth/nativeIdentity`, so web, Expo Go and jest are unaffected and a build without the
  module degrades to the old text share instead of failing.
- **Save (`expo-media-library`).** The founder's call: if someone wants the card in their gallery, ask for
  gallery permission. Two deliberate constraints — the permission is requested when **Save is tapped**,
  never at startup, and it is **add-only**: the plugin's default read-access declaration is switched off,
  because the app has no reason to look at anyone's photos and declaring a capability we never use is the
  over-ask a store review is right to question. Verified through `expo config --type introspect`: only the
  add-usage string lands.
- Declining is an answer, not a failure: it resolves `cancelled`, nothing is captured, and the screen says
  nothing. A failed capture, a failed share and an absent share sheet all resolve calmly — a completed
  Journey must not depend on any of them.
- Share and save go through **one** capture path, so what a friend receives and what sits in the library
  cannot differ.
- **Known limit:** the personal caption does not travel with the shared image. That is the share sheet's
  behaviour, not a bug we can fix from here.

## Settings — the week's first day is picked from a list, not by cycling

Tapping the row used to advance Sun → Mon → … one day per tap, a shape that never shows what the choices
are and that made the day just behind the current one six taps away. The row now opens the seven days with
today's choice ticked and announced as selected, and picking closes the sheet. The sheet
(`SettingsOptionSheet`) is generic over its value type, so the form-of-address row can adopt it without a
second component.

## The server side — the proxy records everyone, and account deletion is live

- **`delete-account` is DEPLOYED** and verified answering 401 unauthenticated. It was written on
  2026-08-09 and parked as a store gate; a second real person on the app changes that, because without it
  "Delete account" fails and the client correctly refuses to wipe local data, leaving the user stuck.
- **The per-user ceiling is a `BYTE_CAP_MB` secret**, not a constant. Unset, malformed or non-positive
  falls back to the decided 2 MB — a bad secret must never read as "no limit". The cap is a LIFETIME
  total; nothing resets it.
- **Every request is now recorded in `llm_usage`, exempt callers included.** Skipping the write for
  `UNMETERED_UIDS` conflated "no ceiling" with "invisible": the founder's own uid is the one whose spend
  reaches his card, and an empty table could equally mean "the proxy was never reached" or "this caller is
  exempt" — an ambiguity that cost a debugging round the same day. Only the ceiling is waived now. The
  write is best-effort: failing to store a counter must never fail a request whose answer is already in hand.
- **`llm_usage` exists.** The founder ran the migration in the SQL editor, so the cap is now actually
  enforced rather than absent. (Closes §2.1 of `04_Product/Open_Work_2026-08-19.md`.)

## The build — an environment that was empty, updates over the air, and iPad

- **The EAS `production` and `preview` environments had NO variables at all.** A build from them would
  have installed perfectly and then had no Supabase URL, no coach and no sign-in — it would have read as a
  broken app rather than as missing config. All four public values are now set for both:
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. `production` is also store-signed now, which TestFlight requires.
- **`expo-updates` is in.** From the partner build onward, anything that is not native reaches the device
  without a reinstall. Two deliberate settings: `fallbackToCacheTimeout=0` so an update check never holds
  the splash screen (it applies on the next launch instead), and `runtimeVersion.policy=fingerprint` rather
  than `appVersion` — with appVersion, a build carrying these new native modules and one without would
  share a runtime id, and an update built against the new native code could land on the old build and crash
  it.
- **iPad is declared** (`supportsTablet`). The partner tests on an iPad, and without it the app is an
  iPhone-only binary that iPad runs in a scaled phone window. **Still portrait-only** — worth revisiting.

## Known limits carried forward

- Moving from an anonymous identity to a real one does NOT migrate what the server holds under the
  anonymous uid. The instruction to the partner is therefore to sign in on first launch.
- The shared image travels without the personal caption (share-sheet limitation).
- The app is portrait-only on iPad.

---

# 2026-08-19 — the streak becomes visible, Postpone absorbs Reschedule, and real Apple/Google sign-in

Branch `feat/buddy-3d-and-reminders`. `tsc` clean · `eslint` unchanged (3 pre-existing errors in two test
files, none from this work) · **jest 1610 passing / 159 suites** (from 1589 / 155 at session start).
Works `04_Product/Open_Work_2026-08-19.md` §1.1, §1.2 and §2.2. Each item committed and pushed on its own.

## §1.1 — the streak rule was already right; the app never SHOWED which Steps bind

The rule (D26.4) is unchanged and was not touched: only a Step whose Journey has **no slack left this
week** can break the streak. The defect was that the user could not see the difference — two Steps
rendered identically, one was missed, the streak rose, and nothing on screen explained why. A rule the
user cannot see is a rule the user cannot trust.

- `streakRole()` sits beside `isUrgentMiss` in `core/util/urgency.ts` and NAMES the two sides of the
  existing predicate; `core.streakRole()` is the single facade. A test asserts the label and the rule
  never disagree on any rhythm or any day of the week — the point being that a second definition in the
  UI is exactly how a shown label and an applied rule drift apart.
- `StepStreakBadge` is shared by Today's focus and This week, so a Step's meaning cannot depend on which
  section of Home it happens to sit in. Calm teal for the recommended side, the warm GOLD role for the
  binding one — never `danger`: this is arithmetic about the week, not a verdict on the person.
- **Copy, second pass (founder, same day).** The first pair was `מומלץ` / `מחזיק את השבוע`. He ruled that
  *"מומלץ להיום"* is the more accurate phrasing and that *"מחזיק את השבוע"* is not clear. The shipped pair
  is `מומלץ להיום` / `נדרש להיום` — differing in one word, so the difference is legible at a glance.
  Alternatives for the second label were rendered for him and are still open.

## §1.2 — Postpone and Reschedule are one action

On the device the two rows read as the same thing, because they were: both mean "not now", and whether
you name the new time yourself is a choice made AFTER that decision. The report menu now asks once, and
`RecoveryFlow` — which already offered an automatic time, a specific one, an optional reason and a free
let-go — is the single path.

The removed branch was doing one thing the postpone path was not: running the adaptive week-review behind
Home's "I adjusted your week" card. `RecoveryFlow` now takes `onReviewed` and fires it on a real
postpone, a partial and a let-go, so **merging removed a row without removing a behaviour**. The orphaned
`report.reschedule.*` copy is gone in both languages so nothing invites the row back.

## §2.2 — real Apple and Google sign-in (P4/P5)

Two native dependencies added (`expo-apple-authentication`, `@react-native-google-signin/google-signin`),
both free. **This is a native change and must therefore land before the single build that goes to the
partner.**

- Both providers reduce to the same shape: a signed **identity token** exchanged by
  `supabase.auth.signInWithIdToken`. The uid that comes back is an ordinary `auth.uid()`, so every RLS
  policy behaves exactly as on the anonymous path.
- The native modules live behind `core/auth/nativeIdentity.ts` and are loaded at CALL time. This keeps
  `SupabaseAuthGateway`'s standing rule intact — it still imports no native module — so Expo Go, web and
  jest are untouched, and a build without the modules degrades to an honest `AuthNotAvailableError`
  rather than failing to start.
- A cancel has its own type, never reaches Supabase, and CLEARS the error banner instead of raising one.
- `app/sign-in.tsx` is not a wall: an anonymous session is already a full session, and the screen says
  what signing in is actually for (recovery on a new phone; letting a Support Circle know who is who). A
  provider this build cannot run is hidden, not shown broken — which is also Apple's requirement.
  Buttons follow Apple's and Google's guidelines rather than pulling their native button views into a
  screen that must also render in Expo Go and on web.
- Privacy holds (red-line R1): only the token crosses the boundary, Apple's one-time full name and the
  Google profile are never read, and Settings can say no more than which provider is linked.
- **The Google URL scheme is committed in `app.json`**, not read from env: it is baked into the binary at
  build time, so an env var could not reach it and a missing scheme breaks the redirect silently. The
  value is public by design, exactly like the client id. Verified with `expo config --type introspect` —
  the Apple sign-in entitlement and the URL scheme both land.

## Still open from that list

§1.3 (the shared completion image) is **blocked on one founder decision** — a faithful capture of the
card needs a native view-capture dependency; there is no way to do it with what is installed. §1.4 (a
completed card's background) and the alternative wording for the binding badge were rendered for him and
await his pick. §1.5 (Home's scroll-to-top) still needs a device check only he can do.

---

# 2026-08-18 (later) — a Journey declares its own variant axis, and every variant is a rated entity (D62/D63)

Branch `feat/buddy-3d-and-reminders`. `tsc` clean · `eslint` unchanged (3 pre-existing errors in two test
files, none from this work) · **jest 1589 passing / 155 suites** (from 1550 / 150 at session start; five
new suites, 37 new tests, two existing suites extended). Builds Decision **D62**, which was recorded the
same day as a specification and is marked here as the build that implements it. **D63** was decided while reviewing this build and is
recorded below.

## What was fixed in the architecture, not in a screen

Before this, "which of three approaches suits you" was a table in the matcher's own code. That table
could only ever hold ONE kind of difference, and the founder's ruling is that there is no such thing:
*"nothing is fixed in advance about which parameters may vary between the variants; every Journey defines
for itself what the difference between its versions is … in one case it can be the level of certainty, in
another free time, in another how urgent it is."*

- **A Journey declares its own axes** (`learning/library/journeyDefinition.ts` + `definitions.ts`). Axis
  ids, axis values and profile-field ids are OPEN strings. The engine reads ids and knows what none of
  them mean, which is what makes a new kind of difference **content, not code** — a test proves it by
  selecting on a `certainty` axis that exists only inside the test file.
- **The variant question is asked AFTER the Journey is chosen, and only when it can change the answer**
  (`selectVariant.ts`, `coach/variantQuestions.ts`). An axis the profile already answers is not asked;
  an axis whose surviving versions no longer differ is not asked. The interview appends it after the
  expert's questions and the horizon question, because that is the first moment the Journey is known.
- **No fixed taxonomy of signal types.** The profile reaches the selector as an ORDERED list of ids,
  most telling first, and a Journey decides which of them it reads and what job each one does — either it
  places the user on a declared axis or it ranks the versions. `matchApproach.ts` keeps exactly one
  responsibility now: the ORDER (friction, then help, then working style), which is about the user and
  not about any Journey.
- **Every variant is a rated entity, and its rating also feeds its Journey's** (`variantRatings.ts`).
  One outcome, counted for both objects, so "which Journey ranked well AND which of its versions did"
  stays answerable across Journeys whose axes do not line up. Unattributed Journeys are ignored rather
  than credited to the default; a version below three labels has NO score rather than a zero.
- **Provenance now exists** (`Journey.libraryRef`, stamped through `goalSpecToJourney` → `JourneyEngine`).
  Without it the end-of-Journey verdict built last session could be counted for nothing at all.

## The three matching questions we did not ask (onboarding v2)

Approved alongside D62: **Q7 starting mode** (clarity first vs action first) · **Q8 how much structure
helps** · **Q9 how much challenge is wanted now**. Single-select, no free text (they are ranking signals
and must stay coarse ids), in a new third section, "How do you like to work?". Both languages shipped.
They already change a plan on their own: two users whose friction answers are silent and who answered Q7
differently now get different Journeys, pinned end to end.

`ONBOARDING_VERSION` → 2; a v1 answer set stays valid and simply carries none of them.

## What this deliberately does NOT do

- **No library Journey for a PROCESS goal — missing content, not a missing decision.** This entry first
  called it an open founder call ("do authored arcs replace the expert's arc or shape movement through
  it"); the founder rejected the framing the same day, because his own rule answers it: **a set of
  Milestones IS a Journey**, several Journeys exist per goal, and a variant never changes Milestones. A
  different arc is a different Journey, and an expert's hardcoded arc is simply Journey #1. What is left
  is authoring process Journeys and having the expert select from them.
  `journeyDefinitionsFor('process')` returns nothing today, and a test pins that nothing is substituted.
- **No "two other ways" surface — and after this session that is a DECISION, not a gap (D63).**
  Reviewing the build, the founder ruled that at this stage the user is not asked to choose a plan: the
  app asks the Journey's guiding question and picks the version itself, without showing the
  alternatives. The versions stay separately addressable and rated.
- **No outbound learning.** Every rating computed here is an on-device aggregate over the user's own
  Journeys. The central loop is still Stage 3+ of the library PRD, behind consent that does not exist.

---

# 2026-08-18 (build session) — plan shapes, the library's first slice, the end-of-Journey label, and six device-QA defects closed

Branch `feat/buddy-3d-and-reminders`, six topic commits, **not pushed**. `tsc` clean · `eslint` 0 errors ·
**jest 1544 passing / 150 suites** (from 1502 / 145 at session start). Decisions **D54–D60**.

## The headline: a repeated goal is now the user's own words, repeated

The founder's verdict on the app — *"the plan that was built for me didn't help me at all"* — came from
asking for *drink a protein shake daily* and receiving Steps about walking at a comfortable pace. The
cause was not bad content: his words picked a DOMAIN and were then discarded, and everything after came
from a four-Milestone table written in advance. Asked for his real goals, four of the five he named are
**repeated actions with no stages** (pillowcases fortnightly, reading twice a week, shaving, the shake).

- **`JourneyShape`** (D54): `recurring` gets no Milestone arc — two setup Steps carrying the user's own
  sentence inside an authored frame, then that sentence on every active day. `process` keeps the arc.
- **Slot-filled templates** (D54/D55): templates hold an `{ACTION}` hole, so the frame can be translated
  once per language while the user's words are inserted after and never translated.
- **Three approaches, differing in METHOD** (D56): attach to an existing routine · start smaller than
  feels worth it · prepare the environment. Variants that differ only in intensity teach nothing.
- **Recurring plans are dated by cadence, not by minute budget** — the budget packer would have stacked a
  week of five-minute repetitions onto one afternoon.
- Three existing tests asserted the old habit arc; they were **pinning the defect as though it were the
  spec** and now assert the user's own words.

## The onboarding answers finally reach the plan

`getOnboardingCoachSummary()` existed, built a summary of what helps the user and what gets in their way
— and **was called by nothing**. Two users who answered differently got byte-identical plans. The matcher
now maps a stated obstacle onto the approach designed for it, friction outranking help (what breaks
someone is answered from experience; what helps is answered from preference), and returns the answer that
decided it so the choice can be checked. Only coarse option ids are read — the free-text answers stay on
the device, pinned by a test.

## The end-of-Journey question, at three endings (D57/D58)

The label the library learns from did not exist. It is now asked at **completion, cancellation, and quiet
death** (no report for 21 days) — the survivorship guard: ask only the people who finished and every
label is a success. **Never by push**; the quiet host waits for the user to open the app, asks once, and
a dismissal is recorded as a real answer. `partly` is not scored as a failure, and "we don't know" stays
distinguishable from "no".

## Six defects closed

One shared Step count (the engine, the Journeys card and the completion card disagreed — a Journey could
read 80% while minting a card from another denominator) · the last two double-flipped RTL inputs · a
postponed Step's notification now goes through the shared copy builder, so it carries language, form of
address and style, and stops putting the Step title on the lock screen · **"see past reasons" was built,
translated in both languages, and opened by nothing** — now offered from the reason sheet, and only once
there is history to look at · six orphan components deleted · two suites that read the real clock and
**failed after 21:30**, verified by pinning them to 23:55 where four postpone tests fail outright.

**Reminders** (D59): the wizard offered 08:00 while the engine defaulted to 09:00, and both ignored the
user's Active Hours. The time is now derived from the first scheduled Step — the interview already asks
when the user can do this — then Active Hours, then the old constant only when nothing is known.

## Not built, and named so it is not mistaken for done
The translation cache (D55) · the "two other ways" surface and process-shape variants (D56) · the
per-topic questionnaires the founder approved (abandonment · motivation · prior experience).

---

# 2026-08-18 (repo-steward pass) — D24's development-stage safety gate corrected: expert review before release replaces it (D53)

Docs only; no code. **The requirement does not change — only where a misattribution is corrected.**

D24 (2026-08-06) recorded, inside its "Safety implication" paragraph, that Addiction and Relationships
& Loneliness "must stay flag/dev-only — never reachable by a real user" until a safety floor and a
clinical review existed, calling it "a hard gate, not a soft target." **The founder states he never made
that ruling** — it was written into the Decision Log as though it were his decision and was treated as
approved for weeks, shaping `MVP_Task_List.md`, being cited by D44/D47/D52, and shaping an outbound
letter to an external partner that was about to be sent.

**Founder, 2026-08-18, verbatim in substance:** *"I'm cancelling it. Right now nothing goes out to
customers, and later everything will go through expert approval. So there's no point in these gates at
this stage."* New Decision Log entry **D53** rescinds only the development-stage mechanism and replaces
it with the real control: **expert review before release**, covering every domain, with Addiction and
Relationships & Loneliness held to the same bar the original gate intended. **What is unchanged:**
unreviewed sensitive-domain content still may never reach a real user — nothing about that requirement
moved.

**Updated:** `06_Decisions/Decision_Log.md` (new **D53**; D24 annotated in place, original text
preserved, not rewritten); `04_Product/Partner_Letter_2026-08-18.md` §8 (corrected before sending, since
it stated the old framing as settled founder policy to an outside party); `04_Product/MVP_Task_List.md`;
`04_Product/PRD/Weekly_Review_Contributions_02_PRD.md`; `04_Product/PRD/Plan_Library_and_Learning_PRD.md`;
`04_Product/Domain_Expert_Authoring_Guide.md`; `05_Research/User_Matching_Parameters_Research_2026-08-17.md`
(§11, which had also mis-cited Body Image as gated instead of Relationships & Loneliness — corrected in
passing).

**Also this session:** an audit of every entry in `06_Decisions/Decision_Log.md` for the same failure
mode (an agent's recommendation recorded as a founder ruling). Finding, reported to the founder rather
than acted on: D24 appears to be an isolated case, not a pattern — see the session report for the full
entry-by-entry review.

---

# 2026-08-18 (product-manager pass) — D52 widened: the three-layer architecture is the product, not a feature

Docs only; no code. **Extends the entry below rather than replacing it** — everything there still holds;
this is the same decision at its full size.

**The founder's re-scope.** *"The app must produce an accurate user profile that knows how to address the
user, what motivates them most, **what makes them abandon plans** […] Another layer is the **Journey
library** — for every goal or Dream we will have **several Journeys** […] Another layer is the **matching
layer** — a Journey may be good for one type of person and not another. **This is the essence of the app.
This is its uniqueness.**"* And, about the Journey the app built for him: **"So far the plan that was
built for me didn't help me at all."**

**The PRD is now organised by his three layers.** **Layer 1, the user profile** — the abandonment
faculty already exists and is unused: `ReasonId` (8 closed reasons) mapped to `LeverId` (8 levers),
persisted as structured `ReasonEntry` rows, whose own type comment calls it *"the seed of the 'learn the
user' data"*. Nothing consumes it for planning, so a person whose last six misses were `no_time` and one
whose were `lost_motivation` get the same next Journey. **Layer 2, the Journey Library** — several
Journeys per goal, judged on persistence, **the stage reached before dropping (a drop-off curve, not a
binary)**, completion, and **end-of-Journey feedback, which is the label on the training data**. Without
a human verdict the corpus has outcomes and no ground truth and "which Journey is better" is
unanswerable. **Layer 3, matching** — fitness is *conditional* on user attributes and the conditions are
**discovered from outcomes**, not declared, with four gates (support both sides, effect size,
multiple-comparison correction, holdout confirmation) before one is trusted.

**The survivorship trap, found while specifying the feedback moment.** The completion ceremony only ever
meets people who finished. Asking there alone means every label comes from a success and the library
learns that everything works. **The most valuable feedback comes from the people who quit.** So the
moment needs three hosts — completion, cancellation, and quiet death (the largest group, with no natural
moment) — and `feedbackHost` is in the record so the bias is visible rather than invisible. Structural
consequence flagged: `Done/Completion_Celebration_PRD.md` is immutable, so this needs a
`Completion_Celebration_02_PRD.md` continuation owning all three hosts, not an edit.

**The objective function, worked out properly.** *Fewer notifications that actually move someone to
action* inverts every standard metric. It is a **constrained optimisation, never a weighted sum** — a
weighted sum always has an exchange rate at which more notifications buy more completions, and the loop
will find it. **Maximise "did it help"; subject to that, minimise interruptions; never the reverse.**
Zero interruptions with a helped Journey is the **maximum** score, not a null result. **The loop is
allowed to discover that nagging works and is forbidden from acting on it**: an interruption ceiling the
loop may lower and never raise. Plus a mandatory drift detector — median Step difficulty and weekly
minutes of recommended Journeys; **if that trends down while retention trends up, the matcher is gaming
us**.

**Two corrections forced by the companion research** (`05_Research/User_Matching_Parameters_Research_2026-08-17.md`,
written in parallel and now the authority on *parameters*). The outbound cohort vector was **cut from
nine flat fields to a hard cap of four** — three fixed slots plus one rotating condition slot — because
nine coarse categoricals give ~15,000 cells, at which point individually-harmless fields become a unique
identifier with a description of someone's struggles attached. Conditional discovery survives, because
finding an interaction needs a stable base plus **one** candidate at a time, not every attribute in one
key; the cost is roughly an eightfold slowdown, stated rather than hidden. And k moved from a
judgement-based 25 to an evidence-based **floor of 20, targeting 50**. Also adopted: **no sentinel for an
excluded domain**, since `domain: 'withheld'` in a population where only two domains may withhold *is*
the disclosure.

**Also settled:** demographics, communication style, personality inventories and readiness-stage
classifiers all stay **out of matching**, each for a stated reason. The marketplace is designed against,
not designed — with one genuinely urgent constraint: a template's **licence field must exist before the
partner's content ships to devices** in Stage 1.

**Files:** `04_Product/PRD/Plan_Library_and_Learning_PRD.md` (restructured around the three layers;
§§11–13 privacy work preserved intact and tightened); `06_Decisions/Decision_Log.md` (**D52** second-pass
addendum, appended, nothing rescinded); `04_Product/PRD/README.md` (index entry rewritten).

---

# 2026-08-17 (product-manager pass) — The Plan Library and cross-user learning: the Spotify model, with a stricter allowlist (D52)

Docs only; no code written or changed. The most consequential architectural decision taken so far, and the
first one that puts anything about a user's behaviour on a server.

**Why it exists.** The four `DomainExpert`s emit **hardcoded template arcs**. A user who asked for help
drinking a protein shake daily received Steps about walking, stretching and eating meals at regular times,
because the request routed to `BodyImageExpert` and that expert has one fixed twelve-string menu.
`MILESTONES` is a four-entry `const`; `buildStructure` has three levers (a 0/1/2 baseline, a minutes
figure, a staged boolean) and discards everything else about the person. The partner's own QA rule — *if
you can swap the user's name and the Journey barely changes, it is too generic* — is not merely failed by
our code, it is **identical for every user in a domain, by construction**.

**The founder's decision (2026-08-17, D52), in his words:** the plan library is *"not client data at all,
**it is our data**"*; progress and personal details *"we will not store and will not take off their
device"*; and after the team compared the idea to Spotify's server-side collaborative filtering, *"I am in
favour of working like Spotify."* The design rule that follows from his framing: **outcome and category,
never story.**

**Where we deliberately diverge from Spotify.** Spotify needs a full user × item matrix because taste has
no describable features. A person's fit to a plan **is** describable — baseline, time, cadence,
feasibility, primary obstacle — so cohort-level aggregates suffice and the outbound record needs no user
link at all. Recommendation: **hybrid — learn centrally, match locally.** The device matches using the
rich local signals (free-text goal, "Other" answers, reason log, behaviour log) that must never leave, so
**a user who contributes nothing gets exactly the same product quality**, which is what makes an honest
opt-in affordable rather than coercive. One trap found and specified out: the manifest must be fetched
whole from an unauthenticated URL identical for everyone, because slicing it by domain would leak the
user's domain through request logs.

**The outbound contract**, written as a strict allowlist in the style and with the force of
`ProgressSummary`: twenty fields, all enums, buckets, booleans, our own content ids, and one **per-instance
random pseudonym** — no stable user id, so no longitudinal dossier can accumulate. Demographics (age,
gender, country, language) are barred **even though they would help learning**, because they are the
classic quasi-identifiers. The negative space is written as an explicit prohibition, including the clause
that a hash or embedding of a barred item is the barred item.

**Honest about the risk.** Small categorical vectors are far more identifying than they look (Sweeney:
ZIP + DOB + sex identifies 87% of the US population); the §7.2 vector has ~15,000 cells, so at small N a
"cohort" is a person. Mitigations are load-bearing, not decorative: a server-side k-anonymity gate with
quarantine → generalise → discard, at most one obstacle code, no row-level ingestion timestamp, no client
IP, randomised 3-to-14-day batched upload, and physical separation from the social backend. And
encryption, which the founder rightly asked for, protects transit and a stolen disk but **not** against us,
our provider, or a subpoena — the only real protection for a corpus we operate is that it is minimal and
unlinkable. The **sensitivity asymmetry** is recorded as the reason the allowlist is stricter than
Spotify's, not looser: their worst case is a listening history, ours is what people are trying to change
about their lives, in a product two of whose domains are addiction and loneliness.

**The growth-before-engagement tension, named.** Whatever we score templates on is what the product
becomes; scoring on completion rate teaches the system to recommend the plans that ask for the least.
Time in app, sessions, open rate, retention, Journeys started and conversion are **forbidden as objectives
permanently**, and the loop may downrank a template but never remove one, and never the ambitious end of
the corpus.

**Sequencing.** Nothing outbound ships soon (no content backend, no privacy policy). **Stage 0 is
buildable today with zero privacy change** and is the recommendation: turn the hardcoded arcs into
versioned Plan Templates, ingest the partner's Golden Journeys, and give `buildStructure` a local matcher.
That alone fixes the protein-shake failure. The outbound half is Stage 2, blocked on **security-privacy and
store-compliance sign-off (both required, scoped field by field)** and on four founder questions. **The
library is valuable long before the learning is.**

**Files:** `04_Product/PRD/Plan_Library_and_Learning_PRD.md` (new); `06_Decisions/Decision_Log.md` (**D52**,
surgical insert after D51, preserving the whole file); `04_Product/PRD/README.md` (one index entry).
`Future/User_Learning_PRD.md` is a **different** thing (a within-user, on-device model) and was not edited,
merged, or superseded.

---

# 2026-08-14 (product-manager pass) — A paused Journey is RE-PLANNED on resume, not compensated (D51, fourth pass)

**This corrects the entry immediately below.** A founder correction, same day, supersedes the freeze-credit
design that entry recorded. Docs only; no code changed.

**The correction.** Resuming a paused Journey is **not** compensated by adding the paused days to its end
date. It is a **re-plan of the remainder, anchored at the resume instant**: *"the restart point becomes the
start point for the remaining part of the Journey"*, every unlived Step is recalculated, the Journey's
structure is unchanged, and the end date moves only as a **consequence** of the rebuild.

**Why the old design was wrong, kept because it is the point.** Adding days to the end date leaves every
Step exactly where it was. A Journey paused on a Sunday and resumed a month later on a Thursday keeps its
Steps planned for Sundays — dates now in the past, on a weekday the person did not choose to restart on.
The window would be honest and the plan would be fiction: a plan that no longer fits the life, just with a
later finish. The superseded design is **preserved in place**, marked superseded, in
`Step_Postponement_02_PRD.md` §14 Q5.0.a and in the D51 addendum — including the part of its reasoning that
survives (the consent argument, which is why a rebuild needs no *new* approval for the window moving).

**The mechanism, specified.** Which Steps move — unreported, undropped, dated ones, using
**`deriveStepStatus`** and explicitly **not** `stepHasHistory`, because a merely-postponed Step reads as
"history" to the cancel rule while still being work that is owed (both predicates already exist in
`core/status/`; the finding is that they are not interchangeable). What is preserved — order, spacing,
Milestones, the "why", the Support Circle, reminder rules, dependencies, content, and every id; a rebuild
writes `plannedFor` and nothing else. **Rhythm re-anchoring**, the sharp part: `Step` has **no weekday
field**, and `cadence`/`rhythm` carry pace but not days — weekday meaning lives only in account-level
`SchedulingPrefs.preferredDays`, `ActiveHours` and `ReminderRule.trigger.weekdays`. So a plan's weekday
pattern is an emergent artifact, not stored data (the same gap as PC-25, and why `weekly-planning.tsx` was
archived for hashing a fake weekday). The recommended rule is **shift, then snap**: shift by the paused
interval, then snap onto the account's preferred days using the helpers `Planner.ts` already has
(`firstPreferredOnOrAfter`, `nextPreferred`, `atDaypart`), preserving order with a strict gap. The app must
not claim to preserve weekday *meaning* it never captured. **Reuse:**
`activateJourney(id, at, { rebase: true })` is the **floor, not the operation** — resume is a strict
superset (different guard, a history filter, the snap, and an explicit window move); recommendation is to
extract one shared `rebasePlan(...)` both callers use, keeping the `rescheduleStep` seam and its per-Step
`PlanAdapted` event, adding one Journey-level `JourneyReplanned` event.

**The resume conversation.** An optional, always-skippable "what made you stop, anything I should know"
moment before the rebuild, sited on the **existing** `return.tsx` between the resume tap and the rebuild —
**no new coach flow**; the existing *Talk to the Coach* button stays the route to a conversation. It reuses
the Miss-Recovery reason vocabulary and UI (`core/config/reasons.ts`, the caring never-accusatory prompt,
the `other`-only free-text field, D31 gender-aware copy), offering a subset of the same closed list rather
than inventing reason ids. Free text is **G1 on-device-only, forever** and barred from every sync path. In
this slice the answer is context (it routes an offer, e.g. toward the coach-led Journey-edit flow), not an
input to the arithmetic; letting it actually reshape the rebuild is Future Vision, stated as such.

**Three more questions closed.** **Q9** — the automatic J5 inactivity freeze gets the **same** treatment as
J3, because under the re-plan model the consent moment moves from the freeze to the **resume**, and
`return.tsx` never auto-resumes (each Journey is picked back up by its own tap). One code path, not two.
**Q7** — Allies see a **paused/running status tag and nothing about the window**; the real finding is that
this is **not expressible today**: `ProgressSummary` is a strict four-field whitelist with no status field,
and `SocialProvider.publishAll` *withdraws* a paused Journey entirely, so a paused Journey currently
disappears from an Ally's view rather than reading as paused. Widening it needs a narrowly-projected
`'active' | 'paused'` field (never raw `JourneyStatus`, which would leak `completed`/`abandoned`) and a
security-privacy review. **Q8** — an extension is **not reversible** (*"the Step is the thing that was
postponed and therefore the Journey was extended"*), so the confirmation copy must state finality as a
plain fact, never as a warning.

**Consequences recorded:** `Journey.frozenAt` is still needed — more than before — now as the anchor the
remainder is measured from rather than the input to a credit; the extension ledger keeps **two** causes
(`postponement_extension` and the renamed `resume_replan`), because deriving the end date from Step dates
instead was considered and **rejected** — `deferDependents` already moves `plannedFor` automatically and
would thereby move the end date automatically, violating D51's own invariant; and the Resume control must
stop being a silent toggle (today `journey/[id].tsx` calls `resumeJourney` with no confirmation at all,
which is fine for a status flip and not fine for a rebuild).

**Files changed:** `04_Product/PRD/Step_Postponement_02_PRD.md` (§14 Q5 rewritten as the re-plan model with
the superseded credit design preserved in Q5.0.a; Q7/Q8/Q9 decided in place; Q8b opened; §5 reconciled with
the ledger's second cause; §9's J3/J5 rows, §11's privacy rules, §16's acceptance direction, §17's
categorization, the status header and the §14 intro updated; fourth-pass code grounding listed);
`06_Decisions/Decision_Log.md` (**D51 amended in place** — no new number: the third-pass addendum's point 1
marked superseded with its reason, a fourth-pass addendum added); `04_Product/PRD/PRD_Coverage_Gaps.md`
(PC-26 row + detail section). `04_Product/PRD/Done/` untouched. Four questions remain open and are the
founder's: §14 Q1, Q2, Q3, Q6.

---

# 2026-08-14 (repo-steward pass) — Step Postponement extension PRD: freeze compensation and the last-day question decided (D51 addendum)

> **PARTLY SUPERSEDED, same day — see the entry above.** The freeze-**compensation** half of this entry no
> longer describes the design: a paused Journey's remainder is **re-planned** on resume, not credited with
> the paused days, and the J5 question it left open is now resolved. The last-day answer below still stands.
> This entry is kept unedited as the record of what was decided and then corrected.

Closed two of the eight open questions in `04_Product/PRD/Step_Postponement_02_PRD.md` §14 from a third
founder pass, same day as D51 itself. Docs only; no code changed.

**A manual Pause/Resume freeze (J3) DOES give the time back.** On resume, the Journey's end date moves out
by the whole days it was frozen. This does not contradict D51's invariant ("a Journey's end date only ever
moves because the user said so") — it is the same invariant applied correctly: an extension-after-
postponement adds time *beyond* the approved plan and needs its own consent (the existing §7 sheet); freeze
compensation adds nothing beyond the plan, it only restores the length already approved, and the consent
moment for it is the **Pause tap itself**. Without compensation, pausing would silently shorten the approved
plan — the exact drift the invariant exists to stop. **Scoped to J3 only** — the automatic 21-day account
inactivity freeze (J5) has no equivalent user-initiated consent moment, so whether it also compensates is a
new, deliberately unanswered question (§14 Q9), cross-referenced from §9's lifecycle table and from the
`deferDependents` question (§14 Q6), which the same reasoning now sharpens.

**Freeze-credit mechanics specified** (§14 Q5): the interval measured is `JourneyFrozen` → `JourneyResumed`;
a new `Journey.frozenAt` field is needed (none exists today — `freezeJourney` only flips `status`); the
credit is a new `cause: 'freeze_credit'` entry in the same append-only extension ledger §5 already proposes,
generalized with a `cause` field so there is one auditable history of every reason a Journey's end date has
moved; repeated freeze/resume cycles each add their own entry; an unresumed freeze credits nothing until it
resolves; the credit stacks additively with any prior postponement extension; and the user-facing copy is
proposed but marked as needing the founder's confirmation, same status as the existing §7 copy.

**Nothing needs to happen on a Journey's last day beyond the existing celebration.** The completion ceremony
(I1/D42) stays the only end-of-Journey moment; a pre-end nudge, countdown, and plan-review prompt were each
considered in the PRD and are declined, not merely left unbuilt.

**Files changed:** `04_Product/PRD/Step_Postponement_02_PRD.md` (§14 Q4/Q5 moved from open to decided in
place, preserving the original recommendation and rejected alternatives; new §14 Q9; §9's J3/J5 lifecycle
rows updated to match; §17 categorization updated; status header and §14 intro corrected); `06_Decisions/
Decision_Log.md` (D51 addendum — surgical insert, no new decision number); `04_Product/PRD/
PRD_Coverage_Gaps.md` (PC-26 row + detail section updated to match).

---

# 2026-08-14 — Partner content, second terminology pass: `Meta-Coach` resolved, `intervention` split, ONE Weekly Review (D48–D50)

Second editing pass over `10_Partner_Coaching_Content/` (the external coaching partner's v1.1 package),
under the standing founder rule for that folder: partner files may be edited **for terminology alignment
only**, **PushApp's own code is not changed to accommodate them**, and nothing there is wired into the app.
Docs only; no code changed.

**`Meta-Coach` → the coach / meta-agent (D49) — 111 occurrences across 27 files.** The partner's
"Meta-Coach" is the entity we call **the coach**, internally the **meta-agent** (D30). Each occurrence was
judged in context rather than swapped as a token: **"the coach"** where the sentence is about what the user
experiences (identity lists, "user-facing voice", safety-table wording), **"meta-agent"** where it is
architecture (spec metadata, Dream ownership, Expert consultation, on-call hand-back). All casings the
package used were covered. **Filenames were left unchanged** (`15_Meta_Coach_Master_Spec.md`,
`14_Meta_Coach_Calibration_24_Cases.md`) so the package stays traceable to the zip the partner sent — the
filename/content mismatch is intentional and recorded in the manifest.

**`intervention` split (D48) — 53 occurrences renamed, 45 deliberately not.** Ours stays **proactive** (a
notification/reminder/outreach PushApp initiates); the partner's opposite, **reactive** sense — a coaching
move inside a conversation the user started — became **`comment`**. Sentences were re-read and adjusted so
each still reads naturally (`Prepared intervention` → `Prepared comment`; `Level 1 — Prepared
micro-intervention` → `Level 1 — One prepared comment`). The **45 academic/clinical uses** ("intervention
research", NICE guidance, the Masi / Liu-Huang-Wang / Guest / Alleva / Oprea / CDC citations) were left
untouched — renaming those would misrepresent cited sources. **Four genuinely ambiguous occurrences were
left alone** rather than guessed at, and are listed individually in the manifest.

**ONE Weekly Review (D50).** The partner's per-Journey weekly `STABILIZE / ADAPT / PROGRESS` adherence
review does **not** become a second object — it **nests inside** our existing Weekly Review
(`04_Product/PRD/Done/Weekly_Review_PRD.md`, D40/D43). The founder's framing: the Weekly Review is a
**shared mechanism available to every domain expert and every Journey, into which they can contribute
information for display**. **Flagged as a future implementation item:** that contribution slot **does not
exist in the code today** and was not built; `Weekly_Review_PRD.md` is in `PRD/Done/` and was not edited.

**Terminology doc gap closed.** `meta-agent` existed only in D30 and
`04_Product/Domain_Expert_Authoring_Guide.md` and was **missing from
`09_Product_Philosophy/Product_Terminology.md`** — which is why the partner drifted to their own name.
Added a full **Meta-agent (the coach)** entry (including the domain-expert relationship), sharpened
**Intervention** to proactive-only with `comment` recorded as its counterpart, and retired "AI Coach" from
the terms-still-to-define list (with a note explaining why, following the Milestone precedent).

**Verification:** the manifest's file table was regenerated (sizes + SHA-256, its own row still blank);
the two exact-duplicate pairs still hash identically; the three near-duplicate spec pairs carry identical
terminology; and all 81 edited lines in the bundled sources are present verbatim in the 247 KB
concatenated `10_PushApp_v1.1_COMPLETE_QUALITY_EVALUATION.md`. The partner reply draft
(`04_Product/Partner_Reply_Terminology_2026-08-13.md`) had its two *(to confirm)* counts replaced with the
confirmed figures.

---

# 2026-08-13 (continued, repo-steward pass) — Journey cancellation model decided; partner-content Ally/Dream differences resolved

A second founder pass, same day, closed five of the seven open questions in
`04_Product/PRD/Journey_Abandonment_PRD.md` §12, and settled two model differences the terminology audit
of `10_Partner_Coaching_Content/` had flagged. Docs only; no code changed.

**Journey cancellation (D46):** canceling is **irreversible, no undo window** (the PRD's recommended
short-undo was offered to the founder and explicitly declined); the **Completed tab is renamed "History"**
(Completed + Stopped grouped inside it), approved as recommended; a **Future Journey is deleted, not
cancelled** — it has no history, so it simply disappears, and the Journey-detail action for it is Delete,
never Cancel; the **inactivity-return screen also offers cancelling a Journey**, per-Journey, alongside
Resume; and **"start again" turns out to be the already-shipped Resume affordance for frozen Journeys**
(`JourneyEngine.resumeJourney`) — there is no restart-from-cancelled path, so nothing new needs building
for that part. Still open: how loudly stopping is affirmed / whether the Support Circle gets an
owner-initiated note (§12.4), and whether cancelled Journeys ever appear under their Dream (§12.6). Every
resolution was written in place in the PRD, preserving the original recommendation and — where the
founder overruled it — recording what was rejected and why.

**Partner-content terminology (D47):** an **Ally is only ever someone the user added to a Journey's
Support Circle** — settles the partner addiction content's looser use of "Ally" to also mean a sponsor,
clinician, or family member. Those real-world supporters are not modeled; the coach must speak of them in
plain language and must never route a user to the in-app Ally list as crisis support. Whether real-world
supporters should ever be modeled is left open (per product-guardian's advice, no new term was invented
to answer it today). Separately, the **Dreams screen stays user-visible for now** (helps testing,
explicitly revisitable) — this is our answer to the partner spec's Dream-as-internal-only-abstraction
model.

**Files changed:** `04_Product/PRD/Journey_Abandonment_PRD.md` (§5.7, §5.8, §7.1, §7.2, §8.1, §8.3, §8.4,
§12, §13.2, §14); `06_Decisions/Decision_Log.md` (new **D46**, **D47**);
`09_Product_Philosophy/Product_Terminology.md` (Ally entry sharpened, not duplicated);
`10_Partner_Coaching_Content/PARTNER_FILE_MANIFEST.md` (new "Model differences — resolved" section,
appended).

---

# 2026-08-13 (repo housekeeping) — PRD Done-tracking sweep: 9 PRDs moved to `Done/`, 3 kept in root on close verification, index reconciled

Applied `04_Product/PRD/README.md`'s Done-tracking rule (a PRD moves to `Done/` once its approved/current
scope is implemented and green, keeping a status header naming what shipped vs. deferred) across every
candidate PRD whose status header had gone stale relative to `Current_Context.md`/`MVP_Task_List.md`.
Corrected each header BEFORE moving (`Done/` is immutable); verified every claim against the actual code
and commit history, not just the founder's framing.

**Moved to `Done/` (headers corrected first):** `Completion_Celebration_PRD.md`, `Step_Dependencies_PRD.md`,
`User_Active_Hours_PRD.md`, `Daily_Step_Reporting_PRD.md` (D35/D36), `Step_Postponement_PRD.md` (D37),
`Weekly_Review_PRD.md` (D40/D43), `Journey_Support_Circle_PRD.md` (D2/D40, hardened 2026-08-13),
`Onboarding_Questionnaire_PRD.md` (K2 + K1's notification-permission close), `Journey_Reminder_Management_PRD.md`
(Off/Fixed slice, D40). Each Done header now names its deferred item(s) explicitly (a later phase or a
named dependency — e.g. I1-a/I1-b, Smart mode gated on `Smart_Notification_Timing_PRD.md`, the live-DB
Support Circle QA, real sign-in inside onboarding).

**Kept in the PRD root on close verification (annotated, not moved) — each PRD's approved/current scope
requires something not yet built, not a peripheral deferral:**
- `Dream_Management_PRD.md` — only a read-only surfacing cut shipped 2026-08-13; the Coach-led Dream
  authoring conversation (§5/§7, this PRD's core mechanism) is unbuilt.
- `Account_Inactivity_Freeze_PRD.md` — a local-first POC shipped 2026-08-13, but the PRD specifies
  **server-authoritative** enforcement throughout (§2/§3/§10); the POC is a client-only approximation, not
  the specified model.
- `Communication_Style_Profile_PRD.md` — the quiz/styles/persistence are built (commit 8313fc7), but §9's
  scope-of-application and Acceptance Criterion #4 (style must change Coach phrasing + notification copy)
  are unmet: `profileToCoachStyle()` and `CommunicationScheduler` → `buildNotificationContent` are both
  explicitly not-yet-wired seams. Flagged because this file was pointed to as a likely-Done candidate;
  verification against the code found the opposite.

**Also:** added the two index entries missing per the coverage audit — `Future/User_Learning_PRD.md`
(was absent from the Index) and `Personal_Growth_Style_Assessment_Form.md` (indexed as reference material,
not moved — it already declares itself non-PRD reference input). Removed the 6 now-`Done/` files' entries
from the main Index list (their `Weekly_Review`/`Daily_Step_Reporting`/`Step_Postponement` counterparts were
never in the Index to begin with — added directly under Done). `PRD/README.md` and the 12 touched PRD files
carry the only edits; nothing was staged with `git add -A` — each move used `git mv` and each edit was
surgical to preserve Codex's parallel in-flight changes to the same files.

# 2026-08-13 (continued) — MVP-ready sweep: Step Dependencies, Buddy→Future, K1/H1 closed, coach CTA, Q1 extended (branch `feat/buddy-3d-and-reminders`, COMMITTED, not pushed)

Same-day continuation of the overnight batch below. Each item: built → adversarially reviewed
(code-reviewer + security-privacy where it touched data) → fixed → green. Final state: `tsc` clean,
`eslint` 0 errors, **jest 969/969** (up from 916). Full narrative + resume: `Current_Context.md` →
"⭐ HANDOFF SNAPSHOT — 2026-08-13 (SESSION — MVP-ready sweep)". Commits, newest first: `ff8a046` Q1 ·
`eb1a8d5` copy polish · `fbff0dc` coach dead-CTA · `d77a185` H1 data-realness · `1210206` K1 onboarding
notif step · `cbb187c` docs · `0762422` Step Dependencies · `689a835` setAllies removal + L1 read-only.

- **Step Dependencies** (`04_Product/PRD/Step_Dependencies_PRD.md`) — a new MVP feature: linear,
  single-predecessor + single-dependent Step dependencies, chains ≤3, within-Milestone, coach-authored.
  A waiting-deck UI (approved mockup `04_Product/UX/Step_Dependency_Cards.html`), fail-open (never a
  dead-end), the adaptive engine never auto-drops a dependency Step, a `deferDependents` cascade.
  Reviewed and fixed (fan-out, defer-stranding, honest waiting-deck copy). The coach does not yet
  PROPOSE a dependency mid-conversation — that authoring logic is a tracked follow-up.
- **Buddy / avatar re-staged to Future** — Decision Log **D45**. The coach (meta-agent) is confirmed as
  the MVP's central user-facing entity; the full Buddy vision is preserved (not deleted) and annotated
  across `AI_Product_Principles.md`, `Product_Terminology.md`, and the roadmap docs.
- **`setAllies` removed** — a dead write path that bypassed the Companion coach-Journeys-only gate
  (flagged LOW/latent in the overnight D2 hardening, now retired outright). **L1 parked-goals surface
  made read-only** pending a coach-in-context activation entry point (founder direction).
- **K1 first-run onboarding — CLOSED.** Added the missing notification-permission pre-prompt (after the
  questionnaire, before the Coach hand-off). Onboarding is now complete for MVP.
- **H1 data-realness sweep** — real empty states replace fabricated `sampleSocial` people on
  Home/Circle/Inbox; the fake `SAMPLE_COMPLETED` demo Journey removed; "Nudge" is now a real distinct
  `CheerKind`; the scripted coach's dead "Build this Journey" CTA now routes to the real manual wizard.
- **Copy polish** (content-writer) across this session's new/changed strings — human phrasing, no
  em-dashes, en+he parity.
- **Q1 gender-aware form-of-address (D31) extended** to the Coach screen, Miss-Recovery caring copy,
  Settings/Profile, and the onboarding self-description step (Hebrew `_feminine`/`_masculine`; neutral
  base stays the universal fallback).
- **Non-code:** the partner's v1.0 coaching-content package was evaluated (adopt-with-conditions;
  awaiting the referenced files); the Invite (deferred-deep-link) feature was scoped as feasible but has
  no PRD yet.
- **Repo docs updated:** `04_Product/MVP_Task_List.md` (K1 → Done, H1/D3 → Done, N1 clarified, Q1
  extended, plus a note that the buildable-without-founder-input MVP queue is essentially drained);
  `Current_Context.md` (new top snapshot).

The founder ▶ NEXT decision queue (a P1/coach-authoring design session, the Apple-gated items, and the
spec track) is in `Current_Context.md`.

# 2026-08-13 — Overnight autonomous batch (branch `feat/buddy-3d-and-reminders`, COMMITTED, not pushed)

Autonomous session while the founder slept: the remaining ready tasks were built, each adversarially
reviewed (code-reviewer + security-privacy) and fixed. Green throughout: `tsc` clean, `eslint` 0 errors,
**jest 916/916** (up from 806). Two topic commits — code `a9c0c48`, docs `23dd121`. Full narrative +
resume: `Current_Context.md` → "⭐ HANDOFF SNAPSHOT — 2026-08-13". Highlights:

- **I1 Completion Celebration** (D42) — small-Step variants + reduced-motion guard + Settings toggle; the
  big Journey ceremony (idempotent card, auto-open latch); a swipeable privacy-selectable completion card +
  Share completion; sharing behind a `CardShareGateway` (native image export deferred); a gentle final-Step
  confirmation. In-app Ally thanks (§5) + device-verified image export deferred (tasks I1-a/I1-b).
- **J5 Account Inactivity Freeze** (D44, local-first POC) — a pure `InactivityEngine` reusing the J3 frozen
  path via a new `Journey.freezeReason`; 21-day threshold; a return flow that never auto-resumes.
  Server-authoritative enforcement deferred to the backend.
- **L1 Parked goals** (D44) — coach-detected extra goals persist to a "For later" surface, activatable /
  dismissable; sensitive domains filtered at capture and activation.
- **F1 Dream creation, initial cut** (D44) — My Dreams entry, a read-only "Part of your Dream" card, and a
  link-approval card for unlinked Journeys. The coach Dream-authoring conversation is deferred to a joint
  design session.
- **D2 Ally hardening** (D44) — invite CTA gated on completed/frozen Journeys, offline-vs-empty distinction,
  and the missing UI tests (Support Circle itself shipped earlier under `b3a9ff5`; live-DB QA is a founder action).
- **C1 Weekly Review** (D43) — found already built under D40; closed with 4 coverage tests. Two-layer split
  (strategic weekly proposal vs tactical/immediate) logged; the "applies automatically" wording corrected to
  the ratified apply-on-approval model.
- **Backfill PRDs** (`04_Product/PRD/Backfill/`) — initial PRDs for 5 shipped-but-undocumented features
  (Journey Lifecycle, Streak, Account Deletion/Export, Notification Content, i18n/RTL), each grounded in code
  with open questions/edge cases flagged for review.

Review found + fixed a HIGH inactivity-freeze re-arm bug (freeze fired only once per account lifetime) plus
4 lesser issues, all with regression tests. The founder ▶ NEXT decision queue is in `Current_Context.md`.

# 2026-08-12 — The "Ready" PRD queue, implemented (branch `feat/buddy-3d-and-reminders`, COMMITTED, not pushed)

A large feature-build session: the whole Ready PRD queue was built, each feature adversarially reviewed
(code-reviewer, + security-privacy for data/social) and fixed. Green throughout: `tsc` clean, `eslint` 0
errors, **jest 806/806** (up from 548). Full narrative + resume: `Current_Context.md` → "⭐ HANDOFF SNAPSHOT
— 2026-08-12". Highlights (with lead commits):

- **Daily Step Reporting** (D35/D36) + **Step Postponement** (D37) + **D41 — Journey completion is FINAL**
  (`f198097`): `reverseReport` refuses on a completed Journey, resolving the contradiction with the
  completion-celebration model.
- **Account Active Hours** (`969cd43`, per-day windows, clamp-not-disable) + **Journey Reminder Off/Fixed**
  (`b2d4008`).
- **Weekly Review** (`f64975d`, D40) — week-close proposal, never-empty next week, forward-only atomic apply,
  48h retention; deterministic + `adaptiveEnabled`-gated.
- **Dream Management** (`9a3b213` + `b1dd07b` + `b38a917`, D40) — coach-owned primary + secondary Dreams;
  engine + My Dreams / Dream-detail view screens.
- **Notification content service** (`30ea92f`, D40) — nine Support-Circle types + reminder; tone-ready seam.
- **Support Circle / D2** (`b3a9ff5`, D40) — consent gate + Companion (coach-Journeys-only, system-generated
  Step progress) + removed-friend security fix; ships a Supabase migration the founder must apply.
- **Onboarding questionnaire** (`d67c9a6`, K2) — first-run gate, language-first, Personal Info, six questions.
- **Communication Style profile** (`8313fc7`, D40) — four styles + 6-comparison quiz + notification tone seam;
  also fixed a pre-existing O1/GDPR gap (the profile blob is now exported and erased on account deletion).
- **Docs:** Decision Log **D35–D41**; the PRD queue moved to Ready; `11_Engineering_Bible/Sync_Manifest.md`;
  `04_Product/PRD/Personal_Growth_Style_Assessment_Form.md` (extracted Tally research reference).

▶ NEXT: Completion_Celebration (Ready, not started); apply the Support-Circle Supabase migration; a
close-the-questions pass on the Approved-not-Ready PRDs; and the deferred wiring slices (scheduler→toned copy,
coach-voice, content/ux passes). On-device + live-DB QA wait for the Apple Developer account.

---

# 2026-08-10 — Form of address (D31), one week boundary (D33), unified Own Profile (D34) + the PRD-per-feature working method (branch `feat/buddy-3d-and-reminders`, COMMITTED, not pushed)

Continuation. Unlike prior entries this work is **committed** (topic commits). Green throughout:
`tsc` clean, `eslint` 0 errors, **jest 548/548 across 59 suites**. Full narrative + resume: see
`Current_Context.md` → "⭐ HANDOFF SNAPSHOT — 2026-08-10". Highlights:

- **D31 — gender-aware "form of address" (לשון פנייה)** — an i18next-context mechanism (`i18n/addressForm`
  + a hook), driven by a persisted preference (default neutral); the coach copy inflects. Now folded
  into the unified profile (D34).
- **D33 — ONE authoritative week boundary** (`core/util/week.ts`) — a configurable, country-derived,
  editable week-start day; consolidated the app's three conflicting week notions (Monday-hardcoded
  Missions/Streak, createdAt-relative Journey pager, DST-unsafe fixed-ms) and migrated every consumer.
- **D34 — unified Own Profile** — `state/ProfileProvider.tsx` (one source of truth; folds in
  form-of-address + week-start + country + display name + birth date; replaces the two standalone
  preference providers) + the **My Profile** screen + an all-countries picker; the own-vs-friend privacy
  boundary keeps private fields out of friend payloads.
- **PRD-per-feature working method** — every feature now gets a PRD in `04_Product/PRD/` (read → question
  → surface edge cases from the code → edit → develop); implemented PRDs move to `PRD/Done/`. Decisions
  D29–D34 in the Decision Log. Also this session (earlier, committed the same day): i18n secondary
  screens, D30 coach voice, J3 Freeze/Resume + `Journey.status`, B1 Coins hidden, E2 Settings.

---

# 2026-08-09 (SESSION 2) — Secondary-screen i18n finished, coach meta-agent voice fix (D30), Journey `status` field + Freeze/Resume (J3), Coins hidden (B1) (branch `feat/buddy-3d-and-reminders`, UNCOMMITTED)

Continuation the same day. **Nothing committed** (autonomous execution per the founder). Verified:
`tsc` clean, `eslint` 0 errors, **jest 533/533 across 56 suites** (from 515/55 at the start of this
session). Full narrative + the ordered work plan: `Current_Context.md` → "⭐ HANDOFF SNAPSHOT —
2026-08-09 (SESSION 2 / continuation)". Highlights:

- **i18n screen translation finished for the secondary screens** — new namespaces `circle`, `inbox`,
  `explore`, `buddy`, `shop`, `missions`, `achievements` (en+he, 14 total at parity); reason copy moved
  into the `journey` ns behind framework-free helpers. Engine/config/dev-sample DATA strings stay English
  by design (a later config-i18n / H1 pass).
- **Coach: the meta-agent is now the sole user-facing voice** (`CoachOrchestrator.metaVoiced`, Decision
  Log **D30**) — expert questions are re-voiced from the meta-agent's own `interview.<intent>` template,
  deterministically (no added LLM call). The 4 domain experts need no user-facing translation (internal
  tools).
- **`Journey.status` field** (`active`/`frozen`/`completed`/`abandoned`) — the authoritative tab/lifecycle
  source of truth, with backward-compat derivation; set explicitly by the engine.
- **J3 — Freeze/Resume a Journey (DONE)** — engine methods + `JourneyFrozen`/`JourneyResumed` events +
  AppCore reminder reconcile; the scheduler skips frozen Journeys; Pause/Resume button + "Paused"
  banner/pill in the UI.
- **B1 (partial) — Coins hidden in the initial version** (D29): `TopStatusBar` no longer shows Coins (the
  engine keeps accruing them). The breadth-leveling reframe is still open (needs design).

---

# 2026-08-09 (SESSION 1) — Initial-version (MVP) scope defined + build begins: i18n infra, coach-led Journey editing, account deletion/export, real StreakEngine (branch `feat/buddy-3d-and-reminders`, UNCOMMITTED)

Working session with the founder that (a) defined the concrete initial-version (MVP) scope as a
granular checklist and (b) began building it. Cross-reference: `06_Decisions/Decision_Log.md`
**D29** (the scope decisions) and `04_Product/MVP_Task_List.md` (the full checklist, created this
session — 21 tracked items, IDs A–P). **Nothing in this entry has been committed** — the working
tree is uncommitted; the founder authorized autonomous execution. Verified: `tsc` clean, `eslint` 0
errors, **jest 499/499 passing across 52 suites** (grew from 468 at session start).

> **⏩ SESSION-END ADDENDUM (the session continued past this entry's mid-session state; final
> hand-off = `tsc` clean, `eslint` 0 errors, `jest` 515/515 across 55 suites, STILL UNCOMMITTED):**
> - **J2 — delete/abandon a Journey: DONE** (verified in web preview). `JourneyEngine.deleteJourney`
>   + `AppCore.deleteJourney` (new `JourneyDeleted` event → persist + reminder reconcile) + a
>   destructive "Delete journey" button and confirm Modal on `journey/[id].tsx`.
> - **i18n screen translation advanced from PARTIAL to the CORE surfaces** (Batches A/B/C-UI/C-Lang-1):
>   Settings, Home + all home components (incl. `SwipeableStepRow` RTL), Journeys, `journey/[id]`,
>   `journey/new` wizard, all `journey/*` components, the Coach UI chrome — all translated + RTL-safe.
>   **The coach now converses in Hebrew** for the general path (interviewPlaybook + meta questions +
>   GeneralExpert via a new `coachContent` namespace + a Gemini locale directive; domain/kind enums
>   stay English). 7 namespaces at en/he parity (`parity.test.ts`).
> - **Journey detail Steps → WEEKLY PAGER** (founder design change, verified): "Steps by week" with
>   ‹ › arrows + "Week X of Y" + one week's Steps at a time; grouping via `stepsByWeek` in
>   `journeyView.ts`.
> - **STILL NOT DONE (next session):** i18n for Inbox/Circle/Explore + `reasons.ts` (Batch D failed
>   twice on infra flakiness), Buddy/Shop/Missions/Achievements, the 4 domain experts' Hebrew content,
>   and a device RTL sweep. Then J3/J4/L1/P1.
> - **Infra note:** the background-subagent layer went flaky mid-session (4 failures: stream stalls +
>   "connection closed mid-response") then recovered — transient API/streaming instability on long
>   agent runs, worsened by a very long main-session context. Next session: fresh lean context, small
>   batches.

## Scope
- `04_Product/MVP_Task_List.md` added — the single granular checklist for the post-pivot
  initial-version build, with per-feature status (✅/🟡/⛔/🔒) and priority.
- `06_Decisions/Decision_Log.md` **D29** — confirmed IN the base version: edit a Journey
  (coach-led via a pencil button), delete/abandon a Journey, first-run onboarding +
  notification-permission ask, multi-language i18n with Hebrew + RTL, account deletion/export.
  Resolved: Coins hidden in MVP (kept in the engine, no Shop sink); the manual Journey wizard kept
  as a coach-first fallback; a minimal friend profile page IN; messaging + Channels/Groups deferred
  post-MVP; Journey Freeze/Resume IN; reminder management for existing Journeys IN; a
  deferred-goals ("parked goals") surface IN, minimal.

## Added — i18n infrastructure (task N1, PARTIAL)
- `i18next` + `react-i18next` + `expo-localization` (all free, no cost gate).
- `app/src/state/LanguagePreference.tsx` — persists `pushapp.languagePreference`; defaults to the
  device locale, falls back to English.
- A searchable, alphabetical language picker at `app/src/app/settings/language.tsx`.
- `app/src/i18n/` — `index.ts` (namespaces `common`/`settings`/`home`/`journeys`/`journey`),
  `rtl.ts` helpers, English + Hebrew resource files.
- `RestartPrompt` component for RTL/LTR direction flips (Expo Go has no auto-reload on locale
  change). The Settings screen is fully translated.
- **Not yet done:** `journeys.tsx`, `journey/new.tsx`, most home/journey components, Coach, and the
  secondary tabs are not migrated (English only, no crash). Full RTL layout is code-level only —
  **not device-verified** (web preview cannot exercise `forceRTL`).

## Added — J1: coach-led Journey editing
- A pencil button on the Journey screen opens the coach in edit mode; it proposes a validated
  structured diff; the user approves; `AppCore.updateJourney` applies it immediately, preserving
  Step ids, check-in history, and XP. Gated on `featureFlags.liveCoach`; blocked on completed
  Journeys. New `JourneyUpdated` event.
- New files: `app/src/core/coach/journeyEdit.ts`, `app/src/core/coach/JourneyEditOrchestrator.ts`,
  `app/src/components/coach/useJourneyEditCoach.ts`,
  `app/src/components/coach/CoachEditProposalCard.tsx`, `app/src/components/coach/EditCoachScreen.tsx`.

## Added — O1: account deletion + data export (built, not deployed)
- Settings gained a "Your data" section: **Export** (`expo-sharing`, writes to cache then deletes
  the temp file) and a destructive **Delete** (confirmation sheet; remote-first, refuses when
  offline; post-delete the app returns to a clean first-run via a persisted `firstRunFlag`
  seed-guard so demo data does not re-seed after deletion).
- `AuthGateway.deleteAccount` + the Supabase implementation; `AppCore.exportStateJson` +
  `AppCore.resetToFirstRun`; `app/src/components/settings/DeleteAccountSheet.tsx`;
  `app/src/state/useAccountActions.ts`.
- An Edge Function is **written but not deployed**: `app/supabase/functions/delete-account/index.ts`.
  Deploying it, plus hosting a Google Play public account-deletion URL, remain founder pre-release
  actions.

## Added — B2: real StreakEngine
- Replaces the hard-coded streak placeholder with a real day-count that increments once per new
  check-in day and resets to 0 only on an **URGENT** missed Step (config-driven "no slack" urgency
  logic in `app/src/core/util/urgency.ts` + `app/src/core/config/streak.ts`; engine at
  `app/src/core/engines/StreakEngine.ts`).
- **Known limitation:** the reset depends on the `StepMissed` event, currently only emitted when
  `featureFlags.adaptiveCoach` is on — works correctly on the founder's device, but in general
  production the streak would only increment (never reset) until the miss-producer runs un-gated.
  Logged as an explicit follow-up, not a silent gap.

## Changed — two founder-requested design fixes (verified in web preview)
- The Home top-bar level/XP meter shrunk to ~¼ its former width.
- The "This week" Dream rail now connects node-centres only (no overshoot past the end dots) and
  is hidden entirely when a Dream group has only a single Step.
- Fixed a spurious `RestartPrompt` that incorrectly appeared on the language screen at app boot —
  it now only shows after a deliberate language change.

## Status
- **Not committed.** Working tree only, on branch `feat/buddy-3d-and-reminders`. `tsc` clean,
  `eslint` 0 errors (101 pre-existing style warnings, unrelated), jest 499/499 across 52 suites.

## Next
- See `Current_Context.md` → "⭐ HANDOFF SNAPSHOT — 2026-08-09" → "Still open / next": finish the
  i18n screen-migration in controlled batches, then continue down `04_Product/MVP_Task_List.md`
  (J2 delete/abandon a Journey is already in progress).

---

# 2026-08-06 — Conversational coach built out: understanding-based multi-goal triage, SX realigned to 4 domains, communication-style + frequency-based scheduling infra, design brief + authoring guide (branch `feat/buddy-3d-and-reminders`, unmerged, behind off-by-default flag)

Continues the 2026-08-05 sprint below on the same branch and flag. Test suite grew **177 → 449**
(41 suites), all green; `tsc` clean throughout. Cross-reference: `06_Decisions/Decision_Log.md`
**D23** (the pivot) and the new decision entries this session added (domain realignment, the
framework-not-content philosophy, the UX/design bundle, paid Gemini tier, single-user auth).

## S2 — conversational coach: understanding-based multi-goal triage
- The coach front door is now a **single "understanding" LLM call** that reads the user's free-text
  goal, detects **multiple** distinct goals (each tagged `kind: recurring | process` + `domain`),
  reflects them back to the user in one message, and **focuses one** to interview now while the
  rest are deferred on-device (not dropped).
- The focused goal is **routed to a `DomainExpert`**, whose own interview drives **closed-option
  chip questions (+ an "Other" free-text escape hatch)**, one question at a time, some multi-select,
  followed by a feasibility/reality-check step before a plan is produced.

## SX — realigned to four new domains (replaces the four first-cut experts)
- **Addiction · Relationships & Loneliness · Body Image (nutrition+fitness) · Career** replace the
  earlier first-cut set (`recovery`, `self-confidence`, `nutrition`, `sport`) recorded in the
  2026-08-05 entry below. New files: `app/src/core/learning/experts/AddictionExpert.ts`,
  `RelationshipsExpert.ts`, `BodyImageExpert.ts`, `CareerExpert.ts`, plus a shared `expertKit.ts`
  and a `registry.ts` with human-readable `displayName`s for each domain.
- **Addiction and Relationships & Loneliness are the two most sensitive domains** and are gated:
  they stay flag/dev-only until the safety floor (below) and a clinical review land — not yet
  cleared for a real user.

## Communication-style infrastructure
- `app/src/core/coach/communicationStyles.ts` — four named styles (**Steady · Direct · Gentle ·
  Spark**). Only **Steady** (professional, warm, accepting, non-judgmental, plan-oriented,
  explicitly not a therapist) is populated; the other three are intentional empty stubs for later
  personalization work, not forgotten gaps.

## Frequency-based scheduling + "honor time"
- Domain-expert plans are now expressed as **frequency** ("≈N×/week, flexible days") rather than
  fixed calendar dates, unless the user explicitly names specific days — reflecting that most goals
  (workouts, check-ins, social outreach) don't have a real fixed slot and forcing one creates false
  misses.

## Privacy / persistence (carried forward, already noted 2026-08-05, reconfirmed still in place)
- `EncryptedLocalRepository` and the `deriveOutreachInsight` boundary remain the S0 foundation this
  session builds on; no change to their design this session, but the **outbound-redaction wiring
  (`redactForCloud`) is still an open follow-up**, not yet connected to the live LLM call path.

## Design / product docs added
- **`04_Product/UX/App_and_Screens_Design_Brief.md`** — comprehensive design brief: reuse the
  existing app design (minimal visual change), remove the avatar/Buddy tab and the Shop tab; Home
  priority = weekly tasks (incl. an urgent/"today's-focus" block) → Coach CTA → Friends (3
  need-help + 3 deserve-encouragement) → My Journeys; streak breaks only on an urgent miss; levels
  kept but reward breadth (parallel Journeys) not depth; Dream = coach-suggested / user-approved
  Journey grouping; Journey editing led by the coach + a Freeze/Resume button; Step reporting is
  small and emotional (happy Done / sad Couldn't / Partial / Postpone); the whole coach conversation
  runs on-phone; the people/support layer (Ally, Support Circle, reciprocal friends, Dream
  Communities) is first-class in the brief, not an afterthought. **Not yet final** — the founder is
  getting a second, external-AI design proposal before any screens get wired.
- **`04_Product/Domain_Expert_Authoring_Guide.md`** — a colleague-facing guide for authoring a new
  domain expert's interview + knowledge without needing to read the engine code.
- **`04_Product/Build_Plan_and_Method.md`** and **`04_Product/Miss_Recovery_PRD.md`** also present
  in the working tree from this stretch of work (see `Current_Context.md` for their current role in
  the S0–S7 method).

## Testing infra
- `npm --prefix app run coach` — interactive dev harness; `COACH_SCRIPT=<path> npm run coach` —
  scripted run (see `app/src/core/coach/sample.script.txt`). Runs against **paid** Gemini
  (`gemini-2.5-flash`, founder-approved ~$10/mo cap, key in git-ignored `app/.env.local`).

## S3 auth — in progress
- Single-user Supabase sign-in + UID verification built (`app/src/core/auth/`: `AuthGateway.ts`,
  `SupabaseAuthGateway.ts`, `authUser.ts`, `singleUser.ts`). Not yet activated — needs the founder
  to set a Supabase password for `guynoiman3@gmail.com` and populate three
  `EXPO_PUBLIC_SINGLE_USER_*` env vars.

## Open follow-ups (explicit next tasks, not silent gaps — carried and expanded from 2026-08-05)
- Reconcile the `Phase` → `Milestone` rename across remaining docs/code (still deferred).
- Harden device crypto (authenticated encryption + secure RNG).
- A completed-Journey `atRisk` nit in the behavior model.
- Wire `redactForCloud` on the outbound LLM path before real users reach it.
- **Build the safety floor**: bilingual (Hebrew/English) inbound crisis-detection + escalation,
  disclaimers/consent, hardened `SafetyLayer` + substance-use gating — required before Addiction and
  Relationships & Loneliness can leave flag/dev-only status, alongside a clinical review.

## Status
- Not merged to `main`. 449/449 tests green, `tsc` clean. Founder is getting a second design
  proposal before screens get wired — see `Current_Context.md`'s 2026-08-06 snapshot for the full
  next-steps order.

## Next
- See `Current_Context.md` → "⭐ HANDOFF SNAPSHOT — 2026-08-06" → "Next steps, in order".

---

# 2026-08-05 — AI-adaptive-coach pivot: S0–S2 built and proven, SX in progress (branch `feat/buddy-3d-and-reminders`, unmerged, behind off-by-default flag)

Cross-reference: `06_Decisions/Decision_Log.md` **D23** (the pivot decision this sprint implements)
and `11_Engineering_Bible/Engineering_Decisions.md` **§E5** (the hub-and-loop architecture). Follows
the founder's working method (`04_Product/Build_Plan_and_Method.md`): one status-tracked S0–S7 task
list, sequential, each component built + tested in isolation before integration. **Everything below
ships behind the off-by-default `adaptiveCoach` feature flag
(`app/src/core/config/featureFlags.ts`) — the existing engine (Journey/Reward/Buddy/Shop/Mission/
Reminder/Auth/Social/Entitlement) is untouched when the flag is off.**

## S0 (done) — foundation, docs-only
- Pivot recorded (D23); **Milestone** adopted as the canonical mid-layer term (supersedes the
  working name "Phase" for new work; a full reconciliation pass across remaining docs/code is a
  separate, deliberately deferred task).
- **Hub-and-loop architecture** designed (`Engineering_Decisions.md` §E5) +
  `04_Product/Build_Plan_and_Method.md` written (the S0–S7 + SX task-list method).
- **Encrypted local store** — AES encryption + `expo-secure-store`, with migration and key rotation.
- **Privacy types** + the **`deriveOutreachInsight` boundary** (raw personal disclosures never leave
  the device; only a minimal derived insight — enums/buckets, no free text — may cross it, and only
  to power outreach timing) + guard tests + a `NullInsightGateway`.

## S1 (done, PROVEN) — the adaptive engine
- **Planner** (goal → Journey), a **DomainExpert** seam + `GeneralExpert` (the domain-agnostic
  default expert), **BehaviorModelEngine** (on-device raw behavior log + a slip detector — the first
  producer of `StepMissed`), **AdaptivePlanner** (`replan` + `applyReplan`), a **CoachNarrator** seam.
- A **headless simulation running 4 personas** proves the closed loop (behavior → insight → re-plan
  → nudge → behavior) actually adapts: compress/shrink/shed/at-risk responses, weekend-concentration
  detection, and early-warning behavior.
- Wired into `AppCore` behind `featureFlags.adaptiveCoach`.

## S2 (done, testable) — the conversational coach
- **Gemini client** behind an `LlmClient` seam (`gemini-2.5-flash`; API key in a git-ignored env
  file — no silent spend per CLAUDE.md §3.10).
- Editable **interview playbook** + coach prompts; a **Coach Orchestrator** where the playbook
  controls *what* to ask and the LLM only handles phrasing/parsing, not decision logic.
- A hardened disclosure parser, a **SafetyLayer**, `GoalSpec` → Journey conversion.
- An interactive dev harness (`npm --prefix app run coach`) to test converse → build →
  report/non-report → adapt live.

## SX (in progress) — domain-expert validation track
- Four first-cut `DomainExpert`s (recovery, self-confidence, nutrition, sport) + a registry, built to
  validate the expert-partition seam introduced in S1. Per-domain knowledge bases and a
  safety/clinical review are the next phase before any of these are real. Per D23, SX is explicitly
  **Future Vision** — parallel to, not part of, the sequential S0–S7 spine.

## Test suite
- Grew from 177 → 338 tests, all green; `tsc` clean throughout.

## Open follow-ups logged (explicit next tasks, not silent gaps)
- Wire outbound redaction before real users reach this path.
- Harden device crypto (authenticated encryption + a secure RNG).
- A completed-Journey `atRisk` nit in the behavior model.
- Reconcile the `Phase` → `Milestone` rename across the remaining docs/code that still use "Phase"
  as the mid-layer term (D23 flagged this as deliberately deferred at pivot time).
- A safety/clinical review must gate the sensitive SX domains before they get real knowledge bases.

## Status
- Not merged to `main`. Founder's working method: one status-tracked S0–S7 (+SX) task list,
  currently **~29/51 tasks done**.

## Next
- Continue the SX per-domain knowledge-base + safety-review track, or resume the sequential S0–S7
  spine — founder's call. See `04_Product/Build_Plan_and_Method.md` for the full stage table.

---

# 2026-07-20 — Hopper in Buddy tab + backend-health + dev tooling + competitive research v2 (merged to `main`); strategy thinking captured (WIP)

Branch `feat/buddy-3d-and-reminders`; `main` fast-forwarded to include this work. Six topic commits
plus a merge that also brought the earlier panel-position fix onto `main`.

## Shipped code
- **feat(buddy):** the registry-driven 3D Hopper now renders in the Buddy tab (2D egg replaced there
  only). `BuddyView` gains an additive `transparent` prop so the creature composites over the forest
  scene; the `/buddy3d-spike` route keeps its opaque default. Verified on device (Expo Go); web
  cannot render GLB.
- **fix(social):** `backendHealth.ts` — one cheap `/auth/v1/health` probe at startup; unreachable or
  5xx ⇒ `stopAutoRefresh()` and the social/auth/entitlement pillars degrade quietly (no red
  "Network request failed"). Prompted by a deleted Free-tier Supabase project (DNS NXDOMAIN); 4xx =
  healthy, 5xx (Cloudflare 521 during restore) ≠ healthy.
- **chore(dev):** `npm run dev` binds Metro to the Mac's Bonjour hostname so the Expo Go recent-URL
  survives DHCP IP changes; `tools/supabase_keepalive.sh` + `install_keepalive.sh` + launchd plist =
  weekly $0 keep-alive so the Free-tier project never idles out (installed copy lives under
  `~/Library/Application Support` — macOS TCC blocks launchd under `~/Documents`).
- **docs(research):** `05_Research/PushApp_Competitive_Research_v2_2026-07` (.docx + .pdf) — 15
  competitors, official App-Store screenshots, per-competitor AI-implementation tables, original 8
  comparison tables carried over, "what died and why" chapter, NLP evidence + claim-risk. Hebrew RTL.
- **feat(ui):** resource-bar polish (founder art direction). **assets(buddy):** Hopper v3 package.

## Strategy — WORK IN PROGRESS (not decided)
- `04_Product/Strategy_WIP_2026-07/` (README + 3 standalone HTML visuals for a future deck).
  All **Open Questions**, none logged to Decision_Log yet: Finch as benchmark + the defensible trio;
  "Ignition, not Maintenance" reframe; AI economics/architecture (Haiku + caching, Level-1-first,
  no model training); the miss-recovery closed-list→AI funnel with rule-based reason→lever mapping;
  categories **Option B chosen** (build `categories.ts` + `Journey.categoryId`, not yet done).

---

# 2026-07-14 — Buddy 3D registry + texture fix + 17 species; finite-step Journey model + Reminder
# engine + Communication Scheduler; UI polish pass (branch `feat/buddy-3d-and-reminders`, unmerged)

All work below is on branch **`feat/buddy-3d-and-reminders`** — **not yet merged to `main`**.
Five commits: `943c732`, `ec69977`, `69d8616`, `d9e5866`, `75f0a36`.

## Decisions (Decision_Log D20–D22)
- **D20** — notification-permission ask folded into onboarding (not a separate later prompt).
- **D21** — a notification/communication-management mechanism (the Communication Scheduler) with
  optional, opt-in, location/calendar-based reminder rules; background geofencing explicitly
  deferred; new privacy red-line **R3** (raw location/calendar data stays on-device only, never
  synced) — numbered R3 to avoid colliding with the existing R1/R2 auth-session red-lines already
  defined in `11_Engineering_Bible/Auth_Backend_Proposal.md`.
- **D22** — keep the "Phase" display name (no rename).

## Added — 3D Buddy / creatures (`943c732`, `d9e5866`)
- Adopted the founder's **PUSh Creature SDK v1.0** (`app/assets/buddies/_sdk/`).
- `app/tools/ingest_creature.py` — hybrid ingest pipeline (embedded-GLB **or** external
  `materials.json` package) → small modular per-species packages + a generated registry
  (`app/src/core/buddies/registry.generated.ts`).
- `app/src/components/buddy3d/BuddyView.tsx` — the sole `three`/`expo-gl` import boundary; the
  `/buddy3d-spike` route now flips through species for visual QA.
- **17 species ingested** (~1–2.4MB each), superseding the throwaway `hopper_v1`/`hopper_v2` spike
  assets (kept for provenance).
- **RN texture-render fix:** r3f-native's `TextureLoader` uploads no pixels on RN/expo-gl for
  external (non-embedded) textures; fixed via a pure-JS PNG decode (`upng-js`) →
  `THREE.DataTexture` path. `BuddyView` now applies `map`/`normalMap`/`emissiveMap` this way.
  Ingested the detailed **v3 Hopper** (painted albedo + normal maps + glowing face) through this
  fix — **not yet confirmed on-device** (paint/flipY/tuning pending); geometry still 21.6MB
  (low-poly regen requested; spec at `app/assets/buddies/_sdk/docs/EXPORT_SPEC_v3_detailed.md`).

## Added — Reminders / Journey model (`ec69977`, `75f0a36`)
- **Journey model confirmed:** a Journey holds a FINITE set of Steps, each completed once (→
  per-Step celebration via `StepCheckedIn`), and completes when the LAST Step is done. Recurring
  "weekly copies" via the Weekly-Planning flow (D12) is a later, separately-sequenced task.
- Reminder engine core: `ReminderRule`, `ReminderEngine.scheduleRule`, `NullLocationGateway` /
  `NullCalendarGateway` behind feature flags (dormant seams, per the E4 reserved-seam pattern).
- **Communication Scheduler** (`app/src/core/engines/CommunicationScheduler.ts`): aggregates all
  active-Journey reminders, applies `SchedulingPrefs` (`preferredDays` hard filter; allowed-window
  + morning/evening clamp), enforces the iOS 64-local-notification cap
  (`app/src/core/config/schedulerLimits.ts`), emits `SchedulerCapped` when reminders were dropped
  to stay under it.
- Onboarding reframed as a **MISSION-based flow**: create a Journey / open the Shop / enable
  notifications / personality quiz → XP → egg hatches. The personality quiz targets the reserved
  `ProfileGateway` seam (E4) and **must pass a security-privacy review before storing anything**.

## Changed — UI polish pass (`69d8616`)
- Home: dynamic sheet height bounded (no longer covers the Buddy); compact tab bar; internal list
  scroll; new "My Journeys" area tile (Missions tile moved right) with a done/total count; Step rows
  gained a ⋯ menu + Reschedule modal.
- Resource bar: coin-stack display, GT shield icon, unified level+XP frame.
- Completed Steps stay visible (green, no DONE watermark) + a check-in celebration.
- Buddy tab: inventory flush; name/stage now render below the meter.
- "My Journeys" screen tabbed; Explore gained search + clear; journey-creation wizard now uses
  `KeyboardAvoidingView`; Missions modal background made transparent.

## Status
- Not merged to `main`. This session's UI polish has **not yet been device-verified**, unlike prior
  fidelity passes. The v3 Hopper texture fix has **not yet been confirmed on-device**.

## Next
- Founder approves the UI polish pass on-device; founder reviews the primary-CTA "quests" reference
  and the 4-area-tile redesign-proposal artifact; decide onboarding mandatory-vs-skippable; get a
  low-poly Hopper v3 regen from the founder; then wire the 3D renderer into the real Buddy tab behind
  `featureFlags.buddy3d`.

---

# 2026-07-12 — Module architecture doc + reserved seams for future domains (E4)

An architecture audit confirmed the codebase already follows modular boundaries (framework-free
engines over an event bus, vendor-isolated `*Gateway`s with `Null*` fallbacks, config-before-code,
offline-first Repository, no business logic in UI). This session made those boundaries explicit
and reserved four future-domain seams so a future team can build behind a stable interface.

## Decisions (Engineering_Decisions E4)
- Document the module map so "who owns this, what can it depend on" is answered by a doc.
- Reserve boundary-only seams (interface + `Null*` + off feature flag) for four vision domains —
  no feature logic, no data collection, until each passes a security-privacy (and, if it changes
  data collection, store-compliance) review per CLAUDE.md §5.

## Added
- **`11_Engineering_Bible/Module_Architecture.md`** — the canonical module map: every BUILT domain
  (Journey, Reward, Buddy, Shop, Mission, Reminder, Auth, Social, Entitlement) and every FUTURE
  domain (User-Model/Profiling, Intervention/Communication, Interests, Close-Circle-deeper), each
  with responsibility / team boundary / public interface / events / data ownership / status, plus
  the full event-contract table.
- `app/src/core/profile/` — `ProfileGateway` + `NullProfileGateway` + factory,
  `featureFlags.profile` (off). `UserProfile` type is PII-free by design (derived/aggregate
  traits only).
- `app/src/core/interests/` — `InterestsGateway` + `NullInterestsGateway` + factory,
  `featureFlags.interests` (off). Topics are user-chosen, never inferred.
- Four reserved (declared-but-never-emitted) members on the `DomainEvent` union
  (`core/events/events.ts`): `ProfileUpdated`, `InterestsUpdated`, `InterventionScheduled`,
  `StepMissed`.

## Changed (behavior-preserving tidy-ups, found while drawing the boundaries)
- `ReminderEngine` constructor now takes an **optional** `EventBus` (stored only, nothing
  subscribed) — the future attachment point for an `InterventionEngine`; zero behavior change.
- `JourneyEngine.journeyProgress()` selector added — progress math moved out of `SocialProvider`.
- Shop catalog now accessed via `AppCore.getCosmetics()` / `resolveCosmetic()` — out of Buddy
  components, which previously imported Shop's config directly.
- `EntitlementEngine` now constructed inside `AppCore`, not in `EntitlementProvider`.

## Status
- Landed in commit `746c685`. `tsc` 0, jest 87/87 (incl. 2 new seam tests), eslint clean, no PII,
  no new dependencies, **zero user-visible behavior change**.

## Next
- The three reserved domains (Profiling, Intervention, Interests) stay off until each is
  explicitly scheduled and passes security-privacy (+ store-compliance if it changes data
  collection) review. Close-Circle-deeper remains fully deferred with no seam yet.
- Unrelated open items carried forward unchanged: Buddy art direction, Buddy inventory interior,
  the ~$99/yr Apple Developer Program approval for P3+ native auth, deferred data-model wiring.

---

# 2026-07-10 — Auth foundation: vendor-isolated AuthGateway + AuthProvider + secure-store (E3, D19)

Approved and began building real-account auth (Sign in with Apple + Google), split into a free
architecture phase (built today) and a later paid native phase (awaiting founder go-ahead).

## Decisions (Decision_Log D19, Engineering_Decisions E3)
- **Auth method = Apple + Google sign-in**, passwordless (no email/password, no SMTP).
- **Do NOT collect the user's real name** — identity stays handle + Buddy; email quarantined in
  Supabase's `auth.users`, never in `public.*`.
- **Build the free foundation (P1–P2) first, at $0, zero behavior change.** The ~$99/yr Apple
  Developer Program + native Apple/Google + dev build (P3+) is a separate, later approval.

## Added
- `11_Engineering_Bible/Auth_Backend_Proposal.md` — the full plan (architecture, privacy
  red-lines, store-compliance checklist, cost table, 7-phase rollout), synthesized from
  architect · security-privacy · store-compliance · cost-guardian.
- `app/src/core/auth/` — vendor-isolated `AuthGateway` interface + `AuthUser` (no PII) +
  `NullAuthGateway` + `SupabaseAuthGateway` (reuses the existing Supabase client; Apple/Google
  methods declared but throw `AuthNotAvailableError` until the P3+ native build) + factory +
  pure `toAuthUser` mapper.
- `AuthProvider` (`app/src/state/`) — owns anonymous session bootstrap, composed outside
  `SocialProvider` in `_layout.tsx`. `featureFlags.auth`.

## Changed
- `SocialProvider` no longer self-initiates anonymous sign-in — it now reacts to the auth uid;
  the `cheers` realtime subscribe takes an explicit uid (fixes a bind race found in review).
- **R2 hardening:** Supabase session storage moved from plaintext AsyncStorage to
  `expo-secure-store` on native, with byte-safe UTF-8 chunking and generation-based atomic
  writes (web unchanged — keeps AsyncStorage, no OS keychain equivalent there).

## Status
- Landed in commit `2af2468`. **Zero user-visible change** — the app still boots anonymous.
  `tsc` 0, jest 55/55 (new PII-stripping, byte-boundary, corruption→logged-out, write-rollback
  tests). Code-reviewed; findings fixed.
- P3+ (native dev build, real Apple/Google sign-in, account deletion, privacy policy) is gated
  on founder approval of the ~$99/yr Apple Developer Program — the only unavoidable cost.

## Next
- Founder decides on the Apple Developer Program approval to unblock P3–P7. Independently: the
  design/data-model open items from the prior snapshot (Buddy art direction, inventory interior,
  deferred data-model wiring) remain open and can proceed in parallel.

---

# 2026-07-10 — v14 design-fidelity pass: full mockup screen set gets a first-pass native build

Closed the "fidelity pass" item left open by the earlier 2026-07-10 session (5-tab nav + Journeys
cluster). Ten commits on `main`, `tsc` clean throughout, each screenshot-verified against its mockup.

## Added
- **Weekly planning** screen (`app/weekly-planning.tsx`, mockup screen-18) — the last v14 screen that
  had no route.
- Shared primitives: `ResourceBar` (floating level+XP / GT / coins strip) and `GlossyTile` (3D squircle
  button), used across Home and Buddy.
- `BuddyInventory` (5 category tabs, item grid, Select) as one unified framed sheet.
- `FriendRow` + `FriendActionMenu` components for the Friends fidelity pass.
- eslint + `eslint-config-expo` dev tooling (`app/eslint.config.js`).

## Changed
- **Home** (screen-01) rebuilt: ResourceBar + "Hello" speech bubble + centered Buddy flanked by 4
  GlossyTile area buttons + cream Week's-steps panel; `StepCard` upgraded (icon tile, Journey·Phase
  line, progress bar, states); `journeyGlyph()` shared via `journeyView.ts`.
- **Buddy** (screen-10) rebuilt, then refined per founder feedback: full-bleed edge-to-edge scene with
  the ResourceBar floating over it; inventory unified into one framed sheet (grabber, rounded top,
  hairline + upward shadow).
- **Bottom nav**: 5 icons (Ionicons, per-tab active accents, Inbox unread dot) in `app-tabs.tsx` /
  `app-tabs.web.tsx`; fixed a web-harness bug where the tab strip overlaid the top ~140px of every
  screen. Documented in `Screen_Bible.md`.
- **Shop** (screen-11): structured header, glossy coin pill, Featured/Cosmetics/Coins/Offers sub-tabs,
  glossy item cards with price chips.
- **Friends** (screen-09): Needs-your-cheer + A-Z Your-friends sections, Cheer CTA, 3-dot menu — closes
  the gap `04_Product/UX/Design_Fidelity_Audit.md` §09 had already flagged as fixed.
- **Missions + Login** (screen-16/17): floating modal, gold-underline tabs, Daily/Weekly pill switch,
  three mission states, 7-day login rail.
- **Journey-creation wizard** (screens 05-08): Name/description, duration/rhythm with a fixed tooltip,
  Plan-the-steps, Your-why.

## Status
- The full v14 screen set (18 mockups) now has a first-pass native implementation. `Design_Fidelity_Audit.md`
  (written 2026-07-09, pre-pass) is **partially superseded** — most of its per-screen P0/P1 findings
  describe the earlier flat/gray state and were not re-verified after this pass; treat it as historical
  until it is re-run.
- Still open (founder-owned): **Buddy art direction** (founder rejected the 4 creature concepts, needs a
  new direction) and the **Buddy inventory interior** depth question (tiles/states/labels vs. current
  framing).
- Deferred data-model wiring, documented as placeholders in the shipped screens: Grace Tokens in
  `AppState`, a Consistency screen/route, per-weekday Step scheduling, user profile/name, Social
  gift/message gateway methods, Shop real-money data model, inventory Items/Location/Furniture
  categories.

## Next
- Founder reviews the fidelity pass on-device (fresh QR). Then: resolve Buddy art direction → decide
  the inventory-interior question → wire deferred data-model items as their pillars land → re-run the
  Design-Fidelity Audit to confirm and retire the stale tables.

---

# 2026-07-08 — Phase 6: four local POC pillars built (autonomous run)

The founder asked the team to run autonomously through everything doable without him. Built all
four **local** POC pillars end-to-end — each implemented → adversarially code-reviewed → fixed →
verified → committed on branch `claude/project-continuity-cost-oversight-1ctfso`. Everything stays
**$0** and offline; the one pillar needing a backend (social) is a proposal awaiting approval.

## Pillars (app/, Expo + TS, engine-based)
- **1 · Journey creation** — `journey/new` modal wizard (title · why · duration/rhythm · Steps ·
  Starter Step); in-context local reminders; wired to `JourneyEngine`.
- **2 · Buddy** — Buddy tab (`BuddyScene`), warm reactions + `EvolveReveal`; focus-gated
  `useBuddyMoments` hook (fixed a cross-tab double-celebration). Replaced the deferred Explore tab.
- **3 · Coins + Shop** — `ShopEngine` + `config/shopItems` (6 cosmetics), `shop` modal, equipped
  cosmetic renders on the Buddy; hardened state migration.
- **4 · Missions + Login** — `MissionEngine` (injected clock), `missions` modal, Coins-only single
  reward path (`RewardGranted → BuddyEngine`), pure reads + foreground rollover that auto-claims
  earned-but-unclaimed Coins (non-punishing).

Engines now: Journey · Reward · Buddy · Reminder · Shop · Mission. **jest 35/35, `tsc`=0, web export ok.**

## Awaiting founder (gate)
- `11_Engineering_Bible/Social_Backend_Proposal.md` — the social/Allies pillar needs a backend
  (Supabase free tier, $0); decision-ready, **nothing provisioned** (§3.10). Becomes E2 on approval.

## Next
- Founder tests the 4 pillars in Expo Go (`app/README.md`) and reviews the social proposal.
  Device smoke-tests owed (native tabs, modals, rollover-across-midnight, persistence). Then visual
  polish toward the mockups, and TestFlight when wanted.

---

# 2026-07-08 — Phase 6 begins: Cost Guardian + POC stack + Expo app scaffold

Started engineering. Added a cost-oversight team role, chose the POC stack, and scaffolded the app.

## Team
- New sub-agent **cost-guardian** (`.claude/agents/cost-guardian.md`): warns in Hebrew before any
  action that could incur a real charge or approach a paid quota. Wired into CLAUDE.md §4 (team),
  §5 (triggers), and new constitutional rule §3.10.

## Decisions (Engineering_Decisions E1)
- **E1 — POC stack.** Expo (React Native) + TypeScript, engine-based architecture; offline-first,
  local notifications; cloud backend (Supabase free tier) deferred to the social pillar. Chosen for
  $0 instant iOS testing (Expo Go, no Mac/Apple account), future web reuse, and Bible alignment.
  Alternatives (native Swift, Flutter, PWA) rejected — see `11_Engineering_Bible/Engineering_Decisions.md`.

## Added / Changed
- New: `11_Engineering_Bible/Engineering_Decisions.md` (E-log); the `app/` Expo project — pure-TS
  engines + event bus + config + offline `Repository`/`LocalRepository` + `AppCore`, and an
  action-based **Home** screen (seeded demo Journey; check-in → engines → Buddy reacts). `tsc` clean.
- `CLAUDE.md` §6 (Stack: TBD → Expo/TS engines); `06_Decisions/Decision_Log.md` (E1 pointer);
  `.gitignore` (node_modules/.expo/dist/native/env excluded so deps never bloat history).

## Next
- Founder feedback on Home (test via Expo Go on his machine). Then build POC pillars in order:
  Journey-creation flow → Buddy evolve UI → Coins/Shop → Missions+Login → social/Allies (Supabase
  free tier enters here, behind the abstraction; cost-guardian reviews first).

---

# 2026-07-08 — Product & business strategy locked (POC/MVP, roadmap, revenue, Grace Tokens)

Jointly defined the build & business strategy after design sign-off.

## Decisions (Decision_Log D13–D17)
- **D13/D14 — POC + MVP + roadmap.** POC tests social + Buddy + reward-loop → persistence; lean MVP = POC + Explore/library + onboarding(egg→hatch) + Phases/full types + light-AI encouragement/reminders; rest → Commercial. (`POC_and_MVP_Scope.md`, resolves D4.)
- **D15 — 5-version roadmap + Rich Step Types.** All remaining work ranked V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem · V5 Future/Optional (`Version_Roadmap.md` + `Version_Roadmap.pdf`). New vision idea **Rich Step Types** (Bible §35).
- **D16 — Revenue streams.** Bible §23 rewritten as a 5-stream portfolio (Shop/coins · subscription · creator marketplace · business/branded Journeys · coach tier); mirrored in Pitch_Deck §9 + Investor_Questions §14.
- **D17 — Grace Tokens.** New flexibility mechanic (Bible §36, + §5A.4/§23 cross-refs, Home spec): earned-only/never-buyable · gift-not-wager · opt-out · regenerating floor; GT card added to Home mockup (v14).

## Added / Changed
- New: `04_Product/Version_Roadmap.md`, `04_Product/Version_Roadmap.pdf`.
- Bible: rewrote §23; added §35, §36; cross-refs in §5A.4.
- Pitch: `Pitch_Deck.md` §9, `Investor_Questions.md` §14 updated.
- `POC_and_MVP_Scope.md` fully written; `UX/Home_Screen.md` GT indicator; `Decision_Log.md` D13–D17; `Current_Context.md`.

## Next
- Build the **investor presentation / pitch deck**. Then Phase 6 (Engineering) — still blocked on the Engineering Bible.

---

# 2026-07-08 — Phases 4–5 close-out: mockups signed off, designs folded into specs

The initial screen-design iteration (~13 mockup rounds, 2026-07-07) is founder-approved.
Folded every finalized visual decision from the mockups into the permanent UX specs so
nothing lives only in artifacts (repo = source of truth). Append-only; no content removed.

## Changed (appended a "Finalized visual design (mockup v13)" section)
- `UX/Home_Screen.md` (headerless forest home, floating stats, greeting bubble, swipe-report cards, DONE watermark / yellow-urgent / red-missed, nav shadow, hub-vs-default nav open question)
- `UX/Journeys_Screen.md` (Home-matching cards, bottom New + Achievements buttons, secondary detail title)
- `UX/Buddy_Screen.md` (headerless, centered buddy, unified edge-to-edge inventory + Select, locked-tab tooltip, **Hatch/Evolve reveal**)
- `UX/Achievements_Screen.md` (warm base, medals 3-up, condition + count, detail sheet)
- `UX/Explore_Screen.md` (draggable carousels — For you / Top creators / Brands — flex-shrink note)
- `UX/Friends_Screen.md` (Cheer rename, A–Z list, neutral 3-dot menu)
- `UX/Inbox_Screen.md` (Friends/Allies/Groups tabs, IG rows, no Ally tag, notifications excluded)
- `UX/Missions_Modal.md` + `UX/Consistency_Reward_Modal.md` (unified centered modal; Missions · Login tabs; per-mission reward/claim states)
- `UX/Journey_Creation_Screen.md` (pencil edit, prev/next labels, tooltip, equal buttons, "Your why" reminder-list, Recommended Starter Step)

## Added
- `UX/Shop_Screen.md` (new — featured pack + daily grid, warm palette)
- `UX/Weekly_Planning_Screen.md` (new — Bible §34.7 / D12)

## Status
- Phases 1–5 complete. Next: **Phase 6 (Engineering)** — blocked on the founder's "Engineering Bible". POC/MVP scope (D4) still to define together.

---

# 2026-07-06 — Founder Decisions (post Repository Review)

Recorded five founder decisions and folded them into the repository. Canonical record: `06_Decisions/Decision_Log.md`.

## Decisions
- Initial positioning: young adults building meaningful habits/goals across different areas of life (positioning, not a vertical).
- AI is part of the MVP, but no core flow depends on it.
- "PushApp" is a working name (branding deferred).
- POC/MVP scope to be defined together later — tracked as a placeholder.
- Object model: Dream → Journey → Phase (optional, sequential) → Step. "Phase" is a working name.

## Changed
- `Product_Bible.md`: §3.3 (2-month default, configurable), new §3.4A (Phases), §11.2 (Home = action-based), §15.1 + §27 (AI-in-MVP principle), §24 + §32 (positioning), §26 (removed resolved questions).
- `Product_Terminology.md` + `Information_Architecture.md`: added the Phase layer.
- `Product_Roadmap_and_Scope.md`: resolved the MVP×AI open question.
- `Open_Questions.md`, `Investor_Questions.md`, `Pitch_Deck.md`: positioning updated.

## Added
- `06_Decisions/Decision_Log.md`, `04_Product/POC_and_MVP_Scope.md`, `Repository_Review_2026-07-06.md`.

---

# 2026-07-06 — Phase 2 Repository Cleanup (Product Update Merge)

Merged the 2026-07-05 Repository Update chain (`10_Product_Updates/`, 9 files) into the permanent docs and retired the folder to `08_Archive/`.

## Method

- Ran a decision-by-decision absorption audit: ~85–90% was already merged in a prior batch. Only genuine gaps were added (no duplication).

## Added (gaps folded into permanent docs)

- Product Bible: persistent per-run Journey history (§5A.5); Buddy customization/species taxonomy, retention framing, surfaces list, adaptive personality, positive voice-lines (§21).
- Product Philosophy: "The Product Should Feel Alive"; "Marketplace shows life paths, not products"; "Journey creation should require less effort over time".
- AI Product Principles: Principle 17 — "Increase Autonomy, Never Create Dependency".
- Pitch Deck: founder/emotional story + whirlpool metaphor.
- Investor Questions: new Q&As (Why Buddy, Why Gamification, Why-not-habit-trackers, works-without-AI, first commercial version, first paying customer, pricing philosophy, success metrics).
- New file: `04_Product/Product_Roadmap_and_Scope.md` (the Vision/POC/MVP/Commercial/Future staging framework — previously only a skeleton in governance docs).
- Open Questions: subsystem-categorized questions (Journey Engine, AI, Buddy, Marketplace, Gamification, Social).

## Changed

- Removed the stale "Updates – 2026-07-05" temporary wrapper from `Information_Architecture.md` (content is now the live doc).
- Converted legacy "Quest" → "Journey" in `Pitch_Deck.md` and `Investor_Questions.md`.

## Flagged (needs founder decision)

- MVP vs AI: the update says the MVP "may already include premium AI"; Product Bible §15.1/§27 says AI is optional / not core MVP. Recorded as an open question in `Product_Roadmap_and_Scope.md`, to resolve during POC/MVP scoping.

---

# 2026-07-06 — Phase 2 Repository Cleanup (Product Bible Consolidation)

Consolidated the multiple Product Bible files into a single canonical document.

## Changed

- Promoted the newest, most complete Bible (Journey-era) to canonical `04_Product/Product_Bible.md`.
- Merged the two former Draft documents into `Product_Bible.md` as §33 (Founder Notes & Draft Hypotheses), preserving the not-yet-approved status of that material and converting legacy "Quest" terminology to "Journey".
- Archived the superseded versions to `08_Archive/` (old Quest-era Bible, intermediate "updated" Bible, and both Draft files) with a provenance `README.md`.
- Removed `Product_Bible_Draft.md` from the reading order in `README.md` and `AI_Context.md` (its content now lives in the Bible).

## Notes

- Nothing was deleted; all superseded content is preserved in `08_Archive/`.
- Supersedes the 2026-07-03 note that "Product_Bible_Draft.md contains evolving thinking" — that staging role now belongs to `Open_Questions.md`.

---

# 2026-07-03 — Batch 1 Foundation Update

Updated the repository after Founder Interview #1 and subsequent product positioning discussion.

## Added

- Expanded Vision with identity, intentional living, support, and real-life success framing.
- Expanded Core Beliefs with identity, help-seeking, human support, and intervention concepts.
- Expanded Product Principles with Intervention over Notifications and Competition as motivation mode.
- Expanded Open Questions with beachhead market, Competition Mode, Intervention Engine, private support, and repository structure questions.
- Expanded Product Bible with sections on Intervention Engine, Competition Mode, and positioning insight.
- Rebuilt Product Bible Draft as a working space for evolving ideas.
- Filled AI Context with a compact orientation for future AI tools.

## Key Decisions

- Repository remains AI-first.
- Prefer fewer, larger documents over many small documents.
- Product_Bible.md contains approved or high-confidence product knowledge.
- Product_Bible_Draft.md contains evolving thinking.
- Competition Mode is not yet approved as core product; it remains a motivation-mode hypothesis.
- Intervention Engine is a strategic direction requiring validation.

## Still Open

- First beachhead market.
- MVP scope.
- Whether Competition belongs in early product.
- How to measure intervention effectiveness.
- How to clearly outperform existing workflows like Calendar + WhatsApp + Notes.
