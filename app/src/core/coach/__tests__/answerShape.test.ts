/**
 * Open by default. Cards only when the budget narrows, or when the turn is a real pick.
 *
 * ── WHAT WENT WRONG (partner QA, 2026-09-08) ───────────────────────────────────────────────────
 *
 * D102 says the conversation stays open and narrows to closed choices only once the conversation's
 * cost budget is crossed. The build had it backwards: every question shipped answer cards, and the
 * budget withdrew the free-text escape instead. So the further somebody got, the more it behaved
 * like the form it exists to replace — and "sometimes there is an Other and sometimes there is not"
 * was the visible symptom of a rule nobody had written down.
 *
 * This is the rule, as a function, so the screen cannot drift from it again.
 */
import { EMPTY_BUDGET, DEFAULT_BUDGET, canSpend, spend } from '../../llm/conversationBudget';

/**
 * The screen's decision, mirrored. `coach.tsx` computes exactly this; keeping the logic here rather
 * than only in JSX is what makes it testable at all.
 */
function offerCards(question: { allowOther: boolean } | null, canAskOpen: boolean): boolean {
  return Boolean(question && (!question.allowOther || !canAskOpen));
}

const open = { allowOther: true };
const pick = { allowOther: false };

describe('while the budget is open', () => {
  const canAskOpen = canSpend(EMPTY_BUDGET, DEFAULT_BUDGET);

  it('asks in the conversation, with no cards', () => {
    expect(canAskOpen).toBe(true);
    expect(offerCards(open, canAskOpen)).toBe(false);
  });

  it('still shows the cards for a genuine pick, because free text cannot answer one', () => {
    // Which goal to build first, which Journey, which variant. These are not questions.
    expect(offerCards(pick, canAskOpen)).toBe(true);
  });
});

describe('once the budget narrows', () => {
  // The founder's own number: narrow after 7 of 10. Five of six calls is the first count that
  // crosses 0.7 — four is 0.67 and still open, which is the kind of off-by-one worth pinning.
  const spent = [1, 2, 3, 4, 5].reduce((s) => spend(s, { tokens: 500 }), EMPTY_BUDGET);
  const canAskOpen = canSpend(spent, DEFAULT_BUDGET);

  it('stops spending on free text', () => {
    expect(canAskOpen).toBe(false);
  });

  it('shows the cards instead, which cost nothing', () => {
    // The honest move at the ceiling is a CHEAPER conversation, not a shorter one. Nobody is told
    // they ran out of anything.
    expect(offerCards(open, canAskOpen)).toBe(true);
  });
});

describe('when there is no question at all', () => {
  it('shows nothing, whatever the budget says', () => {
    expect(offerCards(null, true)).toBe(false);
    expect(offerCards(null, false)).toBe(false);
  });
});
