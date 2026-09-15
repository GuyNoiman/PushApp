/**
 * useLiveCoach — the React adapter that drives the LIVE conversational coach on the Coach tab. It
 * holds ONE {@link CoachOrchestrator} per conversation (in a ref) over the composed cloud LlmClient
 * ({@link makeCoachLlm}, with the redaction seam baked in) and the {@link SafetyLayer} outbound
 * guard, and turns the orchestrator's turns into a flat, render-ready view-model the screen maps 1:1
 * onto the existing presentational coach components (bubbles, option cards, insight / Journey card).
 *
 * Every turn now makes a model call: the goal is INTERPRETED once (triage), and each turn after
 * that is WRITTEN by the model (`composeTurn`). So every advance shows `thinking` — a tap that waits
 * on a model and shows nothing is the bug the partner reported on 2026-09-14. All orchestrator calls are wrapped so a
 * transport failure surfaces a calm retry line and NEVER crashes the screen.
 *
 * SENSITIVE-DOMAIN STOP (safety): if the coach routes the goal to the `addiction` or `relationships`
 * expert, this hook does NOT run that specialised interview or build a Journey — it shows a calm
 * hand-off and offers manual creation instead. The coach shapes a Journey; it never plays clinician.
 *
 * SECURITY-PRIVACY G1: the interview answers and the resulting GoalSpec are ON-DEVICE-ONLY raw
 * signal; this hook keeps them in local React state, never logs them, and never syncs them.
 *
 * Business logic lives here, not in the screen (Engineering Bible §19).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { CoachOption } from '@/components/coach/coachScript';
import { extractTechnicalMode } from '@/core/coach/technicalMode';
import {
  CoachOrchestrator,
  CoachUnavailableError,
  type CoachMode,
  type CoachTurn,
} from '@/core/coach/CoachOrchestrator';
import type { GoalSpec } from '@/core/coach/interviewPlaybook';
import { SafetyLayer } from '@/core/coach/SafetyLayer';
import type { DomainQuestion } from '@/core/learning/DomainExpert';
import { SENSITIVE_DOMAINS } from '@/core/coach/sensitiveDomains';
import {
  DEFAULT_BUDGET,
  EMPTY_BUDGET,
  canSpend,
  spend,
  zoneOf,
  type BudgetState,
  type BudgetZone,
} from '@/core/llm/conversationBudget';
import { getCommunicationProfile, profileToCoachStyle } from '@/core/communication/communicationProfile';
import {
  INTRODUCTION_CONVERSATION_KEY,
  PLANNING_CONVERSATION_KEY,
  asyncStorageBudgetStore,
  type ConversationBudgetStore,
} from '@/core/llm/conversationBudgetStore';
import { makeCoachLlm } from '@/core/llm/makeCoachLlm';
import type { CoachOnboardingSummary } from '@/core/onboarding/model';
import type { Portrait } from '@/core/coach/portrait';

/**
 * The calm, always-safe hand-off shown when the goal routes to a sensitive domain, and the soft retry
 * line if the one LLM call hiccups, both come from the `coach` namespace (`sensitiveHandoff` / `retry`)
 * so they follow the active language — they are never model output.
 */

/**
 * Where the coach is in the one LLM round-trip: idle, waiting on triage, a soft error, or
 * `unavailable` — the coach could not REACH a model at all and has deliberately not started an
 * interview it could only finish by guessing (2026-08-20). `error` remains the softer "something
 * hiccupped, say that again" state.
 */
export type LiveCoachStatus = 'idle' | 'thinking' | 'error' | 'unavailable';

/** One render-ready transcript item — maps 1:1 onto the presentational coach components. */
export type LiveCoachItem =
  | { kind: 'coach'; text: string; strong?: boolean }
  | { kind: 'user'; text: string }
  | { kind: 'insight'; text: string }
  /**
   * TECHNICAL MODE (2026-08-27): why the coach did what it did. Rendered as its own kind of bubble
   * so it can never be mistaken for something the coach said to the user — and so it is obvious at a
   * glance which part of the transcript is the product talking about itself.
   */
  | { kind: 'technical'; text: string }
  | { kind: 'journey'; eyebrow: string; title: string; description: string; meta: string };

