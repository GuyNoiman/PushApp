/**
 * Strength Evidence — five things you are good at, each one standing on a moment you can name.
 *
 * Built to `04_Product/PRD/Tools_Documentation/Strength_Evidence_PRD.md` (approved 2026-08-25).
 *
 * ── THE SHAPE OF THE THING ─────────────────────────────────────────────────────────────────────
 *
 * Stories first, labels last. People describe themselves with flattering words they cannot connect
 * to anything they actually did, and the abilities that matter most feel ordinary precisely because
 * they recur — so this collects six moments before it lets anybody name anything, and the name is
 * the person's own word for a pattern in their own stories.
 *
 * ── THE TWO ROUTES ARE EQUAL ───────────────────────────────────────────────────────────────────
 *
 * Grouping the stories yourself is the whole tool, working, offline. Asking the coach is a
 * convenience, not the real version — and when it cannot be reached, the screen says so and the
 * manual route is still right there (PRD §"Edge cases": never a silent fallback to a weaker path).
 *
 * ── AND WHAT IS NEVER DONE HERE ────────────────────────────────────────────────────────────────
 *
 * No score, no rank, no comparison, no reveal, and no strength without at least one example behind
 * it. The result screen is quiet on purpose: this is not a certificate for being strong.
 *
 * Presentational + local draft state (Engineering Bible §19); every rule is in
 * `core/tools/strengthEvidence/model`.
 */
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ToolChoiceCard } from '@/components/tools/ToolChoiceCard';
import { ToolOpening } from '@/components/tools/ToolOpening';
import { ToolStep } from '@/components/tools/ToolStep';
import { ToolTextField } from '@/components/tools/ToolTextField';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { paletteOfTool } from '@/core/tools/rooms';
import {
  APPLICATION_MAX_CHARS,
  EVIDENCE_CONTEXTS,
  LABEL_MAX_CHARS,
  MAX_STRENGTHS,
  STORY_MAX_CHARS,
  addStory,
  addStrength,
  canConfirm,
  confirmResult,
  removeStory,
  removeStrength,
  setApplication,
  setPersonalisation,
  toggleEvidence,
  type AnalysisMode,
  type EvidenceContext,
} from '@/core/tools/strengthEvidence/model';
import { createId } from '@/core/util/id';
import { useTheme } from '@/hooks/use-theme';
import { useStrengthEvidence } from '@/state/useStrengthEvidence';

type Step = 'opening' | 'prompts' | 'review' | 'mode' | 'group' | 'apply' | 'result';

const PALETTE = paletteOfTool('strengthEvidence');

