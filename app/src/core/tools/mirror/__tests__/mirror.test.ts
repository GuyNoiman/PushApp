/**
 * Mirror Feedback — the rules, before anything can send.
 *
 * This is the only tool that carries OTHER PEOPLE'S private words, and the only one that makes a
 * promise to somebody who is not our user. Every test here is a way of holding that promise: the
 * requester never learns who answered, a partial result stays sealed, a mode cannot change under
 * somebody who already consented to it, and a withdrawal actually withdraws.
 */
import {
  CUSTOM_QUESTION_MAX_CHARS,
  QUESTIONS_PER_ROUND,
  QUESTION_BANK,
  QUESTION_CATEGORIES,
  questionsInCategory,
  recommendedSet,
  reviewCustomQuestion,
} from '../questionBank';
import {
  CLAIM_MIN_SUPPORT,
  CONFIDENTIAL_THRESHOLD,
  LATE_INVITE_MIN_DAYS,
  NUDGE_AFTER_DAYS,
  RAW_RETENTION_DAYS,
  ROUND_OPEN_DAYS,
  acceptsResponses,
  extendForLateInvite,
  rawExpiresAt,
  rawRetentionExpired,
  shouldNudge,
  expiresAt,
  mustDiscardResponses,
  outcome,
  canSend,
  claimIsSupported,
  closeRound,
  isLocked,
  lock,
  readiness,
  setMode,
  setQuestions,
  startRound,
  withdrawalResealsResult,
  type MirrorRound,
  type QuestionTally,
} from '../round';

const FIVE = recommendedSet();

/** A locked confidential round with the recommended five. */
function openConfidential(): MirrorRound {
  let r = startRound('r1', 'confidential');
  r = setQuestions(r, FIVE);
  return lock(r, 1_700_000_000_000, 7);
}

const tallies = (counts: number[]): QuestionTally[] =>
  FIVE.map((questionId, i) => ({ questionId, valid: counts[i] }));

describe('the bank', () => {
  it('is fifteen questions across four categories', () => {
    expect(QUESTION_BANK).toHaveLength(15);
    expect(new Set(QUESTION_BANK.map((q) => q.id)).size).toBe(15);
    for (const c of QUESTION_CATEGORIES) expect(questionsInCategory(c).length).toBeGreaterThan(0);
  });

  it('recommends exactly five, balanced across the categories', () => {
    expect(recommendedSet()).toHaveLength(QUESTIONS_PER_ROUND);
    const kinds = QUESTION_BANK.filter((q) => q.recommended).map((q) => q.category);
    // Two behaviour, one strength, one impact, one growth (PRD §6).
    expect(kinds.filter((k) => k === 'moments')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'strengths')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'impact')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'growth')).toHaveLength(1);
  });
});

describe('the custom-question gate', () => {
  it('passes an ordinary question', () => {
    expect(reviewCustomQuestion('What helps me bring out the best in a team?')).toEqual({
      ok: true,
      problems: [],
      blocking: false,
    });
  });

  it('BLOCKS a request for a verdict, in either language', () => {
    // This tool asks what somebody saw. It never asks them to judge a person.
    for (const bad of ['What is my biggest weakness?', 'מה החולשה הכי גדולה שלי?']) {
      const review = reviewCustomQuestion(bad);
      expect(review.problems).toContain('asksForJudgement');
      expect(review.blocking).toBe(true);
    }
  });

  it('BLOCKS anything about a body, a diagnosis or money', () => {
    for (const bad of ['Do you think I have anxiety?', 'האם המשקל שלי מפריע לך?']) {
      expect(reviewCustomQuestion(bad).blocking).toBe(true);
    }
  });

  it('BLOCKS a question past the character limit', () => {
    const long = `${'a'.repeat(CUSTOM_QUESTION_MAX_CHARS + 1)}?`;
    expect(reviewCustomQuestion(long).problems).toContain('tooLong');
  });

  it('notices two questions crammed into one field', () => {
    // A contributor answers the first and the second silently disappears.
    expect(reviewCustomQuestion('When am I at my best? And when am I not?').problems).toContain(
      'multipleQuestions',
    );
  });

  it('WARNS about a name without blocking it', () => {
    // A name is usually a mistake and occasionally the point. Blocking on a guess would make the
    // tool argue with people about their own sentences.
    const review = reviewCustomQuestion('How do I work with Daniel on hard days?');
    expect(review.problems).toContain('namesSomeone');
    expect(review.blocking).toBe(false);
  });

  it('refuses an empty question', () => {
    expect(reviewCustomQuestion('   ')).toEqual({ ok: false, problems: ['empty'], blocking: true });
  });

  it('never rewrites — it only reports', () => {
    // The API returns problems, not a corrected string. A question sent in somebody's name has to
    // be the question they wrote.
    const review = reviewCustomQuestion('What is my biggest weakness?');
    expect(Object.keys(review).sort()).toEqual(['blocking', 'ok', 'problems']);
  });
});

