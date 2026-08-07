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
 */

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
 * Journey the coach will build.
 */
export const COACH_SCRIPT: CoachStage[] = [
  {
    id: 'opening',
    utterances: [
      {
        kind: 'coach',
        text:
          "Hey, good to have you here. Tell me what's on your mind and we'll " +
          'figure it out together. Nothing is too small to bring up.',
      },
      { kind: 'coach', strong: true, text: 'So, what do you want to work on?' },
    ],
    reply: { mode: 'text', placeholder: 'Type or speak…' },
  },
  {
    id: 'reflect',
    utterances: [
      {
        kind: 'user',
        text:
          'I want to start drinking more protein every day, and I keep meaning to ' +
          'build up my push-ups but never actually start.',
      },
      {
        kind: 'coach',
        text:
          'Okay, I hear two things. One is a daily habit, drinking more protein. The ' +
          "other is a real plan, building up your push-ups. Let's start with one, and " +
          "I'll keep the other safe for later.",
      },
    ],
    reply: {
      mode: 'options',
      prompt: 'Which one first?',
      multiSelect: false,
      allowOther: true,
      options: [
        { id: 'pushups', title: 'Build up my push-ups', meta: 'Step-by-step plan · Body Image' },
        { id: 'protein', title: 'Drink more protein daily', meta: 'Daily habit', canDefer: true },
      ],
    },
  },
  {
    id: 'focus',
    utterances: [
      { kind: 'coach', text: "Thanks. Here's my honest take." },
      {
        kind: 'insight',
        text:
          'Going from zero to a strong set in three weeks is a big ask. Give it six to ' +
          'eight weeks and you get a real change, not just a number.',
      },
      {
        kind: 'journey',
        eyebrow: 'NEW JOURNEY',
        title: 'Push-Up Progression',
        description:
          'A steady build over six to eight weeks, from your first knee push-up to a ' +
          "confident set of 15. It's paced for a busy week, not a sprint.",
        meta: '3 Milestones · ~7 weeks · Body Image',
      },
    ],
    reply: { mode: 'cta', primaryLabel: 'Build my Journey', secondaryLabel: 'Or adjust the pace first' },
  },
];
