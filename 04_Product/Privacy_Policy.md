# PushApp — Privacy Policy

Status: **Draft for the founder's sign-off.** This is the canonical text; the public page at
`app/landing/privacy.html` is generated from it and must be kept in step.
Source of truth for the facts: `04_Product/Privacy_Contract_With_The_User.md`.
Last updated: **2026-08-28**.

> ## ⚠ FIVE BLANKS ONLY THE FOUNDER CAN FILL
>
> Everything else in this document is written and factual. These five are marked `[[…]]` in the text
> and **the policy cannot be published until they are filled** (`Privacy_Contract §6`):
>
> 1. **`[[CONTROLLER]]`** — the legal entity that publishes the app, and the country it sits in.
>    Everything hangs on this.
> 2. **`[[CONTACT_EMAIL]]`** — a support address a human actually reads. It goes in the policy AND in
>    both stores.
> 3. ~~**`[[MIN_AGE]]`**~~ **ANSWERED (founder, 2026-08-28): 13, or higher where the country's age of
>    digital consent is higher — the same rule the stores enforce.** What is still open beside it:
>    whether to keep asking for a full birth date at all, or only a year (§1 of the contract flags it
>    as the most identifying field we hold).
> 4. **`[[BEHAVIOUR_LOG_WINDOW]]`** — how long the coach may remember a life minute by minute. A
>    product decision, not an engineering one.
> 5. **`[[MIRROR_REGION]]`** — the region the Mirror synthesis provider runs in.
>
> Two more things must be TRUE in the app before this is published, not just written here: the
> profile blob (which holds the birth date) is encrypted or stops holding a full date, and the
> in-app account deletion is verified end to end against the live database.

---

## 1. What this is

This policy explains what PushApp holds about you, where it lives, who can see it, and what you can
do about it. It is written to be read, not to be survived.

One thing is worth saying before the detail, because it shapes everything below: **PushApp makes no
money from your attention.** There is no advertising, no advertising identifier, no cross-app
tracking, and nothing about you is sold or shared for anyone else's marketing. There is no analytics
SDK and no crash-reporting SDK in the app. We are not measuring how long you stay.

## 2. Who we are

`[[CONTROLLER]]` is the controller of the personal data described here. You can reach a person at
`[[CONTACT_EMAIL]]`.

## 3. What we hold, and where it lives

PushApp keeps things in four different places, and which place something is in matters more than any
sentence we could write about it.

### 3.1 On your phone, and nowhere else

Stored in an encrypted file on your device. **None of this is sent anywhere:**

- **The words you write.** The "why" behind a Journey, the note you leave when a day went wrong, the
  note at the end of a Journey.
- **Your answers to the app's Tools** — Life Wheel, Values Clarification, My Best Possible Year, the
  Direction Statement, the Passion Map, Strength Evidence and any reflection. The raw answers never
  leave the device. Only each Tool's short derived result is used, and only by the parts of the app
  that Tool names.
- **The behavioural log** the adaptive coach reads — when you opened the app, what you reported, and
  when.
- **Your onboarding answers**, which shape your first plan.
- **The timing evidence** behind smart reminders, and your reminder schedule.
- **Your motivation-card feedback** — an item id and whether you found it helpful. Nothing you typed.

Your reminders are **local notifications**, scheduled on the device. We hold no push token and we
cannot send you anything from a server.

### 3.2 In your account, on our server

So that a lost phone does not mean starting over, your account's own state is stored on our backend
(Supabase) and restored when you sign in: your Dreams, Journeys, Milestones, Steps, your history,
your Buddy, and a closed classification of each missed Step.

**The line we drew inside that, and it is the important one: your raw wording stays on the phone; our
reading of it goes up.** When you miss a Step and write why, what travels is the category ("no time",
"too hard") — never the sentence you wrote. The same is true of a Journey's "why", the note at the
end of a Journey, and the coach's raw behavioural log. This is enforced in code, in one place, with a
test that checks it field by field.

Also on the server, once you use the social features:

