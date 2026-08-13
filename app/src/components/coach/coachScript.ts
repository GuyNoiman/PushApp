/**
 * The scripted Coach conversation that drives the `(tabs)/coach.tsx` prototype.
 *
 * This is a LOCAL, OFFLINE stand-in for the real coach — no LLM, no network. The
 * screen walks this array of {@link CoachStage}s: each stage appends some
 * utterances to the transcript and offers the user one way to reply (free text,
 * selectable option cards + "Other", or a final call-to-action). "Sending" a
 * reply just advances `stageIndex` — the next canned turn is already written here.
 *
 * ── Swapping in the real engine ──────────────────────────────────────────────
 * The shapes below deliberately mirror what a live coach turn looks like so the
 * swap is mechanical: the real {@link import('@/core/coach').CoachOrchestrator}
 * emits coach utterances + a set of expected answers per turn, exactly like a
 * `CoachStage`. To go live, replace this constant with orchestrator output and
 * feed user replies back into it (see the seam comment in `coach.tsx`). Going
 * live needs a founder decision on the LLM API key + cost, so it stays scripted.
 *
 * i18n: the copy is not stored here as literals — {@link buildCoachScript} resolves every
 * user-facing line from the `coach` namespace (`script.*`) through the passed `t`, so the
 * prototype speaks the active language (canonical terms preserved).
 */
/**
 * The minimal translate signature this builder needs: a key (plus optional i18next options) → string.
 * Satisfied by react-i18next's `t` AND the form-of-address–aware `t` from {@link useAddressedTranslation}
 * (D31), so the scripted coach can speak in the user's grammatical gender.
 */
export type CoachScriptT = (key: string, options?: Record<string, unknown>) => string;

/** One selectable answer in an option block (rendered as a check-able card). */
export interface CoachOption {
  id: string;
  /** The option's headline, e.g. "Build up my push-ups". */
  title: string;
  /** A supporting line, e.g. "Step-by-step plan · Body Image". */
  meta?: string;
  /** When true, and another option is focused, this one shows a "Saved for later"
   * tag — the coach focuses one goal now and defers the rest. */
  canDefer?: boolean;
}

/** A single line the coach or user says, or a structured card the coach shows. */
export type CoachUtterance =
  | { kind: 'coach'; text: string; strong?: boolean }
  | { kind: 'user'; text: string }
  | { kind: 'insight'; text: string }
  | {
      kind: 'journey';
      eyebrow: string;
      title: string;
      description: string;
      /** Meta line with numbers, e.g. "3 Milestones · ~7 weeks · Body Image". */
      meta: string;
    };

/** How the user answers the current stage. */
export type CoachReply =
  /** A free-text bar (text field + mic + send). "Sending" advances the script. */
  | { mode: 'text'; placeholder: string }
  /** Selectable option cards + an "Other" free-text field. */
  | {
      mode: 'options';
      /** Small label above the cards, e.g. "Which one first?". */
      prompt: string;
      options: CoachOption[];
      /** Single-focus (tap advances) vs multi-select (a Continue button advances). */
      multiSelect: boolean;
      /** Whether the dashed "Other, type your own" row is offered. */
      allowOther: boolean;
      /** Label for the multi-select advance button (ignored when single-select). */
      continueLabel?: string;
    }
  /** A closing call-to-action (primary button + secondary link). Visual only. */
  | { mode: 'cta'; primaryLabel: string; secondaryLabel: string };

/**
 * One step of the conversation: the turns to reveal, then how the user replies.
 * A stage's `utterances` may begin with a `user` line — that is the answer the
 * user "sent" in the previous stage, echoed back into the transcript.
 */
export interface CoachStage {
  id: string;
  utterances: CoachUtterance[];
  reply: CoachReply;
}

/**
 * The sample fitness conversation (matches `coach_mvp_mockup.html` GROUP 1 and the
 * "Coach conversation" frames of `mature_proposal.html`): opening question →
 * reflect the detected goals back as cards → focus one → name + describe the
 * Journey the coach will build. Every line is resolved from the `coach` namespace so
 * the prototype follows the active language.
 */
export function buildCoachScript(t: CoachScriptT): CoachStage[] {
  return [
    {
      id: 'opening',
      utterances: [
        { kind: 'coach', text: t('script.opening.intro') },
        { kind: 'coach', strong: true, text: t('script.opening.question') },
      ],
      reply: { mode: 'text', placeholder: t('script.opening.placeholder') },
    },
    {
      id: 'reflect',
      utterances: [
        { kind: 'user', text: t('script.reflect.userEcho') },
        { kind: 'coach', text: t('script.reflect.coach') },
      ],
      reply: {
        mode: 'options',
        prompt: t('script.reflect.prompt'),
        multiSelect: false,
        allowOther: true,
        options: [
          { id: 'pushups', title: t('script.reflect.pushupsTitle'), meta: t('script.reflect.pushupsMeta') },
          { id: 'protein', title: t('script.reflect.proteinTitle'), meta: t('script.reflect.proteinMeta'), canDefer: true },
        ],
      },
    },
    {
      id: 'focus',
      utterances: [
        { kind: 'coach', text: t('script.focus.coach') },
        { kind: 'insight', text: t('script.focus.insight') },
        {
          kind: 'journey',
          eyebrow: t('script.focus.journeyEyebrow'),
          title: t('script.focus.journeyTitle'),
          description: t('script.focus.journeyDescription'),
          meta: t('script.focus.journeyMeta'),
        },
      ],
      reply: {
        mode: 'cta',
        primaryLabel: t('script.focus.primary'),
        secondaryLabel: t('script.focus.secondary'),
      },
    },
  ];
}
