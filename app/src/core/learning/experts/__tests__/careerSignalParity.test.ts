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

const MAPPING = join(
  __dirname,
  '../../../../../../07_Assets/Partner_Packages/Career_v1.2_2026-08-23/02_Career_Interview_Diagnosis_Mapping_v1.2.json',
);

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
