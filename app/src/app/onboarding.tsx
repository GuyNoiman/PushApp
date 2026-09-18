/**
 * Onboarding — the first run, as the founder approved it (design pack 2026-09-14, transcribed in
 * `04_Product/UX/Onboarding_Approved_Screens_Build_Spec_2026-09-15.md`).
 *
 * ONE route, SIX screens: welcome → purpose → prepare → account → conversation → handoff. The
 * container owns which one is showing; `ONBOARDING_STEP_ORDER` in `core/onboarding/questions.ts`
 * owns the order, and is the authority. Read it rather than this comment if they ever disagree —
 * they have before, and the comment lost.
 *
 * ── SCREEN 07 IS GONE (founder, 2026-09-18) ─────────────────────────────────────────────────────
 *
 * The pack had a seventh screen that presented the intro Journey and its Steps. The founder, after
 * the first run on his own phone: the Journey is not a step of onboarding, it is an ordinary Journey
 * on the home screen. So the handoff is the last page and its button goes to Home, where that
 * Journey is already waiting — `completeOnboarding` still creates it at the end of the conversation,
 * exactly where it did before.
 *
 * ── TWO OF THE SIX ARE NOT RENDERED FROM HERE, AND THAT IS DELIBERATE ────────────────────────
 *
 * `conversation` is the coach, which lives on `/coach`. `handoff` comes after the coach has built a
 * Journey — and building a Journey CLOSES the first-run gate, which makes this route unreachable. So
 * it is rendered from the coach's tail ({@link '@/components/onboarding/FirstRunTail'}) on the real
 * path. It is still a step: a step is a resume point before it is a screen. This container can still
 * render both, because a device that closed mid-flow can resume on either and must find a screen
 * rather than a blank.
 *
 * ── THE ACCOUNT IS MANDATORY (D104) ─────────────────────────────────────────────────────────────
 *
 * There is no skip and no anonymous path out of screen 4. "Back" returns to `prepare`; the only way
 * forward is a real session. The one exception is a build that cannot sign anybody in at all — see
 * {@link AccountStep}, which explains why that is a broken-build escape and not a skip button.
 *
 * ── WHAT IS RETIRED ─────────────────────────────────────────────────────────────────────────────
 *
 * The language page, the three product-promise screens, the acknowledgement, the profile page and
 * the nine questions are all out of the first run. Every one of them still EXISTS as a page —
 * several are reachable from Settings or the Tools tab — and `resolveResumeStep` maps a device
 * persisted on any of them onto the nearest of the seven. See `RETIRED_FIRST_RUN_STEPS`.
 *
 * ── THREE THINGS THE BUILD SPEC LEAVES OPEN, AND WHERE EACH ONE IS PARKED ───────────────────────
 *
 * None of them is decided here. Each is deliberately ONE line away from being decided:
 *
 *  1. **Where quiet hours live**, now that "choose the hours we may reach you" is not a first-run
 *     screen. A new account's window is `defaultActiveHours()` in `core/AppCore.ts`; the editor is
 *     Settings › Active Hours, and it is still Step 2 of the intro Journey.
 *  2. **Whether voice input ships.** Screen 3 says "Type or speak", which is a promise. If voice
 *     does not ship, `flow.prepare.metaInput` in both locale files is the one string to change.
 *  3. **What the friends-area Step opens.** That Step is part of the approved FOUR-Step intro
 *     Journey and does not exist yet — the shipped Journey still has three. When it lands, its
 *     destination is one entry in `INTRO_JOURNEY_LINKS` in `core/onboarding/introJourney.ts`, which
 *     is the array that pairs a Step with the place in the app where it is actually done.
 *
 * The product's NAME is the fourth, and it blocks nothing: `@/constants/product`.
 *
 * The root layout's first-run gate ({@link '@/app/_layout'}) routes here until onboarding is
 * complete, then never again.
 *
 * The container owns the flow: local `step` + `answers` state (seeded from AppCore so an interrupted
 * flow RESUMES where it left off — PRD §8), the pure answer logic (`core/onboarding`), and persistence
 * after every page transition. All answer math + question config is framework-free; the sub-bodies are
 * presentational (Engineering Bible §19). Answers stay ON DEVICE as the Coach's opening context (PRD
 * §9/§10) — nothing is sent to the cloud here; generation→Dreams remains the coach's gated job (D40).
 */
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProviderButton } from '@/components/auth/ProviderButton';
import { SignInFailureNotice } from '@/components/auth/SignInFailureNotice';
import { HandoffPage } from '@/components/onboarding/FirstRunTail';
import { introJourneyContent } from '@/components/onboarding/introJourneyContent';
import { usePersonalName } from '@/components/onboarding/usePersonalName';
import { RestartPrompt } from '@/components/settings/RestartPrompt';
import { canRestartApp, restartApp } from '@/i18n/restart';
import { isRTL, isRTLLocale } from '@/i18n/rtl';
import {
  OnboardingPrimaryButton,
  OnboardingScaffold,
  OnboardingSecondaryButton,
} from '@/components/onboarding/OnboardingScaffold';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/themed-text';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/constants/legal';
import { PRODUCT_NAME } from '@/constants/product';
import { Radius, Spacing } from '@/constants/theme';
import { isAppleSignInAvailable, isGoogleSignInAvailable } from '@/core/auth/nativeIdentity';
import { appKpi } from '@/core/kpi/appKpi';
import { accountEscapeUsed, onboardingStepReached } from '@/core/kpi/firstRunKpi';
import { stepPosition } from '@/core/onboarding/questions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/state/AuthProvider';
import { activeHoursShape, resolveActiveHours } from '@/core/util/availability';
import type { OnboardingAnswers, OnboardingStep } from '@/core/onboarding/model';
import { firstName, getSimulatedUser } from '@/core/profile/simulatedUser';
import { countryName } from '@/core/profile/countries';
import { generateUsername } from '@/core/social/username';
import { useTheme } from '@/hooks/use-theme';
import { findLanguage, LANGUAGES_ALPHABETICAL, type LanguageCode } from '@/i18n/languages';
import { useApp } from '@/state/AppProvider';
import { useLanguagePreference } from '@/state/LanguagePreference';
import { useProfile } from '@/state/ProfileProvider';
import { useSocial } from '@/state/SocialProvider';

