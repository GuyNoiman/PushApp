# The plan to finish what the founder asked for — 2026-09-15

**Status:** Working list. One line per item, each carrying its real state rather than a status word.
Supersedes nothing; it is the sequencing for the requests made on 2026-09-14/15.

**Nothing below is published.** Everything marked DONE is committed to the working tree of
`feat/buddy-3d-and-reminders` and has never left this machine. The founder is testing an older
build, which is why the new screens do not appear for him.

Baseline as of writing: `tsc` clean, **2930 tests / 275 suites**, all passing.

---

## THE SCOPE, stated by the founder and settling every argument below

**2026-09-15, in his own words:**

> תהליך האונבורדינג מטרתו לרשום את המשתמש ולבנות לו פרופיל. זה הכל
> לאחר מכן בשיחה הבאה עם המאמן ננהל שיחה עם המשתמש על מנת לבנות לו מסע

**Onboarding has two jobs and no third: register the person, and build their profile.**
Journey-building is a SEPARATE, LATER conversation.

Read that as a boundary, not a summary. It decides things that were still being argued:

| | Onboarding (the first run) | The next conversation |
|---|---|---|
| Purpose | register · build the profile | build a Journey |
| Asks about | the person | the plan |
| Touches the Journey catalogue | **never** | yes — diagnosis, matching, the plan |
| Produces | an account and a profile | a Journey |
| Fails how | we do not know the person yet | we cannot match a Journey yet |

So the conversation on approved screen 5 is a **profile-building conversation**. Not a shortened
interview, not an interview with the arithmetic removed — a different conversation with a different
job. Its questions come from what a profile needs, and it is finished when the profile is filled
well enough, not when a question list runs out.

Two consequences worth stating because they are easy to get wrong:

- **The profile is built by TALKING, not by a form.** That is the whole reason screen 5 exists where
  a personal-details screen used to be. The person speaks; the coach extracts.
- **Nothing in the first run may depend on a Journey existing** (his earlier instruction, now
  explained by this one). The diagnosis tree, the Journey-fit axis and the multi-Journey offer all
  belong to the second conversation.

---

## What he asked for, and where each request stands

| # | His request | State |
|---|---|---|
| 1 | The whole design implemented in code | **DONE** — the seven screens, plus the language step in front of them |
| 2 | Testable end to end | **NOT DONE** — the pieces are tested; no single test walks the whole first run |
| 3 | No closed questions too early; reflections that feel attentive | **IN FLIGHT** — S1 below |
| 4 | Onboarding identical to the designs, order and content | **DONE** — transcribed to a build spec and built from it |
| 5 | A default Journey waiting on Home | **DONE already** — it was never missing; only its content is wrong (S4) |
| 6 | Onboarding populates the user profile | **NOT DONE** — S2, the largest item |
| 7 | The profile reaches the coach and the expert and changes the Journey | **NOT DONE** — S2 |
| 8 | Steps deep-link into the app | **PARTLY** — the mechanism exists and works on Home only (S3) |
| 9 | Language selection inside onboarding | **DONE** — step zero, with flags, alphabetical by English name |
| 10 | Active Hours default 09:00–21:00 | **DONE** — new accounts only; installed phones keep their behaviour |
| 11 | A cost limit on the introduction | **IN FLIGHT** — folded into S1 |
| 12 | Voice input ("type or speak") | **NOT DONE** — S6. Screen 3 already promises it |
| 13 | On-screen guidance, or a video on a Step | **NOT DONE** — S7, and deliberately last |
| 14 | The Terms viewable where the app says they are | **IN FLIGHT** — being written now |

---

## Already done, and not yet visible to anybody

- **The seven approved screens**, Hebrew and English, light and dark, with the language step in
  front of them. Retired steps map onto the nearest new one, so a phone stranded mid-flow by
  yesterday's build resumes somewhere real.
- **The answer cards speak Hebrew.** Three of the four domain experts were never localised — 96
  strings. A Hebrew conversation used to ask a Hebrew question over English cards.
- **The understanding check**, in the founder's own wording, with a correction that REBUILDS from
  the whole conversation rather than being acknowledged.
- **A recommended Journey is chosen, not offered** — the taxonomy menu only appears when no
  recommendation exists, and a design for that case exists.
- **Active Hours default 09:00–21:00** for new accounts.
- **The build spec** (`04_Product/UX/Onboarding_Approved_Screens_Build_Spec_2026-09-15.md`), the
  founder's matching spec imported into the repo, and D104–D107 in the Decision Log.

---

## S1 · The first conversation becomes a PROFILE conversation  ← in flight

**Why this is first.** The first-run conversation is literally the Journey-building interview: the
same orchestrator, ending in a built Journey. D105 says it should be an INTRODUCTION that builds
nothing — decided, recorded, never built. Because it inherits the planner's slate it also inherits
`time`, `horizon` and `scheduling`, which D102 says may only be struck off on an exact answer — so
they are structurally the questions that survive to the end. **The last third of every first
conversation is arithmetic.** That is the questionnaire he keeps feeling.

What ships: the introduction's slate drops to four open questions (why it matters · where you are ·
what has been in the way · what keeps you going); it builds nothing; the numbered goal menu opens to
free text; the coach asks the person's name, so the handoff screen can use it; and the cost budget
persists on the device so restarting a conversation no longer refills it.

### THE INTRODUCTION KNOWS NOTHING ABOUT THE CATALOGUE

**Founder, 2026-09-15:**

> שיחת ההיכרות לומדת להכיר את המשתמש ללא תלות באילו מסעות קיימים באפליקציה

This is stronger than "drop the planning questions", and it rules out three more things that are
easy to leave in by accident, because none of them looks like a planning question:

