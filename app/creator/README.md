# The Journey Studio — foundation

A web app for Creators: sign in, prove you may author for the community, and see
what happened to the Journey Templates you published. One HTML file, one
stylesheet, ES modules the browser loads directly. No framework, no build step,
no dependency.

Built to `04_Product/PRD/Future/Creator_Journey_Authoring_Platform_PRD.md`
(**Future Vision** — strategic direction approved, many product, business and
compliance questions open). That PRD's §20 lists promotion gates this does not
meet and does not claim to. This is the foundation, requested on 2026-08-28:
authentication, the permission check, the creator's own page, per-Journey
analytics, and the first metadata-only Journey Template draft flow.

The approved responsive Light/Dark design references are stored under
`04_Product/PRD/Assets/Creator_Journey_Studio/` and embedded in that PRD.

## Terminology, because it is easy to lose

A **Journey Template** is the reusable definition a Creator authors. A
**Journey Instance** is a participant's personal copy — theirs from the moment
they adopt it. This product authors templates.

A creator may call their offering a workshop, a course or a program to their own
audience. Inside PushApp it is a Journey made of Milestones and Steps. There is
no Course object, no Module, no Lesson, and adding one would be the drift the
PRD's §21 exists to prevent.

"For the community" is structural rather than a filter: a person's own Journeys
live on their device and never appear in `journey_templates` at all. Everything
this site shows is something authored to be adopted by somebody else.

## Signing in is the app's own sign-in

The app authenticates with Apple and Google through Supabase, exchanging a
native identity token. A browser cannot do that exchange, so the web equivalent
is Supabase's `/auth/v1/authorize` redirect — the same provider, the same
Supabase project, and therefore the same account and the same user id. A creator
signs in here with the identity they already use in the app.

**Apple is not offered yet.** Sign in with Apple on the web needs a Services ID
and its own return URL, configured separately from the native one. The button is
absent rather than broken — which is what the app's own sign-in screen does with
a provider the build cannot run.

**Before this works, one dashboard step:** the site's URL has to be in the
Supabase project's redirect allow-list (Authentication → URL Configuration).
Without it the provider returns here with an error instead of a session. For
local work that is `http://localhost:4322`.

## Being signed in is not being a creator

Three states, each a real answer:

1. **Signed out** — the front door.
2. **Signed in, not a creator** — expected, and said plainly. §13.1 is explicit
   that an open creator platform must not be the first release: the first
   creators are invited.
3. **A creator** — the profile and the Journeys.

The check is `is_creator()` in the database. It reads `creator_members` today.
When creators eventually hold a different subscription from ordinary users, that
is ORed into **that one function** — nothing in this web app or the rest of the
schema changes. `entitlements` already exists for it and is service-role-written,
so a client can never grant itself the tier.

**There is no creator yet.** `creator_members` is empty and no migration fills
it; the SQL to insert the first one by hand is in the last section of
`app/supabase/migrations/0011_creator_platform_foundation.sql`.

## What a creator can see, and what they cannot

Per Journey Template: how many started it, how many are in progress, completed,
left it, paused; the completion rate; the average rating; the reviews; and every
field they filled in about it.

Never: who the participants are, an individual's progress, private Dreams, the
reason a Step was missed, coach conversations, free-text answers or photos from
Steps, or Ally activity. That list is rendered on the page itself — an absence
is easy to erode, a written line has to be argued with.

**This is enforced by the schema, not by this page.** `template_enrollments` has
no read permission for a creator at all. The numbers come from SECURITY DEFINER
functions that return counts, the same way the operations console reads KPI
freshness without being able to read a KPI row.

### Suppression, and why the total is not suppressed

PRD §14 requires minimum cohort thresholds. Applied to everything, a creator
with three participants would see nothing — which is not what the requirement
protects against. An enrolment **total** identifies nobody; a **breakdown** can:
"1 enrolled, 1 completed" is a fact about a person.

So the total is always shown and every breakdown appears at five participants.
The page says how many more are needed rather than "insufficient data", because
a creator with three should know they need two more.

Reviews are not cohort-suppressed. A review is written knowingly, to be read by
the creator; withholding it would withhold something a person deliberately said.
What is protected is who said it — the reviewer's id is not in the function's
return type at all, so it cannot be selected, joined, or leaked by a later
`select *`.

## Where it is

**https://pushapp-invite--studio.expo.app** — EAS Hosting's free tier, deployed 2026-08-28, as an
**alias** deployment rather than the production one (the invitation page holds production; an alias
sits beside it and leaves it untouched).

Redeploy after a change:

```bash
npx eas-cli@latest deploy --non-interactive --export-dir creator --alias studio
```

**A redeploy does not always move the alias.** The first deploy assigns it; a
later one can create a new deployment and leave the alias pointing at the old
one — which looks exactly like a caching problem and is not. Confirm by fetching
the alias, and if it is stale, move it explicitly:

```bash
npx eas-cli@latest deploy:alias --non-interactive --alias studio --id <deployment-id>
```

The id is the subdomain in the `Deployment URL` the deploy printed.

## Running it locally

```bash
npm run console:config
npx --yes serve creator -l 4322
```

The first command writes `creator/config.js` (and the console's) from the app's
`.env`. Its name is stale — it writes both now — and renaming it is deliberately
deferred: `packageJson:scripts` is a runtime-fingerprint source, so renaming the
script would cut every installed build off from over-the-air updates. It is
worth doing at the next native build and not worth a build of its own.

## Creating the first draft

An active Creator can now open **Create Journey** and save a private metadata
draft. The first slice captures identity and fit, expected effort, and safe
Journey-level rules. It intentionally does **not** invent a structure format:
Milestones, Steps, dependencies, rich media, completion thresholds and Coach
guidance still belong to the future structure builder.

Draft creation goes through `creator_create_template_draft()`, introduced by
`app/supabase/migrations/0012_creator_draft_write_boundary.sql`. The function
derives the owner from the signed-in account and always creates a `draft`; the
browser cannot choose an owner or publish itself. Migration 0012 must be applied
before this version of the site is deployed.

## Known, and deliberate

- **The ignore rule lives in `creator/.gitignore`, not the root one.** The root
  `.gitignore` is a runtime-fingerprint source, and two builds were in flight
  when this landed — editing it would have cut them off from over-the-air
  updates before they were even installed. A nested `.gitignore` is not a
  fingerprint source; verified by computing the hash either side of adding it.
- **`src/api.js` overlaps the operations console's by about eighty lines.** Each
  site deploys as a self-contained folder, so a shared module outside the folder
  is not served, and the two genuinely differ where it matters — a password
  sign-in into `sessionStorage` under an eight-hour cap versus an OAuth redirect
  and a normal product session. A third site is the moment to extract the
  plumbing and accept a copy step or a bundler with it.
- **Metadata draft authoring only.** No structure builder, no Milestones, no
  Steps, no versions, and no publishing action. The lifecycle column accepts all
  eight of §13's states, but the browser can create only a private draft.
- **`journey_templates` has no structure column.** Not even an empty `jsonb`
  "for later" — that would be a guess that later code builds on. §6's structure
  builder is the largest open design in the PRD.
- **Nothing enrols anybody.** `template_enrollments` and `template_reviews` are
  written by the app when adopting a creator Journey exists as a feature. Until
  then every number here is honestly zero.