describe('setting a round up', () => {
  it('takes exactly five questions and drops duplicates', () => {
    const r = setQuestions(startRound('r', 'visible'), [...FIVE, FIVE[0], 'extra']);
    expect(r.questionIds).toHaveLength(QUESTIONS_PER_ROUND);
    expect(new Set(r.questionIds).size).toBe(QUESTIONS_PER_ROUND);
  });

  it('will not send a confidential round to fewer than five people', () => {
    const r = setQuestions(startRound('r', 'confidential'), FIVE);
    expect(canSend(r, CONFIDENTIAL_THRESHOLD - 1)).toBe(false);
    expect(canSend(r, CONFIDENTIAL_THRESHOLD)).toBe(true);
  });

  it('will send a visible round to one person', () => {
    const r = setQuestions(startRound('r', 'visible'), FIVE);
    expect(canSend(r, 1)).toBe(true);
    expect(canSend(r, 0)).toBe(false);
  });

  it('will not send without exactly five questions', () => {
    const r = setQuestions(startRound('r', 'visible'), FIVE.slice(0, 3));
    expect(canSend(r, 9)).toBe(false);
  });
});

describe('the lock is the consent', () => {
  it('freezes the mode once anybody has been asked', () => {
    const r = openConfidential();
    expect(isLocked(r)).toBe(true);
    // A contributor agreed to a specific contract. It cannot change under them.
    expect(setMode(r, 'visible').mode).toBe('confidential');
  });

  it('freezes the questions too', () => {
    const r = openConfidential();
    expect(setQuestions(r, ['somethingElse']).questionIds).toEqual(r.questionIds);
  });

  it('locks once, so a second send cannot rewrite when consent was given', () => {
    const r = openConfidential();
    expect(lock(r, 9_999, 99).lockedAt).toBe(r.lockedAt);
  });
});

describe('readiness never names anybody', () => {
  it('stays sealed until EVERY question clears', () => {
    // Opening question three because it has five, while four has two, tells the requester exactly
    // which question people would not answer — information about contributors, not about them.
    const nearly = readiness(openConfidential(), tallies([5, 5, 5, 5, 4]));
    expect(nearly.open).toBe(false);
    expect(nearly.short).toEqual([{ questionId: FIVE[4], valid: 4, needed: 1 }]);
  });

  it('opens when all five clear', () => {
    expect(readiness(openConfidential(), tallies([5, 6, 5, 7, 5])).open).toBe(true);
  });

  it('reports the LOWEST count, which is the "3 of 5" a person sees', () => {
    expect(readiness(openConfidential(), tallies([5, 3, 5, 5, 5])).lowest).toBe(3);
  });

  it('says what is needed without saying who is missing', () => {
    const short = readiness(openConfidential(), tallies([1, 0, 5, 5, 5])).short;
    for (const entry of short) {
      expect(Object.keys(entry).sort()).toEqual(['needed', 'questionId', 'valid']);
    }
  });

  it('treats a missing tally as zero rather than as ready', () => {
    expect(readiness(openConfidential(), []).open).toBe(false);
  });

  it('has no threshold at all in visible mode — one named answer is a result', () => {
    let r = setQuestions(startRound('r', 'visible'), FIVE);
    r = lock(r, 1, 1);
    expect(readiness(r, tallies([1, 0, 0, 0, 0])).open).toBe(true);
    expect(readiness(r, tallies([0, 0, 0, 0, 0])).open).toBe(false);
  });
});