| What | Fields | Who can read it |
|---|---|---|
| Your account | A user id; an email address **only** if you chose to sign in with Google or Apple | You, and our service |
| Your profile | Your chosen handle, and a coarse Buddy summary | You, and people in your Support Circle |
| Friendships | Who asked whom, and the status | The two people involved |
| Support Circle | Owner, Ally, Journey, what is shared, and the status | The two people involved |
| Shared progress | A coarse progress summary — never your "why", your reflections or your Step detail | You and your accepted Allies |
| Companion Steps | System-generated Step names for coach-built Journeys only. A Journey you typed yourself can never be shared this way | You and your accepted Companions |
| Cheers and nudges | Who sent what, and when | The two people involved |
| Account tier | Free / trial / subscriber | You, read-only. Written only server-side |
| Journey pause events | That a Journey you share was paused or resumed, and when. No reason, no note | You and that Journey's Allies |
| Direct messages | Who talked to whom and when. **The bodies are sealed** | Only the two participants |

**Direct messages are end-to-end encrypted.** Our server stores them as sealed boxes and cannot read
them. There is no column that can hold a readable message.

Everything else in that table is protected by row-level security — the database itself refuses to
return another account's rows — and by our promise: **we do not read it, mine it, or sell it.** It is
not end-to-end encrypted. We hold it the way a large app holds what you post there.

### 3.3 What we send to someone else

| Who | What we send | What they may do with it |
|---|---|---|
| **Google (Gemini), for the AI coach** | Your conversation with the coach, the goal you are describing, and the short derived summaries the coach is allowed to remember | We use the **paid** tier, whose terms **do not train models on the content sent to it**. Obvious personal identifiers (email addresses, phone numbers) are stripped from the outbound request before it leaves |
| **The Mirror synthesis service** | The answers other people gave about you, so they can be de-identified and synthesised | It returns a synthesis. Raw contributor answers are never returned to you and are deleted (see §6). Region: `[[MIRROR_REGION]]` |
| **Apple / Google sign-in** | Only what you approve at the system sheet | Optional. Signing in anonymously is the default, and you can use PushApp with no identifier at all |
| **Expo / EAS** (app builds and updates) | The app itself. Delivering an update involves your device's IP address in their logs | Infrastructure only. No content of yours is sent |

We do not use any other processor. If that changes, this table changes with it, and §11 says how you
will hear about it.

### 3.4 What other people tell us about you

The **Mirror** feature lets you ask people who know you what they see in you. That creates two
people's data at once — yours and theirs — so it has its own rules:

- In **confidential** mode you never see the raw answers. Not in the app, not by export, not through
  the coach, not in a notification, not in an error message. You see only a synthesis.
- Who answered is stored separately from what they answered.
- Raw confidential answers are deleted no later than **seven days** after the synthesis is made or
  the round closes. Only the de-identified synthesis survives.
- A contributor can withdraw before synthesis, and their withdrawal is honoured.
- Contributors are told, in their own words, which mode they are answering in. Visible and
  confidential are different promises and never share one wording.

## 4. What we deliberately do not collect

This list is part of the policy, not marketing:

- **No analytics and no crash-reporting SDK.** None. Not Sentry, not Amplitude, not PostHog, not
  Mixpanel, not their equivalents.
- **No advertising identifier, no cross-app tracking, no ads.** Apple's App Tracking Transparency
  prompt is therefore not shown, because there is nothing to ask about.
- **No push tokens.** Reminders are scheduled locally on your device.
- **No location.** The code has an inert seam for it with nothing behind it; it asks for no location
  permission and reads no location.
- **No calendar access.** The same: a seam, nothing behind it.
- **No contacts.** You find a friend by typing the handle they chose.
- **Nothing is sold, and nothing is shared for anyone else's marketing.**

**The camera, your photos and the microphone are a different case, and this section used to get it
wrong.** The app can attach a photo or a voice note to something you are writing in a Tool. It asks
for that permission only at the moment you tap to use it, never at launch; if you say no, the Tool
works exactly as before without the attachment. **What you attach is a file on your phone and
nothing else** — it is never uploaded, and there is no code in the app that could upload it. Saving
a completion card to your photo library happens only when you tap Save.

## 5. Why we use each thing, and on what basis

