/**
 * The signal vocabulary is the PARTNER'S, and this test is what keeps it his.
 *
 * `CAREER_SIGNAL_HINTS` tells the understanding step which signals it may read out of somebody's
 * opening message and which values each one may take. Those names and values come from
 * `07_Assets/Partner_Packages/Career_v1.2_2026-08-23/02_Career_Interview_Diagnosis_Mapping_v1.2.json`,
 * and the failure they guard against is quiet: rename one value and the classifier keeps returning
 * the old one, every value gets dropped as unknown, and the coach simply goes back to asking
 * questions it did not need to ask. Nothing breaks, nothing errors, and the feature stops working.
 *
 * The `means` lines are his, condensed — so what is checked here is the CONTRACT (names and closed
 * values), not the prose.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { CAREER_SIGNALS, CAREER_SIGNAL_HINTS } from '../careerDiagnosis';

const CARD_COPY = join(
  __dirname,
  '../../../../../../07_Assets/Partner_Packages/Career_v1.3_2026-08-25/03_Career_Diagnosis_Card_Copy_v1.0.json',
);

const MAPPING = join(
  __dirname,
  '../../../../../../07_Assets/Partner_Packages/Career_v1.3_2026-08-25/02_Career_Interview_Diagnosis_Mapping_v1.3.json',
);

interface CardCopy {
  copy: Record<string, Record<string, { en: string; he: string }>>;
}

interface MappingQuestion {
  id: string;
  signal: string;
  answerKinds: Record<string, { means: string; value: string }>;
}

const mapping = JSON.parse(readFileSync(MAPPING, 'utf8')) as {
  coreDiagnosisQuestions: MappingQuestion[];
  conditionalRoutingQuestions: MappingQuestion[];
};
const authored = [...mapping.coreDiagnosisQuestions, ...mapping.conditionalRoutingQuestions];
const cards = (JSON.parse(readFileSync(CARD_COPY, 'utf8')) as CardCopy).copy;

describe('career signal parity with the partner package', () => {
  it('names only signals he authored', () => {
    const his = new Set(authored.map((q) => q.signal));
    for (const signal of CAREER_SIGNALS) expect(his.has(signal)).toBe(true);
  });

  it('allows only the values his mapping declares for each signal we classify', () => {
    for (const hint of CAREER_SIGNAL_HINTS) {
      const question = authored.find((q) => q.signal === hint.signal);
      expect(question).toBeDefined();
      const declared = Object.values(question!.answerKinds).map((kind) => kind.value);
      for (const value of hint.values) expect(declared).toContain(value);
    }
  });

  it('never asks the classifier for "unknown" — not knowing is an absent signal, not a value', () => {
    // His mapping offers `unknown` on several signals. We deliberately do not classify into it: a
    // signal that is present-but-unknown and a signal that is absent lead to the same place (the
    // question stays askable), and having two ways to say it invites treating one of them as an
    // answer.
    for (const hint of CAREER_SIGNAL_HINTS) expect(hint.values).not.toContain('unknown');
  });

  it('classifies every signal the one live diagnosis tree can act on', () => {
    // If a tree ever asks about a signal the classifier cannot read, the "listen first" rule quietly
    // stops applying to that question and the person is asked something they already answered.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { APPLY_NO_RESPONSE } = require('../careerDiagnosis');
    const classified = new Set(CAREER_SIGNAL_HINTS.map((h) => h.signal));
    for (const question of APPLY_NO_RESPONSE.questions) {
      expect(classified.has(question.signal)).toBe(true);
    }
  });
});

describe('the words on the cards are HIS', () => {
  /**
   * Our option value → the (signal, contract value) whose approved wording it carries. The three
   * options not listed are ours rather than his: they split `searchHistorySufficient: yes` further
   * than his mapping does, because "the search falls apart" and "I reach interviews and it stops
   * there" route to two different families. He has been told they are ours.
   */
  const CARD_FOR: Record<string, [signal: string, value: string]> = {
    broad: ['targetClarity', 'broad'],
    clear: ['targetClarity', 'clear'],
    cannotYet: ['existingRelevantExperience', 'no'],
    cannotShow: ['visibleProofMissing', 'yes'],
    haveExamples: ['visibleProofMissing', 'no'],
    applicationsOnly: ['peopleAccess', 'no'],
    peopleToo: ['peopleAccess', 'yes'],
    barelyStarted: ['searchHistorySufficient', 'no'],
  };

  it('matches the approved card copy word for word', () => {
    // The wording IS the routing: a card somebody misreads is a person routed to the wrong Journey,
    // which is a content decision and therefore his. We asked him to write these; this is what stops
    // us drifting away from what he wrote.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { APPLY_NO_RESPONSE } = require('../careerDiagnosis');
    for (const question of APPLY_NO_RESPONSE.questions) {
      for (const option of question.options) {
        const card = CARD_FOR[option.value];
        if (!card) continue;
        expect(option.label).toBe(cards[card[0]][card[1]].en);
      }
    }
  });

  it('has an approved Hebrew card for every English one we use', () => {
    for (const [signal, value] of Object.values(CARD_FOR)) {
      expect(cards[signal][value].he.length).toBeGreaterThan(0);
    }
  });
});
