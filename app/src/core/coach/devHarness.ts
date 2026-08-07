/**
 * devHarness — the interactive dev-only rig the FOUNDER runs in a terminal to test PushApp's
 * adaptive coach end-to-end against REAL Gemini (adaptive coach, S2.7). It is NOT a jest test and
 * is never imported by the app; it is a standalone `tsx` script that wires the real seams together
 * so the whole loop — interview → build → adapt — can be exercised by hand:
 *
 *   Phase 1 — CONVERSE: drive the real {@link CoachOrchestrator} over a live {@link GeminiClient}
 *             on stdin/stdout — the opening greeting, ONE free-text opening that `triage()` UNDERSTANDS
 *             (it may name several goals → a FOCUS pick, exactly one → straight to the expert, or none
 *             → a fallback process-type ask), the routed {@link ../learning/DomainExpert} (whose name
 *             is PRINTED prominently), then that expert's own closed questions (pick a numbered option
 *             — or several comma-separated on a multi-select — no LLM call, or type your own "Other"
 *             answer where offered), a closing scheduling-preference meta question, and finally the
 *             feasibility note + the completed {@link GoalSpec}.
 *   Phase 2 — BUILD:    map that GoalSpec → a Journey via {@link ./goalSpecToJourney} through a real
 *             {@link JourneyEngine}, and pretty-print the Milestones → Steps (with dates + durations).
 *   Phase 3 — REPORT & ADAPT: run the real closed loop in-memory (fresh {@link EventBus} +
 *             {@link JourneyEngine} + {@link BehaviorModelEngine} + {@link replan}/{@link applyReplan}
 *             + {@link CommunicationScheduler} over a {@link MockReminderEngine}, driven by a virtual
 *             clock). Step day-by-day: report an outcome per due Step (or skip the whole day to
 *             simulate NON-reporting), then watch the slip tick, the re-plan (reschedules / resizes /
 *             drops), the nudge decision, the on-device InsightModel and the CoachNarrator line.
 *
 * SECURITY-PRIVACY: the Gemini key is read from the git-ignored `app/.env.local` (never printed,
 * never logged, never placed in a URL — the GeminiClient enforces the same). Everything the coach
 * extracts (title, motivation, failure risks, Milestones …) is ON-DEVICE-ONLY signal that lives
 * only in this process's memory; the harness never persists or transmits it beyond the Gemini call
 * the user's interview requires.
 *
 * DEV-ONLY. Run it from `app/` with `npm run coach`. No React, no UI — a plain Node/tsx script.
 *
 * SCRIPTED MODE (reproducible, non-interactive): set `COACH_SCRIPT=<path>` (or pass `--script <path>`)
 * to a file of canned answers — the FIRST non-comment line is the free-text OPENING fed to `triage()`
 * for understanding, and each subsequent line answers the next question in order (a multi-goal FOCUS
 * pick if one appears, then the expert's questions, then the closing scheduling question): a NUMBER
 * selects that closed option (1-based, matching the printed list — NO LLM call), `1,3` picks several
 * on a multi-select, or `other: <free text>` gives your own answer where allowed (blank lines and
 * `#`-comments ignored). Because closed picks make no model call, a full
 * scripted run costs ~1 LLM call (triage) plus any "Other" — fast even on the paid tier. The harness
 * replays Phase 1 against LIVE Gemini, builds the Journey (Phase 2), prints the FULL transcript + the
 * completed GoalSpec + the built Journey (with the DomainExpert that built it), and EXITS — it never
 * enters the interactive Phase-3 loop. If the script runs out of answers before the interview is
 * `done`, it prints what it gathered and exits gracefully. Under non-TTY / piped stdin with no
 * script, the harness likewise exits cleanly on EOF instead of throwing.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

import { NullCalendarGateway } from '../calendar/CalendarGateway';
import { NullLocationGateway } from '../location/LocationGateway';
import { CommunicationScheduler } from '../engines/CommunicationScheduler';
import { JourneyEngine } from '../engines/JourneyEngine';
import type { ReminderEngine } from '../engines/ReminderEngine';
import { EventBus } from '../events/EventBus';
import { replan } from '../learning/AdaptivePlanner';
import { applyReplan } from '../learning/applyReplan';
import { BehaviorModelEngine } from '../learning/BehaviorModelEngine';
import { DeterministicNarrator } from '../learning/CoachNarrator';
import { getExpert } from '../learning/experts/registry';
import { MockReminderEngine } from '../learning/sim/MockReminderEngine';
import type { PlanConstraints } from '../learning/types';
import { GeminiClient } from '../llm/GeminiClient';
import { type LlmClient } from '../llm/LlmClient';
import { RateLimitRetryingLlmClient } from '../llm/RateLimitRetryingLlmClient';
import type { AppState, DayPart, Journey, Step } from '../types/domain';
import { CoachOrchestrator, type CoachTurn } from './CoachOrchestrator';
import type { DomainQuestion } from '../learning/DomainExpert';
import { buildJourneyInput, goalSpecToPlan } from './goalSpecToJourney';
import type { GoalSpec } from './interviewPlaybook';

/** Local wall-clock hour a Step / nudge lands at, by day-part (mirrors the planners). */
const DAYPART_HOUR: Record<DayPart, number> = { morning: 8, evening: 19, either: 12 };
/** Hard safety cap so an open-ended habit never loops forever. */
const MAX_SIM_DAYS = 120;

