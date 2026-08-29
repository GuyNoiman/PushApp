-- ============================================================================
-- Migration 0015 — one versioned outcome event per Journey ending
-- ----------------------------------------------------------------------------
-- Idempotent.
--
-- Built to `04_Product/PRD/Future/User_Content_Matching_Engine_PRD.md` §3A.6,
-- §5 and §6. The founder's decision, 2026-08-29: do NOT build the matching
-- engine yet — it needs data that does not exist — but start collecting that
-- data now, because it cannot be filled in backwards. A Journey that ended in
-- June is a fact nobody can recover in December.
--
-- ── THE ONE RULE THIS TABLE ENFORCES BY ITS SHAPE (§5.4) ──────────────────
--
-- "It never trains or ranks on one blended success number." So there is no
-- success column, and no score. There are three DIFFERENT outcomes in three
-- different columns, and they are allowed to disagree:
--
--   satisfaction     — did they like and trust it (vulnerable to novelty,
--                      charisma and low difficulty; §5.1)
--   adherence        — did they do the dose THEY intended, which is why
--                      `intended_depth` is recorded at the start rather than
--                      assumed to be "all of it" (§5.2)
--   real_world_change — did anything actually change (§5.3, the primary one and
--                      the hardest to measure honestly)
--
-- Completion is not success and non-completion is not failure. Somebody who
-- wanted one answer, got it in week two and stopped has an excellent outcome and
-- a terrible completion rate, and this table can say so.
--
-- ── EVERY ENDING PRODUCES A ROW, EVEN WITH NO SURVEY ─────────────────────
--
-- The automatic half — how it ended, how much was done, which authored version
-- built it — is written when the Journey ends. The felt half is null until
-- somebody answers, and null means "not asked or skipped", never zero. A
-- feedback request is short and skippable (§3A.7); a skipped one must still
-- leave evidence behind.
--
-- ── WHOSE DATA THIS IS ───────────────────────────────────────────────────
--
-- The participant's. They own the row, they are the only one who can read it,
-- and no creator policy exists here at all — a creator's view of a Journey is
-- `creator_template_stats`, which counts, and `template_reviews`, which the
-- participant wrote knowingly to be read. This table is neither.
-- ============================================================================

create table if not exists public.journey_outcomes (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete cascade,

  -- Versioned so a later change to what these fields MEAN is a new version
  -- rather than a silent reinterpretation of rows already collected.
  schema_version integer not null default 1,

  -- WHICH JOURNEY, at the two granularities that exist. A Journey adopted from a
  -- creator's template names the template; a Journey the coach built from the
  -- authored library names the definition and variant it was built from. A
  -- Journey somebody wrote themselves has neither, and is still evidence — about
  -- the person, at the narrowest scope (§3A.3), which is what "what kind of
  -- Journey does this person finish" is made of.
  template_id       uuid references public.journey_templates(id) on delete set null,
  definition_id     text,
  variant_id        text,
  definition_version integer,
  domain            text,

  -- ── the automatic half ──
  ending         text not null check (ending in ('completed','abandoned','expired','replaced')),
  -- What they said they were after when they started. Without it, adherence is
  -- measured against an assumption nobody made (§5.2).
  intended_depth text check (intended_depth is null or intended_depth in ('whole_thing','specific_answer','trying_it')),
  steps_total    integer,
  steps_done     integer,
  days_active    integer,

  -- ── the felt half: null means not asked or skipped, never zero ──
  satisfaction      integer check (satisfaction is null or satisfaction between 1 and 5),
  real_world_change integer check (real_world_change is null or real_world_change between 1 and 5),
  effort_accuracy   text check (effort_accuracy is null or effort_accuracy in
                      ('much_less','less','as_expected','more','much_more')),
  -- The §6 taxonomy, A–K, as closed ids. An array because a Journey rarely
  -- misses for one reason, and because "too long AND too advanced" is a
  -- different fact from either alone.
  mismatch          text[] not null default '{}',
  -- What HELPED. §3A.7 asks for positive attribution as well: a taxonomy that
  -- can only record complaints learns only how to avoid harm.
  helped            text[] not null default '{}',
  -- The one free-text field, optional, in the person's own words (§3A.7). It is
  -- theirs: no creator, no aggregate and no ranking reads it. Structured
  -- evidence drives matching, not an uncontrolled text embedding.
  comment           text,

  ended_at   timestamptz not null default now(),
  answered_at timestamptz,

  -- One outcome per Journey ending. A Journey that is resumed and ends again is
  -- a new row with its own id; this only stops the same ending being recorded
  -- twice by a retry.
  unique (participant_id, id)
);

create index if not exists journey_outcomes_participant_idx on public.journey_outcomes (participant_id, ended_at desc);
create index if not exists journey_outcomes_template_idx on public.journey_outcomes (template_id) where template_id is not null;
create index if not exists journey_outcomes_definition_idx on public.journey_outcomes (definition_id, variant_id);

alter table public.journey_outcomes enable row level security;
drop policy if exists "journey_outcomes_own" on public.journey_outcomes;

-- The participant, and nobody else. There is deliberately no creator policy and
-- no operator policy on this table: everything anybody else may learn from it is
-- an aggregate, and an aggregate is a function, not a select.
create policy "journey_outcomes_own" on public.journey_outcomes for all to authenticated
  using (participant_id = auth.uid())
  with check (participant_id = auth.uid());

comment on table public.journey_outcomes is
  'One versioned outcome-evidence event per Journey ending (Matching Engine PRD §3A.6). Three separate '
  'outcomes, never one blended score (§5.4). Collected now so the engine has something to learn from later.';

-- ── Retention ─────────────────────────────────────────────────────────────
--
-- Deliberately NOT swept by `purge_operational_data`. This is not operational
-- telemetry with a 90-day life: it is the evidence base the matching engine will
-- be built on, and a 90-day window would mean the engine is trained on whoever
-- happened to finish last quarter. It follows the account — deleting the account
-- cascades it — and its retention belongs in the same policy decision as the
-- coach's behavioural log, which is still open with the founder.
