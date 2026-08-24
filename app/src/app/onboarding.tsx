/**
 * Onboarding — the first-run flow (K2, Onboarding_Questionnaire_PRD). ONE route that walks the user
 * through: language → Personal Information → questionnaire intro → the six questions → completion.
 * The root layout's first-run gate ({@link '@/app/_layout'}) routes here until onboarding is complete,
 * then never again; completion lands the user on HOME (founder decision, Device QA 2026-08-17 B1),
 * with the first Coach conversation one tap away on Home's hero card.
 *
 * The container owns the flow: local `step` + `answers` state (seeded from AppCore so an interrupted
 * flow RESUMES where it left off — PRD §8), the pure answer logic (`core/onboarding`), and persistence
 * after every page transition. All answer math + question config is framework-free; the sub-bodies are
 * presentational (Engineering Bible §19). Answers stay ON DEVICE as the Coach's opening context (PRD
 * §9/§10) — nothing is sent to the cloud here; generation→Dreams remains the coach's gated job (D40).
 */
import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { RestartPrompt } from '@/components/settings/RestartPrompt';
import { confirmAndRestartApp } from '@/i18n/restart';
import { isRTL, isRTLLocale } from '@/i18n/rtl';
import {
  OnboardingPrimaryButton,
  OnboardingScaffold,
  OnboardingSecondaryButton,
} from '@/components/onboarding/OnboardingScaffold';
import { OnboardingQuestionPage } from '@/components/onboarding/OnboardingQuestionPage';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { activeHoursShape, resolveActiveHours } from '@/core/util/availability';
import {
  markSkipped,
  selectedIds,
  setFreeText,
  toggleSelection,
} from '@/core/onboarding/answers';
import type { OnboardingAnswers, OnboardingQuestionId, OnboardingStep } from '@/core/onboarding/model';
import {
  ONBOARDING_QUESTION_COUNT,
  ONBOARDING_QUESTION_IDS,
  isQuestionStep,
  nextStep,
  prevStep,
  questionById,
  questionNumber,
  type OnboardingQuestion,
} from '@/core/onboarding/questions';
import { firstName, getSimulatedUser } from '@/core/profile/simulatedUser';
import { countryName } from '@/core/profile/countries';
import { generateUsername } from '@/core/social/username';
import { useTheme } from '@/hooks/use-theme';
import { findLanguage, LANGUAGES, type LanguageCode } from '@/i18n/languages';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/state/AppProvider';
import { useLanguagePreference } from '@/state/LanguagePreference';
import { useProfile } from '@/state/ProfileProvider';
import { useSocial } from '@/state/SocialProvider';

