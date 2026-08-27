/**
 * Coach — the conversation tab. A calm chat surface where the meta-agent voice
 * ("Steady") interviews the user and turns what they say into a named Journey.
 *
 * ── Two renderers behind ONE flag (config-before-code) ───────────────────────
 * `featureFlags.liveCoach` (on only on the founder's device, where
 * `EXPO_PUBLIC_GEMINI_API_KEY` is present) selects between:
 *   • LiveCoachScreen — the REAL {@link CoachOrchestrator} over live Gemini via
 *     {@link useLiveCoach}; the "Build my Journey" CTA creates a persisted Journey.
 *   • ScriptedCoachScreen — the offline UI PROTOTYPE below, driven ENTIRELY by a
 *     local scripted array ({@link buildCoachScript}); NO LLM call, NO network. It is
 *     the default for every other build, so the flag-off path is zero-regression.
 *
 * Presentational + local state only — the live path keeps its business logic in
 * {@link useLiveCoach} (Engineering Bible §19).
 */
import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import i18n from '@/i18n';

import { CoachBubble } from '@/components/coach/CoachBubble';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { EditCoachScreen } from '@/components/coach/EditCoachScreen';
import { CoachInputBar } from '@/components/coach/CoachInputBar';
import { CoachInsight, CoachJourneyCard } from '@/components/coach/CoachJourneyCard';
import { CoachOptions } from '@/components/coach/CoachOptions';
import { buildCoachScript, type CoachOption } from '@/components/coach/coachScript';
import { useLiveCoach } from '@/components/coach/useLiveCoach';
import {
  CoachMemoryConsentPage,
  RemindersAskPage,
} from '@/components/onboarding/FirstRunTail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConnectionNotice } from '@/components/ui/ConnectionNotice';
import { featureFlags } from '@/core/config/featureFlags';
import { FUTURE_JOURNEY_POLICY } from '@/core/config/futureJourneys';
import { startInstantInDays } from '@/core/journeys/futureJourneys';
import type { JourneyStart } from '@/core/types/domain';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useServerConnection } from '@/hooks/useServerConnection';
import { isRTL } from '@/i18n/rtl';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';
import { useApp } from '@/state/AppProvider';

/**
 * Route the Coach surface: `mode=edit` opens the coach-led Journey EDIT flow ({@link EditCoachScreen},
 * task J1) for the passed `journeyId`; otherwise the tab shows the CREATE coach — the live orchestrator
 * when the founder's key is present, else the offline scripted prototype. The flag is a build-time
 * constant, so hooks stay unconditional in each screen.
 */
export default function CoachScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string; journeyId?: string; firstRun?: string }>();
  // Read unconditionally so the hook order never depends on the route.
  const connection = useServerConnection();
  if (mode === 'edit') return <EditCoachScreen />;
  /**
   * NO SESSION, NO INTERVIEW (2026-08-20). The live coach understands the opening through our proxy,
   * which authenticates with the device's own session. With no session it cannot understand anything
   * — and it used to carry on anyway, turning whatever the person typed into the title of a Journey.
   * A coach that cannot do its job should say so and offer to try again, not quietly become a worse
   * coach. The SCRIPTED prototype needs no session, so it is deliberately not gated.
   */
  if (featureFlags.liveCoach && connection.disconnected) {
    return <CoachOfflineScreen onRetry={() => void connection.retry()} retrying={connection.retrying} />;
  }
  return featureFlags.liveCoach ? <LiveCoachScreen /> : <ScriptedCoachScreen />;
}

/**
 * The whole Coach surface when this device has no session: the same chrome, and one honest card in
 * place of a conversation. The retry re-runs `ensureSession`, so someone who was simply offline at
 * first launch gets their coach back without reinstalling.
 */
