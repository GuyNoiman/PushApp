# Research — Signup and First-Run Onboarding

Status: Product research for the future K1 registration/onboarding PRD.
Date: 2026-08-12.
Scope: mandatory-account registration, returning users, progressive profiling, questionnaires, permissions,
trust, and first-value sequencing in behavior-change/coaching products.

---

## 1. Executive conclusion

The strongest direction for PushApp combines:

- **Duolingo's sequencing:** communicate a concrete promise, gather only immediately relevant intent, and make
  the next action obvious;
- **Finch's warmth and small first action:** begin with something emotionally approachable rather than a long
  setup form;
- **Wysa's trust posture:** explain why information is needed, minimize collection, and make skipping/deletion
  clear;
- **Headspace's permission timing:** request notifications when the user is choosing an actual reminder, not
  as a generic registration demand.

PushApp differs from products that allow anonymous use: an account is mandatory because Journeys, private
Coach context, cross-device recovery, friendships, and Support Circle authorization need a stable identity.
That does not justify asking for every profile field before demonstrating value.

Recommended principle:

> Explain the value, choose language, create the account, progressively learn what is needed, then deliver the
> first Coach-led Journey—without a paywall or generic permission wall in the initial flow.

## 2. Competitor findings

### Finch

Official materials describe beginner goals/self-care setup and account/cloud backup as separable concepts.
New account creation currently uses phone verification, while account/cloud backup provides durable recovery.
The first screen exposes a returning-user login route.

Sources:

