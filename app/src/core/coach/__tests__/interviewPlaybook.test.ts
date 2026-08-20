/**
 * interviewPlaybook tests (S2.2) — assert the editable config is WELL-FORMED so the S2.3
 * orchestrator can trust it: the opening line, the three closed choices A/B/C with the right
 * process shapes, and per-branch extraction orders that cover every required target.
 */
import {
  INTERVIEW_PLAYBOOK,
  type ExtractionField,
  type InterviewBranchId,
} from '../interviewPlaybook';

const BRANCH_IDS: InterviewBranchId[] = ['A', 'B', 'C'];

describe('INTERVIEW_PLAYBOOK', () => {
  it('opens with the coach greeting', () => {
    expect(INTERVIEW_PLAYBOOK.opening).toBe('Hi, how can I help you today?');
  });

  it('offers exactly the three closed choices A, B, C', () => {
    expect(INTERVIEW_PLAYBOOK.choices.map((c) => c.id)).toEqual(BRANCH_IDS);
    for (const choice of INTERVIEW_PLAYBOOK.choices) {
      expect(choice.label.length).toBeGreaterThan(0);
    }
  });

  it('maps choice A → fixed habit (no Milestones) and B → progressive (Milestones)', () => {
    const byId = Object.fromEntries(INTERVIEW_PLAYBOOK.choices.map((c) => [c.id, c]));
    expect(byId.A.processType).toBe('fixed');
    expect(byId.A.usesMilestones).toBe(false);
    expect(byId.B.processType).toBe('progressive');
    expect(byId.B.usesMilestones).toBe(true);
    expect(byId.C.processType).toBe('unknown');
  });

  it('has a branch for each choice that resolves the process type first', () => {
    for (const id of BRANCH_IDS) {
      const branch = INTERVIEW_PLAYBOOK.branches[id];
      expect(branch.id).toBe(id);
      expect(branch.extractionOrder[0]).toBe('processType');
    }
  });

  it('covers every required extraction target in each branch and closes on the Support Circle', () => {
    const required: ExtractionField[] = [
      'processType',
      'motivation',
      'failureRisks',
      'timing',
      'locationCalendar',
      'supportCircle',
    ];
    for (const id of BRANCH_IDS) {
      const order = INTERVIEW_PLAYBOOK.branches[id].extractionOrder;
      for (const field of required) {
        expect(order).toContain(field);
      }
      expect(order[order.length - 1]).toBe('supportCircle');
    }
  });

  it('extracts Milestones on the progressive branch', () => {
    expect(INTERVIEW_PLAYBOOK.branches.B.extractionOrder).toContain('milestones');
  });

  it('offers an example front-loading template and a Support-Circle recommendation', () => {
    expect(INTERVIEW_PLAYBOOK.exampleMessageTemplate).toContain('{goal}');
    expect(INTERVIEW_PLAYBOOK.exampleMessageTemplate).toContain('{motivation}');
    expect(INTERVIEW_PLAYBOOK.supportCircleRecommendation.length).toBeGreaterThan(0);
  });
});