export default function OnboardingScreen() {
  const { core } = useApp();
  // The intro Journey's own copy, for the completion the handoff's button guarantees (see `enterApp`).
  const { t } = useTranslation('onboarding');

  // Seed from the core so an interrupted flow resumes at the same page + language (PRD §8).
  const [step, setStep] = useState<OnboardingStep>(() => core.getOnboardingStep());
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => core.getOnboardingAnswers());

  /**
   * THE FUNNEL (founder, 2026-09-16): every step this route shows is counted as reached, once per
   * installation per step — the gateway enforces the once, so going Back and forward again, or
   * resuming onto the same screen tomorrow, counts nothing twice. A retired page is not a step and
   * is not counted.
   */
  useEffect(() => {
    const event = onboardingStepReached(step);
    if (event) appKpi.record(event);
  }, [step]);

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
  const startConversation = useCallback(() => {
    // Do NOT complete onboarding here. The root Coach route is deliberately reachable while the
    // first-run gate is still closed; completion happens only after a real Journey was created.
    // Persisting `conversation` is what makes a device that closes mid-conversation come back to the
    // launcher rather than to the top of the flow — or to an empty Home.
    core.saveOnboardingProgress('conversation', answers);
    requestAnimationFrame(() => router.replace('/coach?firstRun=1' as Href));
  }, [answers, core]);

  /**
   * Relaunch the app straight onto the WELCOME, after the language step changed text direction.
   *
   * The resume point is moved past the language step BEFORE the relaunch, and the relaunch waits
   * for both writes to land: the onboarding step (through the core's save loop) and the language
   * (through LanguagePreference). A relaunched app reads both back — the first-run gate resumes on
   * `welcome`, LanguagePreference applies the stored language — so the person arrives on the next
   * screen, in their language, laid out the right way round, and not back on the choice they just
   * made. A failed write still relaunches: the worst case is the language screen again, correctly
   * laid out, which is where a person who has not chosen yet would be anyway.
   *
   * The screen is NOT advanced here. Until the relaunch lands, the person keeps looking at the
   * language list rather than a welcome screen drawn in the old direction.
   */
  const relaunchOnWelcome = useCallback(
    (languageStored: Promise<void>) => {
      core.saveOnboardingProgress('welcome', answers);
      void Promise.all([languageStored, core.flushSaves()]).then(restartApp, restartApp);
    },
    [answers, core],
  );

  /**
   * Leave the first run for the app proper — the handoff's one button since screen 07 was dropped
   * (founder, 2026-09-18).
   *
   * It COMPLETES onboarding first, and that is not a duplicate of the coach's call. Home lives
   * behind the first-run gate: replacing to `/` while the gate is still closed bounces the person
   * straight back to this route, onto this same screen, forever. On the real path completion has
   * already happened at the end of the conversation and this is an idempotent no-op that keeps the
   * original timestamp and creates nothing twice (see `AppCore.completeOnboarding`). On the one path
   * where it has not — a device resuming onto the handoff from a build that got here another way —
   * it is what makes the intro Journey exist before Home is reached, which is the guarantee this
   * screen's button now carries.
   */
  const enterApp = useCallback(() => {
    core.completeOnboarding(answers, introJourneyContent(t));
    router.replace('/');
  }, [answers, core, t]);

  // ── Render the current page ──────────────────────────────────────────────────

  /**
   * STEP ZERO — the language, before anything is said in one (founder, 2026-09-15).
   *
   * The approved pack starts at the welcome, and the founder overruled that gap for a reason that
   * settles it: a person may not read English at all, and an English welcome leaves them unable to
   * understand the onboarding well enough to go looking for a language setting. So the choice comes
   * first, it names each language in its own script, and it takes effect on the frame it is tapped.
   *
   * It carries NO pager dot — `stepPosition('language')` is 0 — because the pack has seven screens
   * and the dots have to read as seven. This is the door, not the first room.
   */
  if (step === 'language') {
    return <LanguageStep onContinue={() => go('welcome')} onRelaunch={relaunchOnWelcome} />;
  }

  if (step === 'welcome') {
    return (
      <WelcomeStep
        // A DELIBERATE addition to the approved chrome: screen 1 has no Back in the pack, because
        // the pack has no screen before it. It does now, and somebody who tapped the wrong language
        // a second ago is otherwise stuck reading a language they cannot read until they find
        // Settings — which is the exact harm the language screen was put in front to prevent.
        onBack={() => go('language')}
        onStart={() => go('purpose')}
        // "I already have an account" is a REAL route (build spec §1): it goes straight to the
        // account screen, which signs them in and — because the account screen advances the moment a
        // session exists — does not walk them back through the introduction. If their record
        // restores, the first-run gate itself takes them to Home from underneath us.
        onHaveAccount={() => go('account')}
      />
    );
  }

  if (step === 'purpose') {
    return <PurposeStep onBack={() => go('welcome')} onContinue={() => go('prepare')} />;
  }

  if (step === 'prepare') {
    return <PrepareStep onBack={() => go('purpose')} onContinue={() => go('account')} />;
  }

  if (step === 'account') {
    return <AccountStep onBack={() => go('prepare')} onSignedIn={startConversation} />;
  }

  // The conversation itself is `/coach`; reaching this branch means the app was CLOSED during it and
  // has resumed here. The preparation screen is the honest landing — it is the screen that launches
  // the conversation, and the account is already behind them, so its Back goes there rather than
  // through the gate a second time.
  if (step === 'conversation') {
    return <PrepareStep pager={stepPosition('conversation')} onBack={() => go('prepare')} onContinue={startConversation} />;
  }

  // This normally renders from the coach's tail, after the gate has closed. Resuming onto it means
  // the app was closed between the Journey being built and the person seeing this sentence — so the
  // screen is shown, and its button goes to the app rather than further into a finished flow.
  if (step === 'handoff') {
    return <HandoffStep onContinue={enterApp} />;
  }

  // Retired pages, kept renderable for a device that somehow resumes on one. `resolveResumeStep`
  // maps every one of them onto the flow before it reaches here, so these are unreachable in
  // practice — they exist so the component always returns an element rather than trusting that.
  if (step === 'personalInfo') {
    return <PersonalInfoStep onBack={() => go('welcome')} onContinue={() => go('prepare')} />;
  }

  return <WelcomeStep onBack={() => go('language')} onStart={() => go('purpose')} onHaveAccount={() => go('account')} />;
}