- [Finch approach to self-care](https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care)
- [Finch New User Guide](https://help.finchcare.com/hc/en-us/articles/42149821015693-New-User-Guide)
- [Accounts and Cloud Backups](https://help.finchcare.com/hc/en-us/articles/41834952026381-Accounts-and-Cloud-Backups)

**Strength:** quick emotional ownership and small first actions. Account value is tangible: recovery and
continuity.

**Weakness:** the large game/shop layer can overwhelm new users and shift focus toward the app itself.

**PushApp lesson:** explain the account as the way private Journeys remain safe and recoverable; do not expose
the complete product architecture during first-run.

### Fabulous

Official help material shows fragmented account/subscription activation: email, Apple, and Google may be used
in web/subscription paths, while users can still encounter an in-app profile/account mismatch and duplicate
upgrade prompts.

Sources:

- [Activate a Fabulous subscription](https://help.thefabulous.co/en/support/solutions/articles/101000532053-how-to-activate-my-subscription)
- [Premium access troubleshooting](https://help.thefabulous.co/en/support/solutions/articles/101000406365-i-can-t-access-the-premium-features)
- [Subscription terms](https://help.thefabulous.co/en/support/solutions/articles/101000586285-subscription-terms)

**Strength:** concrete ritual framing makes the first intended behavior feel manageable.

**Weakness:** identity, entitlement, and purchase can become different systems, harming trust and recovery.

**PushApp lesson:** maintain one account identity and avoid inserting subscription complexity into K1.

### Headspace

Headspace requires an account for subscription use, but reminders are configured later through Settings with
chosen time/frequency rather than being an unexplained first-launch permission.

Sources:

- [Purchase a Headspace subscription](https://help.headspace.com/hc/en-us/articles/215758647-How-do-I-purchase-a-Headspace-subscription)
- [Set up reminders](https://help.headspace.com/hc/en-us/articles/115008276788-How-can-I-set-up-Reminders)
- [Company-member onboarding](https://help.headspace.com/hc/en-us/articles/360000220608-My-company-just-launched-Headspace-How-do-I-get-started-and-manage-my-subscription)

**Strength:** contextual reminder permission and an explicit existing-account branch.

**Weakness:** subscription/restore paths can obscure the core first action.

**PushApp lesson:** ask notification permission after the user sets the first real Journey reminder, with a
plain-language pre-prompt.

### Calm

Calm allows users to select goals and close/skip that screen. It supports several authentication methods and
syncs subscription/favorites across devices.

Sources:

- [Calm partner signup and app flow](https://support.calm.com/hc/en-us/articles/360020423153-How-to-sign-up-through-a-Calm-partner-s-URL)
- [Using Calm on multiple devices](https://support.calm.com/hc/en-us/articles/360008703453-Using-Calm-on-Multiple-Devices)
- [Changing login methods](https://support.calm.com/hc/en-us/articles/4410815269275-How-to-Switch-from-Apple-Google-or-Facebook-Login-to-an-Email-Password)

**Strength:** early goal selection is optional and returning users have multiple paths.

**Weakness:** many providers increase duplicate-account/linking ambiguity; trials can appear before enough
value is experienced.

**PushApp lesson:** preserve the ability to skip questions, but keep the provider set deliberately small and
handle account collision/linking explicitly.

### Duolingo

Duolingo's official product guides describe a progressive path: select what to learn, answer motivation/goal
questions, choose beginner versus placement route, complete a first lesson, and preserve progress through an
account. The company extensively tests local wording and stakes.

Sources:

- [Duolingo 101](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/)
- [Adding a new course](https://blog.duolingo.com/add-new-course/)
- [Placement-test improvements](https://blog.duolingo.com/partial-credit-improvements-to-duolingos-placement-test/)
- [Turning local research into global experiments](https://blog.duolingo.com/lessons-from-asia-turning-local-research-into-global-experiments/)

**Strength:** progressive disclosure, novice/experienced fork, and early evidence of competence/value.

**Weakness:** streak and reminder machinery can optimize return rather than meaningful progress.

**PushApp lesson:** show an honest preview of what the Coach will do and provide a clear returning-user path;
do not import engagement-first streak pressure.

### Strava

Strava's getting-started model centers on account setup, pairing/importing data, and recording a first
activity. Privacy controls are granular and device/health permissions occur in context.

Sources:

- [Strava Getting Started](https://support.strava.com/en-us/collections/19657601-getting-started)
- [Setting up an account](https://support.strava.com/en-us/collections/19668971-setting-up-your-account)
- [Activity privacy controls](https://support.strava.com/en-us/articles/15401987-activity-privacy-controls)
- [Strava login](https://www.strava.com/login?cta=log-in&element=global-header&source=apps_index)

**Strength:** stable account identity and contextual data connections.

**Weakness:** setup/data permissions can precede the first meaningful result, and privacy choices can be
cognitively heavy.

**PushApp lesson:** mandatory account is appropriate, but defer optional device/service permissions until a
feature needs them.

### Noom

Noom uses a comparatively long intake around current state, desired outcome, experience, and obstacles before
presenting a personalized program and commercial offer.

Sources:

- [How Noom works](https://www.noom.com/blog/what-is-noom-how-does-noom-work/)
- [Noom free account/features](https://www.noom.com/support/faqs/using-the-app/daily-features/2025/10/free-features-in-the-noom-app/)

The detailed walkthrough may vary from the current A/B-tested flow, but the quiz → personalized result →
commercial conversion structure is clear.

**Strength:** the user feels the program considered their context before proposing a plan.

**Weakness:** high time and disclosure cost before experienced value; projected outcomes can overpromise; an
invested quiz can become a conversion funnel.

**PushApp lesson:** keep the approved questionnaire to six optional questions and about two minutes. Never use
answers to create an unapproved outcome claim or surprise paywall.

### Wysa

Wysa allows base AI use without conventional email/phone signup and emphasizes anonymity, nickname use,
non-diagnostic conversation, deletion/reset, and limits on information sharing.

Sources:

- [Meet Wysa](https://www.wysa.com/meet-wysa)
- [Wysa FAQ](https://www.wysa.com/faq)
- [Clinical-program FAQ](https://www.wysa.com/faq-clinical-program)

**Strength:** privacy and data minimization are part of the first-value proposition.

**Weakness:** anonymous/local identity complicates cross-device recovery and cannot directly support PushApp's
friend/Ally authorization model.

**PushApp lesson:** retain mandatory account identity, but copy Wysa's specificity: explain what is stored,
what is optional, and what is not a diagnosis.

### AI Coach comparators

Current reports on Fitbit/Google's AI Coach describe a conversational onboarding that asks about goals,
preferences, equipment, constraints, and health considerations before generating a plan. Reports place the
conversation around 15–20 minutes and note an explicit option to explore before chatting.

Sources (secondary; treat exact flow as subject to preview/A-B changes):

- [Fitbit AI Coach onboarding report](https://www.tomsguide.com/wellness/fitness/i-spent-20-minutes-chatting-with-fitbits-new-ai-fitness-coach-5-things-that-surprised-me)
- [Fitbit Coach preview setup](https://www.androidcentral.com/apps-software/how-get-started-fitbit-personal-ai-health-coach)

**Strength:** rich context can generate a materially specific plan.

**Weakness:** a 15–20 minute mandatory conversation is too heavy for PushApp's initial setup and may collect
more sensitive information than necessary.

**PushApp lesson:** use six short questions to warm up the Coach, then let the conversation deepen only as the
user chooses.

## 3. Recommended PushApp sequence for discussion

This is a research recommendation, not yet an approved PRD:

1. **Promise/Welcome:** one clear statement of transformation value and two visible actions: Get started and
   Log in.
2. **Language:** mandatory first preference; all later content follows it.
3. **Account:** mandatory Apple/Google creation or existing-user login. Explain stable identity, privacy, and
   recovery. Do not ask for password or legal name.
4. **Personal Information review:** progressively show provider/device defaults. Challenge whether photo,
   birth date, Active Hours, and week start must all block first value; every unnecessary field increases
   abandonment.
5. **Six-question optional questionnaire:** approved two-minute experience; save per page and resume.
6. **First Coach conversation:** use the minimum summary, propose Dream/Journey, and require approval.
7. **First real Step:** create an achievable first action that demonstrates the core value.
8. **Notification permission:** request only after the user chooses an actual reminder. Explain what will be
   sent and that it remains editable.
9. **Home:** arrive with a real Journey/next action, or a useful Coach entry if the user skipped setup.

The alternative of showing one safe intent/value-preview screen before account may improve perceived value,
but the founder has decided an account is mandatory. Whether that preview precedes authentication remains an
open sequencing decision.

## 4. Returning and interrupted flows

Recommended state-machine behavior:

- first screen always exposes **Log in**;
- authenticated + onboarding complete → Home or the approved inactivity-return flow;
- authenticated + onboarding incomplete → exact saved checkpoint;
- provider cancellation/failure → same screen with selections preserved;
- existing remote account beats an unbound local draft; never overwrite remote Journeys/profile silently;
- local pre-auth draft, if supported, binds only after successful account creation and explicit conflict
  handling;
- onboarding version, checkpoint, answers, language, timestamps, and permission-prompt state are idempotent;
- account deletion removes onboarding answers, draft, and derived Coach summary.

## 5. Permission and paywall recommendations

### Notifications

Do not request notification permission at launch or immediately after account creation. Ask when the user
selects a first reminder time or explicitly enables reminders. Use an in-app explanation before the OS dialog.
Declining does not block Journey creation or Coach use.

### Camera/photo

Request only after the user deliberately taps profile photo and chooses camera/library, consistent with the
Own Profile PRD.

### Calendar/location

Future only and requested in the feature context; never part of generic registration.

### Payment

No surprise K1 paywall. The initial product must deliver enough real Coach/Journey value to evaluate
transformation. A commercial boundary requires a separate pricing/subscription PRD.

## 6. Trust copy patterns

Before account:

> Your account keeps your Journeys private, recoverable, and available across devices.

Provider privacy:

> Apple or Google verifies your account. Your email is not shown to other users.

Before questionnaire:

> Six optional questions help the Coach understand what matters to you. You can skip any question and change
> your answers later.

Before Coach handoff:

> The Coach receives only what is needed for this conversation. It will suggest; you decide what changes.

Before notification permission:

> Allow reminders for the Steps and times you choose. You can change or turn them off at any time.

Avoid generic “we value your privacy,” diagnostic claims, projected success dates, countdown pressure,
default-checked marketing consent, and trial urgency.

## 7. Product decisions still needed

1. Does the first screen show only promise/auth actions, or one safe Coach/value preview before authentication?
2. Exact Apple/Google button structure and whether the app offers provider linking after first signup.
3. Which Personal Information fields must be confirmed before the Coach, and which can be completed later?
4. Exact notification-permission moment relative to first Journey/reminder creation.
5. What happens when only one provider is available or the provider returns incomplete data?
6. Account collision: same person uses Apple relay email and Google/another email.
7. Whether pre-auth local onboarding drafts exist at all.
8. The first-run endpoint when the user skips the questionnaire and does not yet want to create a Journey.
9. Age/minor policy and consent requirements before collecting birth date or enabling social features.
10. Terms, privacy, AI disclosure, and marketing-consent presentation.

## 8. Suggested measurement

Measure without answer/free-text content:

- onboarding start and checkpoint abandonment;
- login versus new-account selection;
- provider start/success/cancel/error class;
- resume checkpoint and elapsed-time bucket;
- profile fields edited count, not values;
- questionnaire start, per-question answer/skip, completion duration;
- first Coach conversation, Journey proposal/approval, first Step started/completed;
- notification pre-prompt and permission result;
- day 1/7/14/30 Journey continuation.

Success is the first meaningful real-world Step and later Journey continuity—not the number of onboarding
screens completed or time spent in the app.