describe('a withdrawal actually withdraws', () => {
  it('reseals a result that was standing on the answer taken back', () => {
    const round = openConfidential();
    expect(withdrawalResealsResult(round, tallies([5, 5, 5, 5, 5]))).toBe(false);
    expect(withdrawalResealsResult(round, tallies([5, 5, 4, 5, 5]))).toBe(true);
  });

  it('does not apply to visible mode, where nothing was pooled', () => {
    let r = setQuestions(startRound('r', 'visible'), FIVE);
    r = lock(r, 1, 3);
    expect(withdrawalResealsResult(r, tallies([0, 0, 0, 0, 0]))).toBe(false);
  });
});

describe('what a synthesis may claim', () => {
  it('needs two responses behind a claim, and drops a lone one rather than hedging it', () => {
    // "One person felt…" in a group of five is a sentence that identifies somebody.
    expect(CLAIM_MIN_SUPPORT).toBe(2);
    expect(claimIsSupported(1)).toBe(false);
    expect(claimIsSupported(2)).toBe(true);
  });
});

describe('the week (founder, 2026-08-21)', () => {
  const SENT = 1_700_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;
  const sent = () => {
    let r = startRound('r1', 'confidential');
    r = setQuestions(r, FIVE);
    return lock(r, SENT, 7);
  };

  it('runs for seven days from the first invitation', () => {
    expect(ROUND_OPEN_DAYS).toBe(7);
    expect(expiresAt(sent())).toBe(SENT + 7 * DAY);
    expect(expiresAt(startRound('r', 'confidential'))).toBeUndefined();
  });

  it('locks the questions FOR THE CONTRIBUTORS when the week is up', () => {
    const r = sent();
    expect(acceptsResponses(r, SENT + 6 * DAY)).toBe(true);
    // Somebody opening on day nine is told it closed, not shown a form that goes nowhere.
    expect(acceptsResponses(r, SENT + 9 * DAY)).toBe(false);
  });

  it('shows NO result while the week runs, even once the threshold is met', () => {
    // Opening at the moment the fifth answer lands would tell a requester watching the counter WHEN
    // each person answered — and against a list they invited themselves, timing is an identity.
    const during = outcome(sent(), tallies([5, 5, 5, 5, 5]), SENT + 3 * DAY);
    expect(during).toBe('collecting');
  });

  it('delivers when the week ends with enough answers', () => {
    expect(outcome(sent(), tallies([5, 6, 5, 5, 7]), SENT + 8 * DAY)).toBe('delivered');
  });

  it('says plainly that not enough people answered, and invents nothing', () => {
    expect(outcome(sent(), tallies([5, 5, 4, 5, 5]), SENT + 8 * DAY)).toBe('notEnough');
  });

  it('is a draft until the first invitation, whatever the clock says', () => {
    const r = setQuestions(startRound('r', 'confidential'), FIVE);
    expect(outcome(r, tallies([9, 9, 9, 9, 9]), SENT + 99 * DAY)).toBe('draft');
  });

  it('DESTROYS the answers a short round collected', () => {
    // People answered under a promise that produced nothing. Keeping their words then serves
    // nobody — and it removes the temptation to carry four answers into a second round they never
    // consented to.
    expect(mustDiscardResponses(sent(), tallies([5, 5, 2, 5, 5]), SENT + 8 * DAY)).toBe(true);
    expect(mustDiscardResponses(sent(), tallies([5, 5, 5, 5, 5]), SENT + 8 * DAY)).toBe(false);
    expect(mustDiscardResponses(sent(), tallies([1, 1, 1, 1, 1]), SENT + 2 * DAY)).toBe(false);
  });
});