// ── Step bodies (presentational; flow-specific, co-located like coach.tsx) ──────

/**
 * Can relaunching the app change its layout direction, here and now?
 *
 * Not on web — `I18nManager` cannot flip direction there at all, so a reload would only lose the
 * screen — and not in a build that cannot relaunch itself (see `@/i18n/restart`). In either case the
 * language step behaves as it always did: the choice applies, and RestartPrompt says what is left.
 */
function canRelaunchIntoDirection(): boolean {
  return Platform.OS !== 'web' && canRestartApp();
}

/**
 * STEP ZERO — language first: device-preselected but confirmed; a direction flip relaunches the app.
 *
 * ── WHY IT SURVIVED A DESIGN PACK THAT DOES NOT HAVE IT (founder, 2026-09-15) ───────────────────
 *
 * The approved screens begin at the welcome. The founder put this back in front of them, and the
 * argument is not about preference: **a person may not read English at all.** An English welcome
 * screen leaves them unable to understand the onboarding well enough to go and find a language
 * setting, so a choice that can be made later is, for them, a choice that cannot be made.
 *
 * Which is why the list below shows each language IN ITS OWN SCRIPT — עברית, English — rather than
 * translated names. It is readable without already reading the app's language, which is the whole
 * requirement. It takes effect on the frame it is tapped (`setLanguage` applies before it persists).
 *
 * IT RESTARTS RIGHT HERE, and that is the fix for what the partner hit (2026-08-20): he chose Hebrew
 * and then answered the whole questionnaire in a left-aligned layout, because the flip only takes
 * effect on a fresh launch and nothing was relaunching. Onboarding is the cheapest possible moment
 * to relaunch — the language is already persisted and there is nothing else to lose — and it is the
 * worst possible moment to leave someone reading a mirror-image of their own language.
 *
 * ── AND IT DOES NOT ASK (first device test, 2026-09-16) ────────────────────────────────────────
 *
 * It used to ask, through the same dialog Settings › Language uses, and "Not now" left the ENTIRE
 * first run mirrored: English, right-aligned, the back chevron on the right, all the way to the
 * account screen. Nothing has been entered yet, so there is nothing a relaunch can lose, and a
 * mirrored first run is the worse outcome. So a direction flip relaunches at once, onto the welcome
 * ({@link OnboardingScreen}'s `relaunchOnWelcome`). Settings still asks, because there the person may
 * be in the middle of something.
 *
 * Continue checks the same thing. The layout this launch opened in can disagree with the language
 * that is already selected before anybody taps a row — a phone set to a right-to-left language we
 * do not ship pre-selects English and opens right-to-left — and walking on from there would mirror
 * the whole flow just the same.
 *
 * Where the app cannot relaunch itself, nothing new appears: the choice applies, and the existing
 * RestartPrompt asks for the reopen by hand, exactly as before.
 */