function CoachOfflineScreen({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const theme = useTheme();
  const { t } = useAddressedTranslation('coach');
  const { t: tCommon } = useTranslation('common');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('closeConversation')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">{t('header')}</ThemedText>
        </View>
        <View style={styles.offline}>
          <ConnectionNotice
            variant="block"
            title={tCommon('connection.coachTitle')}
            body={tCommon('connection.coachBody')}
            onRetry={onRetry}
            retrying={retrying}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/** The three start modes offered at final approval (Future Journey Management, §5). */
type StartModeValue = 'now' | 'scheduled' | 'manual';
const START_MODE_VALUES: StartModeValue[] = ['now', 'scheduled', 'manual'];
/** Preset labels, positionally paired with {@link FUTURE_JOURNEY_POLICY.startPresetDays}. */
const START_PRESET_KEYS = ['week', 'twoWeeks', 'month'] as const;

/**
 * LiveCoachScreen — renders the REAL coach from {@link useLiveCoach}: the transcript, the current
 * question's option cards, a "thinking…" state during triage, and a CTA that either builds the
 * Journey (`createJourneyFromGoalSpec`) or, on a sensitive-domain hand-off, points to manual creation.
 */
function LiveCoachScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // FIRST RUN (Onboarding v2): the welcome routes here with `firstRun=1`, and the two questions that
  // used to sit before Home now follow the Journey this conversation creates.
  const { firstRun: firstRunParam } = useLocalSearchParams<{ firstRun?: string }>();
  const firstRun = firstRunParam === '1';
  const [tail, setTail] = useState<'none' | 'reminders' | 'memory'>('none');
  const scrollRef = useRef<ScrollView>(null);
  const { core, snapshot } = useApp();
  // The onboarding profile goes IN to the interview: a Journey's own variant question (D62) is
  // skipped when the user already answered it in onboarding.
  const coach = useLiveCoach({ profile: core.getOnboardingCoachSummary() });
  const { t } = useAddressedTranslation('coach');
  const { t: tCommon } = useTranslation('common');

  const barBottomInset = Math.max(BottomTabInset, insets.bottom);

  /** The bottom input-bar draft (the opening free-text). */
  const [draft, setDraft] = useState('');
  /** Local selection for the current multi-select question (single-select submits on tap). */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  /**
   * WHEN the approved Journey begins (Future Journey Management, §5) — asked right where the proposal
   * is approved, as ordinary option cards in the conversation rather than a modal on top of it.
   * `now` is preselected, so the Build CTA is still one tap for the common case.
   */
  const [startMode, setStartMode] = useState<StartModeValue>('now');
  const [startInDays, setStartInDays] = useState<number>(FUTURE_JOURNEY_POLICY.startPresetDays[0]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const handleSend = useCallback(() => {
    const typed = draft.trim();
    if (typed.length === 0) return;
    setDraft('');
    coach.sendOpening(typed);
    scrollToEnd();
  }, [draft, coach, scrollToEnd]);

  const handleSelect = useCallback(
    (id: string) => {
      const question = coach.question;
      if (!question) return;
      if (question.multiSelect) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      } else {
        setSelectedIds([]);
        coach.selectSingle(id);
        scrollToEnd();
      }
    },
    [coach, scrollToEnd],
  );

  const handleAdvance = useCallback(() => {
    if (!coach.question?.multiSelect) return; // single-select already submitted on tap
    coach.selectMulti(selectedIds);
    setSelectedIds([]);
    scrollToEnd();
  }, [coach, selectedIds, scrollToEnd]);

  const handleSubmitOther = useCallback(
    (text: string) => {
      setSelectedIds([]);
      coach.answerOther(text);
      scrollToEnd();
    },
    [coach, scrollToEnd],
  );

  // The Future list is capped (§10). At the cap the two "for later" cards stay on screen, dimmed,
  // with the reason in their own supporting line — the conversation never raises an error, and
  // "Start now" is always available so approval can always complete.
  const futureFull = snapshot?.futureCapacity?.capReached ?? false;
  const startOptions: CoachOption[] = useMemo(
    () =>
      START_MODE_VALUES.map((value) => ({
        id: value,
        title: t(`start.${value}`),
        meta:
          futureFull && value !== 'now'
            ? t('start.full', { max: FUTURE_JOURNEY_POLICY.max })
            : t(`start.${value}Meta`),
        disabled: futureFull && value !== 'now',
      })),
    [t, futureFull],
  );
  const startPresetOptions: CoachOption[] = useMemo(
    () =>
      FUTURE_JOURNEY_POLICY.startPresetDays.map((days, index) => ({
        id: String(days),
        title: t(`start.presets.${START_PRESET_KEYS[index]}`),
        meta: new Date(startInstantInDays(days, Date.now())).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
      })),
    [t],
  );

  const handleBuild = useCallback(() => {
    if (!coach.goalSpec) return;
    // One approved plan, one chosen start (§5). `now` goes down the unchanged immediate path; the two
    // "for later" modes build a Future Journey, which the cap can decline — in which case nothing was
    // created and the conversation stays put rather than navigating away from a Journey that isn't there.
    const start: JourneyStart =
      startMode === 'scheduled'
        ? {
            mode: 'scheduled',
            at: startInstantInDays(startInDays, Date.now()),
            // Zone context only; `at` is already an absolute instant and is never re-derived from it.
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        : startMode === 'manual'
          ? { mode: 'manual' }
          : { mode: 'now' };
    const journey = core.createJourneyFromGoalSpec(coach.goalSpec, start);
    if (!journey) return;
    // FIRST RUN (Onboarding v2 §13/§14): the two questions that were asked before Home — may I
    // remember, and may I remind you — belong HERE, now that there is a Journey to remember and a
    // Step to be reminded about. Everyone else goes straight to Home, exactly as before.
    if (firstRun) setTail('reminders');
    else router.replace('/');
  }, [coach.goalSpec, core, startMode, startInDays, firstRun]);

  const headerBorder = useMemo(() => ({ borderBottomColor: theme.hairline }), [theme.hairline]);

  /** Both reminder answers move on; a denied OS permission must never block the app opening. */
  const answerReminders = useCallback(async (turnOn: boolean) => {
    if (turnOn) {
      try {
        await core.initReminders();
      } catch {
        // Best-effort by design: whatever the OS decided, the next page is the next page.
      }
    }
    setTail('memory');
  }, [core]);

  const answerMemory = useCallback(
    (granted: boolean) => {
      core.setCoachMemoryConsent(granted ? 'granted' : 'declined', i18n.language);
      router.replace('/');
    },
    [core],
  );

  if (tail === 'reminders') {
    return <RemindersAskPage onTurnOn={() => void answerReminders(true)} onNotNow={() => void answerReminders(false)} />;
  }
  if (tail === 'memory') {
    return <CoachMemoryConsentPage onAnswer={answerMemory} />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, headerBorder]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('closeConversation')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">{t('header')}</ThemedText>
        </View>

        <KeyboardSafeView
          style={styles.flex}
          keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.chat}
            showsVerticalScrollIndicator={false}
            // An option chip / CTA inside the conversation must react to the FIRST tap while the
            // composer keyboard is up, instead of only dismissing it (Device QA A3).
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}>
            {coach.items.map((item, i) => {
              switch (item.kind) {
                case 'coach':
                  return <CoachBubble key={i} role="coach" text={item.text} strong={item.strong} />;
                case 'user':
                  return <CoachBubble key={i} role="user" text={item.text} />;
                case 'insight':
                  return <CoachInsight key={i} text={item.text} />;
                case 'journey':
                  return (
                    <CoachJourneyCard
                      key={i}
                      eyebrow={item.eyebrow}
                      title={item.title}
                      description={item.description}
                      meta={item.meta}
                    />
                  );
                default:
                  return null;
              }
            })}

            {coach.status === 'thinking' && <CoachBubble role="coach" text={t('thinking')} />}

            {/* The connection went while the coach was understanding the opening. Nothing was built
                from it — say that plainly, and offer the one action that can change it. */}
            {coach.status === 'unavailable' && (
              <ConnectionNotice
                variant="block"
                title={tCommon('connection.coachLostTitle')}
                body={tCommon('connection.coachLostBody')}
                onRetry={coach.retryOpening}
              />
            )}

            {coach.question && (
              <CoachOptions
                prompt={coach.question.label}
                options={coach.question.options}
                multiSelect={coach.question.multiSelect}
                // The budget narrows what the coach ASKS, never what it tells the person. A
                // question that allowed free text stops offering it and keeps its cards, which cost
                // nothing — so the conversation carries on and nobody is told they ran out.
                allowOther={coach.question.allowOther && coach.canAskOpenQuestion}
                continueLabel={t('continue')}
                selectedIds={selectedIds}
                disabled={false}
                onSelect={handleSelect}
                onAdvance={handleAdvance}
                onSubmitOther={handleSubmitOther}
              />
            )}

            {/* WHEN IT STARTS (§5) — shown the moment there is a plan to approve, in the SAME option
                cards the rest of the conversation uses. Picking a card only records the choice; the
                Build CTA below is still what creates the Journey, so nothing here starts anything. */}
            {coach.goalSpec && (
              <>
                <CoachOptions
                  prompt={t('start.prompt')}
                  options={startOptions}
                  multiSelect={false}
                  allowOther={false}
                  selectedIds={[startMode]}
                  disabled={false}
                  onSelect={(id) => setStartMode(id as StartModeValue)}
                  onAdvance={() => {}}
                  onSubmitOther={() => {}}
                />
                {startMode === 'scheduled' && (
                  <CoachOptions
                    prompt={t('start.datePrompt')}
                    options={startPresetOptions}
                    multiSelect={false}
                    allowOther={false}
                    selectedIds={[String(startInDays)]}
                    disabled={false}
                    onSelect={(id) => setStartInDays(Number(id))}
                    onAdvance={() => {}}
                    onSubmitOther={() => {}}
                  />
                )}
              </>
            )}
          </ScrollView>

          {/* Bottom region: the opening free-text bar, the Build CTA, or the sensitive-domain hand-off. */}
          {coach.awaitingOpening && (
            <CoachInputBar
              value={draft}
              placeholder={t('inputPlaceholder')}
              bottomInset={barBottomInset}
              onChangeText={setDraft}
              onSend={handleSend}
            />
          )}

          {coach.goalSpec && (
            <View
              style={[
                styles.ctaBar,
                { backgroundColor: theme.background, paddingBottom: Spacing.three + barBottomInset },
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('build')}
                onPress={handleBuild}
                style={({ pressed }) => [styles.ctaPrimary, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
                <Ionicons name="checkmark" size={17} color={theme.backgroundElement} />
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {t('build')}
                </ThemedText>
              </Pressable>
            </View>
          )}

          {coach.handoff && (
            <View
              style={[
                styles.ctaBar,
                { backgroundColor: theme.background, paddingBottom: Spacing.three + barBottomInset },
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('handoff')}
                onPress={() => router.push('/journey/new')}
                style={({ pressed }) => [styles.ctaPrimary, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
                <Ionicons name="create-outline" size={17} color={theme.backgroundElement} />
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {t('handoff')}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </KeyboardSafeView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ScriptedCoachScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { t } = useAddressedTranslation('coach');

  // The scripted (offline) conversation, resolved in the active language.
  const script = useMemo(() => buildCoachScript(t), [t]);

  // The bottom tab bar floats over content (absolute on web), so the pinned
  // input / CTA bar must clear it. Use the tab-bar inset, or the device's
  // home-indicator safe area when that's larger, whichever keeps the bar visible.
  const barBottomInset = Math.max(BottomTabInset, insets.bottom);

  // ── Conversation state (all local; no engine yet) ──────────────────────────
  /** How far through the script we've revealed (0 = just the opening). */
  const [stageIndex, setStageIndex] = useState(0);
  /** The bottom input-bar draft (free-text stages). */
  const [draft, setDraft] = useState('');
  /** Option selections, kept per stage id so a resolved block stays highlighted. */
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  /** Replaces a stage's leading "user" line with what the user actually typed. */
  const [userOverride, setUserOverride] = useState<Record<string, string>>({});
  /** An extra user bubble shown after an options block when they answered "Other". */
  const [otherEcho, setOtherEcho] = useState<Record<string, string>>({});

  const revealed = script.slice(0, stageIndex + 1);
  const current = script[stageIndex];

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  /** Advance to the next scripted stage (no-op at the end). */
  const advance = useCallback(
    (echoIntoNext?: string) => {
      const next = script[stageIndex + 1];
      if (!next) return;
      // If the next stage opens with the user's answer echoed back, override its
      // canned text with what the user really typed.
      if (echoIntoNext && next.utterances[0]?.kind === 'user') {
        setUserOverride((prev) => ({ ...prev, [next.id]: echoIntoNext }));
      }
      setStageIndex((i) => i + 1);
      scrollToEnd();
    },
    [script, stageIndex, scrollToEnd],
  );

  const handleSendText = useCallback(() => {
    // Free-text reply: the prototype ignores the content beyond echoing it and
    // advances with the next canned turn. TODO(coach): send `draft` to the engine.
    const typed = draft.trim();
    setDraft('');
    advance(typed.length > 0 ? typed : undefined);
  }, [draft, advance]);

  const handlePickOption = useCallback(
    (stageId: string, id: string, multiSelect: boolean) => {
      setSelections((prev) => {
        if (!multiSelect) return { ...prev, [stageId]: [id] };
        const currentSel = prev[stageId] ?? [];
        const nextSel = currentSel.includes(id)
          ? currentSel.filter((x) => x !== id)
          : [...currentSel, id];
        return { ...prev, [stageId]: nextSel };
      });
    },
    [],
  );

  const handleSubmitOther = useCallback(
    (stageId: string, text: string) => {
      // The user typed their own answer instead of picking a card — echo it, then
      // advance. TODO(coach): pass this free-text answer to the engine.
      setOtherEcho((prev) => ({ ...prev, [stageId]: text }));
      advance();
    },
    [advance],
  );

  const headerBorder = useMemo(() => ({ borderBottomColor: theme.hairline }), [theme.hairline]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Minimal bar with a back affordance so the user can leave the
            conversation. The coach's name lives in Settings, never here. */}
        <View style={[styles.header, headerBorder]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('closeConversation')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">{t('header')}</ThemedText>
        </View>

        <KeyboardSafeView
          style={styles.flex}
          keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.chat}
            showsVerticalScrollIndicator={false}
            // An option chip / CTA inside the conversation must react to the FIRST tap while the
            // composer keyboard is up, instead of only dismissing it (Device QA A3).
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}>
            {revealed.map((stage, idx) => {
              const isCurrent = idx === stageIndex;
              return (
                <Fragment key={stage.id}>
                  {stage.utterances.map((u, ui) => {
                    switch (u.kind) {
                      case 'coach':
                        return <CoachBubble key={ui} role="coach" text={u.text} strong={u.strong} />;
                      case 'user':
                        return (
                          <CoachBubble
                            key={ui}
                            role="user"
                            text={ui === 0 ? userOverride[stage.id] ?? u.text : u.text}
                          />
                        );
                      case 'insight':
                        return <CoachInsight key={ui} text={u.text} />;
                      case 'journey':
                        return (
                          <CoachJourneyCard
                            key={ui}
                            eyebrow={u.eyebrow}
                            title={u.title}
                            description={u.description}
                            meta={u.meta}
                          />
                        );
                      default:
                        return null;
                    }
                  })}

                  {stage.reply.mode === 'options' && (
                    <>
                      <CoachOptions
                        prompt={stage.reply.prompt}
                        options={stage.reply.options}
                        multiSelect={stage.reply.multiSelect}
                        allowOther={stage.reply.allowOther}
                        continueLabel={stage.reply.continueLabel}
                        selectedIds={selections[stage.id] ?? []}
                        disabled={!isCurrent}
                        onSelect={(id) =>
                          handlePickOption(stage.id, id, stage.reply.mode === 'options' && stage.reply.multiSelect)
                        }
                        onAdvance={() => advance()}
                        onSubmitOther={(text) => handleSubmitOther(stage.id, text)}
                      />
                      {!!otherEcho[stage.id] && <CoachBubble role="user" text={otherEcho[stage.id]} />}
                    </>
                  )}
                </Fragment>
              );
            })}
          </ScrollView>

          {/* Bottom region follows the current stage's reply mode. */}
          {current.reply.mode === 'text' && (
            <CoachInputBar
              value={draft}
              placeholder={current.reply.placeholder}
              bottomInset={barBottomInset}
              onChangeText={setDraft}
              onSend={handleSendText}
            />
          )}

          {current.reply.mode === 'cta' && (
            <View
              style={[
                styles.ctaBar,
                { backgroundColor: theme.background, paddingBottom: Spacing.three + barBottomInset },
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={current.reply.primaryLabel}
                // The scripted coach is a placeholder for the live LLM coach (which builds a Journey
                // from a GoalSpec). Until that lands for this path, route to the manual Journey wizard
                // so the primary CTA is a live destination, not a dead button.
                onPress={() => router.push('/journey/new')}
                style={({ pressed }) => [styles.ctaPrimary, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
                <Ionicons name="checkmark" size={17} color={theme.backgroundElement} />
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {current.reply.primaryLabel}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={current.reply.secondaryLabel}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                style={({ pressed }) => [styles.ctaSecondary, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {current.reply.secondaryLabel}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </KeyboardSafeView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  /** The offline screen's single card, given the same side margins as the conversation. */
  offline: {
    padding: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three - 2,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chat: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two + 2,
  },
  ctaBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 52,
    borderRadius: Radius.card,
    // Soft ambient shadow (Design System §5).
    shadowColor: '#14161C',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  ctaSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
