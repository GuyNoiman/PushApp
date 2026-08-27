/**
 * FirstRunTail — the two pages that used to sit BEFORE Home and now sit after the first Journey
 * exists (Onboarding v2, 2026-08-27, §13 and §14).
 *
 * ── WHY THEY MOVED, AND IT IS THE SAME REASON TWICE ────────────────────────────────────────────
 *
 * Both are questions that only make sense once somebody has something to say yes about. Consenting
 * to a coach remembering things, before you have met the coach, is consenting to a stranger. Turning
 * on reminders, before there is anything to be reminded of, is agreeing to be interrupted about
 * nothing. Asked after a first Journey exists, both are answerable.
 *
 * They live here rather than inside `onboarding.tsx` because the first run no longer ends on that
 * screen: the conversation does. Same components, same copy, same rules — a different moment.
 *
 * Presentational only. Both answers are real on both pages: "Not now" is a full-size button, nothing
 * about the product gets worse if it is chosen, and neither is asked again.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OnboardingPrimaryButton, OnboardingScaffold, OnboardingSecondaryButton } from '@/components/onboarding/OnboardingScaffold';
import { ThemedText } from '@/components/themed-text';

/**
 * The Coach-memory consent page (Coach_Context_Summaries_PRD §4).
 *
 * ── WHAT MAKES THIS A CONSENT AND NOT A NOTICE ─────────────────────────────────────────────────
 *
 * Both answers are real. "Not now" is a full-size button next to the other one, nothing about the
 * product gets worse if it is chosen, and it is never asked again — the PRD forbids repeated
 * prompting, and a screen that comes back until it hears yes is not asking anything.
 *
 * The bullets say what is kept, what is NOT kept, where it lives, and what happens if they say no.
 * Including the uncomfortable one: today this stays on this phone, so a new phone starts the coach
 * fresh. That is true until the encrypted sync in PRD §9 exists, and a consent screen that glossed
 * over it would be collecting agreement to something else.
 */
export function CoachMemoryConsentPage({ onAnswer }: { onAnswer: (granted: boolean) => void }) {
  const { t } = useTranslation('onboarding');
  const points = t('coachMemory.points', { returnObjects: true }) as string[];
  return (
    <OnboardingScaffold
      footer={
        <>
          <OnboardingPrimaryButton label={t('coachMemory.primary')} onPress={() => onAnswer(true)} />
          <OnboardingSecondaryButton label={t('coachMemory.secondary')} onPress={() => onAnswer(false)} />
        </>
      }>
      <ThemedText type="title">{t('coachMemory.title')}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('coachMemory.body')}
      </ThemedText>
      {points.map((point) => (
        <ThemedText key={point} type="small" themeColor="textSecondary">
          {`· ${point}`}
        </ThemedText>
      ))}
    </OnboardingScaffold>
  );
}

/**
 * The reminders ask. Now that it follows a real first Step, the question is about THAT — "want me to
 * help you not forget to come back to this" — rather than about notifications in the abstract.
 *
 * The OS permission dialog is only reached by saying yes here (v2 §13). Declining, and a denial from
 * the OS afterwards, are both non-blocking: whatever happens, the app opens.
 */
export function RemindersAskPage({ onTurnOn, onNotNow }: { onTurnOn: () => void; onNotNow: () => void }) {
  const { t } = useTranslation('onboarding');
  // Guard the async permission request from a double-tap; the choice still resolves the same way.
  const [busy, setBusy] = useState(false);
  return (
    <OnboardingScaffold
      footer={
        <>
          <OnboardingPrimaryButton
            label={t('notifications.primary')}
            disabled={busy}
            onPress={() => {
              setBusy(true);
              onTurnOn();
            }}
          />
          <OnboardingSecondaryButton label={t('notifications.secondary')} onPress={onNotNow} />
        </>
      }>
      <ThemedText type="title">{t('notifications.title')}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('notifications.body')}
      </ThemedText>
    </OnboardingScaffold>
  );
}
