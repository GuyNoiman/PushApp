/**
 * Coach — the conversation tab. A calm chat surface where the meta-agent voice
 * ("Steady") interviews the user and turns what they say into a named Journey.
 *
 * ── This is a UI PROTOTYPE, not the live coach ───────────────────────────────
 * The conversation is driven ENTIRELY by a local scripted array
 * ({@link COACH_SCRIPT}) plus local UI state — there is NO LLM call and NO
 * network here. The screen walks the script one stage at a time: each reply the
 * user "sends" (free text, an option card, or "Other") simply advances
 * `stageIndex` to the next canned turn.
 *
 * TODO(coach): wire the real engine from `src/core/coach/` (CoachOrchestrator).
 *   The orchestrator emits coach utterances + expected answers per turn, matching
 *   the `CoachStage` shape here — so going live means: (1) replace COACH_SCRIPT
 *   with orchestrator output, (2) feed `handleSendText` / `handlePickOption` /
 *   `handleSubmitOther` back into the orchestrator, (3) render the returned turn.
 *   It also needs an LLM API key + a founder decision on cost, so it stays
 *   offline/free for now (do NOT import or instantiate the Gemini/LLM client).
 *
 * Presentational + local state only — no business logic, no Journey creation.
 * "Build my Journey" and the mic are visual affordances until those seams land.
 */
import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { CoachBubble } from '@/components/coach/CoachBubble';
import { CoachInputBar } from '@/components/coach/CoachInputBar';
import { CoachInsight, CoachJourneyCard } from '@/components/coach/CoachJourneyCard';
import { CoachOptions } from '@/components/coach/CoachOptions';
import { COACH_SCRIPT } from '@/components/coach/coachScript';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function CoachScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // The bottom tab bar floats over content (absolute on web), so the pinned
  // input / CTA bar must clear it. Use the tab-bar inset, or the device's
  // home-indicator safe area when that's larger, whichever keeps the bar visible.
  const barBottomInset = Math.max(BottomTabInset, insets.bottom);

  // ── Conversation state (all local; no engine yet) ──────────────────────────
  /** How far through COACH_SCRIPT we've revealed (0 = just the opening). */
  const [stageIndex, setStageIndex] = useState(0);
  /** The bottom input-bar draft (free-text stages). */
  const [draft, setDraft] = useState('');
  /** Option selections, kept per stage id so a resolved block stays highlighted. */
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  /** Replaces a stage's leading "user" line with what the user actually typed. */
  const [userOverride, setUserOverride] = useState<Record<string, string>>({});
  /** An extra user bubble shown after an options block when they answered "Other". */
  const [otherEcho, setOtherEcho] = useState<Record<string, string>>({});

  const revealed = COACH_SCRIPT.slice(0, stageIndex + 1);
  const current = COACH_SCRIPT[stageIndex];

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  /** Advance to the next scripted stage (no-op at the end). */
  const advance = useCallback(
    (echoIntoNext?: string) => {
      const next = COACH_SCRIPT[stageIndex + 1];
      if (!next) return;
      // If the next stage opens with the user's answer echoed back, override its
      // canned text with what the user really typed.
      if (echoIntoNext && next.utterances[0]?.kind === 'user') {
        setUserOverride((prev) => ({ ...prev, [next.id]: echoIntoNext }));
      }
      setStageIndex((i) => i + 1);
      scrollToEnd();
    },
    [stageIndex, scrollToEnd],
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
            accessibilityLabel="Close conversation"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">New plan</ThemedText>
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
                // TODO(coach): build the Journey via goalSpecToJourney + the Repository.
                onPress={() => {}}
                style={({ pressed }) => [styles.ctaPrimary, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
                <Ionicons name="checkmark" size={17} color={theme.backgroundElement} />
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {current.reply.primaryLabel}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={current.reply.secondaryLabel}
                onPress={() => {}}
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