- the **career diagnosis** tree, whose entire purpose is to decide which family of Journeys a goal
  belongs to;
- the **Journey-fit question**, which is an axis inside an authored goal family;
- the **multi-Journey offer**, which picks between catalogue entries.

All three are matching, and under D105 matching is the second conversation. A person who says "I
want to change career" must get the same introduction as anyone else — not a walk through a
diagnosis tree that exists to choose from a catalogue the introduction may not choose from.

**Why this matters more than it looks:** three of our four domains have almost no authored Journeys.
An introduction that leans on the catalogue is an introduction that is good for career people and
thin for everybody else. Making it catalogue-blind is what lets S5 narrow to one expert without the
first conversation narrowing with it.

The domain expert is still used, but only as the source of those four questions — which exist
identically on all four experts and on the general one. That is a dependency on which EXPERTS exist,
not on which JOURNEYS exist.

**What he will feel:** no minutes-per-week, no horizon, no days, no numbered menu, no diagnosis, and
the conversation ends when he has been heard rather than when a list runs out.

## S2 · The profile schema drives the conversation

S1 removes what does not belong. S2 is the positive half: the conversation stops borrowing a domain
expert's four questions and starts being driven by what a PROFILE needs.

The largest item, and requests 6 and 7 both live here. **Its gaps come from what is worth knowing
about a PERSON, not from what would discriminate between Journeys** — the correction above applies
to S2 as much as to S1, and it is the difference between a profile that survives a catalogue change
and one that has to be rebuilt every time the library grows. Matching uncertainty drives the SECOND
conversation; the introduction is not optimising for a recommendation it is not allowed to make.

Today there are two things called a profile and the first run fills NEITHER — the questions that used to fill one are retired, and the personal
details screen left the flow. The coach receives an empty object. It influences Journey choice in
the `career` domain only, and **the domain experts never see it at all**.

Built in the shape of the founder's own spec (§7): every field carries a confidence and a source, so
the engine can tell what somebody actually said from what a model inferred. The next question is
then chosen by what is least certain rather than by position in a list, and the conversation stops
when enough is known (§22) rather than when the list is empty.

**Two things must happen alongside it, not after:** cost per conversation measured server-side, and
a privacy pass — this stores a free-text description of somebody's situation on their device.

## S3 · Steps that go where they say

The mechanism already exists: a Step carries an `appLink`, and the intro Journey already points its
Steps at the profile screen, Active Hours and Tools. **Only Home honours it.** Open the same Journey
from the Journeys tab and the identical Step opens a "did you do it?" sheet instead. Small fix, wide
effect.

## S4 · The intro Journey's four Steps

Shipped: profile · Active Hours · try a Tool. Approved design: profile · a Tool · the friends area ·
build a personal Journey with the coach. Two Steps in, one out, and the fourth is the door into the
second conversation — so this gates S5.

**Open:** Active Hours now have a default AND a Step. If Step 1 already opens the personal details
screen, the separate Step may be redundant.

## S5 · Matching, and the second conversation — ONE EXPERT, PERFECTLY, FIRST

**Founder decision, 2026-09-15**, made once the content gap was on the table:

> אני רוצה שקודם כל הכל יעבוד מושלם על מומחה אחד ואז נוסיף נוספים

This changes the shape of the work and removes what looked like the largest blocker. Ranking needs
three or more metadata-carrying Journeys in a domain to mean anything; **career already has
eighteen, in six goal families, with a diagnosis and a consultation module built against them.**
Body image, addiction and relationships have none — one hardcoded arc each.

So career is the one expert, and it is not a compromise: it is the only domain where the engine can
be judged honestly. Everything built here — the match profile, the ranking, the discriminator, the
handoff — is built domain-agnostically and PROVEN on career. A second expert then costs authored
content, not another engine.

**What this rules out, deliberately, until career is finished:** authoring match metadata for the
other three domains, and any work whose only justification is that another domain needs it. The
introduction stays domain-agnostic, because it must still meet a person whose goal is not career;
what narrows is where matching and planning are proven first.

## S6 · Voice input

Screen 3 says "אפשר לכתוב או לדבר בקול". That is a promise already made, not a nice-to-have. Either
it ships or the line changes.

## S7 · On-screen guidance, or a video

A bubble must anchor to a real element; move a button and the guidance points at empty space
**silently, with no test failing**. A video knows nothing about the screen, so it cannot rot that
way — it is the more robust of the two and the founder's own instinct. It costs money either way:
bundled makes the app bigger, hosted costs per view. Deliberately last, and after S3 has made the
Steps simply open the right screen.

## S8 · End to end

One test that walks language → welcome → purpose → prepare → account → conversation → handoff →
first Journey → Home, in both languages. Last, because until the flow is finished there is nothing
whole to walk.

---

## Waiting on the founder

- **When to publish.** Nothing has been pushed. Publishing changes the runtime fingerprint, and a
  changed fingerprint cuts both test phones off from every future update — so the fingerprint gets
  checked before anything is sent.
- **Where Active Hours live** now that they have a default and a Step.
- **What the friends-area Step opens** — the Support Circle's first-run state is undefined.
- **Deploying the Terms.** The document is being written (founder, 2026-09-15: the terms must be
  viewable in the right place, even if the content is revised later). Writing it is not publishing
  it — the deploy is his call.
- **The product name**, which blocks nothing while it stays a single interpolation.
- **The duplicate D99** in the Decision Log: renumber and chase every reference, or annotate both.

## Related

- `04_Product/UX/Onboarding_Approved_Screens_Build_Spec_2026-09-15.md`
- `04_Product/Onboarding_Journey_Matching_And_Coach_Handoff_Spec_v2_2026-09-14.md`
- `06_Decisions/Decision_Log.md` — D102, D103, D104, D105, D106, D107
