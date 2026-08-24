# Decision Log

Status: Living Document — canonical record of founder-level product decisions.

Each entry records the decision, its framing, and where it is reflected in the repository. Newest first.

> **Engineering decisions** (technology/architecture) are logged in
> `11_Engineering_Bible/Engineering_Decisions.md` with an **E** prefix. Product decisions
> stay here with a **D** prefix.

---

## 2026-08-24 (late) — the confidential synthesis, and how much the coach may remember

### D76 — The coach's memory ships on-device only, and the consent screen says so
**Decision (AI product team, inside the founder's approved PRD and his 2026-08-24 instruction to
"build the initial version with its consent screen"):** Coach Context Summaries ship storing their
bounded summaries **on the device that made them** — excluded from the account backup as well as from
every social path — and the consent text tells the user the consequence in plain words: a new phone
starts the coach fresh.

**The question it answers:** the PRD's §9 requires end-to-end encryption for synchronised summaries
and says in as many words that the key-management design must pass a security review *before*
implementation. Meanwhile D73 had just put the account's state on the server under access control
rather than under encryption we could not read. Putting the coach's memory in that same row would
have been the easy thing and would have quietly downgraded a promise the PRD makes explicitly.

**What was chosen instead:** ship the whole feature except the sync. Consent, the bounded summaries,
the write on approval, the deletion cascade, the withdrawal-deletes-everything rule, and the read path
into the coach are all live; only travel is withheld, and `redactForBackup` enforces it with a test.

**Alternatives considered:** (a) put the summaries in the backup row like everything else — rejected,
it contradicts a written PRD requirement and would have been discovered by the security review rather
than decided by anyone; (b) hold the whole feature until the crypto design exists — rejected, the
coach re-asking the same questions is a real daily cost and none of the other parts depend on sync;
(c) sync it encrypted with a key derived on device now — rejected, that IS the design the PRD wants
reviewed, and inventing it in passing is how key management goes wrong.

**What this costs, stated:** somebody who changes phones loses what the coach remembered. The consent
screen says so before they answer, which is the difference between a limitation and a broken promise.

**Where it lives:** `app/src/core/coach/context/`, `app/src/core/backup/redactForBackup.ts`,
`app/src/app/onboarding.tsx` (the consent page), `app/src/app/settings/coach-memory.tsx`, and the
privacy contract's Group A + its new "what a user is actually agreeing to" section. The line to delete
on the day the crypto lands is marked in `redactForBackup`.

### E8 — Mirror's confidential synthesis runs server-side, and the device never holds the answers
**Decision (engineering, within the approved Mirror Feedback PRD §11):** the confidential synthesis is
produced by a Supabase Edge Function holding the service role
(`app/supabase/functions/mirror-synthesis`). The client may only ASK, by round id, and then read the
`mirror_synthesis` table its own policies allow.

**Why it cannot be on the phone:** producing the summary means reading the contributors' raw words. A
device that computed it would hold those words — in memory, in a network response, and in whatever a
crash reporter picked up — on the phone belonging to the one person the round promised would never
see them. `0005_mirror_feedback.sql` already says the same thing in policy: no rule lets a requester
select raw responses from a confidential round.

**What the server decides, not the client:** that the round is over (a result that appeared as answers
arrived would tell the requester WHEN each person answered, and against a list they wrote themselves,
timing is an identity); that every question cleared the five-answer threshold; what the model is told;
and whether the answer leaked a source word. A question that produced nothing is RECORDED as such —
otherwise the round is produced, and paid for, again on the next open.

**The duplication, deliberately:** Deno cannot import the app's modules, and taking the prompt or the
question text from the client would let the person a round is about write the instructions that
summarise other people's answers about them. So the prompt, the question bank and the thresholds are
copied into the function, and `edgeFunctionParity.test.ts` fails when the copies drift.

**Alternatives considered:** running it on the device behind a "we promise not to look" (rejected — the
whole tool is the opposite of that); a second model call to review the first for leaks (rejected: it
doubles the cost and asks a model to catch a model, while a set intersection against the source words
is free, deterministic, and runs on the side of the wall that holds the sources).

**What was deleted:** `core/tools/mirror/runSynthesis.ts`, the device-side runner written before the
transport existed. It never had a caller; its reasoning moved into the Edge Function's header.

## 2026-08-24 — A lost phone stops meaning starting over

### D73 — The account holds the state, the way the large apps do
**Decision (founder, 2026-08-24):**

> אני רוצה שיעבוד כמו באפליקציות גדולות אחרות, כמו אינסטגרם

**The question it answers:** everything a person built — Dreams, Journeys, history, Buddy — lived
encrypted on ONE device and nowhere else. A lost phone meant starting over, which he called
unreasonable, and he was right: no product that asks somebody to invest a year of their life may
also stake that year on one piece of glass.

**What was chosen:** the Instagram model. The account's state is stored on the server and restored by
signing in. No recovery passphrase, no key for the user to lose, no ceremony.

**The cost, stated rather than buried:** the service CAN read that row. Our protection is access
control (row-level security: your own row, no exceptions), transport encryption, and the promise not
to read, mine or sell — which is what the large apps promise. It is a weaker guarantee than "we
could not read it if we wanted to", and §0 of the privacy contract now says so in the user's own
words instead of the old sentence about everything staying on the phone.

**Alternatives considered:** a user-held recovery passphrase (true zero-knowledge, rejected because a
forgotten passphrase means the data is gone for good and there is nobody who can help); a key escrowed
in the OS keychain and carried by the platform's own backup (rejected: it restores an iPhone from an
iPhone and strands anybody moving between platforms).

**What did NOT move, deliberately:** direct messages stay end-to-end encrypted — they are another
person's words as well as this person's — and the Tools' raw answers stay on the device under the
Tool Addition Protocol's standing rule.

**What it is NOT:** multi-device sync. Newer write wins, ties go to the device in front of the person,
and simultaneous edits on two devices are a case it does not resolve. Written as a backup, described
as a backup.

**Where it lives:** `supabase/migrations/0004_account_state_backup.sql`, `core/backup/`,
`state/StateBackupProvider.tsx`.

### D75 — The raw wording stays on the device; our reading of it goes up
**Decision (founder, 2026-08-24), correcting D73 before it shipped to anybody:**

> את המידע הגולמי של ה"למה" אנחנו לא שומרים בשרת — אנחנו נשמור את הניתוח שלנו למה שהמשתמש אמר
> בשרת אבל את הניסוח הגולמי נשאיר במכשיר… ככה לא נעביר מידע רגיש ולא נאבד מידע כאשר נתחיל ממכשיר חדש

**Why it is a better rule than either extreme:** backing everything up would put the most personal
sentences in the product on a server we can read; backing nothing up would lose a life's work with a
phone. The split gives both — the picture survives, the words do not travel.

**It maps onto the domain exactly, which is why it is cheap:** this app already stores a closed
`reasonId` beside every free-text `note`. The classification IS the reading. So the backup carries
`reasonId`, dates, statuses, Steps, Dreams, Buddy and streak, and strips `Journey.why`,
`reasonLog[].note`, `Journey.feedback.note` and the whole `behaviorLog`.

**The cost, recorded rather than discovered later:** `why` has no derived counterpart today, so a
restored device shows a Journey without the sentence behind it until one exists. Building that
reading is a later task and a good one.

**Where it lives:** `core/backup/redactForBackup.ts`, enforced by a test that asserts field by field
and would fail on a new free-text field added later.

### D74 — Smart notification timing is on
**Decision (founder, 2026-08-24):** approved. The timing model, the tap listener and the ids-only
attribution payload are live for everybody rather than behind an env flag. A test asserts the payload
carries ids and never a word the user wrote.

## 2026-08-23/24 — Eight rooms, the promise made once, and messages nobody but two people can read

> Founder decisions taken while the seven new tools, the Notification Center and the Inbox were
> built. Engineering detail: `00_Foundation/CHANGELOG.md`; the privacy consequences are folded into
> `04_Product/Privacy_Contract_With_The_User.md`.

### D70 — The Tools tab has eight rooms, and colour belongs to the room
**Decision (founder, 2026-08-23):** the five rooms become eight — להכיר את עצמי · לבחור כיוון ·
לעבור לפעולה · תיעוד והתבוננות · עזרה ברגע הזה · שינוי דפוסים ודחפים · קשרים ותמיכה · גוף ואנרגיה —
and each carries its own colour, which the first screen of every tool inside it wears.

**Alternatives considered:** keeping the five rooms and mapping the new tools onto them (rejected: the
names were ours, the rooms are his product); hiding the two rooms that hold nothing yet (rejected by
him — a room a person can see is a promise about where this is going, so they show "coming soon").