| What | Why | Legal basis (EU/UK) |
|---|---|---|
| Your Dreams, Journeys and Steps | To be the product you opened. Without them there is nothing | Performance of a contract |
| Your account backup | So a lost phone does not lose your life's plan | Performance of a contract |
| Your onboarding answers, Tool results and behavioural log | To shape a plan around you rather than a generic one | Legitimate interest, and you can turn the adaptive parts off |
| Your conversation with the coach | To answer you | Performance of a contract. **The coach's memory is separately consented**, and withdrawing it deletes what it held |
| Friendships, Support Circle, shared progress | Because you invited someone, and they accepted | Consent, on both sides |
| Mirror | Because you asked people a question about yourself | Consent, yours and each contributor's |
| Reminders | Because you set them | Consent (the OS permission) |
| Account tier | To know what your account includes | Performance of a contract |

## 6. How long we keep things

| What | Kept |
|---|---|
| Everything on your device | Until you delete it. Deleting your account wipes the file and destroys its key |
| Your account backup and social rows | For the life of the account; deleted when you delete it |
| Mirror confidential raw answers | Seven days from synthesis or round closure, then deleted |
| Mirror abuse evidence, if any is reported | Kept separately, under the abuse exception, for a documented maximum. We say this out loud because deletion does not reach it |
| The coach's conversation content at the provider | The provider's own retention window for the paid tier |
| Journey pause events shared with your Allies | 30 days, then deleted automatically |
| The coach's behavioural log | `[[BEHAVIOUR_LOG_WINDOW]]` |
| Tool derived summaries | Until the Tool's own result goes stale, or you redo it |

## 7. Your rights

You can ask us to give you a copy of your data, correct it, delete it, hand it to you in a portable
form, object to a use of it, or withdraw a consent you gave. Write to `[[CONTACT_EMAIL]]`.

Two of those you do not have to ask for — they are buttons in the app:

- **Export**: Settings → your account → export a copy of your data.
- **Delete**: Settings → your account → delete account. It wipes the device file, destroys its key,
  and deletes your rows from our server. It cannot be undone.

There is also a public page for the deletion request, because the app stores require one:
**https://pushapp-invite.expo.app/delete-account**

If you are in the EU or the UK, you may also complain to your national data protection authority.

**What deletion cannot reach**, and we would rather say it than have you discover it: things that are
also someone else's. A message you sent lives in the other person's conversation too. What a Mirror
contributor wrote is their answer as well as your result. Abuse evidence is retained under the
exception above.

## 8. Children

PushApp is not for children. You must be **13 or older**, or older where your country sets a higher age of digital consent — in parts of the EU that is 14, 15 or 16. This matches the minimum the app stores themselves enforce. We do not knowingly
collect data from anyone younger; if we learn that we have, we delete the account. If you believe a
child is using PushApp, write to `[[CONTACT_EMAIL]]`.

## 9. How we protect it

- Everything on your device is stored in an **encrypted file**, with the key held in the device's own
  secure store (Keychain / Keystore).
- Everything in transit uses **TLS**.
- Every table on our server has **row-level security**: the database refuses to return another
  account's rows, whatever the app asks for.
- **Direct messages are end-to-end encrypted** and the server holds no key that could open one.
- Notifications are written so that what appears on your lock screen never contains a Step title, a
  Journey "why", a reflection, or another person's private text.

No system is perfect, and we would rather tell you what protects what than promise you it cannot fail.

## 10. Does anything decide about you automatically?

Yes, in a limited and visible way: the coach adapts your plan from what you report, and the app
learns when you tend to act so a reminder can arrive at a time that suits you. Those are suggestions
about your own plan. **They have no legal effect and no similarly significant effect on you**, they
are visible in the app, and you can change or turn them off. The coach's output is not professional,
medical, psychological, legal or financial advice. PushApp does not diagnose anything and is not a
clinical tool; goals about addiction or a relationship in difficulty are deliberately handed to a
person rather than turned into a plan.

## 11. Transfers, and changes to this policy

Our backend runs in `[[MIRROR_REGION]]`-adjacent infrastructure operated by Supabase; the AI provider
and the build service operate internationally. Where data leaves the EEA or the UK, it does so under
the standard contractual clauses those providers publish.

If this policy changes in a way that affects you, the app tells you the next time you open it, and
the date at the top of this page changes. We do not make a material change quietly.

## 12. Contact

`[[CONTROLLER]]` · `[[CONTACT_EMAIL]]`