export default function OnboardingScreen() {
  const { core } = useApp();
  const { t, i18n } = useTranslation('onboarding');

  // Seed from the core so an interrupted flow resumes at the same page + language (PRD §8).
  const [step, setStep] = useState<OnboardingStep>(() => core.getOnboardingStep());
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => core.getOnboardingAnswers());

  /** Move to a page and persist the resume point + answers (never completes here). */
  const go = useCallback(
    (to: OnboardingStep, nextAnswers: OnboardingAnswers = answers) => {
      setStep(to);
      setAnswers(nextAnswers);
      core.saveOnboardingProgress(to, nextAnswers);
    },
    [answers, core],
  );

  // ── Question answer handlers (local; persisted on the next page transition) ──
  const toggleOption = useCallback((question: OnboardingQuestion, optionId: string) => {
    setAnswers((a) => {
      let next = toggleSelection(a, question, optionId);
      // Deselecting the "Other" option clears its now-hidden free text, so the summary stays honest.
      const opt = question.options.find((o) => o.id === optionId);
      if (opt?.isOther && !selectedIds(next, question.id).includes(optionId)) {
        next = setFreeText(next, question.id, '');
      }
      return next;
    });
  }, []);

  const changeText = useCallback((id: OnboardingQuestionId, text: string) => {
    setAnswers((a) => setFreeText(a, id, text));
  }, []);

  // ── Flow transitions ────────────────────────────────────────────────────────
  const continueQuestion = useCallback(
    (question: OnboardingQuestion) => go(nextStep(question.id)),
    [go],
  );

  const skipQuestion = useCallback(
    (question: OnboardingQuestion) =>
      // Q6's optional free text is a disclosure that must survive a skip of the capacity choice.
      go(nextStep(question.id), markSkipped(answers, question.id, { keepFreeText: question.freeText === 'optional' })),
    [answers, go],
  );

  const skipAll = useCallback(() => {
    let next = answers;
    for (const id of ONBOARDING_QUESTION_IDS) next = markSkipped(next, id);
    go('completion', next);
  }, [answers, go]);

  const finish = useCallback(() => {
    core.completeOnboarding(answers);
    // LAND ON HOME, not the Coach (founder decision, Device QA 2026-08-17 B1). Onboarding used to
    // hand straight over to the first Coach conversation (PRD §7/§9); on a real device that meant
    // the app opened on a conversation before the user had seen their own app. Home is the anchor,
    // and the Coach is one tap away on Home's hero card — the hand-off still happens, the user just
    // chooses when. Deferred until the gate flips (onboarding done → main stack available), so the
    // route is reachable rather than being redirected back into the (now-removed) onboarding group.
    requestAnimationFrame(() => router.replace('/'));
  }, [answers, core]);

  // K1 — the final soft pre-prompt: ask for notification permission in context, then finish. The
  // request is best-effort; whatever the user (or OS) decides, completion still proceeds.
  const enableReminders = useCallback(async () => {
    try {
      await core.initReminders();
    } finally {
      finish();
    }
  }, [core, finish]);

  // ── Render the current page ──────────────────────────────────────────────────
  if (step === 'language') {
    return <LanguageStep onContinue={() => go('personalInfo')} />;
  }

  if (step === 'personalInfo') {
    return (
      <PersonalInfoStep onBack={() => go('language')} onContinue={() => go('intro')} />
    );
  }

  if (step === 'intro') {
    return <IntroStep onBack={() => go('personalInfo')} onStart={() => go('q1')} onSkipAll={skipAll} />;
  }

  if (isQuestionStep(step)) {
    const question = questionById(step)!;
    const isText = question.select === 'text';
    const isSingle = question.select === 'single';
    const selected = selectedIds(answers, question.id);
    // Q6's free text is an OPTIONAL add-on (kept separate from the "Other" reveal), so read the same key.
    const freeText = answers.freeText[question.id] ?? '';
    // A question is "answered" (Continue enabled) when it has a selection, is a text question with
    // text, OR carries optional free text (Q6 — so a lone constraint disclosure reaches the Coach).
    const hasOptionalText = question.freeText === 'optional' && freeText.trim().length > 0;
    const answered = isText ? freeText.trim().length > 0 : selected.length > 0 || hasOptionalText;
    const skipLabel = isText ? t('questions.q2.secondary') : t('skip');

    return (
      <OnboardingScaffold
        onBack={() => go(prevStep(question.id))}
        progress={{
          current: questionNumber(step),
          total: ONBOARDING_QUESTION_COUNT,
          section: t(`sections.${question.section}`),
        }}
        footer={
          <>
            <OnboardingPrimaryButton
              label={t('continue', { ns: 'common' })}
              disabled={!answered}
              onPress={() => continueQuestion(question)}
            />
            <OnboardingSecondaryButton label={skipLabel} onPress={() => skipQuestion(question)} />
          </>
        }>
        <OnboardingQuestionPage
          question={question}
          selected={selected}
          atLimit={!isSingle && !isText && selected.length >= question.maxSelect}
          freeText={freeText}
          onToggle={(optionId) => toggleOption(question, optionId)}
          onChangeText={(text) => changeText(question.id, text)}
        />
      </OnboardingScaffold>
    );
  }

  if (step === 'completion') {
    // Advance to the notifications pre-prompt (persist the resume point) rather than finishing here,
    // so the gate stays closed and the final step is reachable/resumable after an interruption.
    const skippedAll = ONBOARDING_QUESTION_IDS.every((id) => answers.skipped.includes(id));
    return <CompletionStep skippedAll={skippedAll} onStart={() => go('coachMemory')} />;
  }

  if (step === 'coachMemory') {
    return (
      <CoachMemoryStep
        onAnswer={(granted) => {
          core.setCoachMemoryConsent(granted ? 'granted' : 'declined', i18n.language);
          go('notifications');
        }}
      />
    );
  }

  // notifications — the final soft pre-prompt; both actions finish onboarding and open Home.
  return <NotificationsStep onTurnOn={enableReminders} onNotNow={finish} />;
}

// ── Step bodies (presentational; flow-specific, co-located like coach.tsx) ──────