describe('the nudge, the extension and the retention (founder, 2026-08-21)', () => {
  const SENT = 1_700_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;
  const sent = () => lock(setQuestions(startRound('r1', 'confidential'), FIVE), SENT, 7);

  it('says nothing for the first three days', () => {
    expect(NUDGE_AFTER_DAYS).toBe(3);
    expect(shouldNudge(sent(), tallies([1, 1, 1, 1, 1]), SENT + 2 * DAY)).toBe(false);
  });

  it('tells the requester on day three when the round is short', () => {
    expect(shouldNudge(sent(), tallies([2, 2, 2, 2, 2]), SENT + 3 * DAY)).toBe(true);
  });

  it('says nothing when the round is already there', () => {
    expect(shouldNudge(sent(), tallies([5, 5, 5, 5, 5]), SENT + 4 * DAY)).toBe(false);
  });

  it('says nothing once the round has closed — that is a different message', () => {
    expect(shouldNudge(sent(), tallies([1, 1, 1, 1, 1]), SENT + 9 * DAY)).toBe(false);
  });

  it('gives a late invitee at least five days, and moves the deadline for EVERYONE', () => {
    // One deadline for the round, extended rather than per-person: a per-person deadline would let
    // the synthesis open while somebody still had days to answer.
    const late = extendForLateInvite(sent(), SENT + 5 * DAY, 3);

    expect(LATE_INVITE_MIN_DAYS).toBe(5);
    expect(expiresAt(late)).toBe(SENT + 10 * DAY);
    expect(acceptsResponses(late, SENT + 9 * DAY)).toBe(true);
    expect(late.invited).toBe(10);
  });

  it('NEVER moves the deadline backwards', () => {
    // Somebody promised until Friday is not brought forward because a name was added on Thursday.
    const early = extendForLateInvite(sent(), SENT + 1 * DAY, 1);
    expect(expiresAt(early)).toBe(SENT + ROUND_OPEN_DAYS * DAY);
  });

  it('cannot extend a round that was never sent, or one already closed', () => {
    const draft = setQuestions(startRound('r', 'confidential'), FIVE);
    expect(extendForLateInvite(draft, SENT, 3)).toBe(draft);
    const shut = closeRound(sent());
    expect(extendForLateInvite(shut, SENT, 3)).toBe(shut);
  });

  it('holds the raw answers for a week AFTER the round closes, not after it was sent', () => {
    // The two are the same instant for an untouched round; measured from sending, retention would
    // expire exactly when collection ends and leave no window to build the synthesis.
    expect(RAW_RETENTION_DAYS).toBe(7);
    const r = sent();
    const closed = SENT + ROUND_OPEN_DAYS * DAY;

    expect(rawExpiresAt(r, SENT + 2 * DAY)).toBeUndefined(); // still collecting
    expect(rawExpiresAt(r, closed + 1)).toBe(closed + RAW_RETENTION_DAYS * DAY);
  });

  it('counts the retention from the EXTENDED close when somebody was invited late', () => {
    const late = extendForLateInvite(sent(), SENT + 5 * DAY, 2);
    const closed = SENT + 10 * DAY;
    expect(rawExpiresAt(late, closed + 1)).toBe(closed + RAW_RETENTION_DAYS * DAY);
  });

  it('expires the raw answers whatever the round produced', () => {
    const r = sent();
    const closed = SENT + ROUND_OPEN_DAYS * DAY;

    expect(rawRetentionExpired(r, closed + 1)).toBe(false);
    expect(rawRetentionExpired(r, closed + (RAW_RETENTION_DAYS + 1) * DAY)).toBe(true);
  });
});

describe('closing', () => {
  it('closes a round without pretending it produced something', () => {
    expect(closeRound(openConfidential()).status).toBe('closed');
  });
});
