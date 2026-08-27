/**
 * The Journey-edit prompt — the two things it must carry, and why they are worth a test.
 *
 * ── THE DEVICE REPORT (2026-08-27) ─────────────────────────────────────────────────────────────
 *
 * A Journey called "drink a protein shake". The person asked, in Hebrew, for it "every day". What
 * came back was ADD A STEP called "drink a shake", with cadence daily — which parses perfectly,
 * applies cleanly, and is the opposite of what was asked. Two things were missing, and both are
 * invisible until somebody reads the prompt:
 *
 *  1. The directive listed each Step's id and title and NOT its current cadence, so "make it daily"
 *     had nothing to be a change FROM.
 *  2. Nothing told the model that a frequency request is about something already in the Journey. The
 *     wrong reading is the fluent one, so the rule has to be stated.
 *
 * A third: the edit step got no language guidance at all, while the create step did — so a Hebrew
 * request met a prompt written entirely in English.
 */
import { buildEditDirective, EDIT_SYSTEM_PROMPT } from '../coachPrompts';

const context = {
  title: 'Drink a protein shake',
  rhythm: 'weekly',
  durationDays: 30,
  steps: [
    { id: 'step_a', title: 'Drink a shake', cadence: 'once' },
    { id: 'step_b', title: 'Buy the powder', cadence: 'once' },
  ],
};

describe('the edit directive', () => {
  it('gives every Step its CURRENT cadence, not just its title', () => {
    const directive = buildEditDirective(context, 'make it daily');
    expect(directive).toContain('id "step_a": Drink a shake (currently: once)');
    expect(directive).toContain('id "step_b": Buy the powder (currently: once)');
  });

  it('carries the Journey-level rhythm too, so "the whole thing" has an anchor', () => {
    expect(buildEditDirective(context, 'x')).toContain('rhythm: weekly');
  });

  it('speaks to the user’s language when it is not English', () => {
    expect(buildEditDirective(context, 'מידי יום', 'he')).toContain('Hebrew');
    // English needs no directive — it is the default understanding language.
    expect(buildEditDirective(context, 'daily', 'en')).not.toContain('Hebrew');
  });

  it('still quotes the request verbatim', () => {
    expect(buildEditDirective(context, 'לשתות שייק מידי יום')).toContain('לשתות שייק מידי יום');
  });
});

describe('the edit system prompt', () => {
  it('says that a frequency request is NOT a new Step', () => {
    expect(EDIT_SYSTEM_PROMPT).toContain('HOW OFTEN');
    expect(EDIT_SYSTEM_PROMPT).toContain('NEVER "addSteps"');
  });

  it('says when adding a Step IS right, so the rule does not read as "never add"', () => {
    expect(EDIT_SYSTEM_PROMPT).toContain('genuinely NOT already in the list');
  });

  it('still offers every key the parser accepts', () => {
    for (const key of ['title', 'why', 'rhythm', 'durationDays', 'addSteps', 'editSteps', 'removeStepIds']) {
      expect(EDIT_SYSTEM_PROMPT).toContain(`"${key}"`);
    }
  });
});