/** The current question awaiting an answer, shaped for {@link CoachOptions}. */
export interface LiveCoachQuestionView {
  /** The orchestrator's question id, so the screen can recognise the turns it renders specially. */
  id: string;
  /** A short label above the option cards (the full question is already a coach bubble). */
  label: string;
  /** Option cards; each `id` is the stringified 0-based option index (parsed back on select). */
  options: CoachOption[];
  multiSelect: boolean;
  allowOther: boolean;
}

/** The whole view-model + handlers the Coach screen renders. */
export interface UseLiveCoach {
  items: LiveCoachItem[];
  question: LiveCoachQuestionView | null;
  status: LiveCoachStatus;
  /** The completed GoalSpec once the interview is done — drives the "Build my Journey" CTA. */
  goalSpec: GoalSpec | null;
  /** True once a sensitive-domain hand-off was shown (no Journey to build here). */
  handoff: boolean;
  /** True while the coach awaits the opening free-text (the only free-text moment). */
  awaitingOpening: boolean;
  /**
   * How much of this conversation's budget is left, as a zone rather than a number (2026-08-20).
   *
   * `open` ⇒ the coach may still ask things that cost. `narrowing` ⇒ it must stop offering free text
   * and keep to closed cards, which are free. `closing` ⇒ build from what is known and land.
   *
   * The SCREEN reads this to decide what to offer, which is the point: the budget is a rule about
   * what the coach asks, not an error the person is shown. Nobody is ever told they ran out.
   */
  budgetZone: BudgetZone;
  /** Whether a free-text answer may still be offered. False from `narrowing` onward. */
  canAskOpenQuestion: boolean;
  /** Whether the technical commentary is on (2026-08-27). Toggled by saying so in the conversation. */
  technicalMode: boolean;
  /**
   * True once the INTRODUCTION has landed (D105). It is the first run's equivalent of `goalSpec`,
   * and it is a separate flag precisely BECAUSE there is no spec: the introduction chooses and
   * builds nothing, so the screen's next move is the first run's own tail rather than a build.
   * Always false in `planning` mode.
   */
  introductionComplete: boolean;
  /**
   * The name the person gave when the introduction asked what to call them, once it has one. The
   * screen writes it to the profile; the core is framework-free and does not own that state. Null is
   * the ordinary case in `planning` mode and a perfectly normal one in `introduction` mode.
   */
  personalName: string | null;
  /**
   * THE PORTRAIT (דיוקן) the introduction has built so far, or null in `planning` mode.
   *
   * Handed to the screen rather than written from here, exactly like {@link personalName}: the core
   * is framework-free, and the door to `AppState` belongs to the screen. It updates as the
   * conversation goes, so an introduction somebody abandons half way still leaves what it
   * understood instead of nothing.
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY. It is never rendered, never logged and never sent.
   */
  portrait: Portrait | null;
  /** Send the opening free-text — the only LLM call (triage). */
  sendOpening: (text: string) => void;
  /** Pick a single closed option by its id (index). */
  selectSingle: (id: string) => void;
  /** Submit several chosen ids (index) on a multi-select question. */
  selectMulti: (ids: string[]) => void;
  /** Submit a free-text "Other" answer. */
  answerOther: (text: string) => void;
  /**
   * Try the opening again after an `unavailable` status. It re-sends the LAST opening the person
   * typed, so a coach that lost the connection picks up from their first sentence instead of asking
   * them to write it a second time. A no-op when there is nothing to retry.
   */
  retryOpening: () => void;
  /**
   * The conversation genuinely CONCLUDED — a Journey was created from it — so its persisted budget
   * is released and the next conversation starts fresh. Called by the screen at the build, which is
   * the only place that knows a Journey really exists.
   *
   * A no-op in `introduction` mode: the first conversation is ONE conversation however many times it
   * is re-entered, and its spend never refills (see {@link ../../core/llm/conversationBudgetStore}).
   */
  journeyCreated: () => void;
}

