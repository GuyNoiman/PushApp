/**
 * CoachOrchestrator language tests (C-Lang-1) — the coach SPEAKS the user's selected language while
 * the ONE LLM understanding call keeps the machine-readable classification in English:
 *   • the understanding call's system prompt carries the locale directive (built from the user's
 *     locale) telling the model to read the message in that language and keep each goal `title` in it,
 *     but to classify `domain`/`kind` into the FIXED English enum tokens;
 *   • a Hebrew opening whose mocked understanding returns a Hebrew title + English enums keeps the
 *     title verbatim and the domain/kind English;
 *   • with the app language switched to Hebrew the deterministic meta questions render in Hebrew AND
 *     the exact-string closed-option matching (processType / scheduling) still holds — the rendered
 *     option and the matched constant come from the SAME translated source.
 * Driven by a DETERMINISTIC {@link MockLlmClient} (no network). expo-localization is mocked so the
 * shared i18n instance boots on English.
 */
import i18n, { changeLanguage } from '@/i18n';

import { MockLlmClient } from '../../llm/LlmClient';
import { CoachOrchestrator } from '../CoachOrchestrator';
import { buildLocaleDirective } from '../coachPrompts';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

/** A mock understanding response carrying a SINGLE goal verbatim (title stays in the user's language). */
function singleGoalMock(title: string, kind: 'recurring' | 'process', domain: string): MockLlmClient {
  return new MockLlmClient((req) =>
    req.json ? JSON.stringify({ goals: [{ title, kind, domain }] }) : 'UNUSED',
  );
}

afterEach(async () => {
  // Leave the shared instance back on English for the next test/suite.
  await changeLanguage('en');
});

describe('buildLocaleDirective', () => {
  it('instructs a non-English language to keep the title local but the enums English', () => {
    const directive = buildLocaleDirective('he');
    expect(directive).toContain('Hebrew');
    expect(directive).toContain('title');
    // The fixed English enum tokens must be named so the model never localizes them.
    expect(directive).toContain('body_image');
    expect(directive).toContain('recurring');
    expect(directive).toContain('process');
  });

  it('is empty for an absent, unknown, or English locale (English is the default)', () => {
    expect(buildLocaleDirective('en')).toBe('');
    expect(buildLocaleDirective(undefined)).toBe('');
    expect(buildLocaleDirective('zz')).toBe('');
  });
});

describe('CoachOrchestrator — Hebrew understanding', () => {
  it('threads the locale directive into the one understanding call', async () => {
    const llm = singleGoalMock('לרוץ 5 קילומטר', 'process', 'body_image');
    const orchestrator = new CoachOrchestrator({ llm, locale: 'he' });
    orchestrator.start();

    await orchestrator.triage('אני רוצה להתאמן לריצת 5 קילומטר');

    expect(llm.calls).toHaveLength(1);
    expect(llm.calls[0].system).toContain('Hebrew');
  });

  it('keeps the goal title in the user\'s language while the domain/kind enums stay English', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: singleGoalMock('לרוץ 5 קילומטר', 'process', 'body_image'),
      locale: 'he',
    });
    orchestrator.start();

    const turn = await orchestrator.triage('אני רוצה להתאמן לריצת 5 קילומטר');

    // The free-text title is preserved verbatim in Hebrew.
    expect(turn.state.spec.title).toBe('לרוץ 5 קילומטר');
    // The machine-readable classification stays in the fixed English enums.
    expect(turn.state.spec.domain).toBe('body_image');
    expect(turn.state.spec.processType).toBe('process');
  });
});

describe('CoachOrchestrator — Hebrew deterministic copy + safe closed-option matching', () => {
  it('renders the fallback process-type question in Hebrew and still matches option 0 → recurring', async () => {
    await changeLanguage('he');
    const orchestrator = new CoachOrchestrator({
      // No usable goal → the demoted process-type fallback question.
      llm: new MockLlmClient((req) => (req.json ? '{"goals":[]}' : 'x')),
      locale: 'he',
    });
    orchestrator.start();

    const fallback = await orchestrator.triage('לא בטוח');
    expect(fallback.question?.id).toBe('meta.processType');
    // The prompt + options are the ACTIVE-language (Hebrew) coachContent copy.
    expect(fallback.question?.prompt).toBe(i18n.t('processType.prompt', { ns: 'coachContent' }));
    expect(fallback.question?.options).toEqual(
      i18n.t('processType.options', { ns: 'coachContent', returnObjects: true }),
    );

    // The rendered Hebrew option 0 is matched against the SAME translated source → recurring.
    const next = await orchestrator.selectOption(0);
    expect(next.state.spec.processType).toBe('recurring');
    expect(next.state.phase).toBe('questions');
  });

  it('renders the closing scheduling question in Hebrew and keeps its flexible/specific matching', async () => {
    await changeLanguage('he');
    const orchestrator = new CoachOrchestrator({
      llm: singleGoalMock('לשתות יותר חלבון', 'recurring', 'general'),
      locale: 'he',
    });
    orchestrator.start();
    let turn = await orchestrator.triage('לשתות יותר חלבון כל יום');
    while (turn.question && turn.question.id !== 'meta.scheduling') {
      turn = await orchestrator.selectOption(0);
    }

    expect(turn.question?.prompt).toBe(i18n.t('scheduling.prompt', { ns: 'coachContent' }));
    // Option 0 ("flexible") leaves the preference empty — the exact-string match holds in Hebrew.
    const done = await orchestrator.selectOption(0);
    expect(done.done).toBe(true);
    expect(done.goalSpec?.schedulingPreference).toBeUndefined();
  });
});
