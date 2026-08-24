/**
 * MirrorGateway — the boundary for Mirror Feedback's server side.
 *
 * THE SHAPE OF THIS INTERFACE IS THE PRIVACY RULE. There is a method for reading VISIBLE responses
 * and a method for reading a confidential SYNTHESIS, and deliberately none for reading confidential
 * raw answers. A requester cannot ask for them because there is nothing here to ask with — and the
 * row-level policies say the same thing again underneath, so neither layer is the only guard.
 *
 * Vendor-independent (Engineering Bible §3): one implementation file touches the SDK.
 */
import type { MirrorMode } from './round';

export interface MirrorRoundRow {
  id: string;
  ownerId: string;
  mode: MirrorMode;
  questionIds: string[];
  customQuestions: string[];
  status: 'draft' | 'open' | 'closed';
  openedAt?: number;
  closesAt?: number;
  closedAt?: number;
}

export interface MirrorInvitationRow {
  roundId: string;
  contributorId: string;
  status: 'sent' | 'answered' | 'declined';
  invitedAt: number;
}

/** One contributor's answer. Only ever handed to the person who WROTE it, or to a visible round's owner. */
export interface MirrorResponseRow {
  roundId: string;
  contributorId: string;
  questionId: string;
  body: string;
  createdAt: number;
}

/** One de-identified paragraph. What a confidential round gives back. */
export interface MirrorSynthesisRow {
  roundId: string;
  questionId: string;
  body: string;
}

export interface MirrorGateway {
  readonly enabled: boolean;

  /** Create the round and send its invitations. Returns the stored round. */
  openRound(input: {
    id: string;
    mode: MirrorMode;
    questionIds: string[];
    customQuestions: string[];
    contributorIds: readonly string[];
    closesAt: number;
  }): Promise<MirrorRoundRow>;

  /** The rounds this person started. */
  myRounds(): Promise<MirrorRoundRow[]>;

  /** Rounds this person was invited to answer, with their invitation. */
  invitationsForMe(): Promise<{ round: MirrorRoundRow; invitation: MirrorInvitationRow }[]>;

  /** Answer a round. Idempotent per question. */
  submitAnswers(roundId: string, answers: readonly { questionId: string; body: string }[]): Promise<void>;

  /** Decline an invitation. The requester learns only that the count did not grow. */
  declineInvitation(roundId: string): Promise<void>;

  /** VISIBLE rounds only — the server refuses for a confidential one. */
  visibleResponses(roundId: string): Promise<MirrorResponseRow[]>;

  /** The de-identified result of a confidential round, when it has been produced. */
  synthesis(roundId: string): Promise<MirrorSynthesisRow[]>;

  /** How many people have answered — a COUNT, never who. Safe in both modes. */
  answeredCount(roundId: string): Promise<number>;
}

export const NullMirrorGateway: MirrorGateway = {
  enabled: false,
  async openRound(input) {
    return {
      id: input.id,
      ownerId: '',
      mode: input.mode,
      questionIds: [...input.questionIds],
      customQuestions: [...input.customQuestions],
      status: 'draft',
    };
  },
  async myRounds() { return []; },
  async invitationsForMe() { return []; },
  async submitAnswers() {},
  async declineInvitation() {},
  async visibleResponses() { return []; },
  async synthesis() { return []; },
  async answeredCount() { return 0; },
};
