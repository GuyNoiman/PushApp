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
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { CoachBubble } from '@/components/coach/CoachBubble';
import { EditCoachScreen } from '@/components/coach/EditCoachScreen';
import { CoachInputBar } from '@/components/coach/CoachInputBar';
import { CoachInsight, CoachJourneyCard } from '@/components/coach/CoachJourneyCard';
import { CoachOptions } from '@/components/coach/CoachOptions';
import { buildCoachScript } from '@/components/coach/coachScript';
import { useLiveCoach } from '@/components/coach/useLiveCoach';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { featureFlags } from '@/core/config/featureFlags';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const { mode } = useLocalSearchParams<{ mode?: string; journeyId?: string }>();
  if (mode === 'edit') return <EditCoachScreen />;
  return featureFlags.liveCoach ? <LiveCoachScreen /> : <ScriptedCoachScreen />;
}

/**
 * LiveCoachScreen — renders the REAL coach from {@link useLiveCoach}: the transcript, the current
 * question's option cards, a "thinking…" state during triage, and a CTA that either builds the
 * Journey (`createJourneyFromGoalSpec`) or, on a sensitive-domain hand-off, points to manual creation.
 */
function LiveCoachScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { core } = useApp();
  const coach = useLiveCoach();
  const { t } = useAddressedTranslation('coach');

  const barBottomInset = Math.max(BottomTabInset, insets.bottom);

  /** The bottom input-bar draft (the opening free-text). */
  const [draft, setDraft] = useState('');
  /** Local selection for the current multi-select question (single-select submits on tap). */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const handleBuild = useCallback(() => {
    if (!coach.goalSpec) return;
    core.createJourneyFromGoalSpec(coach.goalSpec);
    router.replace('/');
  }, [coach.goalSpec, core]);

  const headerBorder = useMemo(() => ({ borderBottomColor: theme.hairline }), [theme.hairline]);

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

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.chat}
            showsVerticalScrollIndicator={false}
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

            {coach.question && (
              <CoachOptions
                prompt={coach.question.label}
                options={coach.question.options}
                multiSelect={coach.question.multiSelect}
                allowOther={coach.question.allowOther}
                continueLabel={t('continue')}
                selectedIds={selectedIds}
                disabled={false}
                onSelect={handleSelect}
                onAdvance={handleAdvance}
                onSubmitOther={handleSubmitOther}
              />
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
        </KeyboardAvoidingView>
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

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.chat}
            showsVerticalScrollIndicator={false}
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
