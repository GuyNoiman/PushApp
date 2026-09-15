# Onboarding — the approved screens, as a build spec

**Status:** Authoritative for implementation. Transcribed 2026-09-15 from the founder's approved
design pack at `output/onboarding/meemore-onboarding-screens/` (7 screens × {he,en} × {light,dark},
delivered 2026-09-14).

**Why this file exists.** The designs are PNGs. Nobody can implement copy from a picture without
re-reading it, and re-reading it is how a word quietly changes. Every string below is transcribed
from the approved Hebrew and English screens so the build has one source it can be checked against.
Where this document and the PNGs disagree, **the PNGs win and this file is wrong** — say so and fix
it here.

## Three things that are NOT transcribed, and why

1. **The product name.** Every screen carries the wordmark and three screens name the product in
   running copy. That name is **dropped** (D107) and no replacement is chosen, so it appears below as
   the token `⟨PRODUCT⟩`. Implement it as one i18n interpolation, fed from a single constant — when
   the name is decided it changes in one place, not in eleven strings.
2. **The mirrored English layout.** The English screens in the pack were exported through an RTL
   container: leading full stops and question marks, and the composer's send button pinned
   physically left. That is a bug and is **not** implemented (D106). Controls follow logical
   direction: the send button trails the composer, so it sits left in Hebrew and right in English.
3. **Screen 05's conversation content.** The bubbles there are an illustrative example, not copy to
   ship. What IS binding from that screen is its *shape* — see §5.

---

## 1 · Welcome  (`01-welcome`)

| | Hebrew | English |
|---|---|---|
| Kicker | לפעמים הצעד הראשון הוא הקשה ביותר | Sometimes the first step is the hardest |
| Title | להפוך כוונה **לתנועה אמיתית** | Turn intention **into real movement** |
| Body | ⟨PRODUCT⟩ עוזרת לך להבין מה נכון לך, לבנות דרך אישית ולהתקדם בה עם מאמן שמכיר אותך ואנשים שנמצאים לצדך. | ⟨PRODUCT⟩ helps you understand what works for you, build a personal path, and keep moving with a coach who knows you and people by your side. |
| Primary | הצעד הראשון שלי | Take my first step |
| Secondary | כבר יש לי חשבון | I already have an account |

The title's second line is in the accent colour. The wordmark sits large in the middle of the
screen, not only in the header. **The secondary link is a real route** — an existing account signs
in here and does not walk the first run again.

## 2 · Purpose  (`02-purpose`)

| | Hebrew | English |
|---|---|---|
| Kicker | הדרך שלך, עם העזרה הנכונה | Your path, with the right support |
| Title | לפעמים מפחיד לצאת למסע אישי. | Starting a personal journey can feel daunting. |
| Subtitle (accent) | אנחנו כאן כדי ללוות ולעזור — לאן שתבחר להגיע. | We are here to guide you and help you get wherever you choose to go. |
| Footer | הדרך היא שלך. לא צריך לעבור אותה לבד. | The path is yours. You do not have to walk it alone. |
| Primary | בואו נצא לדרך | Let's begin |

Four bullets, each with a round tinted icon:

| # | Hebrew | English |
|---|---|---|
| 1 | מאמן שזמין לך תמיד ומכיר אותך מצוין | A coach who is always available and truly knows you |
| 2 | בניית תוכניות עבודה המותאמות לך | Action plans built around you |
| 3 | נבין יחד מה הדברים שמניעים אותך | Together, we discover what truly motivates you |
| 4 | יצירת סביבת חברים תומכת | Build a circle of supportive people |

Bullet 4 is the Support Circle, and it is promised on the second screen of the product. Whatever
ships must not make that a lie.

## 3 · Prepare  (`03-prepare`)

| | Hebrew | English |
|---|---|---|
| Kicker | כדי להתאים את הדרך אליך | To shape the path around you |
| Title | בוא נתחיל להכיר | Let's start getting to know you |
| Body | ⟨PRODUCT⟩ לומדת לתת לכל אדם את המענה שנכון לו. נתחיל בשיחת היכרות ראשונית, ועם הזמן נכיר אותך יותר. | ⟨PRODUCT⟩ learns how to give each person the support that fits them. We will begin with a short introduction, and get to know you better over time. |
| Pull quote | מצא כמה דקות, בזמן ובמקום שנוחים לך — ובוא נדבר. | Find a few quiet minutes, wherever and whenever feels right — and let's talk. |
| Meta, line 1 | שיחה קצרה, בקצב שלך | A short conversation, at your pace |
| Meta, line 2 | אפשר לכתוב או לדבר בקול | Type or speak — your choice |
| Primary | אני מוכן, בואו נדבר | I'm ready, let's talk |

The pull quote is set large, between two hairline rules, with a quotation glyph. The meta lines sit
under a clock icon.

**"Type or speak" is a promise of voice input.** If voice does not ship, this line must change.

## 4 · Account  (`04-account`) — BEFORE the conversation, and mandatory (D104)