// ── stdin/stdout plumbing ─────────────────────────────────────────────────────────

// The readline interface is created LAZILY, only when an interactive prompt is actually needed, so
// scripted mode (which reads its answers from a file) never attaches to — or consumes — stdin.
let rl: ReturnType<typeof createInterface> | null = null;

function ensureReadline(): ReturnType<typeof createInterface> {
  if (!rl) {
    rl = createInterface({ input, output });
    // Ctrl-C from readline: exit cleanly rather than dumping a stack.
    rl.on('SIGINT', () => void quit(0));
  }
  return rl;
}

/** Close the terminal cleanly and leave, flushing any pending stdout first. */
async function quit(code = 0): Promise<never> {
  rl?.close();
  // process.exit() can truncate a not-yet-flushed pipe write (e.g. the EOF message just logged), so
  // wait for stdout to drain before exiting — the final line always lands.
  if (output.writableLength > 0) {
    await new Promise<void>((resolve) => output.once('drain', resolve));
  }
  process.exit(code);
}

/**
 * Ask one question; `exit`/`quit` at any prompt leaves immediately. Returns the trimmed answer.
 * ROBUST to a closed stdin: on EOF (piped / non-TTY input that runs out) `rl.question` rejects with
 * "readline was closed" — we catch that and EXIT GRACEFULLY instead of throwing, so the harness never
 * crashes when it is fed a finite, non-interactive stream.
 */
async function ask(prompt: string): Promise<string> {
  const iface = ensureReadline();
  let raw: string;
  try {
    // Race the answer against the interface's `close` event: on EOF (piped / non-TTY stdin that runs
    // out) readline just closes and the `question` promise never settles, so without this the harness
    // would silently die with the event loop instead of reporting. We reject on `close` and exit
    // gracefully. Interactive TTY behaviour is unchanged — `close` only fires on real EOF / Ctrl-D.
    raw = await new Promise<string>((resolve, reject) => {
      let settled = false;
      const onClose = (): void => {
        if (!settled) {
          settled = true;
          reject(new Error('stdin closed'));
        }
      };
      iface.once('close', onClose);
      iface.question(prompt).then(
        (value) => {
          if (!settled) {
            settled = true;
            iface.off('close', onClose);
            resolve(value);
          }
        },
        (err) => {
          if (!settled) {
            settled = true;
            iface.off('close', onClose);
            reject(err);
          }
        },
      );
    });
  } catch {
    console.log('\n\n[i] Input stream closed (EOF) — no more answers to read. Exiting gracefully.');
    return quit(0);
  }
  const answer = raw.trim();
  const lowered = answer.toLowerCase();
  if (lowered === 'exit' || lowered === 'quit') await quit(0);
  return answer;
}

/** Ask until a non-empty answer is given (empty input is re-prompted, never crashes). */
async function askNonEmpty(prompt: string): Promise<string> {
  for (;;) {
    const answer = await ask(prompt);
    if (answer.length > 0) return answer;
    console.log('  (please type something, or `exit` to quit)');
  }
}

// ── env loading (never prints the key) ──────────────────────────────────────────

/**
 * Minimal `.env.local` reader: parse `KEY=value` lines into `process.env` without overwriting an
 * already-set variable. Deliberately tiny (no dotenv dependency needed) and NEVER prints a value.
 */
function loadEnvLocal(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, '../../../.env.local'), // app/.env.local relative to src/core/coach
    resolve(process.cwd(), '.env.local'), // when run from app/
  ];
  for (const path of candidates) {
    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      continue; // not here — try the next candidate
    }
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    return; // first readable file wins
  }
}