export default function StrengthEvidenceScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useStrengthEvidence();

  const accent = theme[PALETTE.accent];
  const tint = theme[PALETTE.tint];

  const [step, setStep] = useState<Step>('opening');
  const [promptIndex, setPromptIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [label, setLabel] = useState('');
  const [openStrengthId, setOpenStrengthId] = useState<string | null>(null);

  const state = store.state;
  const prompt: EvidenceContext | undefined = EVIDENCE_CONTEXTS[promptIndex];

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tools');
  }, []);

  const saveStory = useCallback(() => {
    const text = typed.trim();
    if (text && prompt) {
      store.save(addStory(state, { id: createId('ev'), text, context: prompt, at: Date.now() }));
    }
    setTyped('');
    if (promptIndex + 1 < EVIDENCE_CONTEXTS.length) setPromptIndex(promptIndex + 1);
    else setStep('review');
  }, [typed, prompt, state, store, promptIndex]);

  const chooseMode = useCallback(
    (mode: AnalysisMode) => {
      // The coach route is not wired yet: it needs the server-side analysis that never retains a
      // story. Until it is, choosing it lands on the manual grouping with an honest line rather than
      // pretending — a silent fallback to a weaker path is the one thing the PRD forbids here.
      void mode;
      setStep('group');
    },
    [],
  );

  const ready = canConfirm(state);
  const chosen = state.strengths;

  // ── Opening ────────────────────────────────────────────────────────────────
  if (step === 'opening') {
    return (
      <ToolOpening
        title={t('strengthEvidence.opening.title')}
        lead={t('strengthEvidence.opening.lead')}
        outcomeLabel={t('opening.outcomeLabel')}
        outcome={t('strengthEvidence.opening.outcome')}
        timeLabel={t('opening.timeLabel')}
        time={t('strengthEvidence.opening.time')}
        startLabel={t('strengthEvidence.opening.start')}
        onStart={() => setStep(state.stories.length > 0 ? 'review' : 'prompts')}
        onClose={close}
        closeLabel={t('close', { ns: 'common' })}
        accent={PALETTE.accent}
        tint={PALETTE.tint}
      />
    );
  }

  // ── One moment at a time ───────────────────────────────────────────────────
  if (step === 'prompts' && prompt) {
    return (
      <ToolStep
        stepLabel={t('strengthEvidence.stepLabel')}
        progress={(promptIndex + 1) / EVIDENCE_CONTEXTS.length}
        question={t(`strengthEvidence.prompts.${prompt}.question`)}
        help={t(`strengthEvidence.prompts.${prompt}.help`)}
        accentColor={accent}
        primaryLabel={t('strengthEvidence.addMoment')}
        onPrimary={saveStory}
        primaryDisabled={typed.trim().length === 0}
        secondaryLabel={t('strengthEvidence.skipPrompt')}
        onSecondary={() => {
          setTyped('');
          if (promptIndex + 1 < EVIDENCE_CONTEXTS.length) setPromptIndex(promptIndex + 1);
          else setStep('review');
        }}
        footnote={t('strengthEvidence.savedAsYouGo')}
        onBack={promptIndex > 0 ? () => setPromptIndex(promptIndex - 1) : undefined}
        onClose={close}
        backLabel={t('back', { ns: 'common' })}
        closeLabel={t('close', { ns: 'common' })}>
        <ToolTextField
          value={typed}
          onChangeText={setTyped}
          placeholder={t(`strengthEvidence.prompts.${prompt}.placeholder`)}
          accessibilityLabel={t(`strengthEvidence.prompts.${prompt}.question`)}
          maxChars={STORY_MAX_CHARS}
          minHeight={140}
        />
      </ToolStep>
    );
  }

  // ── The moments, as cards ──────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <ToolStep
        stepLabel={t('strengthEvidence.stepLabel')}
        question={t('strengthEvidence.review.question')}
        help={t('strengthEvidence.review.help', { count: state.stories.length })}
        accentColor={accent}
        primaryLabel={t('strengthEvidence.review.continue')}
        onPrimary={() => setStep('mode')}
        primaryDisabled={state.stories.length === 0}
        secondaryLabel={t('strengthEvidence.review.addAnother')}
        onSecondary={() => {
          setPromptIndex(0);
          setStep('prompts');
        }}
        onClose={close}
        backLabel={t('back', { ns: 'common' })}
        closeLabel={t('close', { ns: 'common' })}>
        {state.stories.map((story) => (
          <View key={story.id} style={[styles.card, { borderColor: theme.hairline, backgroundColor: theme.backgroundElement }]}>
            {story.context ? (
              <ThemedText type="small" themeColor="textMuted">
                {t(`strengthEvidence.prompts.${story.context}.label`)}
              </ThemedText>
            ) : null}
            <ThemedText type="small" style={{ color: theme.text, lineHeight: 21 }}>
              {story.text}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('strengthEvidence.review.remove')}
              onPress={() => store.save(removeStory(state, story.id))}>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                {t('strengthEvidence.review.remove')}
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </ToolStep>
    );
  }

  // ── How the grouping happens. Two equal routes. ────────────────────────────
  if (step === 'mode') {
    return (
      <ToolStep
        stepLabel={t('strengthEvidence.stepLabel')}
        question={t('strengthEvidence.mode.question')}
        help={t('strengthEvidence.mode.help')}
        accentColor={accent}
        primaryLabel={t('strengthEvidence.mode.manual')}
        onPrimary={() => chooseMode('manual')}
        secondaryLabel={t('strengthEvidence.mode.coach')}
        onSecondary={() => chooseMode('coach')}
        footnote={t('strengthEvidence.mode.coachSoon')}
        onClose={close}
        backLabel={t('back', { ns: 'common' })}
        closeLabel={t('close', { ns: 'common' })}
      />
    );
  }

  // ── Naming the patterns ────────────────────────────────────────────────────
  if (step === 'group') {
    return (
      <ToolStep
        stepLabel={t('strengthEvidence.stepLabel')}
        question={t('strengthEvidence.group.question')}
        help={t('strengthEvidence.group.help', { max: MAX_STRENGTHS })}
        accentColor={accent}
        primaryLabel={t('strengthEvidence.group.continue')}
        onPrimary={() => setStep('apply')}
        primaryDisabled={!ready}
        onClose={close}
        backLabel={t('back', { ns: 'common' })}
        closeLabel={t('close', { ns: 'common' })}>
        <ToolTextField
          value={label}
          onChangeText={setLabel}
          placeholder={t('strengthEvidence.group.placeholder')}
          accessibilityLabel={t('strengthEvidence.group.question')}
          multiline={false}
          maxChars={LABEL_MAX_CHARS}
          minHeight={52}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('strengthEvidence.group.add')}
          disabled={label.trim().length === 0 || chosen.length >= MAX_STRENGTHS}
          onPress={() => {
            store.save(addStrength(state, { id: createId('st'), label }));
            setLabel('');
          }}
          style={({ pressed }) => [styles.addRow, { borderColor: accent }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: accent }}>
            {t('strengthEvidence.group.add')}
          </ThemedText>
        </Pressable>

        {chosen.map((strength) => (
          <View key={strength.id} style={[styles.card, { borderColor: theme.hairline, backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{strength.label}</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {t('strengthEvidence.group.attached', { count: strength.evidenceIds.length })}
            </ThemedText>
            {/* Attaching a moment IS the claim. A strength with none cannot be confirmed. */}
            {state.stories.map((story) => (
              <ToolChoiceCard
                key={`${strength.id}-${story.id}`}
                label={story.text}
                selected={strength.evidenceIds.includes(story.id)}
                onPress={() => store.save(toggleEvidence(state, strength.id, story.id))}
                accentColor={accent}
                tintColor={tint}
                role="checkbox"
              />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('strengthEvidence.group.remove')}
              onPress={() => store.save(removeStrength(state, strength.id))}>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                {t('strengthEvidence.group.remove')}
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </ToolStep>
    );
  }

  // ── When does it help, and when is it too much ─────────────────────────────
  if (step === 'apply') {
    const strength = chosen.find((s) => s.id === openStrengthId) ?? chosen[0];
    return (
      <ToolStep
        stepLabel={t('strengthEvidence.stepLabel')}
        question={t('strengthEvidence.apply.question', { label: strength?.label ?? '' })}
        help={t('strengthEvidence.apply.help')}
        accentColor={accent}
        primaryLabel={t('strengthEvidence.apply.continue')}
        onPrimary={() => {
          const next = chosen[chosen.findIndex((s) => s.id === strength?.id) + 1];
          if (next) setOpenStrengthId(next.id);
          else {
            store.save(confirmResult(state, Date.now(), state.analysisMode ?? 'manual'));
            setStep('result');
          }
        }}
        onClose={close}
        backLabel={t('back', { ns: 'common' })}
        closeLabel={t('close', { ns: 'common' })}>
        {strength ? (
          <>
            <ThemedText type="smallBold">{t('strengthEvidence.apply.helpsWhen')}</ThemedText>
            <ToolTextField
              value={strength.helpsWhen ?? ''}
              onChangeText={(text) => store.save(setApplication(state, strength.id, 'helpsWhen', text))}
              placeholder={t('strengthEvidence.apply.helpsPlaceholder')}
              accessibilityLabel={t('strengthEvidence.apply.helpsWhen')}
              maxChars={APPLICATION_MAX_CHARS}
            />
            <ThemedText type="smallBold">{t('strengthEvidence.apply.tooMuchWhen')}</ThemedText>
            <ToolTextField
              value={strength.tooMuchWhen ?? ''}
              onChangeText={(text) => store.save(setApplication(state, strength.id, 'tooMuchWhen', text))}
              placeholder={t('strengthEvidence.apply.tooMuchPlaceholder')}
              accessibilityLabel={t('strengthEvidence.apply.tooMuchWhen')}
              maxChars={APPLICATION_MAX_CHARS}
            />
          </>
        ) : null}
      </ToolStep>
    );
  }

  // ── The map. Quiet on purpose. ─────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.result}>
        <ThemedText type="display">{t('strengthEvidence.result.title')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('strengthEvidence.result.lead')}
        </ThemedText>

        {chosen.map((strength) => (
          <View key={strength.id} style={[styles.card, { borderColor: theme.hairline, backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{strength.label}</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {t('strengthEvidence.result.evidence', { count: strength.evidenceIds.length })}
            </ThemedText>
            {strength.helpsWhen ? (
              <ThemedText type="small" style={{ color: theme.text, lineHeight: 21 }}>
                {strength.helpsWhen}
              </ThemedText>
            ) : null}
          </View>
        ))}

        {/* The permission, stated as what it does rather than as a switch with a name. */}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: state.personalisationAllowed }}
          accessibilityLabel={t('strengthEvidence.result.permission')}
          onPress={() => store.save(setPersonalisation(state, !state.personalisationAllowed))}
          style={({ pressed }) => [
            styles.card,
            {
              borderColor: state.personalisationAllowed ? accent : theme.hairline,
              backgroundColor: state.personalisationAllowed ? tint : theme.backgroundElement,
            },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">{t('strengthEvidence.result.permission')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {state.personalisationAllowed
              ? t('strengthEvidence.result.permissionOn')
              : t('strengthEvidence.result.permissionOff')}
          </ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('strengthEvidence.result.done')}
          onPress={close}
          style={({ pressed }) => [styles.cta, { backgroundColor: accent }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
            {t('strengthEvidence.result.done')}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  result: {
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    padding: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  addRow: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    alignItems: 'center',
  },
  cta: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
});
