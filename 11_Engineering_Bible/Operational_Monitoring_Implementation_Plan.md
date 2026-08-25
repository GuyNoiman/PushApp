# Operational Monitoring & Admin Console — implementation plan

Status: **Architecture plan, 2026-08-25.** Written against
`04_Product/PRD/Operational_Monitoring_Admin_Console_PRD.md` (Approved, 2026-08-25), which asks for
architecture and implementation planning as its next step. It decides no product questions; where the
PRD is silent on sequencing, this file proposes one and says why.

---

## 0. The two facts that shape the whole sequence

**A crash SDK needs a native build (PRD §13.3), and the founder does not want one right now.** Full
Sentry integration has native bindings; a JavaScript-only catcher misses native crashes and early
startup failures, and the PRD is explicit that it may not be called monitoring. So crash monitoring is
the LAST stage, not the first, and everything before it is chosen to be useful without it.

**A new external vendor needs an account, and creating accounts is the founder's to do.** Sentry is
the one new vendor the PRD permits. The account, its organisation, the project, and the DSN come from
him; nothing in this plan creates one. Its free allowance (documented as 5,000 error events/month)
must be re-verified at the moment of use — the PRD says so because quotas change.

Everything in stages 1–3 below is free, needs no build, and reaches both phones over the air.

## 1. Stage 1 — the data spine (Supabase, no build, no vendor)

One migration, deny-by-default. Tables:

| Table | What it holds | Who may read it |
|---|---|---|
| `admin_members` | operator → role(s) (`owner`/`operations`/`developer`/`product`/`support`/`safety`/`readonly`) | an operator reads their OWN row; role checks happen server-side |
| `app_reports` | a user's report: category, description, contact email, the safe diagnostic fields of §8.3 | operators with the right role; the REPORTER may read their own |
| `report_attachments` | one screenshot per report, in a private bucket | role-gated, and every open is audited |
| `app_versions` | the build/update registry (§9): platform, version, build, runtime id, channel, released_at, notes | operators |
| `kpi_events` | the versioned product-event taxonomy (§7), consented separately | nobody reads rows; only aggregates |
| `ops_issues` | an active issue: severity, owner, status, notes, history (§6.6) | operators |
| `admin_audit` | every sensitive access and change (§10) | owner only, append-only |

Two rules the schema itself enforces, because §11.4 is a list of things that must be impossible rather
than discouraged: **`kpi_events` has no free-text column at all** (an event is a name, a version, a
bucketed value and a timestamp), and **`app_reports.description` is the ONLY free-text column in the
whole set** — it exists because a person chose to write it, which is the entire difference.

Retention (§12) runs as a nightly `pg_cron` job in the same file, the third one in this project after
Mirror's raw answers and the inactivity evaluator.

## 2. Stage 2 — report intake in the app (no build) — **BUILT 2026-08-25, minus the screenshot**

**Shipped:** Settings → *Help and feedback* → category, description, an optional reply address, and
the allowlisted diagnostics of §8.3. The screen states what travels with the report before it is
sent, and a failure to send is said out loud — a report that silently vanished is worse than a form
that admits it failed, because the person believes they told us.

**Two things the build made concrete:**

1. **The screenshot is NOT shipped, and the reason is the contract rather than the effort.** §8.4
   requires metadata stripping including location, which means re-encoding the file, which means
   `expo-image-manipulator` — a native module, and therefore a build. `expo-image-picker` is already
   in the build, so a picker would have been easy and would have shipped a promise we are not
   keeping. It arrives with the same build that carries the crash SDK.
2. **The contact email cannot be prefilled** (§8.3 says "when available"). It is not available:
   `AuthUser` holds an id, an anonymous flag and provider names, and never the address — the PII
   boundary (red-line R1). The field starts empty and the hint says why it is worth filling. That is
   the cost of a boundary chosen on purpose, and the right place to pay it is here rather than by
   widening the boundary.

### The original plan for this stage

Settings → *Help and feedback*, plus the in-context error states. This is the highest user-visible
value in the whole PRD and it needs neither a vendor nor a build: today a person who hits something
broken has no way to tell us, which is why the space-bar bug reached the founder by hand.

The screenshot contract (§8.4) is the part with real work in it: full preview, replace/remove, a
warning to exclude private information, metadata stripping INCLUDING location, size/type validation,
and an explicit confirmation that this exact image is what will be sent.

Deliberately deferred, as the PRD allows: reporting another user from their profile (§8.1) waits for
blocking to exist, and encrypted-message evidence (§8.5) waits for its own design.

## 3. Stage 3 — the console (a separate web app, free hosting)

A responsive internal website, not a screen in the app (§5). It is deployed to **EAS Hosting's free
tier**, the same place the invite page lives — no new account, no new billing relationship.

It authenticates with Supabase Auth against `admin_members`, and every authorisation decision is made
server-side (§10): the browser is never trusted with a role. MFA before production access is a
Supabase Auth capability to verify at implementation; if it is not available on the free tier, that
is a gate to raise rather than a rule to quietly drop.

Tabs 3 (Reports) and 4 (Versions) are fully answerable from stage 1's data. Tab 1 (System Health) is
partially answerable — Supabase reachability, update adoption from EAS, KPI freshness — and every
signal that cannot be measured yet is **gray, not green** (§3.4: unknown is not healthy). Tab 2 (KPIs)
lights up with stage 4.

## 4. Stage 4 — KPIs and their separate consent

The event taxonomy is small, versioned, and additive. The consent is a SEPARATE state from the
operational-diagnostics disclosure (§11.2): declining it must not disable crash monitoring or reduce
any product access, and withdrawal stops future events without touching what the account can do.

This is the same consent shape Coach Context Summaries already uses, and it should reuse its module
rather than inventing a second versioned-consent mechanism.

## 5. Stage 5 — Sentry, and the build that carries it

Needs, from the founder: an account, an organisation, a project, and a DSN. Then the SDK, the
allowlist and scrubbing of §11.3/§11.4, source-map upload wired into the EAS build and update, and the
canary QA of §11.5 — planted strings for every prohibited category, a deliberately triggered fatal and
handled path, and an inspection of the final serialized outbound payload. **A release fails if any
canary survives.** That test is the deliverable, not the SDK.

## 6. What this plan does not do

It does not perform, widen or roll back a gradual release (§4.2) — that is its own PRD and it depends
on this one's data rather than the other way round.

## 7. Order, and why

1 → 2 → 3 are strictly free, buildless and independently useful; 4 needs a product decision on the
taxonomy; 5 needs a vendor account and a build. If the order has to change, the one thing that should
not move is that **stage 2 ships before stage 5**: knowing what a person hit is worth more than knowing
that something threw, and it is the half no SDK can provide.