/** Construction options — a test seam to inject an orchestrator over a MockLlmClient. */
export interface UseLiveCoachOptions {
  /** Inject a pre-built orchestrator (tests). Production omits it and builds the live one. */
  orchestrator?: CoachOrchestrator;
  /**
   * What onboarding already learned about this person, supplied by the screen (which owns the core).
   * The orchestrator reads it for ONE thing: to skip a chosen Journey's variant question when the
   * profile has already answered it (D62). Absent ⇒ the question is asked, which is the right
   * behaviour for someone we know nothing about.
   *
   * It is passed IN rather than read here so this hook keeps working without an AppProvider, which
   * is how every test drives it.
   */
  profile?: CoachOnboardingSummary | null;
  /** The user's preferred first name, when the profile has one. Absent is normal. */
  firstName?: string | null;
  /**
   * Which conversation this is (D105). `introduction` is the first run: it asks what to call them,
   * asks only what you would ask on meeting somebody, and builds nothing. Absent ⇒ `planning`, which
   * is the Coach tab and every caller that existed before this option did.
   *
   * Ignored when an orchestrator is injected — that instance already knows which it is, and the hook
   * asks it rather than being told twice.
   */
  mode?: CoachMode;
  /** Where this conversation's spend is persisted. A test seam; production uses AsyncStorage. */
  budgetStore?: ConversationBudgetStore;
}

/** Map an expert {@link DomainQuestion} onto the option-card view (index → id). */
function toQuestionView(question: DomainQuestion, t: TFunction<'coach'>): LiveCoachQuestionView {
  return {
    id: question.id,
    label: question.multiSelect ? t('chooseAny') : t('chooseOne'),
    options: question.options.map((title, index) => ({ id: String(index), title })),
    multiSelect: Boolean(question.multiSelect),
    allowOther: question.allowOther,
  };
}

/** A NEW JOURNEY card summarising the completed goal (no build needed for the summary line). */
function journeyCardItem(spec: GoalSpec, t: TFunction<'coach'>): LiveCoachItem {
  const shape = spec.isHabit ? t('journeyCard.habit') : t('journeyCard.plan');
  const meta = spec.activeExpertDisplayName
    ? t('journeyCard.metaWithExpert', { shape, expert: spec.activeExpertDisplayName })
    : shape;
  return {
    kind: 'journey',
    eyebrow: t('journeyCard.eyebrow'),
    title: spec.title,
    description: spec.description ?? t('journeyCard.defaultDescription'),
    meta,
  };
}