/**
 * §3 — language first: device-preselected but confirmed; a direction flip relaunches the app.
 *
 * IT RESTARTS RIGHT HERE, and that is the fix for what the partner hit (2026-08-20): he chose Hebrew
 * and then answered the whole questionnaire in a left-aligned layout, because the flip only takes
 * effect on a fresh launch and nothing was relaunching. Onboarding is the cheapest possible moment
 * to relaunch — the language is already persisted and there is nothing else to lose — and it is the
 * worst possible moment to leave someone reading a mirror-image of their own language.
 */
function LanguageStep({ onContinue }: { onContinue: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');
  const { language, setLanguage, pendingRestart } = useLanguagePreference();

  const select = (code: LanguageCode) => {
    // Read the flip BEFORE applying it: `setLanguage` forces the new direction for the next launch,
    // so afterwards there is nothing left to compare against.
    const flipsDirection = isRTLLocale(code) !== isRTL();
    setLanguage(code);
    if (flipsDirection) confirmAndRestartApp();
  };

  return (
    <OnboardingScaffold footer={<OnboardingPrimaryButton label={t('language.continue')} onPress={onContinue} />}>
      <ThemedText type="title">{t('language.title')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('language.subtitle')}
      </ThemedText>
      <RestartPrompt visible={pendingRestart} />
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
        {LANGUAGES.map((lang, i) => {
          const selected = lang.code === language;
          return (
            <Pressable
              key={lang.code}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={lang.englishName}
              onPress={() => select(lang.code as LanguageCode)}
              style={({ pressed }) => [styles.langRow, pressed && styles.pressed]}>
              <View style={styles.langMain}>
                <ThemedText type="default">{lang.endonym}</ThemedText>
                {lang.endonym !== lang.englishName ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {lang.englishName}
                  </ThemedText>
                ) : null}
              </View>
              {selected ? <Ionicons name="checkmark" size={20} color={theme.teal} /> : null}
              {i < LANGUAGES.length - 1 ? (
                <View style={[styles.langDivider, { backgroundColor: theme.hairline }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </OnboardingScaffold>
  );
}

/** §4 — Personal Information: a compact, prefilled summary reusing the Own Profile editors. */
function PersonalInfoStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const { t, i18n } = useTranslation('onboarding');
  const { profile, setAddressForm, setWeekStartDay } = useProfile();
  const { language } = useLanguagePreference();
  const { core } = useApp();
  const social = useSocial();

  const sim = getSimulatedUser();
  const shownName = profile.displayName ?? (sim.signedIn && sim.name ? sim.name : firstName(sim.name));
  // Generate a fallback handle ONCE (stable across re-renders); a real/pending handle always wins.
  const [generated] = useState(generateUsername);
  const username = social.profile?.handle ?? generated;

  const weekdayNames = t('weekdays', { ns: 'common', returnObjects: true }) as string[];
  const addressForms = ['neutral', 'feminine', 'masculine'] as const;
  const cycleAddressForm = () =>
    setAddressForm(addressForms[(addressForms.indexOf(profile.addressForm) + 1) % addressForms.length]);
  const cycleWeekStart = () => setWeekStartDay((((profile.weekStartDay + 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6));

  // Active-hours summary (reuses the same coarse shape the Settings screen shows).
  const prefs = core.getSchedulingPrefs();
  const shape = activeHoursShape(prefs);
  const activeHoursValue =
    shape === 'off'
      ? t('activeHours.summaryOff', { ns: 'settings' })
      : shape === 'perDay'
        ? t('activeHours.summaryPerDay', { ns: 'settings' })
        : shape === 'allDay'
          ? t('activeHours.summaryAllDay', { ns: 'settings' })
          : (() => {
              const w = resolveActiveHours(prefs).days[0].window;
              const pad = (n: number) => String(n).padStart(2, '0');
              return t('activeHours.range', {
                ns: 'settings',
                start: `${pad(w.start.hour)}:${pad(w.start.minute)}`,
                end: `${pad(w.end.hour)}:${pad(w.end.minute)}`,
              });
            })();

  return (
    <OnboardingScaffold
      onBack={onBack}
      footer={
        <>
          <OnboardingPrimaryButton label={t('personalInfo.confirm')} onPress={onContinue} />
          <OnboardingSecondaryButton
            label={t('personalInfo.edit')}
            onPress={() => router.push('/settings/profile')}
          />
        </>
      }>
      <ThemedText type="title">{t('personalInfo.title')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('personalInfo.body')}
      </ThemedText>

      <View style={styles.section}>
        <SettingsRow
          icon="person-outline"
          label={t('personalInfo.fields.name')}
          value={shownName || undefined}
          onPress={() => router.push('/settings/profile')}
        />
        <SettingsRow
          icon="at-outline"
          label={t('personalInfo.fields.username')}
          value={`@${username}`}
          onPress={() => router.push('/settings/profile')}
        />
        <SettingsRow
          icon="calendar-outline"
          label={t('personalInfo.fields.birthDate')}
          value={profile.birthDate ?? t('personalInfo.fields.birthDateOptional')}
          onPress={() => router.push('/settings/profile')}
        />
        <SettingsRow
          icon="flag-outline"
          label={t('personalInfo.fields.country')}
          value={countryName(profile.country, i18n.language)}
          onPress={() => router.push('/settings/country')}
        />
        <SettingsRow
          icon="chatbubble-ellipses-outline"
          label={t('personalInfo.fields.addressForm')}
          value={t(`app.addressFormValue.${profile.addressForm}`, { ns: 'settings' })}
          onPress={cycleAddressForm}
        />
        <SettingsRow
          icon="language-outline"
          label={t('personalInfo.fields.language')}
          value={findLanguage(language)?.endonym}
          onPress={() => router.push('/settings/language')}
        />
        <SettingsRow
          icon="time-outline"
          label={t('personalInfo.fields.activeHours')}
          value={activeHoursValue}
          onPress={() => router.push('/settings/active-hours')}
        />
        <SettingsRow
          icon="today-outline"
          label={t('personalInfo.fields.weekStart')}
          value={weekdayNames[profile.weekStartDay]}
          onPress={cycleWeekStart}
        />
      </View>
    </OnboardingScaffold>
  );
}

/** §5 — questionnaire intro: Start / Maybe later (Maybe later skips the whole questionnaire). */
function IntroStep({
  onBack,
  onStart,
  onSkipAll,
}: {
  onBack: () => void;
  onStart: () => void;
  onSkipAll: () => void;
}) {
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingScaffold
      onBack={onBack}
      footer={
        <>
          <OnboardingPrimaryButton label={t('intro.start')} onPress={onStart} />
          <OnboardingSecondaryButton label={t('intro.later')} onPress={onSkipAll} />
        </>
      }>
      <ThemedText type="title">{t('intro.title')}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('intro.p1')}
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('intro.p2')}
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('intro.p3')}
      </ThemedText>
      <ThemedText type="small" themeColor="textMuted">
        {t('intro.time')}
      </ThemedText>
    </OnboardingScaffold>
  );
}

/** §7 — completion: ends the questionnaire and (after the reminders pre-prompt) opens Home, with an
 *  optional Communication Style seam.
 *  Communication Style (D40) is offered here as a NON-BLOCKING secondary action — the onboarding shell
 *  owns final placement; it can also be set later in Settings. */
function CompletionStep({ skippedAll, onStart }: { skippedAll: boolean; onStart: () => void }) {
  const { t } = useTranslation('onboarding');
  const { t: tc } = useTranslation('communication');
  return (
    <OnboardingScaffold
      footer={
        <>
          <OnboardingPrimaryButton label={t('completion.start')} onPress={onStart} />
          <OnboardingSecondaryButton
            label={tc('onboardingEntry.cta')}
            onPress={() => router.push('/settings/communication-style-quiz' as Href)}
          />
        </>
      }>
      <ThemedText type="title">
        {skippedAll ? t('completion.titleSkipped') : t('completion.title')}
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {skippedAll ? t('completion.bodySkipped') : t('completion.body')}
      </ThemedText>
    </OnboardingScaffold>
  );
}

/** K1 — final soft pre-prompt: a value-framed reminders ask AFTER completion, right before Home
 *  opens. "Turn on reminders" requests OS permission in context; "Not now" declines. Either action
 *  finishes onboarding — permission denial or declining must NEVER block completion. */
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
function CoachMemoryStep({ onAnswer }: { onAnswer: (granted: boolean) => void }) {
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

function NotificationsStep({ onTurnOn, onNotNow }: { onTurnOn: () => void; onNotNow: () => void }) {
  const { t } = useTranslation('onboarding');
  // Guard the async permission request from a double-tap; the choice still resolves to finish().
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

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, borderWidth: 1, overflow: 'hidden' },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  langMain: { flex: 1, gap: 1 },
  // `start`/`end`, not `left`/`right`: a physical inset does not mirror, so under RTL the divider
  // would be indented on the wrong side of the list.
  langDivider: { position: 'absolute', start: Spacing.three, end: 0, bottom: 0, height: 1 },
  section: { borderRadius: Radius.card, overflow: 'hidden', gap: 0 },
  pressed: { opacity: 0.6 },
});