**Tradeoff accepted:** eight rooms needed eight hues and the palette had seven, so one new accent
token was added (`clay`, #A4523E, chosen from rendered swatches and then pushed redder). A new colour
in a mature palette is a real cost; the alternative was two rooms a person could not tell apart.

**Where it lives:** `app/src/core/tools/catalog.ts`, `app/src/core/tools/rooms.ts`.

### D71 — We do not narrate what is sent, and we do not ask again
**Decision (founder, 2026-08-23):**

> אנחנו לא מדברים אף פעם עם המשתמש על מה נשלח ומבקשים אישור — אנחנו מבטיחים שלא נמסור מידע גולמי
> שהוא כתב ולא מידע רגיש, ופה זה נגמר.

**What this settles:** the per-action disclosure that had been added above the coach-refinement button
is removed. The promise is made ONCE, at sign-up, and it is a promise about substance: raw text a
person wrote is not handed on, and neither is sensitive content.

**Tradeoff accepted, stated plainly:** keeping the promise becomes entirely an engineering
responsibility, because the user is no longer asked to re-approve it at the moment of use. That is why
the outbound requests are the narrowest possible and why tests assert what they may NOT contain — see
`core/tools/obstacleToAction/refine.ts` and its test.

### D72 — Requests and cheers leave the Inbox for the bell
**Decision (founder, 2026-08-23, and both approved PRDs):** the Inbox holds human conversation only.
Cheers, nudges, friend requests and Support-Circle invitations move to the Notification Center.

**Why it matters more than it sounds:** the two surfaces had been sharing one count. A badge that can
be satisfied from two different screens teaches people that badges mean nothing.

**Consequence:** the mail badge counts unread conversations and open message requests, and shows zero
until there are conversations. The bell counts what other people did. Neither ever counts the same
object.

### E7 — Direct messages are end-to-end encrypted, on one device, honestly
**Decision (engineering, within the founder's approved Inbox PRD §14, 2026-08-24):** message bodies
are sealed on the device with X25519 + XSalsa20-Poly1305 (`tweetnacl`). Each device holds a keypair
in the OS secure store and publishes only its public half; every message is sealed twice, to the
recipient and to the sender, so the server stores two sealed boxes and no key.

**Alternatives considered:** shipping messaging unencrypted and adding encryption later (rejected: the
PRD's §14.1 is a promise to a user, and a promise added later is a lie told in between); a full
multi-device protocol with key distribution and ratcheting (deferred: it is a security build in its
own right, and the PRD delegates the protocol choice to architecture).

**Limits, recorded so nobody has to discover them:** one device per account — a second device cannot
read old messages, which is exactly what §14.2 anticipates; no forward secrecy; no key verification
between people. Each of these is written in `core/messaging/crypto.ts` where the code is.

**Where it lives:** `core/messaging/crypto.ts`, `supabase/migrations/0003_direct_messaging.sql` — a
schema with no column anywhere that could hold a plaintext body.

## 2026-08-20 — The partner's package, in English, at a rhythm the coach decides

> Founder decisions taken while reviewing the partner's Career Expert candidate v1.1
> (`07_Assets/Partner_Packages/Career_v1.1_2026-08-20/`). Engineering detail:
> `00_Foundation/CHANGELOG.md`.

### D69 — The confidential synthesis runs on the paid Gemini, behind a swappable factory
**Decision (founder, 2026-08-21):**

> We can connect now to the Gemini I paid for, and in the future when we replace it, this tool's
> agent will be replaced with it.

**What this settles**, and it is the last of the two provider questions from the PRD's §18: the
confidential synthesis may run, because a PAID tier's terms say the content is not used for training.
The free tier's do not, and that was the actual blocker — for the coach it is a risk we can live with
(a person's own words, given to a coach they chose to talk to), but for Mirror Feedback it is not:
those are a contributor's words, given under a promise of confidentiality, and we cannot promise
somebody something our own terms contradict.

**The swap is one file.** `makeSynthesisLlm` is the whole provider surface, so replacing the model
later is an edit there and nothing above it changes.

**MIRROR GETS ITS OWN CLIENT, and the reason is not tidiness.** The coach's stack REDACTS on the way
out, because it is minimising a person's own words. This one must not: the model's entire job here is
the de-identification, and handing it pre-mangled text would destroy exactly the detail it has to
generalise and leave it summarising something nobody wrote. The safety sits where it belongs
instead — the paid terms, the prompt's prohibitions, and the free local check on the way back.

**What it costs, stated because this is the first thing in the app that spends per use:** one round
is five questions and their answers plus the instructions once — on the order of 3–4k tokens in and
500 out, a fraction of a cent on Flash-class pricing. And it is per ROUND, not per conversation: a
person does this a few times a year. It is metered like everything else, so the figure is never a
guess.

**Region is still open**, and is smaller than it looks: it matters for a European user under GDPR and
not before. Pinning it means going through Vertex AI rather than the plain API, which is a change to
the same one file.

**Reflected in:** `app/src/core/tools/mirror/runSynthesis.ts`, `.../synthesisPrompt.ts`,
`11_Engineering_Bible/Engineering_Decisions.md` (E6 sits beside this one).

### D68 — The nudge on day three, the extension for a late invitee, and a week of raw retention
**Decision (founder, 2026-08-21),** completing D67:

> Hold the data for a week. Also, after three days, if not enough have answered, send the user a
> notification that not enough friends answered and that it is worth adding more recipients. If he
> adds them, the answering window grows for all recipients, until they all have at least five days.

**Three rules, and each one has a reason worth keeping.**

**The nudge carries a count and never a name.** "Four of the five are in" is something the counter
already shows the requester; who has not answered is not, and a helpful reminder is exactly the kind
of place that leak arrives through. It fires once the round is three days old, still open, and still
short.

**A late invitee gets five days, and the extension moves the deadline for EVERYONE — forward only.**
One deadline for the round rather than one per person, for two reasons, and the second is the one
that matters: a per-person deadline would let the synthesis open while somebody still had days left
to answer, and a round whose ending depends on who was invited when is a round whose timing describes
its contributors. Forward only, because somebody promised until Friday is not brought forward because
a name was added on Thursday.

**Raw answers are held one week FROM CLOSURE, not from sending.** For an untouched round those are
the same instant, which is exactly the problem: retention measured from sending would expire the
moment collection ended and leave no window in which the synthesis could be produced. After the week,
only the de-identified synthesis remains. This answers the first of the PRD's four blocking decisions
(§18.1).

**Reflected in:** `app/src/core/tools/mirror/round.ts`, `04_Product/PRD/Tools_Documentation/Mirror_Feedback_PRD.md`.

### D67 — A Mirror Feedback round runs for one week, and closes honestly either way
**Decision (founder, 2026-08-21):**

> The questionnaires are open for a week. After that they lock for the friends. If enough answers
> were collected the result goes to the sender, and if not he gets a message that not enough friends
> answered, so a result cannot be produced.

**What this settles.** A round has a fixed life. The questions lock FOR THE CONTRIBUTORS at the end
of the week — somebody opening an invitation on day nine is told the round has closed, rather than
shown a form whose answer goes nowhere. And the requester gets one of exactly two honest endings.

**A deadline turns out to be a privacy device too, and that is the better half of it.** If a result
opened the moment the fifth answer landed, a requester watching the counter would learn WHEN each
person answered — and against a list of seven people they invited themselves, timing is an identity.
The PRD already forbids exposing timing or order (§3.2). So the result is delivered when the round
CLOSES, never at the moment a response arrives, and the founder's instinct and the privacy rule point
the same way.

**One consequence taken deliberately: a short round DESTROYS the answers it did collect.** People
answered under a promise that produced nothing, and keeping their words then serves nobody — not the
requester, who will never be allowed to read them, and certainly not the contributors. It also
removes the temptation of the obvious "helpful" feature: carrying four answers into a second round.
Those four people consented to ONE round with one set of questions, and reusing their words under a
new consent is not a convenience, it is a different thing from what they agreed to.

**Open, and smaller than it looks:** the live counter is itself a partial timing signal. Somebody
watching "3 of 5" become "4 of 5" learns that somebody answered in that window. The PRD's own design
shows that counter, so this is not a new problem — but if it ever matters, the fix is to round the
counter or to show it only on entry, not to remove the deadline.

**Reflected in:** `app/src/core/tools/mirror/round.ts`, `04_Product/PRD/Tools_Documentation/Mirror_Feedback_PRD.md`.

### D66 — A reflection is FOR THE USER. It does not have to teach us anything
**Decision (founder, 2026-08-20),** on the reflection tools (My Best Possible Year, and the daily
page, start-of-week page, birthdays and moments that follow it):

> The documentation exercises serve the user more than us. We will build some reminder mechanism for
> them, but they will not necessarily help us learn about the user.

**What this settles.** The Tool Addition Protocol requires every tool to answer "what does it teach
us" — and it already allows **"it influences nothing"** as a valid contract, written down with its
reason. This is that answer, for a whole family at once: the reflections are a private writing
surface, and their value is the writing. They owe the app nothing.

**Why it is the right call, and not a gap.** These are the most personal words the product will ever
hold. A tool that learns from them changes what it is: people write differently when something is
reading. The one thing a reflection is allowed to hand over is what the person deliberately types
into the "keep this as a Dream" box at the end — and that is not the letter being read, it is a
separate sentence the person wrote on purpose, knowing where it goes.

**What is still owed for them:** the RETURN mechanism — when a letter or a page comes back, and how.
Today that is in-app and derived from the stored dates. The founder wants to think about the shape;
until then nothing more is built.

**Reflected in:** `04_Product/Tool_Addition_Protocol.md` §4b, `app/src/core/tools/reflections/model.ts`,
`app/src/state/ReflectionsStore.tsx`.

### D64 — Authored content is HELD in English; a Hebrew delivery is translated once, at the end
**Decision (founder, 2026-08-20):** it is fine for the partner to write in Hebrew today, and we keep
his Hebrew as it arrives. **Our side holds English.** The translation is done **once**, when a package
is final or close to it — not per delivery, and not per revision. **From the next letter onward the
partner is asked to deliver in English**, so the English is the author's rather than ours.

**Why translate once and late.** A package that is still being argued about changes shape between
versions; translating each revision pays the same cost repeatedly and, worse, produces an English
copy that quietly diverges from the Hebrew it came from. One translation against a settled version is
one artifact with one meaning.

**Why English is the side we hold.** The repository language is English (CLAUDE.md §3.7), the library
is authored in English and the meta-agent translates it to the user's language at runtime (D55). A
Hebrew-source library would invert that and make English the translation of a translation.

**Reflected in:** `07_Assets/Partner_Packages/README.md` (the standing instruction), the next partner
letter, `04_Product/Open_Work_2026-08-20.md` §1.1.

### D65 — The expert supplies the rhythm CONSTRAINTS; the coach chooses the rhythm inside them
**Decision (founder, 2026-08-20),** answering the partner's open question about
`rhythm / sessionsPerWeek / recurring Steps`:

> The meta-agent decides, from the user's profile and from how much time they want to give **this**
> Journey each week. The Steps follow from that. Where a Journey allows it the track is open-ended,
> and we add Steps to fit the user's time.

**What this settles.** A library Journey does **not** carry a cadence, and the partner is right to
have marked every one of his `frequencyPolicy` fields provisional. Authored content supplies the ARC —
the Milestones, the Steps and their order — and the coach supplies the RATE.

**Why this is the right split, recorded so it is not re-argued.** A cadence written into a library
Journey is a guess about a person the author never met, and it is the guess most likely to be wrong:
the same arc is four weeks for someone with three hours a week and three months for someone with
twenty minutes. It also puts the rhythm where the app already asks about it — capacity is an
onboarding signal, and "how much do you want to give this" is a question the coach can ask about the
one Journey being built.

**AMENDED the same day, by the founder, and the amendment matters:**

> The expert can still say how many times a Step should be done, over what period, or give general
> guidance that helps decide the rhythm. It should be a COMBINATION of what the expert supplies and
> what the coach decides.

So the split is not "content has no say". It is: **the expert states the rhythm CONSTRAINTS its
content actually knows, and the coach chooses inside them.** An expert genuinely knows things the
coach cannot infer — that a Step is worth nothing done once, that two of them a week is the floor
below which the arc stops working, that a particular Milestone needs a fortnight to be real. What it
cannot know is how much of a person's week is available. Guidance from the domain, the rate from the
person, and the coach is the only thing that sees both.

The practical form: a Step may carry a repetition hint and a Milestone a minimum span, both ADVISORY,
and the coach schedules within them. Where they conflict with the person's capacity the coach
lengthens the Journey rather than dropping below the expert's floor — a plan that runs slower is
still the plan; a plan below the floor is a different plan wearing its name.

**What it opens, and is deliberately not decided here:** an open-ended Journey has no fixed end, so
"finished" has to mean something other than "the last Step was done". That is a real question and it
belongs to the completion ceremony, not to this decision.

**Reflected in:** `04_Product/Open_Work_2026-08-20.md` §1.1, and the reply to the partner.

---

## 2026-08-18 — Plan shapes, the library's first slice, and the end-of-Journey label

> Working session with the founder, on branch `feat/buddy-3d-and-reminders`. It began as a review of
> the 2026-08-17/18 handoff's defect list and turned into the first real build of the architecture in
> D52. Engineering detail is in `00_Foundation/CHANGELOG.md`; this log records the founder decisions.

### D63 — The user is not shown the alternatives; a guiding question picks the version for them
**Decision (founder, 2026-08-18, later session),** on reviewing the D62 build:

> "אני חושב שבשלב זה לא צריך לאפשר למשתמש לבחור תוכנית, אלא מספיק לשאול אותו שאלה מנחה ועל פי תשובתו
> לבחור את המסלול הכי מתאים בעצמנו (מבלי להראות לו את האפשרויות השונות)"

**What this settles.** The "two other ways" surface — a screen offering the user the alternative
versions of their Journey to switch between — is **not built now, and is not a gap.** The app asks the
Journey's own guiding question (D62 §2) and chooses the version itself. The user meets one plan, which
is the plan chosen for the answer they gave.

**Why it is the right call at this stage, recorded so the reasoning survives:** offering three plans
side by side moves the professional judgement onto the user at the exact moment they have least
information about themselves, and it invites choosing the easiest-looking one — the failure the whole
objective function is built to avoid (`Plan_Library_and_Learning_PRD` §8.3). A question they can answer
from experience is a better instrument than a menu they must evaluate.

**What it does NOT settle, and must not be read as settling:** every version remains a separately
addressable, rated entity (D62 §4). The choice is still explained by the answer that produced it, and
the surface stays designable later — the founder's words are "at this stage". The user's ability to
overrule a matched approach when one is offered to them stays intact where it already exists.

**Categorization:** **Approved.**
**Reflected in:** `04_Product/PRD/Plan_Library_and_Learning_PRD.md` §6.6,
`04_Product/Status_Report_2026-08-18.md` (the "two other ways" row), `Current_Context.md`.

### D62 — A Journey declares what its own variants differ on; every variant is a rated entity
**Decision (founder, 2026-08-18),** arrived at across one conversation while reviewing the partner's
matching-profile and Career-variant files.

**1. Nothing about the difference between variants is fixed in advance.**

> "לא נקבע מראש מה הפרמטרים שיכולים להשתנות בין הוריאנטים, כל מסע יגדיר בעצמו מה ההבדל בין הגרסאות
> השונות … במקרה אחד זה יכול להיות רמת וודאות, במקרה אחר זמן פנוי, במקרה אחר כמה דחיפות יש למשתמש"

One Journey's versions may differ on how much certainty the user wants before the first real-world
test; another's on available time; another's on urgency. The engine knows no closed list of possible
differences — it reads what each Journey declares about itself. **Adding a new kind of difference is
CONTENT, not code.**

**2. Variant-selection questions come AFTER the Journey is chosen, and only what that Journey needs.**
The expert first decides which Journey fits professionally; then it asks the questions that *this*
Journey declared it needs in order to pick between its own versions. Nobody is asked a question that
cannot change their answer — which is the partner's own rule ("if changing the answer would not
change the Journey we choose, the question should not be in core onboarding") applied one level down.

**3. There is no fixed taxonomy of signal types.** The partner's file sorts onboarding signals into
three jobs (rank a variant / veto a family / reveal a missing comparison). The founder accepted the
*structure* and rejected the *closed set*:

> "אין שלושה סוגי אותות אלה יותר סוגי אותות ובהמשך לכל מידע בפרופיל תהיה השפעה על בחירת המסע והוריאנט"

So the profile is an OPEN set of fields, and a field's job is whatever the Journey or variant that
reads it says it is — not a category we assigned it up front.

**4. Every variant is a separate entity that holds its own rating, and a variant's rating also feeds
its Journey's.** Raised against the objection that per-Journey axes would make cross-Journey learning
impossible:

> "אין סיבה שלא נתייחס לכל וריאנט של מסע כאובייקט נפרד, ישות נפרדת, המחזיקה דירוג (כלומר כל דירוג של
> וריאנט משפיע גם על המסע וגם על הוריאנט)"

This dissolves the objection: we can always say which Journey ranked well AND which of its versions
did, because both carry a rating and the rollup is defined.

**Two things this decision settles that were open:**
- **Terminology.** Same Milestones, different pace or path ⇒ the same Journey in another version.
  Different Milestones ⇒ **a different Journey for the same goal** (the founder's own rule, this
  session). The partner's v0.3 file calls the latter "variants"; **their vocabulary must be aligned
  to ours before that content is ingested**, or the term forks again.
- **Language.** The partner's `02_Career_Direction_3_Variants_v0.3.json` is authored in Hebrew, which
  contradicts D55 (content authored in English, the meta-agent translates). The founder's ruling is
  to align to the rule he set — so partner content is authored in English from here.

**Approved alongside:** add the three matching questions we do not ask (starting mode — clarity
first vs action first; how much structure helps; how much challenge is wanted now), and improve the
wording of the ones we do ask where the partner's is better. `realisticCapacity` and
`abandonmentPattern` already exist and already reach planning; `previousSuccessPattern` exists in a
weaker form (what helps you in general, rather than what kept a change you actually sustained).

**Categorization:** **Approved.** **BUILT 2026-08-18 (later session)** — the entry above is unchanged and
remains the specification; this line records what now exists against it.

- A Journey declares its own axes in content (`app/src/core/learning/library/journeyDefinition.ts`,
  `definitions.ts`); axis ids, values and profile-field ids are open strings and the engine knows what
  none of them mean. A test selects on a `certainty` axis that exists only inside the test file.
- The variant question is asked after the Journey is chosen and only when it can still change the answer
  (`selectVariant.ts`, `app/src/core/coach/variantQuestions.ts`, appended in the interview after the
  expert's questions and the horizon question).
- The profile reaches selection as an ORDERED list of ids with no taxonomy; `matchApproach.ts` now owns
  only that order.
- Every variant is a rated entity whose rating rolls up to its Journey (`variantRatings.ts`), made
  possible by new provenance on the Journey itself (`Journey.libraryRef`).
- Q7–Q9 shipped in onboarding (starting mode · structure · challenge), `ONBOARDING_VERSION` → 2, both
  languages.

**Still not built:** a library Journey for a PROCESS goal, the "two other ways" switching surface, and
any outbound learning — every rating today is an on-device aggregate over the user's own Journeys.

**One framing corrected the same day.** An earlier version of this note called the process case an open
founder decision ("do authored arcs replace the expert's arc or shape movement through it"). The founder
rejected the question rather than answering it, because his own rule already settles it:

> "כל סט של אבני דרך מגדיר מסע. ישנם הרבה מסעות שונים עבור אותה מטרה. לכל מסע יש כמה וריאנטים (אותם
> אבני דרך אבל הבדלים כאלה ואחרים) … ישאל המומחה שאלה מכווינה … ועל פי תשובתו או הפרופיל שלו יבחר את
> הוריאנט הכי מתאים לו"

So an arc that differs is a different **Journey**, never a variant, and a domain expert's hardcoded arc
is Journey #1 for its goals. The process case is missing CONTENT — authored process Journeys, plus the
expert selecting from the library instead of returning its one arc — gated on the partner's content being
ingested under our terminology and language rules. It is a build, not a call to make.

**Reflected in:** `04_Product/PRD/Plan_Library_and_Learning_PRD.md` §6.5–§6.6,
`app/src/core/learning/library/`, `app/src/core/onboarding/questions.ts`,
`00_Foundation/CHANGELOG.md` (2026-08-18 later).

### D61 — The meta-agent is a router, a summariser and a translator; the experts hold a real dialogue
**Decision (founder, 2026-08-18), clarifying the coach architecture:**

> "סוכן העל מבין לאן להפנות את הפנייה של המשתמש, ייתכן והוא גם יתמצת וימקד את מה שאמר המשתמש ואז את
> הסיכום הוא מעביר למומחים הרלוונטים, יחד עם המידע על המשתמש וכל מה שצריך כדי שהמומחה יוכל לבנות
> תהליך כמו שצריך (או להחזיר שאלות רלוונטיות) … יש פינג פונג בין המשתמש למומחה כשבאמצע נמצא סוכן העל
> שמתרגם את ההודעות לנוסח שמתאים למשתמש ולבסוף התוכנית נבנית."

**The standard he set:** *"התהליך הזה חייב להיות מצוין, שאלות רלוונטיות, מקיפות, יסודיות, שבסופן
נבחרת התוכנית הכי מתאימה עבור המשתמש."*

**What already matches.** The two-layer model is the shipped shape: the meta-agent understands the
opening, routes to a `DomainExpert` by domain, and is the SOLE user-facing voice — the expert is an
internal tool that never speaks to the user (`CoachOrchestrator`).

**The four gaps this decision opens, stated precisely so they are not mistaken for done:**

1. **The summary is a title.** Understanding extracts `{ title, kind, domain }` and discards
   everything else the user said. The *why*, the constraint, the history in the same sentence never
   reach the expert. "A summary passed to the expert" does not exist yet — a label does.
2. **The expert never sees the user.** `buildStructure(goal, answers, constraints)` takes no profile.
   What the user told onboarding about what helps them and what defeats them reaches the approach
   matcher (D54/D56) and nothing else.
3. **There is no ping-pong.** The expert's questions are a fixed ordered list from config; it cannot
   ask a follow-up in response to an answer. The interview is a questionnaire, not a dialogue, and
   "comprehensive, thorough questions" is not reachable without the expert being able to ask again.
4. **Re-voicing is a template lookup, not translation.** `metaVoiced` resolves a per-intent string,
   so the question the user reads is generic — it does not reflect what they just said. Deliberate
   (it keeps LLM usage to one call) and now insufficient against the standard above.

**Categorization:** **Approved** as the architecture. **Gaps 1–4 are open work**, sequenced after the
Journey Library and before Apple/Google sign-in per the founder's ordering, 2026-08-18.
**Reflected in:** `app/src/core/coach/CoachOrchestrator.ts`, `app/src/core/learning/DomainExpert.ts`.

### D54 — A plan has a SHAPE: a repeated action is not a staged process, and must not be given an arc
**Decision (founder, 2026-08-18).** Asked for the goals he actually wants, the founder named two kinds:

> "פעולות פשוטות שצריכות לחזור באופן קבוע (החלפת ציפות אחת לשבועיים, קריאה בספר פעמיים בשבוע, גילוח
> זקן פעמיים ביום, שייק חלבון כל יום) ופעולה אחת תהליכית - לצבור בטחון לפנות לאנשים זרים"

Four of his five real goals are **repeated actions with no stages**, and the app knew only one shape —
the staged Milestone arc — and forced it onto both. This is the mechanism behind his verdict that the
plan built for him "didn't help me at all": there is no second phase of changing the pillowcases.

**What is approved:** two plan shapes. A `recurring` goal gets NO Milestone arc — a few setup Steps that
carry the user's own sentence, then that sentence repeated on every active day. A `process` goal keeps
the arc, where stages are real and the domain expert's staged content earns its place.

**The related mechanism the founder approved, in his words "היברידי נשמע נכון":** the library supplies
the SCAFFOLD and the user supplies the CONTENT. Templates carry an `{ACTION}` hole filled with what the
user actually wrote. No model call, no cost, works offline.

**Categorization:** **Approved.**
**Reflected in:** `app/src/core/learning/types.ts` (`JourneyShape`), `app/src/core/learning/library/`,
`app/src/core/learning/Planner.ts`, `04_Product/PRD/Plan_Library_and_Learning_PRD.md` §15 Stage 0–1.

### D55 — Plan content is authored in English; the meta-agent translates it to the user's language
**Decision (founder, 2026-08-18):**

> "תוכן התוכניות תמיד יהיה באנגלית בלבד - זוהי שפתם של המומחים. אבל סוכן העל הוא זה שצריך לדעת לתרגם
> את התשובה לשפה של המשתמש לא משנה מה היא השפה (גם ספרדית לצורך הדוגמה)"

**Consequence recorded at the time, and the agreed implementation:** if translation is a live model call,
a user with no network or no key sees English. Because the templates are a CLOSED set we author, each is
translated ONCE per language and cached, so cost approaches zero and offline works. **The user's own
words are inserted AFTER translation and never pass through it** — filling first would send "שייק חלבון"
through a translator and hand it back as "protein shake".

**Categorization:** **Approved** (the rule) + the caching implementation. **NOT YET BUILT** — the slot
order is in place; the translation cache is not.
**Reflected in:** `app/src/core/learning/library/slots.ts`; open in `04_Product/Open_Questions_For_Founder.md`.

### D56 — Three variants per goal, differing in METHOD; offered quietly, never as a menu
**Decision (founder, 2026-08-18).** Three variants confirmed ("שלושה וריאנטים זה לחלוטין מספיק"). On
presentation he judged a chooser clumsy and asked what could even be shown; the agreed answer is **not a
menu**: the coach picks one, shows the plan, and offers one quiet line — "there are two other ways to do
this". Whoever taps and switches gives the strongest learning signal available, and whoever does not is
not interrupted.

**Why method and not intensity:** variants that differ only in how much work they ask teach us nothing
except that some people prefer less. The three recurring approaches are *attach it to an existing
routine* · *start smaller than feels worth it* · *prepare the environment so the moment needs no
decision*.

**Also decided:** the **experts** own the variants ("המומחים הם אלה שבונים את המסעות והוריאנטים שלהם").
The shared scaffold holds only the shape, which is not domain knowledge.

**Categorization:** **Approved.** Variants and the matcher exist for the recurring shape; **the "two
other ways" surface and the process-shape variants are NOT yet built.**
**Reflected in:** `app/src/core/learning/library/recurringApproaches.ts`, `.../matchApproach.ts`.

### D57 — What counts as "the plan worked": finishing is the evidence, unless the user says otherwise
**Decision (founder, 2026-08-18):**

> "אם משתמש סיים את התוכנית אפשר להניח שהיא עבדה, אלא אם הוא דירג אותה לבסוף בציון נמוך"

This is the objective function the library learns against, and it was the first of the blocking questions.

**Two consequences written into the code, both of which change what the loop can learn:** `partly` is NOT
counted as a failure — treating the honest middle answer as negative would teach the library to avoid
every Journey people found genuinely mixed — and **"we don't know" stays distinguishable from "no"**, so
an unlabelled Journey is missing data rather than a silent negative.

**Categorization:** **Approved.**
**Reflected in:** `app/src/core/celebration/journeyFeedback.ts` (`journeyWorked`).

### D58 — The end-of-Journey question is asked at three endings, as a request, and never by notification
**Decision (founder, 2026-08-18):**

> "כרגע נסתפק במשוב בסוף התהליך בדיוק בנקודות שציינת. המשוב צריך להיות מנוסח בצורה של בקשה … בה אנחנו
> מסבירים למשתמש כי דעתו עשויה לעזור לנו להשתפר עבורו ועבור משתמשים אחרים"

**The three points** are completion, cancellation, and quiet death — the survivorship guard from the
library PRD §6.4: ask only the people who finished and every training label is a success, so the library
learns that everything works, invisibly, from data that looks clean.

**Never by push.** The quiet host waits for the user to open the app themselves, asks once, and a
dismissal is recorded as a real answer so it never asks twice. Asking "why did you stop?" by notification
spends the user's attention on OUR data, in a product whose objective is fewer interruptions that matter
more (D52 §8).

**Categorization:** **Approved.**
**Reflected in:** `app/src/core/celebration/journeyFeedback.ts`,
`app/src/components/celebration/JourneyFeedbackSheet.tsx`, `app/src/app/(tabs)/index.tsx`.

### D59 — A reminder fires when the PLAN says the user does this, never at a fixed hour
**Decision (founder, 2026-08-18).** On being shown that the wizard offered 08:00 while the engine
defaulted to 09:00:

> "כל משתמש מגדיר לעצמו את זמני הפעילות ולכן ייתכן כי השעה 8:00 בכלל לא בחלון הזמינות של המשתמש -
> אנחנו צריכים להבין מהמשתמש מתי הכי נוח לו שנתריע לו"

Also decided: **existing Journeys are not backfilled** with reminders; the new default applies only to
Journeys created from now on.

**Categorization:** **Approved.**
**Reflected in:** `app/src/core/util/reminderView.ts` (`defaultReminderTimeFor`), `app/src/core/AppCore.ts`.

### D60 — The app does not show the user what it has concluded about them
**Decision (founder, 2026-08-18), answering a proposal for a "what we know about you" screen:**

> "אנחנו לא נציג למשתמש את מה שאנחנו חושבים עליו."

**Recorded because the proposal argued the opposite** (that visibility is honest and a differentiator).
The founder's call stands; anything built later that surfaces a derived profile needs this reopened
first, not merely designed around.

**Categorization:** **Approved.**
**Reflected in:** this log (no screen exists; none is to be built).

---

## 2026-08-08 — Initial-version (MVP) task list + scope decisions

> Working session with the founder to define the concrete initial-version scope, on branch
> `feat/buddy-3d-and-reminders`. The granular checklist lives in
> **`04_Product/MVP_Task_List.md`** (created this session); this log records the founder-level
> decisions and their reasoning.

### D29 — Initial-version scope: required base-version capabilities confirmed
**Decision:** After a coverage audit of the flows the founder wants to perform, five capabilities
were confirmed as **required in the initial (MVP) version**:
1. **Edit an existing Journey** (rename / change Steps / change frequency) — currently absent. (How:
   open question — coach-led editing, a simple edit screen, or both; D26.8 leans coach-led.)
2. **Delete / abandon a Journey** — currently absent (only Step-level "let go" exists).
3. **First-run onboarding** including the **notification-permission ask** — currently absent; the app
   drops straight into Home, and permission is asked only inside the creation wizard.
4. **Multi-language (i18n) support with Hebrew** — the app + coach are currently **English-only** with
   no i18n layer. The founder uses Hebrew, so the initial version must support his language. This adds
   an i18n layer, Hebrew translations, **RTL layout** across all screens (the mature redesign was
   built LTR), and the coach conversing in Hebrew.
5. **Account deletion / data export** — currently absent; a hard Apple/Google requirement for a public
   release (not needed for founder-only device testing). Treated as a release gate.
**Why:** items 1–3 are basic usability gaps (a Journey that can't be edited, deleted, or reached
through any first-run is not a shippable product); item 4 is fundamental to who the initial version is
for (the founder himself, a Hebrew speaker); item 5 is a non-negotiable store-compliance gate.
**Categorization:** **Approved** — these five are IN the base version.

**The remaining open questions were then resolved (founder, same session):**
- **Coins** → **hidden in MVP** (kept accruing in the engine, not shown — the Shop is archived, no sink).
- **Manual Journey creation** (the wizard) → **kept** as a coach-first fallback / escape hatch.
- **Friend profile page** → **IN** (minimal: name + active Journeys + progress + cheer).
- **Messaging / start a conversation** → **deferred post-MVP** (cheer/nudge already serve the loop).
- **Channels / Groups** → **deferred post-MVP** (Communities = Commercial stage).
- **Journey Freeze/Resume** → **IN**.
- **Reminder management for an existing Journey** → **IN**.
- **Deferred-goals ("parked goals") surface** → **IN** (minimal — persist + a list to activate later).
- **J1 "how to edit a Journey"** → **coach-led**: a **pencil button on the Journey screen** opens the
  coach conversation; the coach asks what the user wants to change, proposes the updated Journey
  settings from the user's answer, and **the user must approve the change** before it applies.
**Reflected in:** `04_Product/MVP_Task_List.md` (the full checklist + statuses + open questions);
`Current_Context.md` (to be updated at sprint end); the harness task list for this build.

## 2026-08-09 — i18n rollout + domain-expert language ownership

### D30 — Domain experts are INTERNAL tools; the meta-agent owns the user's language
**Decision:** During the Hebrew i18n rollout the question came up of whether the four domain experts
(Addiction · Relationships & Loneliness · Body Image · Career) need their interview content
translated. **Founder decision: no — not now, and by design not as per-expert user-facing copy.** The
experts are **empty foundation scaffolding, not yet specced**, and are **internal tools**: they
communicate with the **meta-agent ("Steady")**, and it is the meta-agent that talks to the user and
speaks the user's language. So the experts themselves carry no user-language requirement. When the
experts are actually specced, they will be built i18n-aware from the start, or — cleaner, and the
founder's leaning — kept as pure internal tools with the meta-agent phrasing everything to the user
in their language.
**Why:** it matches the **framework-not-content** philosophy (D25) — the experts encode interview
*structure and planning logic*, not user-facing prose — and avoids prematurely translating unspecced,
gated (D24) scaffolding. It also keeps a single, clean language boundary: the meta-agent.
**Implemented (2026-08-09, same session — the hierarchy fix the founder asked for):** the meta-agent
is now the SOLE user-facing voice for the interview. `CoachOrchestrator.askCurrentQuestion` re-voices
every expert question through the new `CoachOrchestrator.metaVoiced` helper, which resolves the
user-facing prompt from the meta-agent's own `interview.<intent>` template in the `coachContent`
namespace (user's active language, **deterministic — no added LLM call**, so the "one understanding
call" budget is preserved). The expert now supplies only the STRUCTURE (question id/intent + closed
`options` + planning logic) and never speaks to the user directly; only the `prompt` is re-authored,
so the closed-option answer-matching is untouched. **Mechanism chosen: deterministic per-intent
templates** (the founder picked this over per-question LLM phrasing, to avoid ~6 extra LLM calls per
interview — cost/latency). A domain expert reached in Hebrew now renders the meta-agent's Hebrew
question, not the expert's internal English prose. Covered by an updated `CoachOrchestrator.test.ts`
assertion (`coachMessage === i18n.t('interview.foundation', { ns: 'coachContent' })`).
**Categorization:** **Approved + Implemented** (the language-ownership direction + the meta-agent
voicing) + **Open/Future** (the full expert spec + un-gating land later; when the experts are specced
they inherit this — they stay pure internal tools, the meta-agent phrases everything).
**Reflected in:** `app/src/core/coach/CoachOrchestrator.ts` (`metaVoiced` + header doc);
`app/src/i18n/resources/{en,he}/coachContent.json` (`interview.*`); `04_Product/MVP_Task_List.md`
(N1 Batch 3 note); `Current_Context.md`.

### D31 — Gender-aware "form of address" (לשון פנייה) across all languages
**Decision:** the app must address the user in the correct grammatical form. Hebrew (and many
languages) inflect address by gender; English does not — so the mechanism has to generalize.
- **Mechanism:** i18next **context**. A string that needs it provides `key_feminine` / `key_masculine`
  variants and the base `key` as the fallback; languages with no gendered address just use the base.
- **State:** a persisted **`addressForm`** preference — `neutral` | `feminine` | `masculine` — mirroring
  the language/theme preferences. It drives translation via a React hook (components) and a module-level
  accessor (the framework-free engines/coach read it the same way they read `i18n`).
- **Sourcing (founder):** the user is **asked at onboarding** for their form of address. If a
  **Google/Apple sign-in returns the user's gender**, the field is **auto-set** from it — but it is
  **still shown in the onboarding questionnaire and remains user-editable** (and editable later from the
  profile). The address form follows the gender automatically, but the user can override it.
**Why:** addressing a user in the wrong gender reads as broken/impersonal in Hebrew; this is
foundational for a real (non-founder) Hebrew launch. Building the mechanism early avoids retrofitting
gendered variants across a large string base later.
**Categorization:** **Approved.** Build the mechanism + preference + a control now; convert strings
incrementally (coach + Home first); wire the sign-in auto-detect when real OAuth lands (E1, Apple-gated);
fold the picker into the P1 profile redesign.
**Reflected in:** `04_Product/MVP_Task_List.md` (Section Q); `Current_Context.md`; (implementation to
follow this decision).

### D32 — Completion-celebration model: small confetti (Step) + a shareable achievement card (Journey/Milestone)
**Decision (founder, I1):** two tiers of celebration.
- **Small — on a Step check-in:** on-screen **confetti** (colored ribbons). Provide **several distinct
  variants**, chosen by the founder or picked at **random each time** for variety.
- **Big — on completing a Journey or a Milestone:** a full **achievement card** the user can **edit,
  share to social (Facebook/Instagram), save as an image, or close.** Reference point: **Finch's**
  goal-completed / Micropet-egg achievement screen (founder attached a screenshot) — PushApp's version
  should be **similar in intent but more elegant** and on-brand (mature, calm, one accent).
**Why:** a full transformation deserves a bigger, shareable moment than a per-Step check-in; sharing is
also organic growth (the people pillar) without being a punishment/streak mechanic.
**Related Open Question (Future Vision):** an achievements **FEED** — users share achievements and write
a few words on each (post-style). Privacy/moderation-heavy; log fully before building.
**Also flagged (Open Question):** **photo upload as part of a Step-completion report** — the current
Step-report UI doesn't support it; needs a design pass (attach point, on-device-first storage/privacy).
**Categorization:** **Approved** (the two-tier celebration model) + **Open/Future** (the feed + the
photo-in-report). **Reflected in:** `04_Product/MVP_Task_List.md` (I1 + Open questions + Post-MVP).

### D33 — One authoritative week boundary (Week Boundary Preference)
**Decision (founder, PRD `04_Product/PRD/Done/Week_Boundary_Preference_PRD.md`):** there is exactly ONE
definition of when the user's week begins, and **every** week-referencing area aligns to it — weekly
Missions, the Streak "no-slack" rule, Week Review, AND the Journey "Week X of Y" pager. A single
profile-level **`weekStartDay`** (0=Sun … 6=Sat) is defaulted from the profile's single **`country`**
field (until `Own_Profile` lands, from the device region) and is user-editable; from the moment it is
set the whole app follows it.
**Why:** the code audit found THREE conflicting "week" notions — a Monday-hardcoded calendar week
(Missions + Streak), per-Journey rolling weeks from `createdAt` (the pager), and fixed-millisecond
arithmetic (DST-unsafe, forbidden by the PRD). They must be consolidated so nothing drifts.
**MVP scope (approved):** local midnight start only (no advanced start-time); device-local CALENDAR
arithmetic (no fixed ms — DST-safe); the IANA-zone/device-travel/multi-device cases are **deferred**
until a backend + synced preference exist (and depend on the `country` field from `Own_Profile`);
changes apply GOING FORWARD (the Streak is computed live for MVP — stamping a boundary/version on
weekly records is the next step once a backend exists; Missions already stamp via `weeklyResetKey`).
**Implemented (2026-08-10):** `app/src/core/util/week.ts` (the single service — configurable start,
calendar arithmetic, `startOfWeek`/`startOfNextWeek`/`remainingDaysInWeek`/`weekKey`/`weeksBetween` +
a framework-free `get/setWeekStartDay` module value); `app/src/state/WeekStartPreference.tsx` (persist
+ device-region default + mirror into the module); consumers migrated — `MissionEngine` + `urgency.ts`
(Streak) + `journeyView.stepsByWeek` (pager now calendar-aligned; `weekKey` removed from `util/date`);
an interim "My week starts" Settings row (will move into the P1 profile redesign); tests in
`util/__tests__/week.test.ts`. Green: tsc clean, eslint 0 errors, jest 543/543.
**Categorization:** **Approved + Implemented (MVP slice)** + **Open/Future** (IANA/travel/multi-device
+ boundary stamping, gated on the backend + `Own_Profile`'s country field).
**Reflected in:** the PRD (§9 current-implementation, §10 resolution & MVP scope); the files above.

### D34 — Unified Profile model + own-vs-friend boundary (Own Profile)
**Decision (founder, `Own_Profile_PRD.md`):** ONE source-of-truth `Profile` object holds every identity/
adaptation field (option A). Two distinct uses of "profile": **Own Profile** is the PRIVATE self-view —
the user sees/edits ALL fields; **Friend Profile** (P1) is a filtered projection showing only a public
SUBSET (photo, display name, `@username`, Level, authorized progress) and NEVER the private fields
(country, birth date, form of address, email, provider info). Form-of-address default = **neutral**
(reconciles the PRD's earlier "masculine" with D31). Country covers **all countries** (full ISO list;
week start = Sun/Mon/Sat only, encoded as a Sunday-set + Saturday-set + Monday-default) and supplies the
week-start default (a manual override still wins, D33). **Phased build:** Phase 1 = fields + the Own
Profile screen; Phase 2 = the profile photo (its own slice with the §4 binding safety requirements +
`expo-image-picker`); auth-provider seeding wires in with real OAuth (E1, Apple-gated).
**Implemented — Phase 1a (2026-08-10, green: tsc clean, eslint 0 errors, jest 548/548):**
`state/ProfileProvider.tsx` (the unified store — persists one JSON object; mirrors `addressForm` +
`weekStartDay` into their framework-free modules; migrates the two legacy preference keys) FOLDS IN and
REPLACES the former standalone `AddressPreference` (D31) + `WeekStartPreference` (D33) providers;
`core/profile/countries.ts` (all-countries list + country→week-start mapping + device-region default +
`Intl.DisplayNames` localized names); consumers migrated (`_layout`, `useAddressedTranslation`,
`settings.tsx`); `core/profile/__tests__/countries.test.ts`.
**Implemented — Phase 1b (2026-08-10, green: tsc clean, eslint 0 errors, jest 548/548, web-verified in
Hebrew):** the dedicated **My Profile** screen `app/settings/profile.tsx` (avatar initials + a
private-scope note, editable display name, `@username` reusing the shared username logic, country row,
birth-date row with an inline `YYYY-MM-DD` editor, form-of-address) + a searchable **country picker**
`app/settings/country.tsx` (all countries, `Intl.DisplayNames` localized names, alphabetical) + the
entry point (the Settings `ProfileIdentity` card now navigates to it). Phase 1 (fields + screen) is
DONE; the **profile photo is Phase 2** (its own slice with the §4 safety requirements +
`expo-image-picker`), and auth-provider seeding wires in with real OAuth (E1, Apple-gated).
**Categorization:** **Approved + Phase-1 Implemented** + **Open** (Phase 2 photo, auth seeding).
**Reflected in:** `Own_Profile_PRD.md` (status + §10/§11); the files above.

### D35 — Daily Step Reporting: blocking questions closed (PRD ready)
**Decision (founder, `04_Product/PRD/Daily_Step_Reporting_PRD.md` §12):** all seven §12 blocking questions
were resolved against the current codebase, moving the PRD from Open Questions to **Ready for
implementation**. Key calls:
1. **Flexible weekly targets = multiple pre-created Steps** (the existing one-shot `Step` model, grouped by
   `stepsByWeek`), each reported independently → separate rows on Home, which the founder accepted. **No**
   occurrence entity and **no** "x/y this week" counter in MVP (both deferred post-MVP). Rationale: finite
   `durationDays` bounds pre-creation; per-instance evidence already lives in `checkIns`/`reasonLog`.
2. **All report transitions allowed within the open week** (including reversing a `completed`); history is
   **retained** via the append-only `reasonLog`/`behaviorLog` (never overwritten); **no XP clawback** on
   reversal (kept forgiving). An "un-report" path is a small addition (`checkInStep` is one-way today).
3. **No hard closed-week immutability in MVP** — past weeks just aren't surfaced for editing (product
   convention, not a storage lock; no "closed week" state exists in code).
4. **Partial `0.75` = research hypothesis only**; progress stays binary (partial counts as 0). Partial
   remains a distinct non-failure status/signal with no numeric weight.
5. **Weekly Review may use the Partial note, on-device only** (feeds local `reviewWeek`/`AdaptivePlanner`);
   never to cloud/DomainEvent/social/analytics without a fresh security-privacy decision (G1).
6. **Partial explanation is OPTIONAL, not mandatory** — a short on-device-only note; mandatory text would
   contradict the "reporting in seconds" principle (§2).
7. **Retention/deletion already covered** by the single encrypted `AppState` blob +
   `resetToFirstRun()`/account deletion + `exportStateJson()`. The elaborate §8 cascade is **N/A until a
   backend sync exists** (revisit with security-privacy then).
**Method note:** first feature closed under the PRD-per-feature flow using a code-grounding pass (the
explorer mapped the real `Step`/reporting/reasons/week/persistence model before answering), which is why
most "open" questions collapsed against what already exists.
**Categorization:** **Approved** (PRD Ready; implementation not yet started).
**Reflected in:** `Daily_Step_Reporting_PRD.md` (status + §4/§5/§6/§7/§10/§12).

### D36 — Daily Step Reporting: implementation approach (status derived, not stored; reversal via a marker)
**Decision (architect plan, ratified at implementation start 2026-08-10):** implement D35 without a new
report ledger and without a `Step.status` enum. Specifically:
- **Status is DERIVED** by a pure helper `deriveStepStatus(step, reasonLog)` from `done`/`dropped` + the
  append-only `reasonLog` + a new optional `Step.lastReportClearedAt`. Progress stays binary.
- **Reversal** = a new `JourneyEngine.reverseReport` + `StepReportReversed` event: clears `done`/`lastCheckInAt`,
  stamps `lastReportClearedAt`, un-completes + reactivates an auto-completed Journey, KEEPS prior CheckIn /
  reason rows (history retained). **No XP clawback.**
- **Idempotent rewards**: `StepCheckedIn`/`JourneyCompleted` gain `firstCompletion`; `RewardEngine` grants
  only when true (`Journey.completionRewarded` set once). Re-completing after a reversal grants nothing.
- **Optional Partial note** reuses the existing on-device `ReasonEntry.note` path (`did_partially` via
  `submitReason`); `ReasonEntry` gains an optional `action` for precise derivation. The note NEVER enters an
  emitted event (G1). **security-privacy** to confirm; **ux-designer** owns the non-failure Partial color
  token; **content-writer** owns he/en copy.
**Categorization:** **Approved** (implementation approach; build in progress).
**Reflected in:** `Daily_Step_Reporting_PRD.md`; the engine/UI/i18n files in the plan.

### D37 — Step Postponement: blocking questions closed (PRD ready; requires a Miss_Recovery update)
**Decision (founder, `04_Product/PRD/Step_Postponement_PRD.md` §11):** the five §11 blocking questions were
resolved against the current codebase, moving the PRD to **Ready for implementation**. This feature is
mostly conflict-resolution between the founder's mobile draft and the existing Miss-Recovery POC. Calls:
1. **"Postponed" is an ACTION, not a status** — the Step stays `unreported` (matches the code; `postponeStep`
   changes no field) and the four Daily-Reporting statuses (D35.5). UI shows a "postponed to <time>"
   affordance when `postponedUntil` exists.
2. **Reason on Postpone → OPTIONAL, with a fast one-tap reason-free path** ("remind me in 2h" / pick a time).
   Matches the "common action must be fast" principle + the Partial-note decision (D35.6). **Supersedes
   Miss_Recovery's "reason required on Postpone."**
3. **Repeated-postponement Coach intervention → DEFERRED post-MVP** (depends on the off `intervention` engine
   + the Coach). MVP persists `postponeCount` **per occurrence** only; no threshold fires. Removes the
   POC-threshold conflict.
4. **Per-occurrence retiming → YES for MVP** — postpone schedules a **one-shot reminder** for the Step at
   `postponedUntil`, independent of the Journey's recurring reminder. Correct semantics for "remind me about
   THIS step later"; **supersedes the current Journey-level retiming** for the postpone path. Heaviest part of
   the build (reminder scheduler; relates to J4) but adds a one-shot rather than rewriting the reminder model.
5. **Retention/deletion → already covered** by the single encrypted `AppState` blob (count/timestamps
   on-device; events ids-only; `note` on-device for `other`); cascade-deleted + exported. Intervention
   telemetry N/A until that engine ships.
**Required follow-up:** `../Miss_Recovery_PRD.md` must be updated for #2 and #4 before/with build. That file
is currently in a locally-modified (Codex) state — the founder aligns/commits it first; we never overwrite it.
**Refinement (founder 2026-08-10):** (a) **Partial CANCELS** the pending one-shot (a Partial is a final
report of execution — overrides the earlier "keep on Partial"); (b) the **2h default is fixed**, but the user
may **pick the exact reminder time**; (c) **day-crossing shorten rule** — if the 2h default would cross
midnight, shorten to keep the reminder today down to a **30-minute floor**, and if even 30 minutes crosses
the day, tell the user no further reminder can be made today; (d) **helper + AppCore**, not a dedicated
engine. See `Step_Postponement_PRD.md` §4 + §11.6.
**Categorization:** **Approved** (PRD Ready; implementation not yet started; Miss_Recovery update pending).
**Reflected in:** `Step_Postponement_PRD.md` (status + §3/§4/§5/§7/§11 incl. §11.6).

### D38 — Adaptive timing learns per recurring-activity (a Step `seriesId`), not per Journey
**Decision (founder, 2026-08-10):** the grain for reminder-timing (and postpone-pattern) learning is the
**recurring ACTIVITY**, linked by a stable **`seriesId`** stamped on the Steps that are instances of the same
repeated task, at creation. Learning accumulates per `seriesId` so timing improves from one occurrence to the
next.
**Reasoning / path (the founder reasoned through both alternatives):**
- **Rejected — per-Journey timing** (his own first idea, then withdrawn): too coarse. A single Journey — e.g.
  a "weekly routine" — can bundle **multiple distinct recurring task types**, each with its own ideal time;
  one Journey-level time can't serve them.
- **Rejected — full occurrence/recurrence entity** (D35.1, deferred): `seriesId` is a lightweight grouping
  KEY, not a materialized-occurrence model or a recurrence engine.
- **UX unchanged** (D35.1): still separate rows; `seriesId` is invisible, used only for aggregation.
**Scope:** the field + stamping-at-creation land **now** (folded into the Step Postponement build); the
learning itself belongs to **`Smart_Notification_Timing_PRD.md`**. Postpone one-shots stay per-occurrence
(D37); `postponeCount` stays per-occurrence for now, with `seriesId` enabling future per-series aggregation.
**Open implication (architect to map):** reminders are per-Journey today; acting on per-activity timing may
require per-series reminder timing — coexisting with the per-occurrence one-shot from D37.
**Categorization:** **Approved** (foundational model addition; architect + product-guardian pass in flight).
**Reflected in:** to be reflected in `Step_Postponement_PRD.md` (seriesId field) + `Smart_Notification_Timing_PRD.md`
(learning) once the architect/guardian pass returns.
**Refinement (founder 2026-08-10):** (i) **granularity = ONE series per action** — drop `milestoneId` from the
key (the same action across phases must keep one timing insight, not split). (ii) **Grain-split (see D39):**
per-activity (`seriesId`) learning applies to the new **routine** object; a regular **Journey** learns
**per-Journey** (schedule-level). `seriesId` is therefore primarily for routines — its implementation now
**folds into the routine definition (D39)**, not shipped standalone.

### D39 — A fast-path recurring "routine" object, distinct from Journey
**Decision (founder, 2026-08-10):** PushApp will support a **fast path** for small recurring tasks (e.g.
"drink water", "change the sheets", "wash the floor") that are **not tied to a Dream** and are **not
Journeys**. A Journey stays a **finite** transformation ("Every Journey Must End"); recurring-maintenance
tasks get their own home — a distinct object (**working name "weekly routine"; final name TBD** by
product-manager + product-guardian).
**Philosophy reconciliation (founder):** a routine **is itself a transformation** — a person who builds a
routine becomes more organized, responsible, and in control, which *is* "becoming who you choose to be." So
it is within the mission, **not** a bare habit-tracker. The founder acknowledges the perception risk (it can
*look* like a habit-tracker) and chose to include it, framed this way.
**GUARDRAIL (product-guardian, binding):** it must ladder to a **chosen identity**, never become a
streak/chore tracker; per-activity timing learning must **not multiply notifications** (feeds the per-day
send cap — D38 / `Smart_Notification_Timing`).
**Scope:** reuses `Step` + **Daily Step Reporting (D35)** + **Step Postponement (D37)**. Learning grain is
per-activity (`seriesId`, D38) for routines; a regular Journey stays per-Journey.
**Categorization:** **Approved — Vision (IN the app).** To be **defined by a product-manager PRD** +
**product-guardian gate**; `Product_Philosophy` / `Information_Architecture` must be updated so this is a
deliberate broadening, **not a silent redefinition** of Journey.
**Reflected in:** `Future/Recurring_Routine_PRD.md` (now Parked) + D38.
**PARKED (founder, 2026-08-11):** the founder decided **not to build a distinct "weekly routine"/Practice
object at this stage.** Small recurring tasks AND small goals go through the EXISTING `Dream → Journey → Step`
model like everything else; after real-world usage we revisit whether a distinct object is warranted.
Consequences (all MOOT for now, preserved for the revisit): the name (Practice vs routine), container-vs-
standalone, placement, the streak-includes-routine question, the Practice↔Dream anchoring, and the
product-guardian conditions C1–C8. `Recurring_Routine_PRD.md` moved to `Future/` with a Parked status. This
reverses only the "build it now," not the analysis.

### D40 — Daily-loop batch resolutions: Weekly Review, Dreams, reminders, support circle, notifications (2026-08-11)
Resolved with the founder 2026-08-11 across the PRD queue (each PRD to be updated to match):
- **Weekly Review:** **never show an empty next week** — always surface remaining Steps from other active
  Journeys, else a coach CTA to build a plan, else a Dream-based suggestion (a fitting existing Dream or one
  not yet addressed). Keep the user in motion. The screen opens with a past-week summary ("X Steps done",
  note frozen Journeys). A proposed plan-change is retained **≤48h**. Changes apply **forward-only**; already-
  reported/past data stays saved (immutable). Analysis stays on-device deterministic (Q1 hybrid: optional LLM
  narration behind the live-coach gate); free text not analyzed; retention rides the encrypted blob.
- **Dreams (Dream Management):** each Journey has **one PRIMARY Dream + optional secondary Dreams**
  (many-to-many with a primary; first UI slice exposes single-primary). The **coach OWNS the Dream layer** —
  it infers/formulates Dreams from the conversation, the **user does NOT approve**, and the coach may
  create/edit/delete Dreams freely. Sync invariants deferred to a backend.
- **Reminders:** account-level **Active Hours** (set at onboarding, editable in the Profile screen) are
  DISTINCT from **per-Journey reminder times**. An out-of-hours reminder is **moved earlier to fit (clamp),
  NOT disabled** — reusing the shipped clamp behavior + the postpone shorten-rule logic (so NO behavior
  reversal; this overrides the earlier "disable" recommendation and the PRDs' "never clamp" wording). **Smart
  mode deferred** (needs Weekly Review) — tracked as a follow-up so it isn't lost. Build order: account Active
  Hours → per-Journey Off/Fixed management (also migrate the creation-wizard reminder into the managed
  ReminderRule system) → Weekly Review → Smart. Per-series (`seriesId`) timing rides in with Smart, not now.
- **Support Circle (D2):** add a **consent/acceptance gate** before any sharing (and fix, in the same slice,
  the current bug where a removed friend keeps seeing shared snapshots). **The Companion bundle IS IN**
  (founder: consensual sharing with a chosen person is legitimate). **Scope refinement (founder 2026-08-11):**
  Companion for MVP shares **only system-generated Step progress (names + statuses)** — this is content the
  app created, not the user, so it is low-sensitivity and is NOT user-generated content. **No images and no
  cloud image storage in MVP** — proof images belong to `Accountability_Ally` (Future) only, which removes the
  storage cost. Owner-attached free text is **deferred to Accountability Ally too** (recommended, pending
  final founder confirm) so Companion MVP carries no UGC. Access is **revocable at any time**. Net: the only
  live requirement is a **light security-privacy pass** (row-level access + immediate revocation + fixing the
  removed-friend bug); **store-compliance (UGC/Apple 1.2) and cost-guardian are N/A for this slice**. Build
  against the real schema; validate with a seeded second account until general sign-up lands. Bundle names
  (Encourager/Companion) → product-guardian to ratify.
- **Notifications:** build a unified **notification service** as infrastructure now, with per-type templated
  phrasing that will later be **tone-driven** (ties to the unified communication style). Add **all nine**
  Support-Circle notification types now even if not all fire yet; more types are coming.
- **Friend messaging:** deferred post-MVP (honors D29) but **planned into the architecture now** (keep a seam).
- **Communication style:** ONE unified preference driving **both** the coach tone and notification copy,
  SELECTED via the (future) onboarding questionnaire.
- **Onboarding questionnaire (K2):** parked — not ready to spec.
- **Sync manifest:** produce a doc listing every area/field needing cross-device sync / server persistence so
  a future backend migration is turnkey; the app should behave identically across devices (not prioritized now).
**Categorization:** **Approved.** **Reflected in:** to be applied to `Weekly_Review`, `Dream_Management`,
`User_Active_Hours`, `Journey_Reminder_Management`, `Journey_Support_Circle`, `Communication_Style_Profile`,
`Friend_Profile` PRDs + a new Sync-Manifest doc.

### D41 — Journey completion is FINAL (a report reversal can never un-complete a Journey)
**Decision (founder, 2026-08-12):** resolves a real contradiction found between **Daily Step Reporting**
(D35/D36 — `reverseReport` reopened an auto-completed Journey, un-completing it) and the
**completion-celebration model** (D32/I1 — a Journey completion is a celebrated, **shareable, final**
moment). **Resolution: completion is FINAL.** Once a Journey is `completed`, its reports are **locked** —
`reverseReport` refuses when `journey.status === 'completed'` (or `completedAt` is set), so a report reversal
can never un-complete a Journey. In-week report correction applies to **active** Journeys only; a completed
Journey may be **deleted** (J2) but never **reopened**, which keeps the shareable achievement (D32) valid.
**Implemented 2026-08-12** (`JourneyEngine.reverseReport` guard; the D36 "reopens" test flipped to "REFUSES";
jest 661/661, tsc clean, eslint 0). **Design note for I1:** the completing check-in should be a
deliberate/celebrated moment (a gentle confirm, or the celebration itself) so an accidental final-Step
check-in doesn't permanently complete a Journey.
**Categorization:** **Approved + Implemented.** **Reflected in:** `Daily_Step_Reporting_PRD.md` (§7 + §12.2);
`app/src/core/engines/JourneyEngine.ts` (`reverseReport`).

### D42 — Completion Celebration (I1): MVP scope, deferrals, and the final-Step confirmation (2026-08-12)
**Decision (founder, 2026-08-12):** built the Completion Celebration (`PRD/Completion_Celebration_PRD.md`,
I1) with a deliberately scoped MVP slice. **Three founder calls this session:** (1) **Defer the in-app
Ally completion/thanks message** (PRD §5) — there is no delivery channel (no push backend; in-app messaging
is post-MVP per D29). The ceremony still offers the OS share sheet now; the in-app Ally path is tracked as a
follow-up (`MVP_Task_List.md` **I1-a**). (2) **Save the card as an image** stays in scope, but real
device-verified image export needs the not-yet-existing native build, so all native capture sits behind a
`CardShareGateway` seam with a degraded web/Expo-Go fallback (text share via `expo-sharing`); device
verification is follow-up **I1-b**. (3) **Add a gentle final-Step confirmation** before the last Step
completes a Journey (D41 makes completion final) — copy: "על ידי ביצוע הצעד הזה אתה מסיים את ה-Journey. לאשר?"
(gendered, en+he), wired once through a shared gate into all three completion paths (Home swipe, ⋯ report,
Journey-detail check-in). **Auto-open priority (founder default):** when a Weekly Review and a completion
ceremony are both pending, the **ceremony wins** and the review defers to the next foreground (one flippable
decision point, `COMPLETION_CEREMONY_WINS`; "one major event per foreground" enforced via per-foreground
latches reset on `AppState` active).
**Built:** small-celebration variants + reduced-motion guard + Settings toggle; the big ceremony (dedicated
modal route, idempotent card minted once at the first `completed` transition, auto-open latch mirroring
Weekly Review); the swipeable completion card (name-revealing + name-omitting variants, safe-fields-only,
privacy preview before share); the share gateway. **Reviewed** (code-reviewer + security-privacy): privacy
model sound (safe-field whitelist enforced, caption never persisted, card exported + wiped with the account);
fixed a HIGH i18n key bug (doubled `card.` prefix, now a single tested `cardCopyKey` seam) and a
Weekly-Review auto-open suppression bug. **Green: tsc clean · eslint 0 · jest 852/852.**
**Open (Low, founder's call):** the default card variant reveals the Journey name — consider defaulting to a
name-omitting variant for privacy on sensitive Journeys (privacy-review L1).
**Categorization:** **Approved + Implemented (MVP slice).** **Reflected in:** `Completion_Celebration_PRD.md`
(§0), `MVP_Task_List.md` (I1, I1-a, I1-b); `app/src/core/celebration/*`, `app/src/core/share/*`,
`app/src/app/completion.tsx`, `app/src/components/celebration/*`, `app/src/hooks/useFinalStepConfirm.ts`.

## 2026-08-13 — Weekly Review closed; overnight autonomous build batch (J5, L1, F1, D2)

> Continues the branch `feat/buddy-3d-and-reminders`. The founder pre-authorized autonomous execution
> overnight; each item was built → adversarially reviewed (code-reviewer + security-privacy) →
> findings fixed → green. Final state: `tsc` clean · `eslint` 0 · `jest` 916/916. Everything is
> committed by topic but not pushed. Full narrative: `Current_Context.md` → "⭐ HANDOFF SNAPSHOT —
> 2026-08-13".

### D43 — Weekly Review: the two-layer split is authoritative; apply-on-approval, not automatic
**Decision:** closes a wording ambiguity between the founder's original 2026-08-07 direction and the
ratified/shipped behavior. The system has exactly **two layers** of plan change, and they must never be
confused:
1. **Tactical layer (immediate):** per-occurrence recovery (Step postponement, D37) and direct user
   edits to a Journey (coach-led, J1) apply **immediately**, effective the moment the user acts.
2. **Strategic layer (weekly boundary):** Weekly Review analyses the past week and proposes next
   week's plan **at the week close/open boundary**. The proposal is retained for **≤48h** and **owns
   the plan for that window** — but it never applies silently. It applies **only on the user's
   explicit approval** (or expires unapplied at the 48h mark), per `Weekly_Review_PRD.md` §1/§2
   ("meaningful Journey changes never apply without explicit user approval").
**Wording correction:** `MVP_Task_List.md`'s original C1 line (carried from the founder's 2026-08-07
note in `Current_Context.md`, and repeated in D40's Weekly Review summary bullet) said the weekly plan
"applies automatically... for the coming week." That phrasing is **superseded** by the ratified PRD and
the shipped code — apply-on-approval, not a silent daily/automatic apply. The 2026-08-07
`Current_Context.md` snapshot is left unchanged as accurate history of the founder's original framing;
only the now-stale `MVP_Task_List.md` C1 row is corrected.
**Why:** a silent automatic re-plan would contradict the product's trust model (the user must always
see and approve a change to their week) and would collide with D41 (Journey completion is final) and
the PRD's own "the previous valid plan remains active while a proposal awaits a decision" principle.
Naming the two-layer split explicitly (rather than leaving it implicit inside D40's Weekly Review
bullet) prevents this ambiguity recurring as the feature evolves (Smart reminder timing, D2 lifecycle
notices, etc.).
**Status (2026-08-13):** C1 was found **already built** during tonight's work — a real week-boundary
trigger (`weekGate`), a real `weekly-review.tsx` screen, forward-only apply-on-approval,
`adaptiveEnabled`-gated (so production stays dormant). Tonight only closed the gap with 4 new coverage
tests (flag-off inert, empty-week, 48h expiry, late-approval rebase).
**Categorization:** **Approved + Implemented.** **Reflected in:** `Weekly_Review_PRD.md` (§1/§2,
already correctly worded); `MVP_Task_List.md` (C1 row, wording corrected); the weekly-review test
suite.

### D44 — Overnight build batch: inactivity freeze (J5, local-first), parked goals (L1), Dream surfacing (F1, initial cut), Support Circle hardening (D2)
**Decision / session record** (founder pre-authorized autonomous execution; each item built →
adversarially reviewed by code-reviewer + security-privacy → findings fixed → green):

1. **J5 — Account Inactivity Freeze, LOCAL-FIRST POC.** Per `Account_Inactivity_Freeze_PRD.md`
   (Ready), built a pure `InactivityEngine` reusing the existing J3 frozen path via a new
   `Journey.freezeReason` provenance field (`manual` vs `account_inactivity`, matching PRD §4); a
   21-day threshold (`config/inactivityPolicy.ts`); a lazy foreground-evaluated tick (no server job);
   a return flow (`return.tsx`) offering Talk-to-coach / Choose-Journeys-to-resume / Not-now — **never
   auto-resumes**, matching the PRD's core promise. Review found and fixed a **HIGH** bug (freeze
   could re-arm across cycles) and a **MEDIUM** bug (a zero-frozen cycle left an undismissable CTA).
   **Deferred — server-authoritative enforcement:** freezing exactly at-the-mark while the app is
   closed, authoritative server time, multi-device consistency, and Ally lifecycle notices (PRD §3/§6)
   all need a backend and are explicitly NOT built — the local-first POC only evaluates on foreground
   open, using device time. This is a scoped, honest MVP-POC slice, not a silent gap: safe for the
   founder's own single-device testing, not yet correct for a multi-device or server-timed release.
2. **L1 — Parked (deferred) goals.** Coach-detected extra goals (`GoalSpec.deferredGoals`) now persist
   to `AppState.parkedGoals` instead of being dropped once the conversation instance ends. Surfaced on
   the Journeys "For later"/Future tab; **activatable** into a real Journey (reuses the existing
   `createJourneyFromGoalSpec`, so no new Journey-creation path); **dismissable**. **Sensitive-domain
   goals (addiction/relationships) are filtered at capture AND guarded again at activation** via a
   shared `core/coach/sensitiveDomains.ts` — a deliberate double-gate so a sensitive goal can never
   reach a Journey through the parked-goals side door, consistent with D24's gating of those domains.
3. **F1 — Dream creation, INITIAL surfacing cut only.** Added: a My Journeys → My Dreams nav entry; a
   read-only "Part of your Dream" card on the Journey detail screen; a link-approval card for Journeys
   not yet linked to a Dream (reuses the already-tested `linkJourneyToDream`). **The coach
   Dream-authoring conversation itself (the coach actually creating/naming a Dream from conversation)
   is explicitly DEFERRED** to a joint design session — open questions remain in
   `Dream_Management_PRD.md`. This slice is surfacing/linking only, not Dream creation. Note: this does
   not touch D40's "coach owns the Dream layer, no user approval to create/edit" model — the
   link-approval card here approves *attaching an existing Journey to an existing Dream*, a distinct,
   still-approval-gated action from Dream creation itself.
4. **D2 — Journey Support Circle hardening (correcting a stale task-list line).**
   `MVP_Task_List.md`'s D2 row said "no screen calls [`setAllies`] — a user cannot currently
   propose/name an Ally in-app," but the real Journey Support Circle (consent gate + propose/accept UX
   + the Companion bundle) was **already built** in the D40 work (commit `b3a9ff5`, see
   `Journey_Support_Circle_PRD.md`). That row was simply stale; corrected tonight. Tonight's actual
   work was **hardening**, not building from scratch: hid the invite CTA on completed/frozen Journeys
   (inviting an Ally to a Journey that can no longer progress is a dead end); distinguished an
   offline-load-failure state from a genuinely-empty Support Circle (previously indistinguishable,
   risking a user believing they have no Support Circle when the real cause is network); added the
   missing UI test coverage. **Flagged, not fixed tonight (LOW, latent):** the older `setAllies` write
   path bypasses the Companion coach-Journeys-only gate (D40's scope restriction) — no caller reaches
   it today so it is inert, but it should be **retired or guarded** so a future caller can't silently
   reintroduce ungated Ally sharing.

**Why (shared reasoning across all four):** each was picked because it was fully executable without
founder input tonight (a closed PRD spec, or a straightforward code-grounding correction), per CLAUDE.md
§3.8 ("solve autonomously, escalate sparingly"). None required a founder aesthetic/positioning call —
J5/L1/D2 had closed specs (PRDs Ready, or already-built code needing only correction/hardening); F1 was
deliberately capped to the surfacing-only slice specifically because the remaining piece (coach
Dream-authoring) does need founder/design input, so it was left out rather than guessed at.
**Verification:** built → adversarially reviewed (code-reviewer + security-privacy) → findings fixed →
green throughout this batch: `tsc` clean · `eslint` 0 · **`jest` 916/916**.
**Categorization:** **Approved + Implemented** (J5 local-first POC, L1, F1 initial cut, D2 hardening) +
**Open/Deferred** (J5 server-authoritative enforcement; F1 coach Dream-authoring conversation; D2
live-DB authorization-matrix QA + the latent `setAllies` gap; L1's user-facing label / cap /
activation-mechanics need founder confirmation).
**Reflected in:** `MVP_Task_List.md` (J5, L1, F1, D2 rows); `PRD/Account_Inactivity_Freeze_PRD.md`;
`PRD/Journey_Support_Circle_PRD.md`; `PRD/Dream_Management_PRD.md`; `Current_Context.md` (2026-08-13
overnight snapshot).

### D45 — Buddy / avatar DEFERRED to Future; the coach (meta-agent) is the MVP's central user-facing entity
**Decision:** The Buddy companion/avatar is **deferred to Future — it is NOT part of the MVP.**
Currently there is no avatar and no Buddy in the app; the user talks directly to the **coach** (the
meta-agent, see D30), which is the MVP's central user-facing entity. The Buddy vision itself is **not
cut** — it is fully preserved and may be reintroduced post-MVP (per CLAUDE.md §3.3, "the vision never
shrinks — move it later, never delete").
**Why now:** this resolves a standing tension in the repository between two philosophy/principle docs
written when Buddy was the active design (`AI_Product_Principles.md` Principle 9, "Buddy Is The
Experience" — present the AI through Buddy; and `09_Product_Philosophy/Product_Terminology.md`'s "Buddy"
entry — "Buddy becomes the emotional face of PushApp") and the mature-redesign / AI-adaptive-coach
direction already shipped in the app (origin: the 2026-08-07 mature-redesign snapshot in
`Current_Context.md`, which removed the Buddy tab from the navigation and made the coach the primary
AI-facing surface; formalized as the meta-agent being the sole user-facing voice in D30, 2026-08-09).
Those docs were never updated to reflect that the avatar had already been dropped from the shipped
product — this decision makes the staging explicit rather than leaving an unresolved contradiction.
**What does NOT change:** "Buddy" remains the **canonical term** for the deferred companion/avatar
concept — it is not renamed, and no synonym is introduced. All existing Buddy reasoning (why it exists,
what it represents, its role in the reward loop/economy, its Future-vision depth) stays intact in the
docs, annotated with a Future/deferred stage marker rather than deleted or rewritten.
**Categorization:** **Approved** (product direction; re-staging, not a new invention).
**Reflected in:** `AI_Product_Principles.md` (Principle 9 annotated), `09_Product_Philosophy/
Product_Terminology.md` ("Buddy" entry annotated), `04_Product/Version_Roadmap.md` (Future entry for
Buddy/avatar reintroduction), `Current_Context.md` (2026-08-13 snapshot note).

## 2026-08-13 (continued) — Journey cancellation model; partner-content terminology resolved

> Same day, a second founder pass: answers to `Journey_Abandonment_PRD.md` §12 (the open questions from
> the initial 2026-08-13 spec) and to the terminology audit of `10_Partner_Coaching_Content/`.

### D46 — Journey cancellation: irreversible with no undo, Future Journeys are deleted not canceled, History tab approved, inactivity-return offers cancel
**Decision (founder, 2026-08-13):** four linked calls that resolve five of the seven open questions in
`Journey_Abandonment_PRD.md` §12:
1. **Cancelling a Journey is IRREVERSIBLE.** No undo window of any kind. Pressing the action raises a
   confirmation that asks the user whether they are sure **and states plainly that the action is
   irreversible**; on confirm it is done and final.
2. **The "Completed" tab is renamed "History"** (Hebrew "היסטוריה"), with **Completed** and **Stopped**
   grouped inside it — approved exactly as recommended.
3. **A Future Journey is DELETED, not cancelled — it simply disappears.** It has no history to preserve,
   so Delete is the honest action; the Journey-detail action is **Delete** for a `future` Journey and
   **Cancel** for an active or frozen one, never both.
4. **The inactivity-return screen also offers cancelling a Journey**, per-Journey, alongside Resume.
5. **"Start again" appears only for FROZEN Journeys** — meaning there is **no restart-from-cancelled
   path.** Verified against the shipped code (`JourneyEngine.resumeJourney`, surfaced as "Resume journey"
   / "חידוש המסע" on the Journey-detail screen and "Choose Journeys to resume" / "חידוש" on the
   inactivity-return screen): this is the **existing Resume affordance**, not a new feature — nothing new
   needs to be built for it.
**Rejected, and why (preserved, not discarded):**
- **A short (~10s) undo window after cancelling** — the PRD's own recommendation, built on the reasoning
  that "the splice is genuine data loss and mistaps are real." The founder heard this and declined it
  anyway; no verbatim reason was captured, so none is invented here, but the outcome is firm: no undo,
  immediate or delayed.
- **"Start it again as a new Journey," seeded from a canceled one** — the PRD's recommended fast-follow
  restart path for a *canceled* Journey. Superseded by point 5 above: the founder's "start again" refers
  only to the frozen-Journey case (the existing Resume), so this seeded-restart idea for canceled
  Journeys is not being built, not now and not later as currently scoped.
- **Allowing Cancel (not just Delete) on a Future Journey**, the PRD's primary recommendation for §7.2 —
  the founder chose the PRD's own noted counter-argument instead (zero history means nothing to
  preserve, so Delete is the honest and only action).
**Why:** finality mirrors D41 (Journey completion is FINAL) — one coherent rule that terminal states are
terminal and only Pause/Freeze is reversible; a tab named "Completed" holding canceled Journeys would be
a label that lies; a Future Journey has no lived history, so "cancel, keep what I did" doesn't apply to
it; the inactivity-return screen is exactly the moment a user decides whether a paused thing is worth
resuming, so offering cancel there (not just resume-or-nothing) matches user intent honestly.
**Still open (not answered this session):** how loudly stopping is affirmed and whether the Support
Circle gets an owner-initiated "I'm stopping this one" note (§12.4); whether cancelled Journeys ever
appear under their Dream (§12.6).
**Categorization:** **Approved.**
**Reflected in:** `04_Product/PRD/Journey_Abandonment_PRD.md` (§5.7, §5.8, §7.1, §7.2, §8.1, §8.3, §8.4,
§12, §13.2, §14 — each resolution recorded in place, prior recommendations and rejected alternatives kept
intact).

### D47 — Ally = whoever the user added to the Support Circle; real-world supporters are not modeled
**Decision (founder, 2026-08-13, from the terminology audit of `10_Partner_Coaching_Content/`):** **An
Ally is whoever the user chose to add to the Support Circle. Nothing else.** This settles an ambiguity
found in the partner's addiction on-call content, which used "Ally/support" to also mean a sponsor, a
clinician, or family — none of whom are Allies in PushApp's model, and none of whom are currently modeled
as any in-app object.
**Consequence, made explicit:** when the coach refers to real-world support (a sponsor, a clinician, a
family member, "someone you trust"), it must speak in **plain language** — never the term "Ally," and it
must **never route a user to the in-app Ally/Support Circle list as if it were crisis support.** The
in-app Support Circle is Journey-scoped, consensual, and not a safety mechanism; conflating it with
real-world crisis support would be actively unsafe. This connects to the still-open safety-floor gate on
the Addiction and Relationships & Loneliness domains (D24) — this decision does not close that gate, it
only prevents one specific way the product could mislead a user before it does.
**Left open, deliberately not decided today:** whether real-world supporters (sponsor, clinician, family)
should ever be modeled as their own in-app concept. The founder did not say, and product-guardian's
advice — followed here — was **not to invent a term for this before the underlying vision question is
answered.** No new terminology is introduced for this pass; the audit's own fix (widening the partner
content's generic "Ally" uses to also name a sponsor/clinician/family member in plain language) already
matches this decision and needed no further change.
**Also from this audit pass (not a Decision Log item on its own, recorded here for provenance):** the
Dreams screen stays user-visible for now (helps testing), settling the partner content's position that
the coach should own Dreams as an internal-only abstraction — our Dream stays user-visible, with the
decision explicitly marked revisitable. See `10_Partner_Coaching_Content/PARTNER_FILE_MANIFEST.md`.
**Categorization:** **Approved** (the Ally definition) + **Open Question** (whether real-world supporters
are ever modeled).
**Reflected in:** `10_Partner_Coaching_Content/PARTNER_FILE_MANIFEST.md` (resolution note appended);
`09_Product_Philosophy/Product_Terminology.md` (Ally entry — checked against this decision; see that
file's own note on whether it needed sharpening).

## 2026-08-14 — Partner content, second terminology pass: `intervention` split, Meta-Coach resolved, ONE Weekly Review

> Second editing pass over `10_Partner_Coaching_Content/` (the external coaching partner's v1.1
> package), under the same founder rule as the first: partner files may be edited for terminology
> alignment, **PushApp's own code is not changed to accommodate them**, and nothing there is wired
> into the app. The reply the founder will send the partner is
> `04_Product/Partner_Reply_Terminology_2026-08-13.md`.

### D48 — `intervention` keeps its PushApp meaning (proactive); the partner's reactive coaching move becomes `comment`
**Decision (founder, 2026-08-13/14):** the two vocabularies use the same word for opposite things, so
each sense keeps its own word:
- **Ours — `intervention`: a proactive action PushApp initiates** — a notification, a reminder, an
  outreach. Unchanged; this is the definition already in `Product_Terminology.md`.
- **Theirs — a reactive coaching move made inside a conversation the user started** — renamed
  **`comment`**. Their `prepared intervention` / `micro-intervention` headings are now
  `Prepared comment` / `one prepared comment`.
**Why both words were needed:** the difference is *who initiates*, and that is not cosmetic — it decides
which engine owns the behaviour. A proactive intervention is scheduled work the product does while the
user is absent (Communication Scheduler, notification permission, quiet hours, D21); a reactive comment
is something the coach says in a turn the user opened, and it has no scheduling, permission or
quiet-hours dimension at all. Collapsing them into one term would have let on-call conversational
content be read as licence to push notifications, which is exactly the kind of drift the privacy
red-lines exist to stop. Renaming ours instead was rejected: `intervention` is load-bearing in our own
docs, and it is the accurate word for the proactive sense.
**Explicitly not renamed:** the **45 academic/clinical uses** — "intervention research",
"behaviour-change interventions", NICE guidance, meta-analysis citations (Masi, Liu/Huang/Wang, Guest,
Alleva, Oprea, CDC). Those name cited literature; rewriting them would misrepresent the sources.
**Categorization:** **Approved.**
**Reflected in:** `09_Product_Philosophy/Product_Terminology.md` (Intervention entry sharpened, with
`comment` recorded as the partner-side counterpart); `10_Partner_Coaching_Content/` (53 occurrences
renamed across 6 files + the consolidated bundle, logged in `PARTNER_FILE_MANIFEST.md`);
`04_Product/Partner_Reply_Terminology_2026-08-13.md` §3.2.

### D49 — The partner's "Meta-Coach" is our coach (user-facing) / meta-agent (architecture)
**Decision (founder, 2026-08-13/14):** the partner's **Meta-Coach** is the same entity we call **the
coach**, whose internal architectural name is **meta-agent** (D30). Their content is aligned to ours:
**"the coach"** where the sentence is about what the user experiences (identity, voice, what the coach
says or must not say, safety wording the user reads), **"meta-agent"** where it is architecture (spec
metadata, Dream ownership, Expert consultation and routing, on-call hand-back to the orchestrating
layer). 111 occurrences across 27 files, judged one at a time rather than swapped as a token.
**Our own fault, named plainly:** the partner did not disobey the brief — **`meta-agent` existed only in
D30 and `04_Product/Domain_Expert_Authoring_Guide.md`, and was missing from the canonical terminology
document**, which is the one place an outside author would look. That gap is the reason the drift
happened, and it is now closed (see below). This is the second time a partner-facing term was
under-documented on our side; the rule going forward is that a term is not canonical until it is in
`Product_Terminology.md`.
**Filenames deliberately unchanged:** `Master_Specs_Original/15_Meta_Coach_Master_Spec.md` and
`Calibration/14_Meta_Coach_Calibration_24_Cases.md` keep their names so the package stays traceable to
the zip the partner sent, and so the manifest's hashes stay comparable with their originals. Content
inside them uses our naming; the mismatch is intentional and recorded in the manifest.
**Categorization:** **Approved.**
**Reflected in:** `09_Product_Philosophy/Product_Terminology.md` (new **Meta-agent** entry);
`10_Partner_Coaching_Content/` (111 occurrences, logged in `PARTNER_FILE_MANIFEST.md`);
`04_Product/Partner_Reply_Terminology_2026-08-13.md` §3.1.

### D50 — There is exactly ONE Weekly Review; per-Journey and per-expert content nests inside it
**Decision (founder, 2026-08-13):** the partner's per-Journey weekly adherence review — the
`STABILIZE / ADAPT / PROGRESS` decision in
`10_Partner_Coaching_Content/01_Eating_Daily_Consistency_Progression.md` §7 — **does not become a second
object.** It **nests inside our existing Weekly Review** (`04_Product/PRD/Done/Weekly_Review_PRD.md`,
D40/D43).
**The founder's framing, which is the architectural part:** *the Weekly Review is a shared mechanism
available to every domain expert and every Journey, into which they can contribute information for
display.* So there is one Weekly Review surface, one week boundary, one 48-hour approval window — and
per-Journey and per-expert content is nested content **within** it, not a parallel ritual with the same
name.
**Why:** two weekly rituals would compete for the same week boundary and the same approval moment, and
the user would have to learn which one owns their plan. It would also fork the trust model D43 protects
(nothing applies without one explicit approval). Treating the Weekly Review as a shared contribution
surface keeps the domain experts where D30 puts them — internal tools that feed the meta-agent, never a
second user-facing voice.
**Flagged, not built:** this gives the Weekly Review a **contribution slot that does not exist in the
code today.** `Weekly_Review_PRD.md` §6/§7 defines review inputs and Journey-level analysis as
first-party logic; there is no interface for a domain expert to contribute a per-Journey block for
display, and none was added. **This is a future implementation item**, to be specified before any
partner content is wired — which, per the folder's standing rule, it is not.
**Categorization:** **Approved** (the architecture) + **Future** (the contribution slot itself).
**Reflected in:** `04_Product/Partner_Reply_Terminology_2026-08-13.md` §3.5;
`10_Partner_Coaching_Content/PARTNER_FILE_MANIFEST.md` (second-pass note). `Weekly_Review_PRD.md` is in
`04_Product/PRD/Done/` and is immutable — it was **not** edited; when the contribution slot is built it
needs its own PRD delta.
**Delta written (2026-08-14):** that PRD delta now exists as
`04_Product/PRD/Weekly_Review_Contributions_02_PRD.md` — the contribution contract (three kinds:
display-only `note`, verifiable `evidence`, and a `proposal` that inherits D43's single atomic 48h
approval gate unchanged), D30 re-voicing through the meta-agent's own intent templates, volume caps,
empty/degraded states, the on-device privacy red lines, and a cross-check confirming
`Smart_Notification_Timing_PRD.md` §6 is a strict instance of this contract rather than a conflict.
**Still Future — approved architecture, interface not built, not scheduled**, with 7 open founder
questions in its §14 (the sharpest being whether the change vocabulary grows to cover the partner's
`context`/`busyDayVersion`, without which `PROGRESS`-by-context is inexpressible).

### D51 — A Journey always has an end date; it moves ONLY when the user explicitly says so (no automatic extension, and no ceiling)
**Decision (founder, 2026-08-14, in two passes on the same day):**

**Pass 1 — finiteness and explicit extension.** *"There is no need for a Journey without an end date. Every
Journey is initially planned for up to two months and remains a finite process. If postponing a Step moves
work past the end date, the Journey may be extended — but only following an explicit user action and
approval. The extension is never automatic."*

**Pass 2 — the ceiling question, resolved.** *"It's fine for a Journey to become infinite if the user
**actively** extends it. The two-month decision is for their benefit, but if they choose to extend, that is
their decision and we respect it."*

**What is settled:** (1) a Journey always has an end date — there is no open-ended Journey; (2) the
**two-month planning window is guidance, not a cap**, and its job is to stop people over-committing at the
moment they plan, which is when over-committing happens; (3) **there is no hard ceiling on extension** — a
Journey may be extended repeatedly and may in practice run indefinitely; (4) **every extension requires an
explicit user action and approval**, from a real user-facing moment, with no automatic extension from any
caller, ever.

**The invariant, stated so nobody has to infer it:** *a Journey's end date only ever moves because the user
said so.* What the design prevents is **drift without consent**, not length. That line is absolute: an end
date that moves automatically, silently, or as a side effect of another action is forbidden — including
from the inactivity freeze (J5), the Weekly Review, the `deferDependents` cascade and the adaptive planner.

**Why, and why it is consistent with how we already work:** this is the same stance as **D46** (Journey
cancellation is irreversible, with no undo). The app may make a heavy action quiet and deliberate, and may
explain the consequences honestly, but once the person has understood and chosen, their decision is
**respected, not fought**. The product's job is to inform the choice, never to overrule it. D46 and D51
read as one stance, not two unrelated calls. A hard cap would have been the app deciding it knows a user's
life better than they do, which is the paternalism the mission rejects. And "a Journey is a finite
transformation" stays true: that is a claim about the object's *shape* — it always has a last day and a
defined set of Steps, and it never becomes an open-ended recurring object (the deliberately parked Practice
model, D39) — not a promise about the number 60.

**Growth-before-engagement tension, recorded rather than hidden:** extension unbounded by consent could in
principle prolong a Journey that should have been reshaped or let go. The safeguard chosen is
**measurement, not a gate**: completion rate of extended vs non-extended Journeys, days past planned end at
completion, and the "many extensions, never completes" pattern (`Step_Postponement_02_PRD.md` §12). If the
data shows extending hurts real follow-through, the response is better planning up front and an earlier
route to the coach-led Journey-edit conversation — never a cap imposed on the user.

**Code truth this corrects (verified 2026-08-14, not assumed):** a postponement today writes only the four
per-occurrence Step fields (`postponedUntil`, `postponedAt`, `postponeCount`, `postponeNotificationId`)
plus one OS notification. **No path writes `Journey.durationDays` or any end date**, so a postponement past
the last day currently strands work outside the Journey's window with nothing recorded anywhere. There is
no extension mechanism to modify; it has to be built. The same work must fix `AppCore.journeyEndsAt`, which
anchors on `createdAt` while `journeyView.endsAt` anchors on `effectiveStartAt` — so the two disagree for
any Journey activated later than it was created, and the existing `crosses_journey_end` warning misfires
for Future Journeys.

**Addendum — third pass, same day (2026-08-14): two of the original eight §14 questions answered.**

1. **~~A manual Pause/Resume freeze (J3) gives the time back by extending the end date.~~ SUPERSEDED the
   same day by the fourth pass below — see "Addendum — fourth pass".** Recorded here rather than deleted,
   because the reasoning is still load-bearing. **The superseded answer:** *"Yes, a freeze should also
   extend the remaining time. On resume we calculate how long the Journey was frozen and add it to the end
   date."* — implemented as a `cause: 'freeze_credit'` entry on the append-only extension ledger, computed
   automatically inside `resumeJourney`, with no separate approval sheet, scoped to J3 only because J5 has
   no Pause-tap consent moment. **Why it was superseded:** adding days to the end date leaves **every Step
   exactly where it was**, so a Journey paused on a Sunday and resumed a month later on a Thursday keeps
   Steps planned for Sundays — dates now in the past, on a weekday the person did not choose. The window
   became honest and the plan became fiction. **What survives intact and is carried forward:** the consent
   reconciliation this pass established — the invariant is about **consent**, not about which caller writes
   a field; an extension-after-postponement adds time *beyond* the approved plan and needs its own consent
   (the §7 sheet), whereas restoring the working length of a plan the user already approved adds nothing
   beyond it, and failing to give the time back would *itself* be the drift the invariant exists to
   prevent. That argument is why the fourth pass's rebuild needs no *new* approval for the window moving.
2. **Nothing needs to happen on a Journey's last day beyond the existing celebration.** *"Nothing needs to
   happen on the last day. After a Journey ends there is a celebration, and that is enough."* The completion
   ceremony (**I1/D42**) stays the only end-of-Journey moment; a pre-end nudge, a countdown and a plan-review
   prompt were each considered and are declined, not merely unbuilt. **This answer stands, unaffected by the
   fourth pass.**

**Addendum — fourth pass, same day (2026-08-14): the founder corrects the third pass and closes three more
questions.** This addendum **supersedes point 1 above**. It does not take a new decision number: it is the
same decision, corrected.

1. **A pause is not compensated — the remainder is RE-PLANNED.** The founder's correction:

   > "I don't see this as compensation. It is simply continuing the plan (the Journey) from the point where
   > we stopped, without changing the Journey's structure. **The restart point becomes the start point for
   > the remaining part of the Journey.** And yes, all the Steps should also be recalculated accordingly. In
   > practice, if the user stopped the plan on a Sunday and restarted it a month later on a Thursday, the
   > remaining part of the Journey has to be **re-planned** — so what is needed here is a rebuild process
   > that essentially keeps the same plan and adapts it to the restart time.
   >
   > Also, at restart we could **ask the user what caused them to stop and whether they have any notes** they
   > want to give before the plan is rebuilt — and then take what they say into account and rebuild it better."

   **What this settles.** The operation is a **rebuild of the remainder anchored at the resume instant**, not
   arithmetic on an end date. Every unreported, undropped, dated Step is recalculated; the Journey's
   *structure* is untouched (order, spacing, Milestones, the "why", the Support Circle, reminder rules and
   every id are preserved); and **the end date moves only as a consequence of the rebuild, never as the
   operation itself**. At the resume the user may optionally be asked what made them stop, with the answer
   used as context for the rebuild. Full mechanics — scope rule, weekday re-anchoring, reuse of the existing
   rebase, the resume conversation, the ledger consequence, events and edge cases — are in
   `04_Product/PRD/Step_Postponement_02_PRD.md` §14 Q5.1–Q5.7.

   **Why the correction matters beyond this feature:** it distinguishes *bookkeeping* from *the plan*. An app
   that gives back the days but not the fit has satisfied its own ledger and not the person — which is
   exactly the growth-before-engagement test in `CLAUDE.md` §3.4.

2. **The automatic J5 inactivity freeze gets the same treatment as J3 — Q9 resolved.** The third pass left
   this open because J5 has no Pause tap to point at as consent. Under the re-plan model the consent moment
   is no longer the *freeze* but the **resume**, and a resume is an explicit user action in both cases:
   `app/src/app/return.tsx` **never auto-resumes** — it offers Talk to the Coach / Choose Journeys to resume
   / Not now, and each Journey is picked back up by its own tap, with Keep it paused and Cancel it as equal
   alternatives. One code path, not two; the only surviving difference is `freezeReason` provenance.

3. **Allies see a status tag, and nothing about the window.** *Allies "should see a tag of the Journey's
   status (changed to paused or resumed), but for now there is no display beyond that."* **Approved as a
   rule; not expressible in today's code** — a real finding, not a detail: `ProgressSummary`
   (`app/src/core/social/SocialGateway.ts`) is a strict four-field whitelist (`journeyId`, `title`,
   `progress`, `streak`) with **no status field**, and `SocialProvider.publishAll` gates on the positive
   `isRunning` predicate and **withdraws** a paused Journey's summary entirely — so today a paused Journey
   *disappears* from an Ally's view rather than showing as paused. Expressing the tag requires adding one
   narrowly-projected `status: 'active' | 'paused'` field (never the raw `JourneyStatus`, which would leak
   `completed`/`abandoned`) and changing the publish gate to a two-branch rule that still withdraws
   everything else. That widens a whitelist whose own comment forbids widening it without review, so it is
   **Proposed, pending a security-privacy review**.

4. **An extension is NOT reversible.** *"the Step is the thing that was postponed and therefore the Journey
   was extended, so this action cannot really be undone."* The extension is the *consequence* of an event
   that already happened; undoing it would strand the postponed Step outside the window again, which is the
   failure the feature exists to fix. Same stance as **D46**. **Consequence:** the §7 confirmation copy must
   be honest about finality — as a stated fact, never as a warning, and with none of §7's forbidden
   vocabulary (no icon, no red, no "Are you sure?").

**Categorization:** **Approved** — the fourth pass's four answers, plus the third pass's last-day answer.
**Superseded** — the third pass's freeze-credit model (preserved above and in `Step_Postponement_02_PRD.md`
§14 Q5.0.a with the reason). **Proposed, pending security-privacy review** — the Ally status-tag mechanism.
**Open Question** — four items remain in `Step_Postponement_02_PRD.md` §14: **Q1** (what is shown at the
extension moment — the founder decided the rule, not the copy), **Q2** (the wizard's 90-day option), **Q3**
(whether an extension also moves `plannedFor`), **Q6** (the `deferDependents` cascade); plus **Q8b** (what
the completion card shows), which is a design question for ux-designer + content-writer rather than a
founder ruling, and whether Journey-level pause reasons should be added to the closed reason list.
**Reflected in:** `04_Product/PRD/Step_Postponement_02_PRD.md` (the continuation PRD: the model
recommendation, the exact trigger, the approval moment, lifecycle interactions, metrics and open
questions — §14 Q4 decided in place; §14 Q5 **rewritten** as the re-plan model with the superseded credit
design preserved in Q5.0.a; Q7/Q8/Q9 decided in place; Q8b opened; §5 reconciled with the ledger's second
cause; §9's J3/J5 rows, §11's privacy rules, §16's acceptance direction and §17's categorization updated to
match); `04_Product/PRD/README.md` (index); `04_Product/PRD/PRD_Coverage_Gaps.md` PC-26 (the gap this closes
at the specification level; the implementation gap remains).
`04_Product/PRD/Done/Step_Postponement_PRD.md` (D37) is immutable and was **not** edited; nothing in it is
rescinded.

### D52 — A shared Plan Library is OUR data; a minimal, non-personal outcome record may leave the device (the Spotify model, with a stricter allowlist)
**Decision (founder, 2026-08-17), in two passes in the same conversation.**

**Pass 1 — the boundary, drawn by the founder himself:**

> "The whole idea of the app is that we succeed in learning which plans are better. We want to learn how
> to best help the user — and to do that we must understand which plans are good in which cases and for
> which users. **We must manage this database.** There is no problem storing a plan library on our side —
> it is not sensitive client data, in fact it is not client data at all, **it is our data**. The client's
> progress, or personal details they gave us, we will not store and will not take off their device. But we
> do want to build **some profile** of each client so we know how to match the right plans to them."

**Pass 2 — after the team compared the idea to Spotify's server-side collaborative filtering:**

> "That is exactly what I mean. We will define exactly the structure of the information that goes from the
> device to us. That structure will not include sensitive information, only parameters that are essential
> for us in order to learn and improve. We will also do our best to encrypt the information properly. **So
> in summary, I am in favour of working like Spotify.**"

**What is settled.** (1) PushApp maintains a **Plan Library** — a versioned corpus of authored Plan
Templates — on our side. It is our content, not client data, and holding it raises no privacy question.
(2) A **minimal, strictly-allowlisted outcome record** may leave the device to tell us how a template
performed. (3) The **structure of what leaves is defined by us in advance and is closed**, never
open-ended and never a general telemetry stream. (4) The founder's own line stands as the design rule:
**outcome and category, never story** — *plan of type X, given to a user in category Y, reached 70%
completion, broke in week 3*; never why they wanted it, never anything they typed.

**The boundary the founder drew, restated so nobody has to infer it:** progress, personal details, and
everything the user wrote **stay on the device**. What may leave describes **the plan's performance**, in
buckets, attached to a coarse category of user rather than to a user. Every existing red line in
`11_Engineering_Bible/Sync_Manifest.md` §4 and every G1/G2 comment in `SocialGateway.ts` /
`domain.ts` survives this decision **unweakened**; this opens a new, narrow path and reinterprets none of
the old ones.

**Why the comparison to Spotify produced this, and where we deliberately diverge.** Spotify does
collaborative filtering server-side because taste has no describable features: you cannot say "songs like
this" without enumerating the crowd, so the full user × item matrix has to sit in one place. **Our problem
is different in a way that matters.** A person's fit to a plan *is* describable — baseline, available
time, cadence, feasibility, primary obstacle — and those are exactly the small categorical values the
interview already computes on device. That means **cohort-level aggregates are sufficient and a user × item
matrix is not needed**, which in turn means the outbound record does not need to be linked to a person at
all. The team's recommendation, therefore, is a **hybrid: learn centrally, match locally** — the server
publishes a template corpus plus cohort-conditioned scores, and the device does the matching using the
rich local signals (the free-text goal, "Other" answers, reason log, behaviour log) that must never leave.
Two consequences worth recording: a user who contributes nothing receives **exactly the same product
quality**, which is what makes an honest opt-in affordable rather than coercive; and the manifest must be
fetched **whole from an unauthenticated URL identical for every user**, because slicing it by domain would
leak the user's domain through ordinary request logs.

**The sensitivity asymmetry, recorded because it is the reason the allowlist is stricter than Spotify's,
not looser.** Spotify's worst case is a leaked listening history. Ours would be a leaked record of **what
people are trying to change about their lives**, in a product whose four domains (D24) include addiction
and relationships/loneliness. The FTC has treated app-collected mental-health questionnaire data as
sensitive health information (BetterHelp, $7.8M, 2023; a $7M settlement proposed against Cerebral), and
under GDPR Art. 9 health data is a special category for which pseudonymisation is not a defence where
re-identification is reasonably possible. Also recorded honestly: **small categorical vectors are far more
identifying than they look** (Sweeney: ZIP + date of birth + sex uniquely identifies 87% of the US
population), so the specified mitigations — coarse buckets, no demographics at all, at most one obstacle
code, a server-side k-anonymity gate, no row-level ingestion timestamp, randomised delayed batched upload,
and physical separation from the social backend — are load-bearing rather than decorative. And encryption,
which the founder rightly asked for, protects transit and a stolen disk; it does **not** protect the data
from us, our provider, or a lawful demand, because we hold the keys. **The only real protection for a
corpus we operate is that it is minimal and unlinkable.**

**The growth-before-engagement tension, named rather than hidden (CLAUDE.md §3.4).** A learning loop needs
an objective function, and whatever we score templates on is what the product becomes. Scoring on
completion rate would reliably teach the system to recommend the plans that ask for the least — engagement
optimisation wearing the costume of outcomes. **Forbidden as an objective, permanently:** time in app,
sessions, notification open rate, retention/DAU, Journeys started, streak length as a terminal goal,
subscription conversion. **Structural guardrail:** the loop may *downrank* a template for a cohort but may
never *remove* one, and never the ambitious end of the corpus (CLAUDE.md §3.3 — the vision never shrinks).

**Sequencing — nothing here ships soon, and the first stage needs none of it.** There is no content
backend and no privacy policy. **Stage 0, buildable today with zero privacy change**, is to turn the
hardcoded arcs into data: extract `MILESTONES`/`STEP_TITLES` out of the four experts into versioned
templates, ingest the partner's Golden Journeys, and give `buildStructure` a local matcher. That alone
fixes the failure that triggered this decision (a user who asked for help drinking a protein shake daily
received Steps about walking, stretching and eating meals at regular times, because `BodyImageExpert` has
one fixed twelve-string menu for everyone). The outbound half is Stage 2 and is blocked on a privacy
policy that does not exist, on **security-privacy and store-compliance sign-off (both required, scoped in
the PRD §12)**, and on the four founder questions below. **The library is valuable long before the learning
is.**

**Categorization:** **Approved** — the four settled points above. **Recommended, awaiting founder
confirmation** — the twenty-field allowlist, per-instance pseudonymity (no stable user id), the hybrid
matching model, opt-in consent, `career` + `general` domains only at v1, and k = 25. **Open Question** —
nine items in the PRD §14, four of them blocking Stage 2: (1) what counts as "the plan worked", which is
the single most consequential choice because the objective function becomes the product; (2) which domains
participate; (3) opt-in vs opt-out; (4) the k threshold. Plus terminology ratification of **Plan Template**
(blocking Stage 0, product-guardian's call), whether cross-Journey longitudinal learning is ever wanted,
hosting cost (cost-guardian, before anything is provisioned), partner content licensing terms, and the
content-safety escalation path.
**Reflected in:** `04_Product/PRD/Plan_Library_and_Learning_PRD.md` (the full specification);
`05_Research/User_Matching_Parameters_Research_2026-08-17.md` (the companion parameter research);
`04_Product/PRD/README.md` (index). `Future/User_Learning_PRD.md` is a **different** thing (a
within-user, on-device model) and is **not** edited, merged, or superseded by this decision.

**Addendum — second pass, 2026-08-18: the founder widens the scope from a feature to the product.** This
does not take a new decision number; it is the same decision, at its full size. The framing that governs
everything above:

> "The app must produce an accurate user profile that knows how to address the user, what motivates them
> most, **what makes them abandon plans**, and more […] Another layer is the **Journey library** — for
> every goal or Dream we will have **several Journeys**, and we need to understand which work better and
> which work worse […] Another layer is the **matching layer** — a Journey may be good for one type of
> person and not another […] **This is the essence of the app. This is its uniqueness.** We need to know
> the user well enough to send **few** notifications but ones that actually move them to action."

And the sentence that should govern how urgently this is treated, about the Journey the app built for him:
**"So far the plan that was built for me didn't help me at all."**

**What the widening settles.** (1) The architecture is **three layers**, not one feature: the **user
profile** (how to address them, what motivates them, what makes them abandon), the **Journey Library**
(several Journeys per goal, not one arc per domain), and the **matching layer** (which Journey suits
which kind of person). (2) A Journey's quality is measured by **persistence, the stage reached before
dropping (a drop-off curve, not a binary), completion, and end-of-Journey feedback — did it help, and a
rating**. (3) **That feedback is the label on the training data**: without a human verdict the corpus has
outcomes and no ground truth, and "which Journey is better" is unanswerable. It does not exist in the
product today. (4) Journey fitness is **conditional on user attributes**, and the conditions are
**discovered from outcomes**, not declared by an author. (5) A future **marketplace** of coach-uploaded
workshops is designed *against* but not designed — chiefly, template provenance, licence terms and
version must be modelled from the start, and the licence field must exist before the partner's content
ships to devices.

**The objective, which is where growth-before-engagement becomes operational.** The founder's goal —
*fewer notifications that actually move someone to action* — inverts every standard metric, because open
rate, sessions, retention and send volume all improve when you interrupt people more. The objective is
therefore a **constrained optimisation, never a weighted sum** (a weighted sum always has an exchange
rate at which more notifications buy more completions, and the loop will find it): **maximise "did it
help"; subject to that, minimise interruptions; never trade the second against the first in the other
direction.** Zero interruptions with a helped Journey is the **maximum** score, not a null result. And
the rule that makes it real: **the loop is allowed to discover that nagging works, and is forbidden from
acting on it** — each user has an interruption ceiling the loop may lower and may never raise. A
mandatory drift detector (median Step difficulty and weekly minutes of recommended Journeys; if it
trends down while retention trends up, the matcher is gaming us) sits on the same dashboard as the
primary metric.

**Two corrections the companion research forced, recorded because the reasoning matters more than the
conclusion.** (a) The outbound cohort vector was **cut from nine flat fields to a hard cap of four** —
three fixed slots plus one rotating condition slot assigned per instance — because nine coarse
categoricals produce ~15,000 cells, at which point a vector of individually-harmless fields is a unique
identifier with a description of someone's struggles attached. Conditional discovery survives the cut
because finding an interaction needs a stable base plus **one** candidate at a time, not every attribute
in one key; the cost is that each condition is sampled on about one record in eight, which makes Layer 3
later still. (b) The k-threshold moved from a judgement-based 25 to an evidence-based **floor of 20,
targeting 50**. Also adopted: **no sentinel for an excluded domain** — where a domain does not
participate the record is not sent at all, because in a population where only two domains are
withholding-eligible, `domain: 'withheld'` *is* the disclosure.

**What must not enter matching, decided now so it is not argued later.** Demographics (age, gender,
country) are weak predictors and our strongest re-identifiers. **Delivery parameters** (communication
style, Active Hours, language, form of address) change how and when we speak, never what plan we build —
otherwise "Direct-style users get harder Journeys" becomes a defensible-sounding sentence with no
evidence behind it. A **personality inventory** and a **readiness/stage-of-change classifier** are both
refused, the first because revealed adherence measures the same construct from behaviour for free and a
trait label invites fatalistic matching, the second because the evidence says stage-matched
interventions do not beat well-designed unmatched ones.

**The gap this names, plainly:** the four `DomainExpert`s are the **opposite** of this architecture — one
fixed arc per domain, no variants, no outcome capture, no feedback, no matching. **There is nothing to
compare, so there is nothing to learn from.** The library therefore **replaces** the template model
rather than sitting beside it; each expert's fixed arc is preserved as template #1 for its domain and
demoted from "the answer" to "one candidate", and the expert becomes the interviewer, router and safety
authority rather than a content source.

**Sequencing unchanged in spirit, sharper in fact:** Stages 0–2 are buildable now with **no backend, no
privacy policy, no consent and no review beyond product-guardian** — wire the reason log and the dormant
communication style into planning (the abandonment taxonomy already exists in `ReasonId`/`LeverId` and
nothing consumes it), turn the fixed arcs into a local library, and build the feedback moment plus local
outcome capture. Only Stage 3 changes the privacy posture. **The library is valuable long before the
learning is.**

**Categorization (widened):** **Approved** — the three-layer architecture; several Journeys per goal; the
four quality signals including end-of-Journey feedback; conditional matching discovered from outcomes;
the on-device profile boundary. **Recommended, awaiting founder confirmation** — the four-field capped
allowlist with the rotating condition slot, per-instance pseudonymity, hybrid learn-centrally/
match-locally, the constrained objective and the interruption ceiling, opt-in consent, `career` +
`general` at v1, k ≥ 20, and the three feedback hosts owned by one continuation PRD. **Future Vision,
designed against but not designed** — the coach marketplace. **Open Question** — eleven items in the PRD
§17, five blocking Stage 3 and one (terminology) blocking Stage 1, plus the three non-overlapping
questions in the research's §13.

### D53 — D24's development-stage safety gate is rescinded; the control moves to expert review before release
**Decision (founder, 2026-08-18, verbatim in substance):**

> "I'm cancelling it. Right now nothing goes out to customers, and later everything will go through
> expert approval. So there's no point in these gates at this stage."

**What prompted this:** D24's "Safety implication" paragraph stated that Addiction and Relationships &
Loneliness "must stay flag/dev-only — never reachable by a real user" until a safety floor was built and
a clinical review had happened, and called this "a hard gate, not a soft target." **The founder says he
never made that ruling.** It was written into the Decision Log as though it were his decision, and it has
since been treated as approved throughout the repository — it shaped work priorities (`MVP_Task_List.md`),
was cited by later decisions (D44, D47, D52) as settled founder policy, and shaped an outbound letter to an
external partner (`04_Product/Partner_Letter_2026-08-18.md` §8, "Safety: the gate has not moved") that was
about to be sent stating D24 as the founder's own ruling. See the Decision Log audit this same session for
the finding that D24 is, so far, the **only** entry in this log showing this failure mode (an agent's
safety recommendation recorded as a founder decision) — recorded here, not fixed silently elsewhere.

**What is rescinded, precisely:** only the part of D24 that made the gate a **development-stage**
constraint — i.e., that Addiction and Relationships & Loneliness must not even be built out or reached in
a dev/flag-gated build until the safety floor + clinical review exist. That specific mechanism (bilingual
crisis detection, disclaimers/consent, a hardened `SafetyLayer`, substance-use gating, as a precondition on
*build-out*) is cancelled as a precondition on development work.

**What is NOT rescinded, and must never be read as rescinded:** whether unreviewed sensitive-domain content
may reach a real user. It may not, and this decision does not weaken that in any way. The founder's own
reasoning: right now nothing goes out to customers at all — there is no release path today — so a gate that
blocks *development* protects nobody; it only slows work while nothing ships. The real, ongoing control is
procedural and sits at the **release boundary**: **everything goes through expert review/approval before it
reaches a real user** — not only Addiction and Relationships & Loneliness, but every domain, every time. The
requirement does not disappear; it moves from "must not be built or reached even in dev" to "must not
release without expert review."

**Why the distinction matters, stated so it cannot be misread in six months:** this is a narrowing of
*where the mechanism sits*, not a narrowing of *what is required*. A development-stage gate constrains
internal work while nothing ships; it protects no actual user. The safety boundary the founder holds — and
restates here — is expert review before release, covering the sensitive domains (and, per his own framing,
every domain going forward). No sensitive-domain content — Addiction or Relationships & Loneliness above
all — may ship to a real user without that review having happened. Anything that reads this decision as
"the safety requirement was dropped" has misread it.
**Categorization:** **Approved** (the development-stage gate is rescinded) + **Approved** (the replacement
control: expert review before release, for every domain, with Addiction and Relationships & Loneliness held
to the same standard the original gate intended).
**Reflected in:** D24 above (annotated in place, original text preserved — not rewritten or deleted);
`04_Product/Partner_Letter_2026-08-18.md` §8 (corrected before sending); `04_Product/MVP_Task_List.md`;
`04_Product/PRD/Weekly_Review_Contributions_02_PRD.md`; `04_Product/PRD/Plan_Library_and_Learning_PRD.md`;
`09_Product_Philosophy/Product_Terminology.md`; `04_Product/Domain_Expert_Authoring_Guide.md`;
`05_Research/User_Matching_Parameters_Research_2026-08-17.md`;
`04_Product/Strategy_WIP_2026-07/08_domain_experts_deepening.md`.

## 2026-08-06 — Coach build-out: domain realignment, framework-not-content philosophy, UX/design bundle, paid Gemini tier, single-user auth

> Continues the D23 pivot on branch `feat/buddy-3d-and-reminders` (unmerged), behind the
> off-by-default `adaptiveCoach` flag. See `Current_Context.md` → "⭐ HANDOFF SNAPSHOT — 2026-08-06"
> and `00_Foundation/CHANGELOG.md`'s 2026-08-06 entry for full engineering detail; this log records
> the decisions and their reasoning.

### D24 — Domain realignment: Addiction · Relationships & Loneliness · Body Image · Career
**Decision:** The set of first-cut `DomainExpert`s changes from the original SX exploration
(`recovery`, `self-confidence`, `nutrition`, `sport` — recorded implicitly in the 2026-08-05
CHANGELOG entry, never itself logged as a D-decision) to **four new domains**: **Addiction**,
**Relationships & Loneliness**, **Body Image** (covering both nutrition and fitness together, not
as two separate domains), and **Career**.
**Why:** the new set was chosen to better match the kinds of goals a general adaptive coach
realistically needs to triage from open-ended free text, and to consolidate nutrition+fitness
(which users rarely separate cleanly when describing a body-image goal) into one domain rather than
two competing experts.
**Safety implication:** **Addiction** and **Relationships & Loneliness** are the two most
sensitive domains in this new set (substance use / crisis risk; loneliness / relational distress
risk). Per this decision, both **must stay flag/dev-only** — never reachable by a real user — until
(a) the safety floor is built (bilingual Hebrew/English inbound crisis-detection + escalation,
disclaimers/consent, a hardened `SafetyLayer`, substance-use gating) and (b) a clinical review has
happened. This is a hard gate, not a soft target.
**Categorization:** Approved (the domain set itself, as the current SX validation target) +
**Open Question / gated** (Addiction and Relationships & Loneliness cannot ship to real users until
the safety floor + clinical review above are satisfied — do not treat their current dev-only
buildout as launch-ready).
**Correction (D53, 2026-08-18) — read this before relying on the "Safety implication" paragraph
above.** The founder states he never made the ruling above that Addiction and Relationships &
Loneliness "must stay flag/dev-only" as a **development-stage** precondition — it was written into
this entry as though it were his decision and was never actually his call. **D53 rescinds only that
part** (the dev-stage gate) and replaces it with **expert review before release**, covering the
sensitive domains, as the live control. The original paragraph above is left completely intact,
unedited and unrescinded-in-place — including the part that turned out to be misattributed — because
how it got here is itself worth keeping on record; see D53 for the full reasoning and for the audit
finding on how this happened. **Do not read the original paragraph above as current policy on its
own** — read it together with D53.
**Reflected in:** `app/src/core/learning/experts/AddictionExpert.ts`, `RelationshipsExpert.ts`,
`BodyImageExpert.ts`, `CareerExpert.ts`, `registry.ts`; `Current_Context.md`;
`00_Foundation/CHANGELOG.md` (2026-08-06 entry); **D53** (2026-08-18, the correction above).

### D25 — Framework-not-content philosophy for domain experts
**Decision:** The coach and its domain experts are explicitly a **framework, not content**. The
system structures goals, interviews, feasibility-checks, and adapts plans over time — it does
**not** supply expert domain knowledge as if it were a licensed professional. Concretely: the coach
is **not** a nutritionist, **not** a trainer, **not** a matchmaker, **not** a therapist. Domain
experts encode *interview structure and planning logic* (what to ask, how to turn answers into a
frequency-based plan, how to detect risk and re-plan), not clinical/professional content.
**Why:** this keeps the product's actual claim honest and legally/ethically bounded — it is a
structuring and accountability tool built on top of the user's own goal, not a substitute for
professional guidance in domains (addiction, relationships, nutrition, career) where bad
"expert-sounding" content from an LLM could cause real harm. It also keeps each `DomainExpert`
implementation genuinely domain-agnostic in shape (same seam, same interview pattern), which is
consistent with D23's "the domain is not the bet, the engine is" principle.
**Categorization:** Approved — this is a standing design constraint on every current and future
`DomainExpert`, not a one-off choice for the current four.
**Reflected in:** `app/src/core/learning/DomainExpert.ts` seam design and all four expert
implementations; `04_Product/Domain_Expert_Authoring_Guide.md` (the colleague-facing guide that
teaches this constraint to whoever authors the next domain); `Current_Context.md`.

### D26 — UX/design decisions bundle for the coach-first app
**Decision:** A bundle of linked UX/design decisions for the coach-first rebuild, captured in full
in **`04_Product/UX/App_and_Screens_Design_Brief.md`** (comprehensive brief — **not yet final**, see
status note below):
1. **Reuse the existing app design** (minimal visual change) rather than a ground-up redesign.
2. **Remove the avatar/Buddy tab and the Shop tab.** (Note: D23 had said the Buddy "stays" but
   evolves per level rather than via dress-up cosmetics — this decision goes further, removing the
   Buddy/avatar and Shop **tabs** from the navigation entirely as part of the coach-first redesign.
   This is flagged here explicitly as a refinement of D23's framing, not a silent contradiction —
   see the note under "Reflected in" below.)
3. **Home priority order:** weekly tasks (including an **urgent / "today's-focus"** block) → a
   central **Coach CTA** → **Friends** (3 who need help + 3 who deserve encouragement) → **My
   Journeys**.
4. **Streak** = a prominent day-count that **breaks only when an urgent task is missed** (not any
   miss) — a non-punishing streak design consistent with D11 (flexible, non-punishing streaks).
5. **Levels are kept**, reframed to reward **breadth** (running multiple parallel Journeys, up to a
   cap) rather than depth/grind within one Journey — consistent with D23's "mature progression, not
   childish gamification."
6. **Urgent is computed**: a task becomes urgent when
   `remaining-days-in-week == remaining-required-sessions`.
7. **Dream = coach-suggested, user-approved.** The coach suggests linking related Journeys into a
   Dream; the user must explicitly approve before "My Journeys" groups by that Dream.
8. **Journey editing is coach-led**, plus a simple **Freeze/Resume** button for pausing without
   deleting.
9. **Step reporting is small and emotional/visual**: happy-face Done / sad-face Couldn't / Partial
   / Postpone — not a form.
10. **The entire coach conversation runs fully on the phone.**
11. **The people/support layer** (Ally, Support Circle, reciprocal friends, goal/Dream Communities)
    is first-class in the brief, not deferred.
**Why:** minimizes redesign risk/cost by reusing proven UI where the mechanism change (companion
app → coach) doesn't require new visuals; removing Buddy/Shop tabs reflects that the coach, not the
Buddy/economy loop, is now the primary daily surface; the Home ordering and urgent/streak/breadth
rules translate D23's "mature progression" and D11's "non-punishing streaks" principles into
concrete screen behavior; coach-led editing + Freeze/Resume keeps Journey structure changes
consistent with the adaptive loop rather than ad hoc manual edits; frequency/coach-suggested-Dream
keep the system honest about what it actually knows vs. assumes.
**Categorization:** **Approved direction for planning purposes**, but explicitly **not final** — the
founder is obtaining a **second, external-AI design proposal** before any screens are actually
wired. Treat this bundle as the working direction, subject to revision once that proposal is
compared.
**Reflected in:** `04_Product/UX/App_and_Screens_Design_Brief.md` (full detail);
`Current_Context.md` (2026-08-06 snapshot). **Note on D23 interaction:** D23 said "The Buddy avatar
stays... it evolves per level" — this decision's "remove the avatar/Buddy tab" is a later
refinement made during the coach-first UX pass, not a silent reversal. Both are preserved here; if
the Buddy's fate needs to be read as a single current answer, this D26 entry (2026-08-06, more
recent) is the current direction, pending the second design proposal.

### D27 — Gemini paid tier for coach testing (~$10/mo cap)
**Decision:** The founder enabled billing on the Gemini API to unblock realistic coach testing,
capped at **~$10/month**. Model used: `gemini-2.5-flash`. API key lives in the git-ignored
`app/.env.local` as `GEMINI_API_KEY` — never committed.
**Why:** the free tier's rate limits were insufficient for iterative interactive testing of the
multi-turn coach conversation; a small, capped paid tier unblocks real testing without open-ended
spend risk (per CLAUDE.md §3.10 — the founder was asked and approved before this was enabled).
**Categorization:** Approved, POC-scale only. **Open note:** shipping to real users would need the
key handled differently (currently would need `EXPO_PUBLIC_…` client exposure, which is a
POC-personal-testing shortcut, not a production-safe secret-handling pattern — flagged as a
pre-launch follow-up, not yet an open question requiring a decision today).
**Reflected in:** `app/.env.local` (git-ignored), `app/src/core/coach/` (the `LlmClient` seam),
`Current_Context.md`.

### D28 — Single-user Supabase auth for the POC (S3)
**Decision:** For the current POC stage, auth is scoped to a **single, known user**
(`guynoiman3@gmail.com`, Supabase UID `d87033dc-254d-4b95-92ba-10c8ba62a87f`) rather than building
out general multi-user sign-up flows yet. Activation requires the founder to set a Supabase
password for that user and populate `EXPO_PUBLIC_SINGLE_USER_EMAIL` /
`EXPO_PUBLIC_SINGLE_USER_PASSWORD` / `EXPO_PUBLIC_SINGLE_USER_UID` in `app/.env.local`.
**Why:** at this stage the only real user is the founder himself; building single-user auth first
lets S3 (auth/backend) proceed and be tested end-to-end without the added scope of general
sign-up/sign-in flows, which can be layered on later once the coach itself is validated. This is a
narrower, deliberately-scoped step within the existing D19 auth direction (Apple + Google,
passwordless, no real-name collection) — it does not replace or contradict D19, it is an interim
POC-stage narrowing of it.
**Categorization:** Approved, POC-scale only — general multi-user sign-up remains Future Vision per
the existing D19 phasing (P3+).
**Reflected in:** `app/src/core/auth/` (`AuthGateway.ts`, `SupabaseAuthGateway.ts`, `authUser.ts`,
`singleUser.ts`), `Current_Context.md`.

---

## 2026-08-01 — Product pivot: AI adaptive coach (repositioning, mechanism change)

### D23 — Reposition from gamified-companion app to AI adaptive coach; mission unchanged; continue the same repo/codebase
**Decision:** PushApp repositions its **mechanism** from a gamified-companion app to an **AI
adaptive coach**. The **mission is unchanged** — "help people become who they choose to be;
close the gap between intention and action" (`09_Product_Philosophy/Product_Philosophy.md`) still
holds exactly as written. What changes is *how* the product delivers on that mission:
1. **Continue the same repo/codebase.** This is an **evolution, not a rewrite** — the existing
   engine-based architecture (pure-TS engines over an event bus, config-before-code, vendor-isolated
   gateways) already fits; several reserved seams/events/flags already exist for this
   (`11_Engineering_Bible/Module_Architecture.md` §E4 — User-Model/Profiling, Intervention/
   Communication, Interests seams). No new codebase.
2. **Mature progression, not childish gamification.** Points/levels and daily/weekly Missions stay.
   The Buddy avatar stays, but it is **NOT dress-up/cosmetic customization** — it **evolves per
   level** (a fixed form per level), reusing the existing Buddy 3D pipeline
   (`11_Engineering_Bible/Buddy_3D_Spike_Findings.md`, `app/tools/ingest_creature.py`).
3. **The moat is the closed feedback loop, not any single feature.** Two moats — **adaptive
   personalization** + **human accountability** — working *together*. The defensible core is the
   **integration**: a closed loop of **behavior → insight → re-plan → nudge → behavior**.
   Competitors have disconnected pieces (an AI planner here, a buddy system there, an accountability
   partner somewhere else); PushApp builds the loop connecting them.
4. **Domain strategy: the domain is not the bet, the engine is.** Build a **domain-agnostic**
   engine now. **General habits/goals is the current build target** (not a specific vertical).
   Sharp vs. general positioning (the "wedge") is a separate, **deliberately deferred** question
   (see Open Question below).
5. **Privacy = local-first split.** Raw personal disclosures stay **encrypted on-device**; only a
   minimal **derived "insight model"** (enums/buckets/preferences — no free text) may persist
   server-side, and only to power outreach timing. This is consistent with the existing
   on-device-only red-line pattern already set for location/calendar data (D21, R3) and should be
   reconciled with it as a broader privacy principle when the engineering plan for this pivot lands.
6. **Build approach:** one status-tracked task list to MVP-in-store; sequential; each component
   built in isolation with tests, then integrated; any partial work always gets an explicit
   follow-up completion task (never left silently unfinished).

**Considered and rejected:**
- **Professional certification-completion vertical** — explored as a possible sharp domain wedge,
  then dropped. Reason: a cert-completion product forces the app to **assess the user's prior
  knowledge** before it can plan a path (a hard, domain-expert-heavy problem). General habits/goals
  sidesteps this entirely — no prior-knowledge assessment is needed to help someone build a habit.
- **Sports vertical** — also considered as a possible sharp wedge and set aside for the same reason:
  committing to a vertical now would mean building domain expertise before the domain-agnostic
  engine is proven. Not rejected forever — see Future Vision below.

**Why (validated by two competitive scans, `05_Research/`):** AI plan-generation is now a
commodity — many apps already generate a plan from a goal. The defensible, hard-to-copy asset is
the **persistence loop + human ally**, not any one AI feature. Closest competitive threats
identified: **Commit** (general-purpose AI coach) and **CertPrep / TrackMates** (certification-
space competitors relevant to the now-rejected cert-vertical exploration).

**Categorization (per `Repository_Guidelines.md` Approved/Future Vision/Open Question):**
- **Approved:** mission unchanged; mechanism = AI adaptive coach; continue same repo; mature
  progression (levels/Missions kept, Buddy evolves per level instead of dress-up cosmetics);
  domain-agnostic engine with general habits/goals as the current build target; local-first privacy
  split; sequential one-task-list build method.
- **Future Vision:** **domain-expert modules** (relationships, learning, nutrition, sports,
  professional certification, etc.) as **pluggable add-ons**, built **later**, only after the
  domain-agnostic infrastructure has proven itself. The sports and cert-completion explorations
  above are preserved here as candidate future modules, not deleted ideas.
- **Open Question — deliberately deferred:** **general vs. sharp ("wedge") positioning.** Whether
  PushApp should eventually launch/market around one sharp vertical (like the rejected sports/cert
  explorations) or stay general-purpose is **not decided**. Revisit explicitly **before design and
  launch** — do not let a design or marketing decision silently pre-empt this question.

**Supersedes (marked, not deleted — see each doc for the "why" that is being preserved):**
`09_Product_Philosophy/Product_Philosophy.md` (Buddy-customization framing inside "Gamification
Exists To Reinforce Reality"), `04_Product/Product_Bible.md` §21.5 (Buddy customization as a
retention system) and §15.1 (AI framed as enhancement-only, D2), `00_Foundation/
Information_Architecture.md` (the "Buddy" section's customization/equipment/shop framing),
`Current_Context.md` (top-of-file pivot notice — all prior handoff snapshots stay as accurate
engineering/process history, only the positioning framing they inherit is superseded).

**Reflected in:** this entry; superseded-notes added 2026-08-03 to the four docs listed above.
Terminology (`Product_Terminology.md`), the engineering/architecture docs, and the working-method
docs were intentionally **not yet updated** at the time this entry was written — tracked as a
separate follow-up task (S0.2).
**S0.2 follow-up landed 2026-08-03:** `Product_Terminology.md` (mid-layer term renamed Phase →
**Milestone**, founder decision 2026-08-01, old "Phase" text preserved as superseded, not deleted);
`11_Engineering_Bible/Engineering_Decisions.md` **E5** (hub-and-loop engine design recorded); new
`04_Product/Build_Plan_and_Method.md` (the S0–S7 (+SX) task-list method this entry's "Build
approach" point named). `CLAUDE.md` §3 rule 2's protected-terms list updated Phase → Milestone.
Other docs still using "Phase" as the mid-layer term (`Product_Bible.md` §3.4A/§35,
`Information_Architecture.md`, `Module_Architecture.md`, several `UX/*.md` docs, and UI copy in
`app/src/`) were **deliberately left unchanged** — a full reconciliation pass is a separate later
task, not bundled into S0.2.

---

## 2026-07-14 — Reminders / Communication Scheduler + onboarding (branch `feat/buddy-3d-and-reminders`, unmerged)

> **Branch note:** D20–D22 and their implementation land on branch `feat/buddy-3d-and-reminders`,
> **not yet merged to `main`.** Recorded here per CLAUDE.md §9/§3.6 (log approved product decisions
> as they're made); treat as approved-for-the-branch until the branch merges.

### D20 — Notification-permission ask happens during onboarding
**Decision:** The OS notification-permission prompt is asked **as part of onboarding** (the new
mission-based flow — see D21), not deferred to first-reminder-fire or a separate later screen.
**Why:** reminders are core to the Journey/Step loop from day one; asking early, in context, while
the user is already granting other setup permissions, avoids a confusing later interruption.
**Reflected in:** `Current_Context.md` (2026-07-14 snapshot); implementation on
`feat/buddy-3d-and-reminders`.

### D21 — Communication Scheduler mechanism + opt-in location/calendar reminder rules; background geofencing deferred; new privacy red-line R3
**Decision:** Reminders are managed by one **Communication Scheduler** that aggregates every
active Journey's reminders into a single schedule, applies the user's `SchedulingPrefs`
(preferred days as a hard filter; an allowed time-window with morning/evening clamping), and
respects the **iOS 64-local-notification cap** (emitting `SchedulerCapped` rather than silently
dropping or over-scheduling). Location- and calendar-based reminder rules are **optional and
opt-in**, built behind vendor-isolated `LocationGateway`/`CalendarGateway` seams
(`NullLocationGateway`/`NullCalendarGateway` today — dormant, consistent with the E4 reserved-seam
pattern). **Background geofencing is explicitly deferred** (not in this pass) — only
on-device, foreground/scheduled use is built now.
**New privacy red-line — R3:** raw location/calendar data stays **on-device only, never synced**
to any backend. *(Numbered R3, not R2, to avoid colliding with the existing R1/R2 privacy
red-lines already defined for auth sessions in `11_Engineering_Bible/Auth_Backend_Proposal.md` §4 —
R1 = no PII in world-readable tables, R2 = sessions in `expo-secure-store`. Renumbering here rather
than reusing "R2" preserves both sets of reasoning without collision; if a single global red-line
registry is ever wanted, reconcile R1–R3 into one place then.)*
**Why:** a single scheduler avoids the failure mode of many independent per-Journey reminder
schedulers silently exceeding the OS cap or fighting over notification slots; opt-in
location/calendar keeps the feature genuinely optional and privacy-respecting from day one; keeping
raw location/calendar data on-device-only avoids opening a new PII-in-the-cloud surface before the
feature has even shipped; deferring background geofencing avoids the OS-permission and battery-cost
complexity of always-on location before there's a validated need for it.
**Reflected in:** `app/src/core/engines/CommunicationScheduler.ts`,
`app/src/core/config/schedulerLimits.ts`, `app/src/core/location/`, `app/src/core/calendar/`,
`Current_Context.md` (2026-07-14 snapshot), `00_Foundation/CHANGELOG.md`.

### D22 — Keep the "Phase" display name
**Decision:** The Journey → **Phase** (optional, sequential) → Step naming from D5 stays as-is;
no rename. D5 had left "Phase" as a working name (candidates: Phase, Chapter, Part) — this closes
that naming question without changing the object model.
**Reflected in:** `Product_Terminology.md`, `Product_Bible.md` §3.4A (unchanged); this entry closes
the open naming question from D5.

---

## 2026-07-10 — Auth foundation: real accounts via Apple + Google (E3)

### D19 — Auth method, no real-name collection, foundation-first phasing
**Decision:** Three linked founder decisions approving the auth plan in
`11_Engineering_Bible/Auth_Backend_Proposal.md`:
1. **Auth method = Sign in with Apple + Sign in with Google**, passwordless (no email/password, no
   SMTP) — consistent with the earlier anonymous-auth rationale (E2) of avoiding email entirely.
2. **Do NOT collect the user's real name** from Apple or Google. In-product identity stays the
   **handle + Buddy**, never a legal name; email is quarantined in Supabase-managed `auth.users`
   and is never written to any `public.*` table.
3. **Build the free foundation (P1–P2) first, at $0 with zero user-visible behavior change.** The
   native Apple/Google sign-in buttons + dev build (P3+) require the **~$99/yr Apple Developer
   Program** — the one unavoidable cost — and are a **later, separately-approved step**, per
   CLAUDE.md §3.10 (never spend the founder's money silently).
**Why:** real users need real, durable, cross-device accounts, and each user's private data must
never be exposed to any other user (founder requirement) — anonymous-only auth (E2) cannot satisfy
this long-term. Apple + Google keeps friction and cost low; skipping the real name removes a
liability with no product use (the identity system already runs on handle + Buddy); splitting the
free architecture work from the paid native step means the $0 foundation doesn't wait on a cost
decision, and the cost decision isn't rushed to unblock engineering.
**Alternatives rejected:** email + password (needs a custom SMTP provider to stay usable, adds a
password-reset surface, higher friction); collecting the real name (no product feature needs it);
shipping P3+ bundled with P1–P2 (would force the $99/yr approval before it needed to happen).
**Landed 2026-07-10:** P1–P2 + R2 secure-store hardening shipped in commit `2af2468` — a
vendor-isolated `AuthGateway` (`app/src/core/auth/`), a new `AuthProvider` owning session
bootstrap (moved out of `SocialProvider`), and Supabase sessions moved from plaintext AsyncStorage
to `expo-secure-store` on native. App still boots anonymous; Apple/Google methods throw
`AuthNotAvailableError` until the P3+ native dev build. `tsc` 0, jest 55/55, code-reviewed.
**Full record (architecture, privacy red-lines, store-compliance, cost, phasing):**
`11_Engineering_Bible/Auth_Backend_Proposal.md`; engineering decision record:
`11_Engineering_Bible/Engineering_Decisions.md` §E3.
**Reflected in:** `app/src/core/auth/`, `app/src/app/_layout.tsx`, `Current_Context.md`.

---

## 2026-07-10 — Interim Buddy art direction

### D18 — Interim Buddy creature = "Ember" (coral), current avatar stands in
**Decision:** Adopt **Ember (the coral/orange creature)** as the **interim** Buddy art
direction. The founder rejected the four creature concepts (Ember · Lumi · Nimbo · Sprig) as
*final* art and is designing new Buddies himself in parallel; to keep nothing blocked, one is
chosen to use now. Ember is picked because the shipped in-app `BuddyAvatar` (glossy SVG creature)
already renders in Ember's coral-orange palette and already matches the v14 mockup's "Sprout,"
so **no art re-draw is needed** — the current avatar *is* the interim Ember Buddy.
**Framing:** Interim only. Re-implementing a different concept as SVG would be throwaway work
since new Buddy art is in progress. When the founder's new Buddies land, they replace this.
**Reflected in:** `app/src/components/buddy/BuddyAvatar.tsx` (already coral/orange), `Current_Context.md`,
`07_Assets/Buddy_Creature_Concepts.html` (the four concepts, for provenance).

---

## 2026-07-08 — Engineering: POC stack chosen (E1)

### E1 — POC technology stack
**Decision:** Build the POC on **Expo (React Native) + TypeScript** with an **engine-based
architecture** (pure-TS `JourneyEngine`/`BuddyEngine`/`RewardEngine`/`MissionEngine`/`ReminderEngine`
communicating over an event bus; configuration-before-code; an offline-first `Repository`
abstraction; on-device local notifications for reminders). Chosen jointly with the founder.
**Why:** instant iOS testing via Expo Go at **$0** (no Mac, no Apple Developer account for the
feedback loop), future web reuse of the UI-agnostic engines, and full alignment with the
Engineering Bible (engines-before-features, vendor independence, offline-first, business logic
outside UI). A cloud backend (Supabase free tier, front-runner) is added behind the abstraction
only when the social/Allies pillar lands.
**Alternatives rejected:** native Swift (needs Mac + paid Apple account, no web path), Flutter
(no JS/TS code-share with the future web builder), PWA (weak iOS notifications, weaker native feel).
**Full record (alternatives, tradeoffs, future):** `11_Engineering_Bible/Engineering_Decisions.md` §E1.

---

## 2026-07-08 — POC scope defined (resolves part of D4)

### D13 — POC hypothesis & scope
**Decision:** The POC tests a single hypothesis — **whether the combination of social support (a chosen circle of friends who see + cheer progress) and the evolving Buddy companion (with its coin/shop/missions reward loop) makes people persist and complete their Journeys.** Success = a meaningful share of users keep checking in ~4 weeks and complete/progress a Journey, and credit the friends and/or Buddy for keeping them going.
**In scope:** Journey loop (create → check-in → progress, incl. Starter Step + "why"); evolving Buddy + celebrations; add-friends → Allies see progress → cheer/nudge; coin economy + Shop (Buddy cosmetics); daily/weekly Missions + Login rewards; basic (non-AI) reminders.
**Out (deferred):** AI Intervention Engine, Explore/Marketplace/templates/creators/brands, Achievements wall, Weekly-planning flow, Phases complexity, public/creator Journeys, rich onboarding.
**Guardrails:** shallow economy (one currency = coins, small cosmetic set, few mission types); combined POC can't isolate social-vs-Buddy (accepted; instrument both, isolate via an MVP A/B); vision intact (deferred ≠ cut).
**Reflected in:** `04_Product/POC_and_MVP_Scope.md` §1.

### D14 — MVP delta & roadmap staging (fully resolves D4)
**Decision:** **MVP = POC + (a) Explore + a starter Journey library (browse & adopt), (b) proper onboarding incl. egg→hatch, (c) Journey Phases + full Journey types, (d) light AI = personalized encouragement from the "why" + smarter-timed reminders** (enhancement only; D2 — nothing core depends on AI).
**Deferred to Commercial:** adaptive Intervention Engine (MVP keeps smarter reminders only), weekly-planning flow, AI Buddy-drafts-your-Journey (paid), Achievements wall, Marketplace/creators/brands, broader Ally types.
**Framing:** MVP job = smallest product adoptable solo with value over *months* that shows why PushApp beats "habit tracker + group chat"; differentiation = the POC-proven social+Buddy+reward loop made adoptable (library+onboarding+real Journey types) and lightly personalized.
**Reflected in:** `04_Product/POC_and_MVP_Scope.md` §2–3 (incl. roadmap staging). **D4 now fully resolved.**

### D15 — 4-version release plan + Rich Step Types (vision)
**Decision:** Ranked all remaining work into **four versions** — **V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem** (maps onto the staging framework). V3 = adaptive Intervention Engine, weekly planning, AI Journey-drafting (paid), Achievements, deeper economy, Buddy customization depth, broader Allies, Community Insights, templates, subscription. V4 = full Marketplace/Creator economy, Business Journeys, **Rich Step Types**, Interactive Journey Experiences, Buddy voice/conversations, AI-generated roadmaps, full JITAI Intervention Engine, Competition Mode.
**Added (vision/future):** **Rich Step Types inside a Journey** — Steps become richer/extensible (video · audio · quiz · reflection · meditation · PDF · slides · AI-conversation · in-app exercise …) while the model stays Dream→Journey→Phase→Step and Step stays the unit of progress. Enables courses/coaching/meditation/creator experiences without changing the core. Strong investor-vision material.
**Reflected in:** new `04_Product/Version_Roadmap.md`; `Product_Bible.md` **§35** (Rich Step Types, Stage: Future).

### D16 — Revenue streams consolidated (business model)
**Decision:** Monetization = a **portfolio of 5 complementary streams** (ratios TBD, version-mapped), not one bet; core growth always free: **(1) Virtual economy / Shop** (coins, cosmetics, Buddy items — V1 shallow→V3), **(2) Consumer subscription** Premium/Freemium (AI, analytics, advanced interventions — V3), **(3) Creator marketplace** (paid creator Journeys + platform rev-share — V4), **(4) Business/branded Journeys** (publishing fee · rev-share · placement — **promoted from §33.6 hypothesis to approved** — V4), **(5) Coach/professional tier** (seats; future coach marketplace — V3–V4). Framing: early revenue leans IAP+subscription; marketplaces scale later.
**Reflected in:** `Product_Bible.md` **§23** (rewritten as "Revenue Streams"; §33.6 kept as hypothesis history), `03_Pitch/Pitch_Deck.md` §9, `03_Pitch/Investor_Questions.md` §14, `Version_Roadmap.md`.

### D17 — Grace Tokens
**Decision:** Adopt a **Grace Token** system (spend a token to skip/postpone a Step without breaking the Journey; extends §5A.4, feeds §30). Locked guardrails: **(a) earned only, NEVER purchasable / not in Shop** (protects the mission; explicitly not a revenue stream); **(b) transferable only as a GIFT of support (Ally→friend), NEVER a competition wager**; **(c) user opt-out in general settings** (when off, the GT indicator is hidden from Home; ideally also per-Journey "strict"); **(d) separate resource from Coins.** Balance: **regenerating baseline floor + earned top-ups, small cap (~3)**; running out is not punishment (falls back to the gentle §9.10 miss handling); never offered free on-demand. Each use captures a **brief reason → learning, not judgment →** feeds Buddy + Intervention Engine. **Visual:** a "GT" card at the top of Home next to Coins, no "+" button. **Roadmap:** minimal in V2/MVP, full system in V3.
**Reflected in:** `Product_Bible.md` §36 (+ §5A.4, §23 cross-refs), `UX/Home_Screen.md`, `Version_Roadmap.md`.

---

## 2026-07-07 — Batch 2 (Atomic Habits behavioral additions)

Founder-approved, inspired by *Atomic Habits*. Full detail in `Product_Bible.md` §34.
All respect **D2** (no core flow depends on AI).

- **D6 — Step description + "More Info".** Each Step has a short title **and** a longer
  description; the description is hidden by default and opened from the Step card's
  three-dot menu ("More Info"). → Bible §34.1, `UX/Home_Screen.md`, `UX/Journey_Creation_Screen.md`.
- **D7 — No dedicated Habit Stacking (for now).** Calendar- and location-based triggers
  cover the need; no separate "attach to an existing habit" flow. → Bible §34.2, §30.
- **D8 — Starter Step.** The first Step of a Journey is a ≤2-minute action, with author
  guidance + examples. → Bible §34.3, `UX/Journey_Creation_Screen.md`.
- **D9 — Identity & motivation questions at Journey start.** Saved answers power
  *personal* (not generic) encouragement. → Bible §34.4, `UX/Journey_Creation_Screen.md`.
- **D10 — Immediate positive feedback on completion.** Several elegant (not childish)
  celebration variations. → Bible §34.5, `Design_System.md` §7, `UX/Home_Screen.md`.
- **D11 — Flexible, non-punishing streaks.** Recovery-oriented; return-with-one-small-step
  copy. → Bible §34.6, §9.10.
- **D12 — Weekly planning confirmation flow.** Start-of-week review/approve/edit/move plan;
  a new **Weekly Planning** screen is owed. → Bible §34.7, `Open_Questions.md`.

---

## 2026-07-06 — Batch 1 (following the pre-Series-A Repository Review)

### D1 — Initial Positioning
**Decision:** For the initial product, PushApp is positioned for *young adults who want to build and maintain meaningful habits and personal goals across different areas of life.*
**Framing:** This is **positioning, not a vertical**. Do not restructure the product around a single domain (fitness, coaching, education, etc.). The long-term vision remains a general personal-growth platform.
**Deferred:** Specific go-to-market segments and channels → a dedicated Go-To-Market document (later).
**Reflected in:** `Product_Bible.md` §32 (+ §24), `Open_Questions.md` (Beachhead Market), `Investor_Questions.md` Q3, `Pitch_Deck.md`.

### D2 — AI in the MVP
**Decision:** AI **is part of the MVP**, but the MVP must **not depend on AI** in order to provide value. AI enhances the experience, personalizes the product, and improves guidance; every core user flow must remain functional if AI is temporarily unavailable.
**Reflected in:** `Product_Bible.md` §15.1 and §27, `Product_Roadmap_and_Scope.md`.

### D3 — Product Name
**Decision:** "PushApp" is a **working name**. Branding will be revisited later and must not influence current product or engineering decisions. No further action for now.
**Reflected in:** this log only.

### D4 — POC / MVP Definition
**Decision:** To be defined **together, later** — not authored independently. Tracked as a missing document.
**Reflected in:** `04_Product/POC_and_MVP_Scope.md` (placeholder).

### D5 — Object Model: the Phase layer
**Decision:** The object hierarchy is **Dream → Journey → Phase (optional) → Step.** A Phase is an optional, sequential grouping of Steps. "Phase" is a **working name** (not finalized; candidates: Phase, Chapter, Part).
**Reflected in:** `Product_Bible.md` §3.4A, `Product_Terminology.md` (Phase), `Information_Architecture.md`.
**Naming closed by D22 (2026-07-14):** "Phase" is kept as the permanent display name — no rename.

### Also reflected (previously-confirmed decisions the review flagged)
- **Home screen is action-based** (not Journey-based) — `Product_Bible.md` §11.2.
- **Maximum Journey duration** defaults to **~2 months, configurable** — `Product_Bible.md` §3.3.