export function useLiveCoach(options?: UseLiveCoachOptions): UseLiveCoach {
  const { t, i18n } = useTranslation('coach');
  /**
   * What this conversation has cost. A ref, not state: it is written from inside the LLM stack and a
   * setState there would re-render mid-call. The zone is mirrored into state below, where the screen
   * can see it.
   */
  const budgetRef = useRef<BudgetState>(EMPTY_BUDGET);
  const [budgetZone, setBudgetZone] = useState<BudgetZone>('open');
  /**
   * WHERE THAT NUMBER LIVES BETWEEN VISITS (founder, 2026-09-15).
   *
   * The ref above dies with the component, so backing out of a conversation and starting it again
   * used to hand somebody a fresh six calls — and again, and again. The running total is now read
   * from the device on mount and written back on every spend, keyed by the CONVERSATION rather than
   * by the screen. Everything downstream is untouched: this changes where the number is kept, not
   * what it means.
   */
  const budgetStoreRef = useRef<ConversationBudgetStore>(options?.budgetStore ?? asyncStorageBudgetStore);
  const conversationKeyRef = useRef<string>(PLANNING_CONVERSATION_KEY);
  const orchestratorRef = useRef<CoachOrchestrator | null>(null);
  if (orchestratorRef.current === null) {
    orchestratorRef.current =
      options?.orchestrator ??
      // Thread the user's ACTIVE language into the one understanding call so the coach reads a
      // non-English opening in it (the visible dialogue is already localized via i18n).
      new CoachOrchestrator({
        // Every call is charged as it happens, including one that fails — see MeteringLlmClient.
        llm: makeCoachLlm((tokens) => {
          budgetRef.current = spend(budgetRef.current, { tokens });
          setBudgetZone(zoneOf(budgetRef.current, DEFAULT_BUDGET));
          // Off the render path, exactly like the ref it mirrors: fire-and-forget, never awaited
          // inside the LLM stack, and a failed write only means a more generous budget.
          void budgetStoreRef.current.save(conversationKeyRef.current, budgetRef.current);
        }),
        guard: new SafetyLayer().messageGuard(),
        locale: i18n.language,
        // What onboarding already learned, so the chosen Journey does not ask a question the user
        // has answered (D62). Read once, at construction: an interview is one conversation, and a
        // profile edited mid-interview must not change the questions under the user.
        profile: options?.profile,
        // THE NAME THEY ARE CALLED. "Use their name" is an instruction a model
        // cannot follow when it has not been given one — it invents one, or
        // writes a placeholder. Read once at construction, like the profile and
        // the voice: a name that changed mid-conversation would read as somebody
        // else answering.
        firstName: options?.firstName ?? null,
        // THE USER'S OWN VOICE (Communication_Style_Profile_PRD §9, AC#4). Until this line the
        // coach spoke `steady` to everybody, which made the whole style questionnaire change
        // nothing anyone could hear. Read once at construction for the same reason as the profile:
        // a voice that changed mid-conversation would read as a different person answering.
        styleId: profileToCoachStyle(getCommunicationProfile()),
        // WHICH CONVERSATION THIS IS (D105). The first run is an INTRODUCTION: it meets the person
        // and builds nothing. Absent ⇒ planning, so the Coach tab is unchanged.
        mode: options?.mode ?? 'planning',
      });
  }
  // Asked of the orchestrator rather than of the options, so an injected instance (every test, and
  // the dev harness) and the hook can never disagree about which conversation this is.
  const isIntroduction = orchestratorRef.current.isIntroduction();
  conversationKeyRef.current = isIntroduction
    ? INTRODUCTION_CONVERSATION_KEY
    : PLANNING_CONVERSATION_KEY;

  const [items, setItems] = useState<LiveCoachItem[]>([]);
  const [questionView, setQuestionView] = useState<LiveCoachQuestionView | null>(null);
  const [status, setStatus] = useState<LiveCoachStatus>('idle');
  const [goalSpec, setGoalSpec] = useState<GoalSpec | null>(null);
  const [handoff, setHandoff] = useState(false);
  /** Whether the commentary is on. Mirrored into state so the screen can show that it is. */
  const [technicalMode, setTechnicalMode] = useState(false);
  const [awaitingOpening, setAwaitingOpening] = useState(true);
  /** The introduction landed. There is no spec to build from — that is the point (D105). */
  const [introductionComplete, setIntroductionComplete] = useState(false);
  /** The name the introduction learned, for the screen to write to the profile. */
  const [personalName, setPersonalName] = useState<string | null>(null);
  /** What the introduction has understood so far, for the screen to write to AppState. */
  const [portrait, setPortrait] = useState<Portrait | null>(null);

  // The raw current question, kept in a ref so handlers always read the latest without re-binding.
  const rawQuestionRef = useRef<DomainQuestion | null>(null);
  const startedRef = useRef(false);
  /** The last opening text, kept so an `unavailable` coach can be retried without retyping it. */
  const lastOpeningRef = useRef<string | null>(null);

  const applyQuestion = useCallback(
    (question: DomainQuestion | null) => {
      rawQuestionRef.current = question;
      setQuestionView(question ? toQuestionView(question, t) : null);
    },
    [t],
  );

  /**
   * Read what this conversation has already spent.
   *
   * It ADDS to whatever the ref holds rather than replacing it, which is not defensive noise: a turn
   * can be paid for before this read lands, and a replace would silently give that call back. The
   * ref starts empty, so on the ordinary path the sum is exactly the stored value.
   */
  useEffect(() => {
    let cancelled = false;
    const store = budgetStoreRef.current;
    const key = conversationKeyRef.current;
    void store
      .load(key)
      .then((stored) => {
        if (cancelled) return;
        const merged: BudgetState = {
          callsUsed: stored.callsUsed + budgetRef.current.callsUsed,
          tokensUsed: stored.tokensUsed + budgetRef.current.tokensUsed,
        };
        budgetRef.current = merged;
        setBudgetZone(zoneOf(merged, DEFAULT_BUDGET));
      })
      .catch(() => {
        // The store already swallows device failures; this is the second belt, for an injected one
        // that does not. Nothing read means nothing spent — never a full budget, never a blocked
        // conversation. Storage trouble must not lock somebody out of the app.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The conversation concluded for real — a Journey exists — so its budget is released and the next
   * one starts fresh. The introduction never releases: it is one conversation for the life of the
   * install, however many times the first run is re-entered.
   */
  const journeyCreated = useCallback(() => {
    if (isIntroduction) return;
    void budgetStoreRef.current.clear(conversationKeyRef.current);
  }, [isIntroduction]);

  // Greet once, on mount — start() is a no-op-safe local call (no LLM).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const opening = orchestratorRef.current!.start();
    setItems([{ kind: 'coach', text: opening.coachMessage }]);
  }, []);

  /** Append the turn's technical commentary, when the mode is on. Display-only; never sent anywhere. */
  const appendNotes = useCallback((notes: readonly string[] | undefined) => {
    if (!notes || notes.length === 0) return;
    setItems((prev) => [...prev, ...notes.map((text): LiveCoachItem => ({ kind: 'technical', text }))]);
  }, []);

  /** Apply an orchestrator turn to the view-model (hand-off / question / done). */
  const applyTurn = useCallback(
    (turn: CoachTurn) => {
      // BEFORE the branches below, every one of which may return early. The commentary is about the
      // turn that just happened and must survive a hand-off or a completion.
      appendNotes(turn.technicalNotes);
      // SENSITIVE-DOMAIN STOP: never interview or build a Journey for a sensitive domain.
      if (turn.activeExpert && SENSITIVE_DOMAINS.has(turn.activeExpert.id)) {
        applyQuestion(null);
        setGoalSpec(null);
        setHandoff(true);
        setItems((prev) => [...prev, { kind: 'coach', text: t('sensitiveHandoff') }]);
        return;
      }

      // THE NAME, on the one turn that learns it. Surfaced before the branches below for the same
      // reason the notes are: it must survive whatever this turn also is.
      if (turn.personalName) setPersonalName(turn.personalName);
      // WHAT THE FIRST RUN PRODUCES. Surfaced before the branches below for the same reason the
      // name is: the landing turn is also the turn that carries the finished Portrait.
      if (turn.portrait) setPortrait(turn.portrait);

      const appended: LiveCoachItem[] = [{ kind: 'coach', text: turn.coachMessage }];
      if (turn.awaitingGoalText) {
        applyQuestion(null);
        setGoalSpec(null);
        setAwaitingOpening(true);
        setItems((prev) => [...prev, ...appended]);
        return;
      }
      if (turn.done) {
        const spec = turn.goalSpec ?? null;
        if (spec) appended.push(journeyCardItem(spec, t));
        applyQuestion(null);
        setGoalSpec(spec);
        // An introduction ends with nothing to build (D105), so there is no Journey card and no
        // Build CTA — the screen moves on to the first run's own tail instead.
        if (isIntroduction) setIntroductionComplete(true);
        setItems((prev) => [...prev, ...appended]);
        return;
      }

      applyQuestion(turn.question ?? null);
      setItems((prev) => [...prev, ...appended]);
    },
    [appendNotes, applyQuestion, isIntroduction, t],
  );

  /**
   * Echo the user's answer, advance the orchestrator, and apply the returned turn. Any throw
   * surfaces a calm retry line — the screen never crashes.
   *
   * ── EVERY ADVANCE THINKS NOW (partner QA, 2026-09-14) ────────────────────────────────────────
   *
   * This used to take a `thinking` flag, true only for the triage call, because everything else was
   * recorded on-device and returned instantly. `composeTurn` ended that on 2026-09-06: the coach now
   * WRITES each turn, so a tap that used to be instant waits on a model like any other.
   *
   * The flag stayed false on those paths, so the person tapped a card and watched nothing happen for
   * a second or more — which is exactly the "the thinking indicator does not always appear" the
   * partner reported, and it is a regression my own change caused. There is no longer such a thing
   * as an advance that does not think.
   */
  const advance = useCallback(
    async (userEcho: string | null, call: () => Promise<CoachTurn>) => {
      setAwaitingOpening(false);
      applyQuestion(null); // hide the options while we advance
      if (userEcho) setItems((prev) => [...prev, { kind: 'user', text: userEcho }]);
      setStatus('thinking');
      try {
        const turn = await call();
        setStatus('idle');
        applyTurn(turn);
      } catch (e) {
        // NEVER REACHED A MODEL. The coach has nothing to build an interview on, so it says so and
        // stops, rather than degrading into a worse coach that turns the person's own sentence into
        // the title of a Journey they never asked for. The screen renders the retry affordance.
        if (e instanceof CoachUnavailableError) {
          setStatus('unavailable');
          setAwaitingOpening(false);
          return;
        }
        // Anything else is a softer hiccup: the surface stays alive and the person can say it again.
        setStatus('error');
        setItems((prev) => [...prev, { kind: 'coach', text: t('retry') }]);
        // Reopen the composer only when the failure left NO question on the table — otherwise the
        // person is looking at a question they can still answer, and an opening bar beside it
        // invites them to start over instead of retrying.
        if (!rawQuestionRef.current) setAwaitingOpening(true);
      }
    },
    [applyTurn, applyQuestion, t],
  );

  /**
   * The technical-mode switch, recognised BEFORE anything is sent.
   *
   * It costs no model call and cannot be mistaken for a goal — which is the whole reason it is
   * matched here rather than inside the orchestrator, whose first job is to understand a sentence.
   * Returns true when the message was the command and has been handled.
   */
  const handleTechnicalCommand = useCallback(
    (text: string): { handled: boolean; rest: string } => {
      const { command, rest } = extractTechnicalMode(text);
      if (!command) return { handled: false, rest: text };
      const on = command === 'on';
      orchestratorRef.current!.setTechnicalMode(on);
      setTechnicalMode(on);
      setItems((prev) => [
        ...prev,
        { kind: 'user', text: text.trim() },
        { kind: 'technical', text: on ? t('technical.on') : t('technical.off') },
      ]);
      // The switch is not an answer. When the message carried one as well, the
      // rest of it is still a thing somebody said and still gets replied to —
      // the first version dropped it silently, which is how a tester ended up
      // seeing no change AND no answer.
      return { handled: true, rest };
    },
    [t],
  );

  const sendOpening = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      const { handled, rest } = handleTechnicalCommand(trimmed);
      // Handled AND nothing else said: the switch was the whole message.
      if (handled && !rest) return;
      const message = handled ? rest : trimmed;
      lastOpeningRef.current = message;
      void advance(message, () => orchestratorRef.current!.triage(message));
    },
    [advance, handleTechnicalCommand],
  );

  /**
   * Retry after `unavailable`. The orchestrator was left exactly where it was (still awaiting the
   * opening, with the unanswered line taken back out of its history), so the SAME instance can run
   * triage again. The echoed user bubble is already in the transcript, so it is not echoed twice.
   */
  const retryOpening = useCallback(() => {
    const text = lastOpeningRef.current;
    if (!text) return;
    void advance(null, () => orchestratorRef.current!.triage(text));
  }, [advance]);

  const selectSingle = useCallback(
    (id: string) => {
      const question = rawQuestionRef.current;
      if (!question) return;
      const index = Number(id);
      if (!Number.isInteger(index) || index < 0 || index >= question.options.length) return;
      void advance(question.options[index], () => orchestratorRef.current!.selectOption(index));
    },
    [advance],
  );

  const selectMulti = useCallback(
    (ids: string[]) => {
      const question = rawQuestionRef.current;
      if (!question || ids.length === 0) return;
      const indices = ids.map(Number);
      if (!indices.every((i) => Number.isInteger(i) && i >= 0 && i < question.options.length)) return;
      const echo = indices.map((i) => question.options[i]).join(' · ');
      void advance(echo, () => orchestratorRef.current!.selectOptions(indices));
    },
    [advance],
  );

  const answerOther = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || !rawQuestionRef.current) return;
      void advance(trimmed, () => orchestratorRef.current!.answerOther(trimmed));
    },
    [advance],
  );

  return {
    technicalMode,
    introductionComplete,
    personalName,
    portrait,
    journeyCreated,
    items,
    question: questionView,
    status,
    goalSpec,
    handoff,
    awaitingOpening,
    sendOpening,
    selectSingle,
    selectMulti,
    answerOther,
    retryOpening,
    budgetZone,
    canAskOpenQuestion: canSpend(budgetRef.current, DEFAULT_BUDGET),
  };
}