// ── formatting helpers ────────────────────────────────────────────────────────────

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${WEEKDAY[d.getDay()]} ${MONTH[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${hh}:${mm}`;
}

function rule(char = '─', width = 72): string {
  return char.repeat(width);
}

function heading(title: string): void {
  console.log(`\n${rule('═')}`);
  console.log(`  ${title}`);
  console.log(rule('═'));
}

// ── date helpers (local wall-clock; mirror the planners) ────────────────────────────

function dayStartAt(now0: number, dayIndex: number): number {
  const d = new Date(now0);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayIndex).getTime();
}

function atHour(dayStart: number, hour: number): number {
  const d = new Date(dayStart);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour).getTime();
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** A minimal, valid AppState for the rig (mirrors the sim + engine tests' builders). */
function freshState(): AppState {
  return {
    dreams: [],
    journeys: [],
    buddy: {
      name: 'Pip',
      xp: 0,
      level: 1,
      stage: 'egg',
      coins: 0,
      ownedCosmetics: [],
      equippedCosmetic: null,
    },
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
    reminderRules: [],
    communicationPrefs: {
      remindersEnabled: true,
      socialCheerEnabled: true,
      socialNudgeEnabled: true,
      locationOptIn: false,
      calendarOptIn: false,
    },
    schedulingPrefs: { window: undefined, dayPart: 'either', preferredDays: [] },
  };
}

// ── Phase 1 — converse ──────────────────────────────────────────────────────────

/**
 * Run the real interview against live Gemini and return the completed GoalSpec. Only `triage()` makes
 * an LLM call (wrapped so a transient Gemini error is reported, then re-asked); every closed pick and
 * "Other" answer is recorded on-device with NO model call.
 */
async function runInterview(llm: LlmClient): Promise<GoalSpec> {
  heading('PHASE 1 — CONVERSE (live Gemini)');
  const orchestrator = new CoachOrchestrator({ llm });

  const opening = orchestrator.start();
  console.log(`\ncoach> ${opening.coachMessage}`);

  // ONE free-text opening drives the UNDERSTANDING call (the interview's only LLM call). It may name
  // several goals → a focus choice, exactly one → straight to the expert, or none → a fallback ask.
  let turn: CoachTurn | null = null;
  while (turn === null) {
    const goalText = await askNonEmpty('you> ');
    turn = await withRetry(() => orchestrator.triage(goalText), 'understanding your goal');
  }

  // The active expert appears once the goal is chosen (immediately for a single goal, after the focus
  // pick for several, after the fallback question when nothing was understood). Print it once.
  let expertPrinted = false;
  const maybePrintExpert = (t: CoachTurn): void => {
    if (!expertPrinted && t.activeExpert) {
      printActiveExpert(t.activeExpert);
      expertPrinted = true;
    }
  };
  maybePrintExpert(turn);

  // Walk every remaining question — the multi-goal focus choice, the expert's own questions, then the
  // closing scheduling meta question: pick a number (or several comma-separated on a multi-select), or
  // type your own ("Other") where offered.
  let guard = 0;
  while (!turn.done && guard++ < 40) {
    const question = turn.question!;
    printQuestion(question);
    turn = await answerQuestionInteractive(orchestrator, question);
    maybePrintExpert(turn);
  }

  // The closing turn carries the feasibility note + the Support-Circle recommendation.
  console.log(`\ncoach> ${turn.coachMessage}`);
  if (!turn.goalSpec) {
    console.log('\n(The interview ended without a completed GoalSpec — nothing to build.)');
    await quit(0);
  }
  printGoalSpec(turn.goalSpec!);
  return turn.goalSpec!;
}

/** Print the routed expert prominently — the process-visibility line the founder asked for. */
function printActiveExpert(activeExpert: CoachTurn['activeExpert']): void {
  console.log(`\n${rule()}`);
  console.log(`  → Expert activated: ${activeExpert?.displayName ?? 'General'}`);
  console.log(rule());
}

/** Print one question: the prompt, its NUMBERED closed options, then the "Other" escape if allowed. */
function printQuestion(question: DomainQuestion): void {
  console.log(`\ncoach> ${question.prompt}`);
  question.options.forEach((opt, i) => console.log(`   ${i + 1}. ${opt}`));
  if (question.allowOther) {
    console.log(`   ${question.options.length + 1}. Other (type your own)`);
  }
  if (question.multiSelect) {
    console.log('   (pick one or more — comma-separated, e.g. 1,3)');
  }
}

/**
 * Read one interactive answer to the current question and advance the orchestrator: a number in
 * range selects that closed option; a MULTI-SELECT question also accepts several comma-separated
 * numbers ({@link CoachOrchestrator.selectOptions}), recorded as the chosen option VALUES. The
 * "Other" number — or any free text — is stored via {@link CoachOrchestrator.answerOther}. No LLM.
 */
async function answerQuestionInteractive(
  orchestrator: CoachOrchestrator,
  question: DomainQuestion,
): Promise<CoachTurn> {
  const allowOther = question.allowOther;
  const otherNum = question.options.length + 1;
  for (;;) {
    const raw = await askNonEmpty(
      question.multiSelect
        ? `Pick 1-${question.options.length} (comma-separated for several)${allowOther ? `, ${otherNum} for Other` : ''}: `
        : allowOther
          ? `Pick 1-${otherNum} (or type your own answer): `
          : `Pick 1-${question.options.length}: `,
    );

    // Multi-select: accept several comma-separated option numbers (e.g. "1,3").
    if (question.multiSelect && raw.includes(',')) {
      const nums = raw.split(',').map((s) => Number(s.trim()));
      if (nums.every((n) => Number.isInteger(n) && n >= 1 && n <= question.options.length)) {
        const values = nums.map((n) => question.options[n - 1]);
        console.log(`  → ${values.join(' · ')}`);
        return orchestrator.selectOptions(nums.map((n) => n - 1));
      }
      console.log(`  (use option numbers 1-${question.options.length}, comma-separated)`);
      continue;
    }

    const n = Number(raw);
    const isNum = Number.isInteger(n);
    if (isNum && n >= 1 && n <= question.options.length) {
      console.log(`  → ${question.options[n - 1]}`);
      return question.multiSelect
        ? orchestrator.selectOptions([n - 1])
        : orchestrator.selectOption(n - 1);
    }
    if (allowOther && isNum && n === otherNum) {
      const text = await askNonEmpty('  Your answer> ');
      return orchestrator.answerOther(text);
    }
    if (allowOther && !isNum) return orchestrator.answerOther(raw); // free text typed directly
    console.log(
      allowOther
        ? `  (enter a number 1-${otherNum}, or type your own answer)`
        : `  (enter a number 1-${question.options.length})`,
    );
  }
}

/** Run one LLM-backed call; on an error print a friendly note (never the key) and return null. */
async function withRetry<T>(fn: () => Promise<T>, what: string): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`\n[!] Gemini hiccup while ${what}: ${message}`);
    console.log('    Try again (or type `exit` to quit).');
    return null;
  }
}

function printGoalSpec(spec: GoalSpec): void {
  heading('COMPLETED GoalSpec (on-device only)');
  console.log(`  title:            ${spec.title || '(none)'}`);
  if (spec.description) console.log(`  description:      ${spec.description}`);
  console.log(`  domain:           ${spec.domain}`);
  if (spec.activeExpertDisplayName) {
    console.log(`  expert:           ${spec.activeExpertDisplayName}`);
  }
  if (spec.feasibility) {
    console.log(`  feasibility:      ${spec.feasibility.verdict} — ${spec.feasibility.note}`);
  }
  const answers = Object.entries(spec.answers ?? {});
  if (answers.length > 0) {
    console.log('  answers:');
    for (const [id, value] of answers) {
      console.log(`     ${id}: ${Array.isArray(value) ? value.join(' · ') : value}`);
    }
  }
  console.log(`  processType:      ${spec.processType} (isHabit=${spec.isHabit})`);
  if (spec.milestones.length > 0) {
    console.log('  milestones:');
    for (const m of spec.milestones) console.log(`     ${m.order + 1}. ${m.title}`);
  }
  if (spec.motivation) console.log(`  motivation:       ${spec.motivation}`);
  if (spec.failureRisks.length > 0) {
    console.log(`  failureRisks:     ${spec.failureRisks.join(' · ')}`);
  }
  const t = spec.timing;
  const timingParts = [
    t.sessionMinutes != null ? `${t.sessionMinutes} min` : null,
    t.sessionsPerWeek != null ? `${t.sessionsPerWeek}×/week` : null,
    t.daypart ? t.daypart : null,
    t.preferredDays && t.preferredDays.length > 0
      ? `days ${t.preferredDays.map((d) => WEEKDAY[d]).join(',')}`
      : null,
    t.targetDate != null ? `by ${fmtDate(t.targetDate)}` : null,
  ].filter(Boolean);
  console.log(`  timing:           ${timingParts.length ? timingParts.join(' · ') : '(defaults)'}`);
  console.log(
    `  schedulingPref:   ${spec.schedulingPreference ? spec.schedulingPreference : '(flexible)'}`,
  );
  if (spec.cadence) console.log(`  cadence:          ${spec.cadence}`);
  if (spec.locationRelevant != null) console.log(`  locationRelevant: ${spec.locationRelevant}`);
  if (spec.calendarRelevant != null) console.log(`  calendarRelevant: ${spec.calendarRelevant}`);
  if (spec.wantsSupportCircle != null) {
    console.log(`  wantsSupportCircle: ${spec.wantsSupportCircle}`);
  }
}

// ── Phase 2 — build ────────────────────────────────────────────────────────────

/** The rig every engine shares once the Journey is built. */
interface Rig {
  state: AppState;
  bus: EventBus;
  journeyEngine: JourneyEngine;
  model: BehaviorModelEngine;
  scheduler: CommunicationScheduler;
  reminder: MockReminderEngine;
  narrator: DeterministicNarrator;
  journey: Journey;
  constraints: PlanConstraints;
  /** The single virtual clock every engine reads; mutated as the days advance. */
  getClock: () => number;
  setClock: (ms: number) => void;
  slipBuffer: string[];
}

/**
 * Wire the fresh in-memory rig, build the Journey from the GoalSpec through the real JourneyEngine
 * (via the S2.6 mapper), pretty-print it, and hand the rig to Phase 3.
 */
function buildJourney(spec: GoalSpec, now0: number): Rig {
  heading('PHASE 2 — BUILD (deterministic Planner → JourneyEngine)');

  let clock = now0;
  const state = freshState();
  const bus = new EventBus();
  const journeyEngine = new JourneyEngine(bus, () => state);
  const model = new BehaviorModelEngine(bus, () => state, () => clock);
  const reminder = new MockReminderEngine();
  const scheduler = new CommunicationScheduler(
    bus,
    () => state,
    reminder as unknown as ReminderEngine,
    { location: NullLocationGateway, calendar: NullCalendarGateway },
    () => new Date(clock),
  );

  // Capture slips (only the end-of-day tick emits StepMissed).
  const slipBuffer: string[] = [];
  bus.on('StepMissed', (e) => slipBuffer.push(e.stepId));

  const { constraints } = goalSpecToPlan(spec);
  // Route by the coach-detected domain so the SAME engine yields domain-appropriate Milestones
  // (e.g. "quit smoking" → AddictionExpert vs "train for a 5K" → BodyImageExpert). SX.2.
  const expert = getExpert(spec.domain);
  console.log(`\n  domain:   ${spec.domain} → ${expert.displayName ?? spec.domain} built this Journey`);
  if (spec.feasibility) {
    console.log(`  verdict:  ${spec.feasibility.verdict} — ${spec.feasibility.note}`);
  }
  const journeyInput = buildJourneyInput(spec, expert, { now: now0 });
  const journey = journeyEngine.createJourney(journeyInput);

  // A single reminder rule for this Journey; its nudge target is rewritten on each re-plan.
  const actionHour = DAYPART_HOUR[constraints.daypart];
  state.reminderRules.push({
    id: 'reminder_dev',
    journeyId: journey.id,
    trigger: { kind: 'fixedTime', hour: actionHour, minute: 0 },
    title: 'Time for your Step',
    body: 'Your Journey is waiting.',
    enabled: true,
    scheduledNotificationIds: [],
  });

  printJourney(journey, journeyInput.sessionsPerWeek);

  return {
    state,
    bus,
    journeyEngine,
    model,
    scheduler,
    reminder,
    narrator: new DeterministicNarrator(),
    journey,
    constraints,
    getClock: () => clock,
    setClock: (ms) => {
      clock = ms;
    },
    slipBuffer,
  };
}

function printJourney(journey: Journey, sessionsPerWeek?: number): void {
  console.log(`\n  Journey: ${journey.title}`);
  if (journey.description) console.log(`  ${journey.description}`);
  if (sessionsPerWeek != null) {
    console.log(`  schedule: ≈${sessionsPerWeek}×/week · flexible days, no fixed dates · steps: ${journey.steps.length}`);
  } else {
    console.log(`  duration: ${journey.durationDays} days · rhythm: ${journey.rhythm} · steps: ${journey.steps.length}`);
  }
  console.log(rule());

  const milestones = journey.milestones ?? [];
  if (milestones.length > 0) {
    for (const m of [...milestones].sort((a, b) => a.order - b.order)) {
      console.log(`\n  Milestone ${m.order + 1}: ${m.title}`);
      const steps = journey.steps.filter((s) => s.milestoneId === m.id);
      for (const s of steps) console.log(`     ${fmtStep(s)}`);
    }
    const orphans = journey.steps.filter((s) => !s.milestoneId);
    if (orphans.length > 0) {
      console.log('\n  (no milestone)');
      for (const s of orphans) console.log(`     ${fmtStep(s)}`);
    }
  } else {
    for (const s of journey.steps) console.log(`  ${fmtStep(s)}`);
  }
}

function fmtStep(s: Step): string {
  const when = s.plannedFor != null ? fmtDate(s.plannedFor) : 'flexible';
  const dur = s.estimatedDuration != null ? `${s.estimatedDuration}min` : '—';
  const diff = s.difficulty != null ? `d${s.difficulty}` : '';
  const starter = s.isStarterStep ? ' [starter]' : '';
  return `• ${when}  (${dur}${diff ? ' ' + diff : ''})  ${s.title}${starter}`;
}

// ── Phase 3 — report & adapt ─────────────────────────────────────────────────────

/**
 * Drive the closed loop day-by-day. For each day with due Steps the founder reports an outcome per
 * Step (or skips the whole day to simulate NON-reporting); then the harness runs the slip tick,
 * re-plans, and prints what changed, the nudge decision, the InsightModel and the CoachNarrator line.
 */
async function runAdaptLoop(rig: Rig, now0: number): Promise<void> {
  heading('PHASE 3 — REPORT & ADAPT (real engines + virtual clock)');
  console.log(
    '\n  Each day: report `done` / `partial` / `couldnt` / `skip` / `none` per due Step,\n' +
      '  or type `skip` at the day prompt to skip the WHOLE day (simulate not reporting).\n' +
      '  `exit` quits at any time.\n',
  );

  const actionHour = DAYPART_HOUR[rig.constraints.daypart];
  const maxDays = Math.min(MAX_SIM_DAYS, Math.max(rig.journey.durationDays + 2, 7));
  const live = (): Journey => rig.state.journeys.find((j) => j.id === rig.journey.id)!;

  for (let dayIndex = 0; dayIndex < maxDays; dayIndex++) {
    if (live().completedAt) {
      console.log(`\n🎉  The Journey completed on day ${dayIndex}. Every Step is done.`);
      break;
    }

    const dayStart = dayStartAt(now0, dayIndex);
    const due = live().steps.filter(
      (s) =>
        !s.done &&
        !s.dropped &&
        s.plannedFor != null &&
        startOfDay(s.plannedFor) === dayStart,
    );

    // Fast-forward days with nothing due (still tick, so an earlier miss can slip), but do run the
    // end-of-day tick so recency/slip signals stay honest.
    if (due.length === 0) {
      rig.setClock(atHour(dayStart, 23));
      rig.model.tick(rig.getClock());
      continue;
    }

    console.log(`\n${rule()}`);
    console.log(`  DAY ${dayIndex} — ${fmtDate(dayStart)} — ${due.length} Step(s) due`);
    console.log(rule());

    const dayCmd = (
      await ask('  [Enter] report each Step · `skip` skip whole day · `exit` quit: ')
    ).toLowerCase();
    const skipDay = dayCmd === 'skip' || dayCmd === 's';

    // The persona (the founder) acts at the day-part hour.
    rig.setClock(atHour(dayStart, actionHour));
    for (const step of due) {
      const outcome = skipDay ? 'skip' : await askOutcome(step);
      applyOutcome(rig, step.id, outcome);
    }

    // End-of-day slip detection.
    rig.slipBuffer.length = 0;
    rig.setClock(atHour(dayStart, 23));
    rig.model.tick(rig.getClock());
    const slips = [...rig.slipBuffer];
    if (slips.length > 0) {
      console.log(`\n  slip: ${slips.length} Step(s) elapsed unmet → flagged missed.`);
    }

    // Re-plan the morning after, so any reschedule lands from tomorrow onward (not in the past).
    rig.setClock(dayStartAt(now0, dayIndex + 1) + 30 * 60 * 1000);
    await doReplanAndReport(rig);
  }

  if (!live().completedAt) {
    console.log(`\n  Reached the end of the simulated window (${maxDays} days).`);
  }
  console.log('\nDone. Thanks for testing the loop.');
  await quit(0);
}

type Outcome = 'done' | 'partial' | 'couldnt' | 'skip' | 'none';

async function askOutcome(step: Step): Promise<Outcome> {
  for (;;) {
    const raw = (
      await ask(`    Step "${step.title}" → [done/partial/couldnt/skip/none]: `)
    ).toLowerCase();
    switch (raw) {
      case '':
      case 'none':
      case 'n':
        return 'none';
      case 'done':
      case 'd':
        return 'done';
      case 'partial':
      case 'p':
        return 'partial';
      case 'couldnt':
      case "couldn't":
      case 'c':
        return 'couldnt';
      case 'skip':
      case 's':
        return 'skip';
      default:
        console.log('    (type one of: done, partial, couldnt, skip, none)');
    }
  }
}

/** Apply one reported outcome through the real JourneyEngine. `skip`/`none` do nothing (→ slip). */
function applyOutcome(rig: Rig, stepId: string, outcome: Outcome): void {
  const journeyId = rig.journey.id;
  switch (outcome) {
    case 'done':
      rig.journeyEngine.checkInStep(journeyId, stepId);
      break;
    case 'partial':
      rig.journeyEngine.markPartial(journeyId, stepId);
      break;
    case 'couldnt':
      rig.journeyEngine.cancelStep(journeyId, stepId, 'couldnt');
      break;
    case 'skip':
    case 'none':
      // Report nothing — the end-of-day tick will flag the elapsed Step as a slip.
      break;
  }
}

/** Re-plan, enact it, push the nudge through the scheduler, and print the full report. */
async function doReplanAndReport(rig: Rig): Promise<void> {
  const journey = rig.state.journeys.find((j) => j.id === rig.journey.id)!;
  const insight = rig.model.getInsights();
  const result = replan(journey, insight, rig.constraints, undefined, rig.getClock());
  applyReplan(rig.journeyEngine, journey, result);

  // Push the coach's NudgeHint (day-part + the weekdays the remaining Steps land on) to the
  // CommunicationScheduler → MockReminderEngine, exactly as the app would.
  const ruleRow = rig.state.reminderRules.find((r) => r.id === 'reminder_dev')!;
  ruleRow.trigger = {
    kind: 'fixedTime',
    hour: DAYPART_HOUR[result.nudge.daypart],
    minute: 0,
    weekdays: result.nudge.days.length > 0 ? result.nudge.days : undefined,
  };
  ruleRow.enabled = !journey.completedAt;
  await rig.scheduler.reconcile();
  const scheduled = rig.reminder.drain();

  // ── report ──
  const rescheduled = result.stepAdjustments.filter((a) => a.kind === 'rescheduled');
  const resized = result.stepAdjustments.filter((a) => a.kind === 'resized');
  const removed = result.stepAdjustments.filter((a) => a.kind === 'removed');

  console.log('\n  ── coach re-plan ──');
  if (!result.changed) {
    console.log('  changes:  none (plan still fits)');
  } else {
    if (rescheduled.length > 0) {
      console.log(`  moved:    ${rescheduled.length} Step(s)`);
      for (const a of rescheduled) {
        console.log(`              • ${stepTitle(journey, a.stepId)} → ${a.plannedFor != null ? fmtDate(a.plannedFor) : '?'}`);
      }
    }
    if (resized.length > 0) {
      console.log(`  resized:  ${resized.length} Step(s)`);
      for (const a of resized) {
        const bits = [
          a.estimatedDuration != null ? `${a.estimatedDuration}min` : null,
          a.difficulty != null ? `d${a.difficulty}` : null,
        ].filter(Boolean);
        console.log(`              • ${stepTitle(journey, a.stepId)} → ${bits.join(' ')}`);
      }
    }
    if (removed.length > 0) {
      console.log(`  dropped:  ${removed.length} Step(s) (shed to hold the goal)`);
      for (const a of removed) console.log(`              • ${stepTitle(journey, a.stepId)}`);
    }
  }
  console.log(`  atRisk:   ${result.atRisk}`);

  const nudgeDays =
    result.nudge.days.length > 0 ? result.nudge.days.map((d) => WEEKDAY[d]).join(',') : 'daily';
  console.log(
    `  nudge:    ${result.nudge.daypart} · ${nudgeDays}` +
      `${result.nudge.extra ? ' · extra' : ''} (scheduled ${scheduled.length} notif)`,
  );

  console.log('\n  ── InsightModel (on-device) ──');
  console.log(
    `  pace=${insight.paceRatio.toFixed(2)} · slip=${insight.slipRate.toFixed(2)} · atRisk=${insight.atRisk}`,
  );
  console.log(
    `  daypart=${insight.preferredDaypart} · typicalSession=${insight.typicalSessionMinutes}min · daysSinceActive=${insight.daysSinceLastActivity}`,
  );
  const rel = Object.entries(insight.reliabilityByMilestone);
  if (rel.length > 0) {
    console.log(
      `  reliability: ${rel.map(([id, r]) => `${milestoneLabel(journey, id)}=${r.toFixed(2)}`).join(' · ')}`,
    );
  }

  console.log('\n  ── coach says ──');
  console.log(`  ${rig.narrator.describeAdaptation(result, { journeyTitle: journey.title })}`);
  console.log(`  ${rig.narrator.encourage(insight)}`);
}

function stepTitle(journey: Journey, stepId: string): string {
  return journey.steps.find((s) => s.id === stepId)?.title ?? stepId;
}

function milestoneLabel(journey: Journey, milestoneId: string): string {
  const m = journey.milestones?.find((x) => x.id === milestoneId);
  return m ? `M${m.order + 1}` : milestoneId.slice(0, 6);
}

// ── scripted mode (reproducible, non-interactive) ────────────────────────────────

/**
 * Load the scripted-conversation file requested via `COACH_SCRIPT=<path>` or `--script <path>`, or
 * return `null` when none was requested (→ interactive mode). Blank lines and `#`-comments are
 * stripped so the file stays readable; the surviving lines are the free-text opening (understanding
 * input), then per-question answers (a number, `1,3` for a multi-select, or `other: <text>`).
 */
function loadScript(): string[] | null {
  const argIndex = process.argv.indexOf('--script');
  const argPath = argIndex !== -1 ? process.argv[argIndex + 1] : undefined;
  const path = (process.env.COACH_SCRIPT ?? argPath)?.trim();
  if (!path) return null;

  const resolved = resolve(process.cwd(), path);
  let raw: string;
  try {
    raw = readFileSync(resolved, 'utf8');
  } catch {
    console.error(`\n[x] COACH_SCRIPT file could not be read: ${resolved}`);
    process.exit(1);
  }
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/**
 * Run ONE scripted, LLM-backed orchestrator call EXACTLY ONCE. There is no human to re-prompt, so on
 * a hard failure it aborts cleanly with a clear message rather than dumping a stack. Free-tier RATE
 * LIMITS (HTTP 429) are handled one level down, inside {@link RateLimitRetryingLlmClient}, so the
 * backoff never re-invokes this non-idempotent step — the fix for the "A branch was already chosen"
 * abort that a 429 on the first question used to trigger.
 */
async function scriptedCall<T>(fn: () => Promise<T>, what: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[x] Gemini failure while ${what}: ${message}`);
    console.error('    Aborting so the failure is visible.');
    return quit(1);
  }
}

/**
 * Replay a canned conversation (Phase 1) against LIVE Gemini, then build the Journey (Phase 2) and
 * print the full transcript + GoalSpec + Journey. Deliberately NON-interactive: it never reads stdin
 * and never enters the Phase-3 adapt loop, so the same script yields a reproducible end-to-end run.
 * The FIRST line is the free-text opening `triage()` understands (the only LLM call); each later line
 * answers the next question — a multi-goal focus pick if one appears, then the expert's questions — a
 * number (1-based option), `1,3` for a multi-select, or `other: <text>`. If the script runs out of
 * answers before the interview is `done`, it reports what it gathered and exits gracefully.
 */
async function runScripted(llm: LlmClient, lines: string[], now0: number): Promise<void> {
  heading('PHASE 1 — CONVERSE (scripted · live Gemini)');
  const orchestrator = new CoachOrchestrator({ llm });

  let cursor = 0;
  const nextLine = (): string | null => (cursor < lines.length ? lines[cursor++] : null);
  const transcript: Array<{ question: string; answer: string }> = [];

  const opening = orchestrator.start();
  console.log(`\ncoach> ${opening.coachMessage}`);

  // The FIRST script line is the free-text OPENING that the understanding step distils (the one LLM
  // call). It may name several goals (→ a focus pick line follows) or exactly one.
  const goalText = nextLine();
  if (goalText === null) {
    console.log('\n[i] The script was empty — nothing to understand. Exiting.');
    return quit(0);
  }
  console.log(`you> ${goalText}   (opening — understanding input)`);

  let turn = await scriptedCall(() => orchestrator.triage(goalText), 'understanding the goal');

  // The active expert appears once the goal is chosen — print it as soon as it does.
  let expertPrinted = false;
  const maybePrintExpert = (t: CoachTurn): void => {
    if (!expertPrinted && t.activeExpert) {
      printActiveExpert(t.activeExpert);
      expertPrinted = true;
    }
  };
  maybePrintExpert(turn);

  // Each later line answers the current question — the multi-goal focus choice, an expert question,
  // then the closing scheduling question (a number, `1,3` for a multi-select, or `other: <text>`
  // where allowed) — no LLM call.
  let guard = 0;
  while (!turn.done && guard++ < 40) {
    const question = turn.question!;
    printQuestion(question);
    const line = nextLine();
    if (line === null) {
      console.log(`\n${rule()}`);
      console.log('  [i] The script ran out of answers before the interview completed.');
      console.log(`      Coach was waiting on:  ${question.id}`);
      console.log(rule());
      printGoalSpec(turn.state.spec);
      console.log('\n  (No Journey built — the interview never reached a completed GoalSpec.)');
      return quit(0);
    }
    turn = await applyScriptedAnswer(orchestrator, question, line, transcript);
    maybePrintExpert(turn);
  }

  console.log(`\ncoach> ${turn.coachMessage}`);

  if (!turn.done || !turn.goalSpec) {
    console.log('\n[i] The interview did not complete within the guard limit — nothing to build.');
    printGoalSpec(turn.state.spec);
    return quit(0);
  }

  // ── the full transcript, exactly as replayed ──
  heading('TRANSCRIPT (scripted conversation)');
  transcript.forEach((t, i) => {
    console.log(`\n  Q${i + 1}  coach> ${t.question}`);
    console.log(`      you> ${t.answer}`);
  });

  printGoalSpec(turn.goalSpec);

  // Phase 2 — build the Journey (prints the routed DomainExpert + Milestones → Steps).
  buildJourney(turn.goalSpec, now0);

  console.log(`\n${rule()}`);
  console.log('  Scripted run complete — Journey built. Skipping the interactive adapt loop.');
  console.log(rule());
  return quit(0);
}

/**
 * Apply one SCRIPTED answer line to the current expert question and advance the orchestrator: a bare
 * NUMBER picks that 1-based closed option ({@link CoachOrchestrator.selectOption}); `other: <text>`
 * stores free text ({@link CoachOrchestrator.answerOther}). Neither calls the LLM. A malformed line
 * (out-of-range number, or "Other" with no text) aborts with a clear message rather than guessing.
 */
async function applyScriptedAnswer(
  orchestrator: CoachOrchestrator,
  question: DomainQuestion,
  line: string,
  transcript: Array<{ question: string; answer: string }>,
): Promise<CoachTurn> {
  const otherMatch = /^other\s*:\s*(.*)$/i.exec(line);
  if (otherMatch) {
    if (!question.allowOther) {
      console.error(`\n[x] Script line "${line}" chose "Other", but "${question.id}" is pick-only.`);
      return quit(1);
    }
    const text = otherMatch[1].trim();
    if (!text) {
      console.error(`\n[x] Script line "${line}" chose "Other" but gave no text.`);
      return quit(1);
    }
    console.log(`you> Other → "${text}"`);
    transcript.push({ question: question.prompt, answer: `Other: ${text}` });
    return orchestrator.answerOther(text);
  }

  // Multi-select: a comma-separated list of option numbers (e.g. "1,3"), recorded as the VALUES.
  if (question.multiSelect && line.includes(',')) {
    const nums = line.split(',').map((s) => Number(s.trim()));
    const inRange = nums.every((x) => Number.isInteger(x) && x >= 1 && x <= question.options.length);
    if (!inRange) {
      console.error(
        `\n[x] Script line "${line}" is not a valid comma-separated option list (1-${question.options.length}).`,
      );
      return quit(1);
    }
    const values = nums.map((x) => question.options[x - 1]);
    console.log(`you> ${line}  (${values.join(' · ')})`);
    transcript.push({ question: question.prompt, answer: values.join(' · ') });
    return orchestrator.selectOptions(nums.map((x) => x - 1));
  }

  const n = Number(line.trim());
  const otherNum = question.options.length + 1;
  if (Number.isInteger(n) && n >= 1 && n <= question.options.length) {
    const chosen = question.options[n - 1];
    console.log(`you> ${n}  (${chosen})`);
    transcript.push({ question: question.prompt, answer: chosen });
    return question.multiSelect ? orchestrator.selectOptions([n - 1]) : orchestrator.selectOption(n - 1);
  }
  if (Number.isInteger(n) && n === otherNum) {
    console.error(`\n[x] Script line "${line}" picked "Other" — use \`other: <your text>\` instead.`);
    return quit(1);
  }
  console.error(
    `\n[x] Script line "${line}" is neither an option number (1-${question.options.length}) nor \`other: <text>\`.`,
  );
  return quit(1);
}

// ── entry point ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnvLocal();

  heading('PushApp — Adaptive Coach dev harness');

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0) {
    console.error(
      '\n[x] GEMINI_API_KEY is not set.\n' +
        '    Add it to app/.env.local as `GEMINI_API_KEY=...` and re-run `npm run coach`.\n',
    );
    await quit(1);
  }

  // Wrap the real client so a free-tier 429 is retried at the single-call level (inside complete()),
  // never by re-running a non-idempotent orchestrator turn like chooseBranch()/respond().
  const llm = new RateLimitRetryingLlmClient(new GeminiClient()); // reads GEMINI_API_KEY from env
  const now0 = startOfDay(Date.now()); // start the simulation at today's local midnight

  // Scripted (reproducible) mode short-circuits the interactive loop entirely.
  const script = loadScript();
  if (script) {
    console.log(
      '\n  SCRIPTED MODE — replaying a canned conversation against live Gemini, then building the\n' +
        '  Journey and printing the full transcript. Non-interactive; no adapt loop.\n',
    );
    await runScripted(llm, script, now0);
    return;
  }

  console.log(
    '\n  This runs the REAL conversational coach against live Gemini, builds a Journey from the\n' +
      '  result, then lets you play the adaptive loop day-by-day. Type `exit` at any prompt to quit.\n',
  );

  const spec = await runInterview(llm);
  const rig = buildJourney(spec, now0);
  await runAdaptLoop(rig, now0);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n[x] Harness crashed: ${message}`);
  void quit(1);
});