function LanguageStep({
  onContinue,
  onRelaunch,
}: {
  onContinue: () => void;
  onRelaunch: (languageStored: Promise<void>) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');
  const { language, setLanguage, pendingRestart } = useLanguagePreference();
  // Once a relaunch is on its way, a second tap must not change what it relaunches into.
  const [relaunching, setRelaunching] = useState(false);

  const relaunch = (stored: Promise<void>) => {
    setRelaunching(true);
    onRelaunch(stored);
  };

  const select = (code: LanguageCode) => {
    if (relaunching) return;
    // Read the flip BEFORE applying it: `setLanguage` sets the new direction for the next launch,
    // so afterwards there is nothing left to compare against.
    const flipsDirection = isRTLLocale(code) !== isRTL();
    const stored = setLanguage(code);
    if (flipsDirection && canRelaunchIntoDirection()) relaunch(stored);
  };

  const next = () => {
    if (relaunching) return;
    if (isRTLLocale(language) !== isRTL() && canRelaunchIntoDirection()) {
      // Re-applying the selected language is what sets the direction for the relaunch.
      relaunch(setLanguage(language));
      return;
    }
    onContinue();
  };

  return (
    <OnboardingScaffold footer={<OnboardingPrimaryButton label={t('language.continue')} onPress={next} />}>
      <ThemedText type="title">{t('language.title')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('language.subtitle')}
      </ThemedText>
      <RestartPrompt visible={pendingRestart} />
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
        {LANGUAGES_ALPHABETICAL.map((lang, i) => {
          const selected = lang.code === language;
          return (
            <Pressable
              key={lang.code}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={lang.englishName}
              onPress={() => select(lang.code as LanguageCode)}
              style={({ pressed }) => [styles.langRow, pressed && styles.pressed]}>
              {/* The flag is decoration for the eye, so it is hidden from the screen reader — the
                  row already announces the language by its English name. */}
              <ThemedText style={styles.langFlag} accessibilityElementsHidden importantForAccessibility="no">
                {lang.flag}
              </ThemedText>
              <View style={styles.langMain}>
                <ThemedText type="default">{lang.endonym}</ThemedText>
                {lang.endonym !== lang.englishName ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {lang.englishName}
                  </ThemedText>
                ) : null}
              </View>
              {selected ? <Ionicons name="checkmark" size={20} color={theme.teal} /> : null}
              {i < LANGUAGES_ALPHABETICAL.length - 1 ? (
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

/**
 * 01 · WELCOME (build spec §1).
 *
 * Kicker, a two-line title whose second line is the accent, one paragraph of what the product does,
 * and two actions. The product is named through `{{product}}` — see `@/constants/product`.
 *
 * The secondary is a REAL ROUTE, not a footnote: somebody who already has an account goes straight
 * to the account screen and, because that screen advances the moment a session exists, does not
 * walk the introduction again.
 */
function WelcomeStep({
  onBack,
  onStart,
  onHaveAccount,
}: {
  onBack: () => void;
  onStart: () => void;
  onHaveAccount: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingScaffold
      onBack={onBack}
      pager={stepPosition('welcome')}
      footer={
        <>
          <OnboardingPrimaryButton label={t('flow.welcome.primary')} onPress={onStart} />
          <OnboardingSecondaryButton label={t('flow.welcome.secondary')} onPress={onHaveAccount} />
        </>
      }>
      <ThemedText type="small" themeColor="textSecondary">
        {t('flow.welcome.kicker')}
      </ThemedText>
      {/* The wordmark sits large in the middle of the screen (build spec §1), not only in a header.
          It is text rather than an asset because the name is being replaced (D107) and an image
          would be one more place the old one survives. */}
      <View style={[styles.wordmark, { backgroundColor: theme.tealTint }]}>
        <ThemedText type="display" style={{ color: theme.teal }}>
          {PRODUCT_NAME}
        </ThemedText>
      </View>
      <ThemedText type="title">{t('flow.welcome.title')}</ThemedText>
      <ThemedText type="title" style={{ color: theme.teal }}>
        {t('flow.welcome.titleAccent')}
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('flow.welcome.body')}
      </ThemedText>
    </OnboardingScaffold>
  );
}

/**
 * 02 · PURPOSE (build spec §2) — what the product is for, and the four things it does.
 *
 * The fourth bullet is the **Support Circle**, promised on the second screen of the product. The
 * build spec says it plainly and it is repeated here: whatever ships must not make that a lie.
 */
function PurposeStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');
  const bullets = t('flow.purpose.bullets', { returnObjects: true }) as string[];
  const icons: (keyof typeof Ionicons.glyphMap)[] = [
    'chatbubble-ellipses-outline',
    'trail-sign-outline',
    'sparkles-outline',
    'people-outline',
  ];
  return (
    <OnboardingScaffold
      onBack={onBack}
      pager={stepPosition('purpose')}
      footer={<OnboardingPrimaryButton label={t('flow.purpose.primary')} onPress={onContinue} />}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('flow.purpose.kicker')}
      </ThemedText>
      <ThemedText type="title">{t('flow.purpose.title')}</ThemedText>
      <ThemedText type="default" style={{ color: theme.teal }}>
        {t('flow.purpose.subtitle')}
      </ThemedText>

      <View style={styles.bullets}>
        {bullets.map((bullet, index) => (
          <View key={bullet} style={styles.bullet}>
            <View style={[styles.bulletIcon, { backgroundColor: theme.tealTint }]}>
              <Ionicons name={icons[index] ?? 'ellipse-outline'} size={20} color={theme.teal} />
            </View>
            <ThemedText type="default" style={styles.bulletText}>
              {bullet}
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedText type="small" themeColor="textMuted">
        {t('flow.purpose.footer')}
      </ThemedText>
    </OnboardingScaffold>
  );
}

/**
 * 03 · PREPARE (build spec §3) — a few quiet minutes, at your pace, before the conversation.
 *
 * ⚠ **"Type or speak" is a promise of voice input.** The line ships as the approved design has it;
 * if voice does not ship, `flow.prepare.metaInput` is the one string that has to change. It is a
 * single key in both locale files precisely so that is a one-line correction and not a hunt.
 *
 * Rendered twice in the flow: as step 3, where it continues to the account gate, and as the RESUME
 * screen for step 5, where the same button re-enters a conversation the app was closed during.
 * Hence `pager` being a parameter — the screen is the same, its position is not.
 */
function PrepareStep({
  pager = stepPosition('prepare'),
  onBack,
  onContinue,
}: {
  pager?: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingScaffold
      onBack={onBack}
      pager={pager}
      footer={<OnboardingPrimaryButton label={t('flow.prepare.primary')} onPress={onContinue} />}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('flow.prepare.kicker')}
      </ThemedText>
      <ThemedText type="title">{t('flow.prepare.title')}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('flow.prepare.body')}
      </ThemedText>

      {/* The pull quote: set large, between two hairline rules, with a quotation glyph. */}
      <View style={[styles.quote, { borderColor: theme.hairline }]}>
        <Ionicons name="chatbox-outline" size={20} color={theme.teal} />
        <ThemedText type="displaySmall">{t('flow.prepare.quote')}</ThemedText>
      </View>

      <View style={styles.meta}>
        <Ionicons name="time-outline" size={18} color={theme.textMuted} />
        <View style={styles.metaLines}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('flow.prepare.metaPace')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('flow.prepare.metaInput')}
          </ThemedText>
        </View>
      </View>
    </OnboardingScaffold>
  );
}

/**
 * 04 · ACCOUNT (build spec §4) — before the conversation, and MANDATORY (D104).
 *
 * ── WHAT "MANDATORY" MEANS HERE ────────────────────────────────────────────────────────────────
 *
 * There is no skip and no anonymous path. "Back" returns to the preparation screen; the only way
 * forward is a real session, and the screen advances BY ITSELF the moment one exists rather than
 * asking the person to confirm what they just did. That also makes the welcome's "I already have an
 * account" work: it lands here, they sign in, and the flow carries on from the conversation.
 *
 * ── THE ONE ESCAPE, AND WHY IT IS NOT A SKIP BUTTON ────────────────────────────────────────────
 *
 * A build can be incapable of signing anybody in: no backend configured, or neither provider
 * available on this device/runtime (Expo Go, web, a jest render). Held strictly, that would trap
 * every such person on screen 4 of 7 forever, on a path they cannot fix — the same dead end the
 * founder removed from the coach on 2026-09-03. So when, and only when, the build offers no
 * provider at all, the screen says so and offers one clearly-labelled way on. It never appears
 * because somebody would rather not sign in.
 *
 * Presentational (Engineering Bible §19): identity work belongs to AuthProvider → AuthGateway →
 * nativeIdentity. This screen asks, waits, and reports.
 */
function AccountStep({ onBack, onSignedIn }: { onBack: () => void; onSignedIn: () => void }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const { t } = useTranslation('onboarding');
  const { t: tSettings } = useTranslation('settings');
  const { enabled, status, signInFailure, signInWithApple, signInWithGoogle } = useAuth();

  // Which providers THIS build can actually run. Apple's check is async (it asks the OS), so both
  // start hidden and appear once known — a button that cannot work must never be offered.
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleAvailable] = useState(() => isGoogleSignInAvailable());
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  useEffect(() => {
    let mounted = true;
    void isAppleSignInAvailable().then((ok) => {
      if (mounted) setAppleAvailable(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // A session is what this screen is for; having one is the only thing that advances it.
  useEffect(() => {
    if (status === 'authenticated') onSignedIn();
  }, [status, onSignedIn]);

  const run = async (provider: 'apple' | 'google') => {
    if (busy) return;
    setBusy(provider);
    try {
      // AuthProvider swallows a cancel and surfaces anything else through `signInFailure` — nothing
      // to catch here, and nothing to show for a person who simply closed the sheet.
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
    } finally {
      setBusy(null);
    }
  };

  const noProvider = !enabled || (!appleAvailable && !googleAvailable);

  // The escape advances with NO session. It must never be used on a real device, and the only way
  // to know that it is not is to count it — by why it was offered, never by anything about the person.
  const continueWithoutProvider = () => {
    appKpi.record(accountEscapeUsed(enabled));
    onSignedIn();
  };

  return (
    <OnboardingScaffold
      onBack={onBack}
      pager={stepPosition('account')}
      footer={
        <>
          {appleAvailable ? (
            <ProviderButton
              icon="logo-apple"
              label={t('flow.account.apple')}
              busy={busy === 'apple'}
              disabled={busy !== null}
              // Apple's HIG: black on a light background, white on a dark one.
              background={dark ? '#FFFFFF' : '#000000'}
              foreground={dark ? '#000000' : '#FFFFFF'}
              onPress={() => void run('apple')}
            />
          ) : null}
          {googleAvailable ? (
            <ProviderButton
              icon="logo-google"
              label={t('flow.account.google')}
              busy={busy === 'google'}
              disabled={busy !== null}
              // Google's guidelines: a neutral surface with a visible outline, not a filled brand colour.
              background={theme.backgroundElement}
              foreground={theme.text}
              borderColor={theme.hairline}
              onPress={() => void run('google')}
            />
          ) : null}
          {noProvider ? (
            <>
              <ThemedText type="small" themeColor="textMuted" style={styles.centred}>
                {tSettings('signIn.unavailable')}
              </ThemedText>
              <OnboardingPrimaryButton label={t('flow.account.unavailableContinue')} onPress={continueWithoutProvider} />
            </>
          ) : null}
          {/* A real failure is said plainly, in a sentence of ours and never the error's own text
              (the partner's Android showed Google's DEVELOPER_ERROR line here, 2026-09-16), and it
              stays on screen with a way to try again; the user's data is untouched. */}
          <SignInFailureNotice
            failure={signInFailure}
            disabled={busy !== null}
            onTryAgain={(provider) => void run(provider)}
          />
          <LegalLine />
          <OnboardingSecondaryButton label={t('flow.account.back')} onPress={onBack} />
        </>
      }>
      <ThemedText type="small" themeColor="textSecondary">
        {t('flow.account.kicker')}
      </ThemedText>
      <ThemedText type="title">{t('flow.account.title')}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t('flow.account.body')}
      </ThemedText>

      {/* A shield inside concentric rings fills the middle (build spec §4). */}
      <View style={styles.shield}>
        <View style={[styles.ring, styles.ringOuter, { borderColor: theme.hairline }]} />
        <View style={[styles.ring, styles.ringInner, { borderColor: theme.tealTint }]} />
        <Ionicons name="shield-checkmark-outline" size={54} color={theme.teal} />
      </View>
    </OnboardingScaffold>
  );
}

/**
 * "By continuing, I agree to the Terms and Privacy Policy." — one sentence, two real links.
 *
 * Split into five keys rather than interpolated, because a link inside an interpolation cannot be
 * made tappable without parsing the translated string, and a parser over user-facing copy is a bug
 * waiting for the first translator who moves a word. The five pieces reassemble into exactly the
 * approved sentence in both languages.
 *
 * ⚠ The Terms document is not published yet — see `TERMS_URL`.
 */
function LegalLine() {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');
  const open = (url: string) => void Linking.openURL(url).catch(() => {});
  return (
    <ThemedText type="small" themeColor="textMuted" style={styles.centred}>
      {t('flow.account.legalPrefix')}
      <Text
        accessibilityRole="link"
        style={{ color: theme.teal }}
        onPress={() => open(TERMS_URL)}>
        {t('flow.account.legalTerms')}
      </Text>
      {t('flow.account.legalAnd')}
      <Text
        accessibilityRole="link"
        style={{ color: theme.teal }}
        onPress={() => open(PRIVACY_POLICY_URL)}>
        {t('flow.account.legalPrivacy')}
      </Text>
      {t('flow.account.legalSuffix')}
    </ThemedText>
  );
}

/**
 * 06 · HANDOFF, as reached from THIS route — the last screen of the first run (founder, 2026-09-18).
 *
 * The screen itself lives in `FirstRunTail` because the real path renders it from the coach, after
 * the first-run gate has already closed. This wrapper only supplies the name — and the name is the
 * reason it is a wrapper: the page takes whatever we have and decides which of two complete
 * sentences is true, so a person the conversation never named still reads a finished line.
 */
function HandoffStep({ onContinue }: { onContinue: () => void }) {
  const name = usePersonalName();
  return <HandoffPage name={name} onContinue={onContinue} />;
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
  langFlag: { fontSize: 24, lineHeight: 30, width: 34 },
  langMain: { flex: 1, gap: 1 },
  // `start`/`end`, not `left`/`right`: a physical inset does not mirror, so under RTL the divider
  // would be indented on the wrong side of the list.
  langDivider: { position: 'absolute', start: Spacing.three, end: 0, bottom: 0, height: 1 },
  section: { borderRadius: Radius.card, overflow: 'hidden', gap: 0 },
  pressed: { opacity: 0.6 },
  centred: { textAlign: 'center' },

  // 01 · Welcome — the wordmark, large, in the middle of the screen.
  wordmark: {
    minHeight: 120,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.two,
  },

  // 02 · Purpose — four bullets, each with a round tinted icon. A row mirrors under RTL on its own.
  bullets: { gap: Spacing.three, marginVertical: Spacing.two },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bulletIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bulletText: { flex: 1 },

  // 03 · Prepare — the pull quote between two hairline rules, and the meta lines under a clock.
  quote: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: Spacing.three,
    marginVertical: Spacing.two,
    gap: Spacing.two,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  metaLines: { flex: 1, gap: 2 },

  // 04 · Account — a shield inside concentric rings.
  shield: { minHeight: 180, alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.two },
  ring: { position: 'absolute', borderWidth: 1, borderRadius: 999 },
  ringOuter: { width: 168, height: 168 },
  ringInner: { width: 112, height: 112 },
});