| | Hebrew | English |
|---|---|---|
| Kicker | לפני שנתחיל לדבר | Before we talk |
| Title | נשמור את הדרך שלך | Let's save your path |
| Body | החשבון מאפשר לשמור את השיחה, להמשיך מכל מכשיר ולמצוא את המסעות שלך בדיוק כפי שהשארת אותם. | Your account saves the conversation, lets you continue on any device, and keeps your Journeys right where you left them. |
| Provider 1 | המשך באמצעות Apple | Continue with Apple |
| Provider 2 | המשך באמצעות Google | Continue with Google |
| Back | חזרה | Back |
| Legal | בהמשך אני מאשר את תנאי השימוש ואת מדיניות הפרטיות. | By continuing, I agree to the Terms and Privacy Policy. |

A shield glyph inside concentric rings fills the middle. **There is no skip and no anonymous path** —
"Back" returns to screen 3. The legal line is quiet type under the buttons, and Terms and Privacy
must each be a real link to a real document.

## 5 · Conversation  (`05-conversation`)

Header: **המאמן שלך / שיחת היכרות** · **Your coach / Introduction**.
Composer placeholder: **אפשר לכתוב בחופשיות...** · **Write freely...**

The bubbles are illustrative. What is binding is the surface:

- Coach turns are plain bubbles on the leading side; the person's turns are solid teal on the
  trailing side.
- **A reflection gets its own treatment** — a tinted, outlined bubble, visibly not an ordinary coach
  line, so "here is what I heard" reads differently from "here is a question".
- Under a reflection sit two chips — **כן, בדיוק / רוצה לדייק** · **Yes, exactly / I want to
  clarify** — AND the composer stays open beneath them. Both at once; neither replaces the other.
- The composer is always present. This screen shows no option cards at all, which is the point of
  requirement 3: the conversation opens in free text and narrows only when it must.

This screen is an **introduction and chooses no Journey** (D105). Matching happens later, in a
second conversation entered from Step 4 of the intro Journey.

## 6 · Handoff  (`06-handoff`)

| | Hebrew | English |
|---|---|---|
| Kicker | נעים להכיר, ⟨name⟩ | It's good to know you, ⟨name⟩ |
| Title | עכשיו הדרך מתחילה | Now the path begins |
| Body | מחכה לך מסע קצר שיעזור לך להכיר את האפליקציה, לגלות מה יכול לסייע לך — ולבנות את המסע האישי הראשון שלך. | A short Journey is waiting to help you explore the app, discover what can support you, and build your first personal Journey. |
| Footer | לא צריך ללמוד הכול עכשיו. נתקדם יחד, צעד אחר צעד. | You do not need to learn everything now. We will move forward together, one Step at a time. |
| Primary | למסע הראשון שלי | Take me to my first Journey |

The kicker uses the name the person gave the coach — so the conversation must capture it, and this
screen must not render a blank or a placeholder if it did not.

## 7 · First Journey  (`07-firstJourney`) — the default Journey

| | Hebrew | English |
|---|---|---|
| Kicker | המסע הראשון שלך | Your first Journey |
| Title | להכיר את ⟨PRODUCT⟩ | Discover ⟨PRODUCT⟩ |
| Body | ארבעה צעדים קצרים, וכל אחד מהם יפתח עוד חלק בדרך. | Four short Steps, each opening another part of the path. |
| Card header | היכרות עם האפליקציה · **1 מתוך 4** | Getting to know the app · **1 of 4** |
| Card status | התחלת עכשיו | Started now |
| Primary | לצעד הראשון | Go to the first Step |

The four Steps, each numbered in a ringed circle:

| # | Hebrew title | Hebrew subtitle | English title | English subtitle |
|---|---|---|---|---|
| 1 | להשלים את הפרופיל שלי | כדי שהאפליקציה תרגיש באמת שלי | Complete my profile | Make the app feel truly mine |
| 2 | לגלות כלי אחד | היכרות קצרה עם עצמי | Discover one Tool | A short moment of self-discovery |
| 3 | להכיר את אזור החברים | אפשר גם להמשיך לבד | Explore the friends area | You can also continue on your own |
| 4 | לבנות מסע אישי עם המאמן | הדרך שנבחר יחד | Build a personal Journey with my coach | The path we will choose together |

### What this replaces

The shipped intro Journey (`app/src/i18n/resources/{he,en}/onboarding.json`, key `introJourney`)
has **three** Steps: profile · quiet hours · try a Tool. The approved design has **four**, and
"choose the hours we may reach you" is **not** among them. Quiet hours do not disappear from the
product; they stop being a first-run Step. Record where they go before deleting the Step.

### Every Step must go somewhere

Tapping a Step opens the place in the app where it is actually done — the profile screen in
Settings, the Tools tab, the friends area, and for Step 4 the coach in its matching conversation.
A Step that only describes itself is a checklist, and the product is not a checklist.

---

## What the screens do not settle, and somebody must

- **Where quiet hours go**, now that they are not a Step.
- **Whether voice input ships**, because screen 3 promises it.
- **What Step 3 opens**, since the friends area is the Support Circle and its first-run state is
  undefined.
- **The name**, which blocks nothing here as long as `⟨PRODUCT⟩` stays a single interpolation.

## Related

- `06_Decisions/Decision_Log.md` — D104 (account before the conversation), D105 (the conversation is
  an introduction), D106 (the English RTL export bug), D107 (the name is dropped).
- `04_Product/UX/Turquoise_Path_Visual_System.md` — the visual system these screens are drawn in.
- `04_Product/Onboarding_Journey_Matching_And_Coach_Handoff_Spec_v2_2026-09-14.md` — the founder's
  matching spec, whose §25 is superseded by D105.
