# Partner packages — the convention

Status: Living · established 2026-08-20

Everything the coaching partner sends lands here, **one folder per delivery**, named
`<Domain>_<version>_<date received>`. The folder holds the delivery EXACTLY as it arrived and
nothing else — no edits, no renames, no fixes.

## Why a folder per delivery

A package is a snapshot of what somebody asserted on a day. Keeping each one whole means a later
version can be dropped in beside it, or deleted, without touching anything that came before, and
without anyone having to work out which loose file belonged to which delivery. The earlier layout put
the files flat in `07_Assets/`, which was already ambiguous with two versions of one library in it.

## The rules

1. **Never edit a package in place.** If something in it is wrong, that belongs in the reply to the
   partner and in the ingest notes — never in his file. The folder must always be a faithful record
   of what he sent.
2. **A package is a SOURCE, not the library.** Nothing here is loaded by the app. Content becomes
   real by being TRANSLATED into `app/src/core/learning/library/`, where what changed on the way in
   is documented at the top of each file.
3. **A superseded package stays.** It is the record of what an earlier decision was made against.
   Deleting one destroys the reasoning behind the code that was written from it.
4. **Some files must never be ingested.** Each package's own README says which; where it does not,
   the ingest notes must. QA fixtures in particular carry personas and invented people, and a persona
   must never reach the library — a Dream belongs to the person living it.

## What is here

| Folder | Received | What it is | State |
|---|---|---|---|
| `Career_v0.6_2026-08-19/` | 2026-08-19 | Six Career goal families, 18 Journeys | **Ingested** → `app/src/core/learning/library/career/` |
| `Career_v1.1_2026-08-20/` | 2026-08-20 | The complete Career Expert candidate: 20 goals, 30 families, 60 Journeys, the diagnosis, the routing rules, the interview and the signal dictionary | **Not ingested.** Reviewed 2026-08-20 — see `04_Product/Open_Work_2026-08-20.md` §1.1 |

**Do not import `Career_v1.1_2026-08-20/12_Authoring_QA_Fixtures_v1.1.json`.** It is the partner's own
instruction and ours: it holds 73 persona references, which is exactly the material that must not
reach the library.

## A standing instruction for future deliveries

**The repository language is English.** Hebrew source is accepted and translated on our side, but
every future package should arrive in English so the translation is the author's and not ours. Told
to the partner from the next letter onward (founder, 2026-08-20).
