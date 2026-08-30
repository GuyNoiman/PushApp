/**
 * The coach speaks in the voice the user chose — Communication_Style_Profile_PRD §9, AC#4.
 *
 * Until 2026-08-24 the orchestrator fixed itself to `steady`, which meant answering six comparisons
 * changed a confirmation screen and nothing else. These assert the wiring both ways: a chosen style
 * reaches the system prompt, and the absence of one still lands on the old default.
 */
import { profileToCoachStyle } from '../../communication/communicationProfile';
import { CoachOrchestrator } from '../CoachOrchestrator';
import { coachSystemPrompt } from '../coachPrompts';
import { DEFAULT_STYLE_ID, getStyle, STYLE_IDS } from '../communicationStyles';
import type { LlmClient } from '../../llm/LlmClient';

const llm: LlmClient = { complete: async () => ({ text: '{}' }) };

/** The private field is the only place the fragment lands; reading it is the honest assertion. */
const fragmentOf = (orchestrator: CoachOrchestrator) =>
  (orchestrator as unknown as { styleFragment: string }).styleFragment;

describe('the coach voice', () => {
  it('keeps the founder-approved conversational behavior in the main coach prompt', () => {
    // The permanent character moved to `coachCharacter.ts` (founder, 2026-08-31) so that editing a
    // FLOW cannot quietly edit who the coach is. The composed prompt is what the model sees, so it
    // is what this asserts — the split is an implementation detail, the behaviour is not.
    const COACH_SYSTEM_PROMPT = coachSystemPrompt({ firstName: 'Yoav' });
    expect(COACH_SYSTEM_PROMPT).toContain('PERSONAL, NOT OVER-FAMILIAR');
    expect(COACH_SYSTEM_PROMPT).toContain('preferred first name');
    expect(COACH_SYSTEM_PROMPT).toContain('LISTEN BEFORE DIRECTING');
    expect(COACH_SYSTEM_PROMPT).toContain('REFLECT BEFORE PROPOSING');
    expect(COACH_SYSTEM_PROMPT).toContain('STAY IN THEIR WORDS');
    expect(COACH_SYSTEM_PROMPT).toContain('EMPATHY THROUGH ACCURACY');
    expect(COACH_SYSTEM_PROMPT).toContain('ONE question');
    expect(COACH_SYSTEM_PROMPT).toContain('ONE USEFUL LAYER DEEPER');
    expect(COACH_SYSTEM_PROMPT).toContain('Deepening is not interrogation');
  });

  it('uses the style it was given', () => {
    for (const id of STYLE_IDS) {
      const orchestrator = new CoachOrchestrator({ llm, styleId: id });
      expect(fragmentOf(orchestrator)).toBe(getStyle(id).systemPromptFragment ?? '');
    }
  });

  it('falls back to steady when nobody has chosen', () => {
    expect(fragmentOf(new CoachOrchestrator({ llm }))).toBe(
      getStyle(DEFAULT_STYLE_ID).systemPromptFragment ?? '',
    );
  });

  it('gives each of the four profiles a distinguishable voice', () => {
    // The mapping is only worth wiring if the four choices do not all collapse to one fragment.
    const fragments = new Set(
      (['direct', 'warm', 'energizing', 'explanatory'] as const).map((profile) =>
        fragmentOf(new CoachOrchestrator({ llm, styleId: profileToCoachStyle(profile) })),
      ),
    );
    expect(fragments.size).toBeGreaterThan(1);
  });
});
