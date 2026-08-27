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
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { activeHoursShape, resolveActiveHours } from '@/core/util/availability';
import type { OnboardingAnswers, OnboardingStep } from '@/core/onboarding/model';
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

  /**
   * Close the first-run gate and go somewhere reachable.
   *
   * ── WHY THE GATE CLOSES *BEFORE* THE CONVERSATION, NOT AFTER IT ──────────────────────────────
   *
   * The v2 flow puts the coach inside onboarding, and the coach lives outside the first-run gate —
   * until onboarding is marked complete, `/coach` is not a reachable route at all. Marking it
   * complete here is what opens the door. It also means somebody who walks away mid-conversation
   * lands on a working app rather than being trapped in a flow they did not want, which is the
   * thing the gate exists to prevent in the first place. `onboardingCompletedAt` records that the
   * FIRST-RUN GATE is done — not that a person has finished being understood.
   *
   * ── AND WHY LANDING ON THE COACH IS NOT A REVERSAL OF THE 2026-08-17 DECISION ────────────────
   *
   * That decision ("land on Home, not the Coach") answered a real device finding: the app opened on
   * a conversation before the user had seen their own app, and behind that conversation Home was
   * empty. Here the conversation IS the onboarding — it is what the welcome screen just promised —
   * and it ends by creating a Journey, so Home has something in it when they arrive. The objection
   * is answered rather than overruled.
   */
  const finish = useCallback(
    ({ toCoach }: { toCoach: boolean }) => {
      core.completeOnboarding(answers);
      // Deferred until the gate flips (onboarding done → main stack available), so the route is
      // reachable rather than being redirected back into the now-removed onboarding group.
      requestAnimationFrame(() =>
        router.replace(toCoach ? ('/coach?firstRun=1' as Href) : '/'),
      );
    },
    [answers, core],
  );

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
    return (
      <IntroStep
        onBack={() => go('personalInfo')}
        onStart={() => finish({ toCoach: true })}
        onLater={() => finish({ toCoach: false })}
      />
    );
  }

  // The flow is three pages now (Onboarding v2). Anything else a persisted resume point could name
  // is resolved to the welcome by `resolveResumeStep` before it reaches here, so this is unreachable
  // in practice — it exists so the component always returns an element rather than trusting that.
  return <IntroStep onBack={() => go('personalInfo')} onStart={() => finish({ toCoach: true })} onLater={() => finish({ toCoach: false })} />;
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
/**
 * The WELCOME (Onboarding v2 §4 Step B). Its whole job is to set the expectation that what comes
 * next is a short conversation rather than a form — because what comes next used to be nine
 * questions and now is the coach.
 *
 * "Maybe later" is a real answer and must stay non-punitive: it opens the app, invents no answers,
 * and leaves the coach exactly one tap away on Home.
 */
function IntroStep({
  onBack,
  onStart,
  onLater,
}: {
  onBack: () => void;
  onStart: () => void;
  onLater: () => void;
}) {
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingScaffold
      onBack={onBack}
      footer={
        <>
          <OnboardingPrimaryButton label={t('intro.start')} onPress={onStart} />
          <OnboardingSecondaryButton label={t('intro.later')} onPress={onLater} />
        </>
      }>
      <ThemedText type="title">{t('intro.title')}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('intro.p1')}
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('intro.p2')}
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
