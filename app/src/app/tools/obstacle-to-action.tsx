/**
 * Obstacle to Action — one recurring obstacle turned into one sentence a person can perform.
 *
 * EIGHT SCREENS (PRD §7): the opening with three routes, the topic, the wish, the outcome, the
 * obstacle, the response builder, the quality offer, and the confirmed sentence.
 *
 * THE PART THAT IS OURS is the check before the end. Existing versions of this exercise collect four
 * texts and stop; this one asks whether the trigger is something you would NOTICE and whether the
 * response is yours, small and single. The check runs on the device, sends nothing, and it never
 * refuses — every flag is a question, and "save what I wrote" is always the other button.
 *
 * IT NEVER TOUCHES THE LINKED OBJECT. Choosing a Dream or a Journey is context and nothing more: no
 * Step is created, no reminder scheduled, nothing edited. A plan is also never treated as proof that
 * anybody did anything (PRD §9).
 *
 * THE COACH REFINEMENT is deliberately not wired here. It is a real disclosure of the person's own
 * words to a model and its privacy gate (PRD §13) has not been passed, so the option is shown as not
 * yet available rather than silently missing or falsely working.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ToolChoiceCard } from '@/components/tools/ToolChoiceCard';
import { ToolOpening } from '@/components/tools/ToolOpening';
import { ToolStep } from '@/components/tools/ToolStep';
import { ToolTextField } from '@/components/tools/ToolTextField';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { paletteOfTool } from '@/core/tools/rooms';
import {
  canConfirm,
  checkQuality,
  confirmed,
  confirmResult,
  dropMissingContext,
  isObstacleActionResult,
  setField,
  startResult,
  supersede,
  type ObstacleActionResult,
  type ObstacleContextType,
  type QualityFlag,
  type QualityLexicon,
} from '@/core/tools/obstacleToAction/model';
import { makeCoachLlm } from '@/core/llm/makeCoachLlm';
import { refinementInput, requestRefinement, type IfThenSentence } from '@/core/tools/obstacleToAction/refine';
import { createId } from '@/core/util/id';
import { isRunning } from '@/core/util/journeyStatus';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';
import { useToolRecords } from '@/state/ToolRecordsStore';

type Step = 'opening' | 'topic' | 'wish' | 'outcome' | 'obstacle' | 'builder' | 'check' | 'result';
const SEQUENCE: Step[] = ['topic', 'wish', 'outcome', 'obstacle', 'builder'];
/** The tool wears its ROOM's colour — see `core/tools/rooms.ts`. */
const PALETTE = paletteOfTool('obstacle');

export default function ObstacleToActionScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useToolRecords('obstacleToAction', isObstacleActionResult);
  const { snapshot } = useApp();

  const accent = theme[PALETTE.accent];
  const tint = theme[PALETTE.tint];

  const [step, setStep] = useState<Step>('opening');
  const [draft, setDraft] = useState<ObstacleActionResult | null>(null);
  const [shown, setShown] = useState<ObstacleActionResult | null>(null);
  /** The coach's proposal, held BESIDE the original until the person picks one (PRD §6). */
  const [proposal, setProposal] = useState<IfThenSentence | null>(null);
  const [refining, setRefining] = useState(false);
  /** True once a refinement came back with nothing — said once, quietly, and never repeated. */
  const [refineFailed, setRefineFailed] = useState(false);

  const results = useMemo(() => confirmed(store.records), [store.records]);

  /**
   * The words that make the local check real in the current language. They live in i18n precisely
   * because they are words; the engine takes them as data (see its header).
   *
   * Stored as ONE comma-separated string per list rather than an array, because a language does not
   * need the same number of markers as another — Hebrew has four natural conjunctions where English
   * has five — and the i18n parity test compares key-for-key, arrays included.
   */
  const lexicon = useMemo<QualityLexicon>(() => {
    const split = (key: string) =>
      t(key)
        .split(',')
        .map((word) => word.trim())
        .filter(Boolean);
    return {
      otherPeople: split('obstacle.lexicon.otherPeople'),
      guarantees: split('obstacle.lexicon.guarantees'),
      conjunctions: split('obstacle.lexicon.conjunctions'),
    };
  }, [t]);

  const journeys = useMemo(() => (snapshot?.journeys ?? []).filter(isRunning), [snapshot]);
  const dreams = useMemo(() => snapshot?.dreams ?? [], [snapshot]);

  useEffect(() => {
    if (!store.ready || step !== 'opening' || draft || shown) return;
    const latest = results[0];
    if (!latest) return;
    // A Journey deleted since the response was written leaves a standalone result, not a dead link.
    const stillThere =
      latest.contextType === 'standalone' ||
      (latest.contextType === 'journey'
        ? journeys.some((j) => j.id === latest.contextId)
        : dreams.some((d) => d.id === latest.contextId));
    const repaired = dropMissingContext(latest, stillThere, Date.now());
    if (repaired !== latest) store.put(repaired);
    setShown(repaired);
    setStep('result');
  }, [store, results, step, draft, shown, journeys, dreams]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tools');
  }, []);

  const update = useCallback(
    (next: ObstacleActionResult) => {
      setDraft(next);
      store.put(next);
    },
    [store],
  );

  const begin = useCallback(
    (routeId?: string) => {
      const contextType: ObstacleContextType =
        routeId === 'journey' ? 'journey' : routeId === 'dream' ? 'dream' : 'standalone';
      setShown(null);
      update(startResult(createId('obs'), contextType, Date.now()));
      setStep(contextType === 'standalone' ? 'wish' : 'topic');
    },
    [update],
  );

  const flags: QualityFlag[] = draft ? checkQuality(draft, lexicon) : [];

  const common = {
    accentColor: accent,
    onClose: close,
    backLabel: t('back', { ns: 'common' }),
    closeLabel: t('close', { ns: 'common' }),
  };
  const progressOf = (current: Step) => (SEQUENCE.indexOf(current) + 1) / SEQUENCE.length;

  const save = useCallback(
    (from: ObstacleActionResult) => {
      // The previous version becomes history the moment a new one is approved — never before, so a
      // cancelled edit cannot damage the sentence somebody is relying on (PRD §6).
      const previous = results[0];
      if (previous && previous.id !== from.id) store.put(supersede(previous, Date.now()));
      const done = confirmResult(from, Date.now());
      update(done);
      setShown(done);
      setStep('result');
    },
    [results, store, update],
  );

  /**
   * Ask the coach for a sharper version. Everything about this is deliberately undramatic: it sends
   * only the two halves, the obstacle and the flag names (see `refine.ts`), it cannot fail loudly,
   * and whatever comes back is shown NEXT TO the original rather than replacing it.
   */
  const refine = useCallback(async () => {
    if (!draft || refining) return;
    setRefining(true);
    setRefineFailed(false);
    // Hebrew is our only right-to-left language, so the direction IS the language here — and it
    // avoids reaching for the i18n instance just to read one string.
    const language = isRTL() ? 'Hebrew' : 'English';
    const result = await requestRefinement(makeCoachLlm(), refinementInput(draft, flags, language));
    setProposal(result);
    setRefineFailed(result === null);
    setRefining(false);
  }, [draft, flags, refining]);

  if (!store.ready) return <ThemedView style={styles.container} />;

  if (step === 'opening') {
    return (
      <ToolOpening
        title={t('obstacle.title')}
        lead={t('obstacle.intro.lead')}
        outcomeLabel={t('opening.outcomeLabel')}
        outcome={t('obstacle.intro.outcome')}
        timeLabel={t('opening.timeLabel')}
        time={t('obstacle.intro.time')}
        chooseLabel={t('opening.chooseLabel')}
        routes={[
          {
            id: 'journey',
            title: t('obstacle.routes.journey.title'),
            blurb: t('obstacle.routes.journey.blurb'),
            time: t('obstacle.routes.journey.time'),
            disabled: journeys.length === 0,
            note: journeys.length === 0 ? t('obstacle.routes.journey.none') : undefined,
          },
          {
            id: 'dream',
            title: t('obstacle.routes.dream.title'),
            blurb: t('obstacle.routes.dream.blurb'),
            time: t('obstacle.routes.dream.time'),
            disabled: dreams.length === 0,
            note: dreams.length === 0 ? t('obstacle.routes.dream.none') : undefined,
          },
          {
            id: 'standalone',
            title: t('obstacle.routes.standalone.title'),
            blurb: t('obstacle.routes.standalone.blurb'),
            time: t('obstacle.routes.standalone.time'),
          },
        ]}
        startLabel={t('opening.start')}
        onStart={begin}
        onClose={close}
        closeLabel={t('close', { ns: 'common' })}
        accent={PALETTE.accent}
        tint={PALETTE.tint}
      />
    );
  }

  if (step === 'topic' && draft) {
    const options = draft.contextType === 'journey' ? journeys : dreams;
    return (
      <ToolStep
        {...common}
        stepLabel={t('obstacle.steps.topic')}
        progress={progressOf(step)}
        question={draft.contextType === 'journey' ? t('obstacle.topic.journeyQuestion') : t('obstacle.topic.dreamQuestion')}
        help={t('obstacle.topic.help')}
        primaryLabel={t('obstacle.continue')}
        primaryDisabled={draft.contextId === undefined}
        onPrimary={() => setStep('wish')}>
        {options.map((option) => (
          <ToolChoiceCard
            key={option.id}
            label={option.title}
            selected={draft.contextId === option.id}
            onPress={() => update({ ...draft, contextId: option.id, updatedAt: Date.now() })}
            accentColor={accent}
            tintColor={tint}
            role="radio"
          />
        ))}
      </ToolStep>
    );
  }

  if ((step === 'wish' || step === 'outcome' || step === 'obstacle') && draft) {
    const field = step;
    const back: Record<typeof field, Step> = { wish: 'topic', outcome: 'wish', obstacle: 'outcome' };
    const forward: Record<typeof field, Step> = { wish: 'outcome', outcome: 'obstacle', obstacle: 'builder' };
    const value = field === 'outcome' ? draft.outcome ?? '' : draft[field];
    const required = field !== 'outcome';
    return (
      <ToolStep
        {...common}
        stepLabel={t(`obstacle.steps.${field}`)}
        progress={progressOf(step)}
        question={t(`obstacle.${field}.question`)}
        help={t(`obstacle.${field}.help`)}
        onBack={() =>
          setStep(draft.contextType === 'standalone' && back[field] === 'topic' ? 'opening' : back[field])
        }
        primaryLabel={t('obstacle.continue')}
        primaryDisabled={required && value.trim().length === 0}
        onPrimary={() => setStep(forward[field])}
        secondaryLabel={required ? undefined : t('obstacle.skip')}
        onSecondary={required ? undefined : () => setStep(forward[field])}
        footnote={t('obstacle.autosave')}>
        <ToolTextField
          value={value}
          onChangeText={(text) => update(setField(draft, field, text, Date.now()))}
          placeholder={t(`obstacle.${field}.placeholder`)}
          accessibilityLabel={t(`obstacle.${field}.question`)}
          maxChars={200}
          autoFocus
        />
      </ToolStep>
    );
  }

  if (step === 'builder' && draft) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('obstacle.steps.builder')}
        progress={progressOf(step)}
        question={t('obstacle.builder.question')}
        help={t('obstacle.builder.help')}
        onBack={() => setStep('obstacle')}
        primaryLabel={t('obstacle.continue')}
        primaryDisabled={!canConfirm(draft)}
        onPrimary={() => setStep('check')}>
        <ThemedText type="smallBold" style={{ color: theme.text }}>{t('obstacle.builder.whenLabel')}</ThemedText>
        <ToolTextField
          value={draft.trigger}
          onChangeText={(text) => update(setField(draft, 'trigger', text, Date.now()))}
          placeholder={t('obstacle.builder.whenPlaceholder')}
          accessibilityLabel={t('obstacle.builder.whenLabel')}
          maxChars={160}
          multiline={false}
        />
        <ThemedText type="smallBold" style={{ color: theme.text }}>{t('obstacle.builder.thenLabel')}</ThemedText>
        <ToolTextField
          value={draft.response}
          onChangeText={(text) => update(setField(draft, 'response', text, Date.now()))}
          placeholder={t('obstacle.builder.thenPlaceholder')}
          accessibilityLabel={t('obstacle.builder.thenLabel')}
          maxChars={160}
          multiline={false}
        />
      </ToolStep>
    );
  }

  if (step === 'check' && draft) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('obstacle.steps.check')}
        question={flags.length === 0 ? t('obstacle.check.clearTitle') : t('obstacle.check.title')}
        help={flags.length === 0 ? t('obstacle.check.clearHelp') : t('obstacle.check.help')}
        onBack={() => setStep('builder')}
        primaryLabel={t('obstacle.check.save')}
        onPrimary={() => save(draft)}
        secondaryLabel={t('obstacle.check.edit')}
        onSecondary={() => setStep('builder')}>
        <View style={[styles.sentence, { backgroundColor: tint, borderColor: accent }]}>
          <ThemedText type="small" style={{ color: theme.text }}>
            {t('obstacle.sentence', { trigger: draft.trigger, response: draft.response })}
          </ThemedText>
        </View>

        {flags.map((flag) => (
          <View
            key={flag}
            style={[styles.flag, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <Ionicons name="help-circle-outline" size={18} color={accent} />
            <ThemedText type="small" style={{ color: theme.textMuted, flex: 1 }}>
              {t(`obstacle.flags.${flag}`)}
            </ThemedText>
          </View>
        ))}

        {/* The coach's proposal, beside the original. The person picks; nothing is replaced for them. */}
        {proposal ? (
          <View style={[styles.flag, { backgroundColor: theme.backgroundElement, borderColor: accent }]}>
            <View style={styles.proposal}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>{t('obstacle.check.proposalTitle')}</ThemedText>
              <ThemedText type="small" style={{ color: theme.text }}>
                {t('obstacle.sentence', { trigger: proposal.trigger, response: proposal.response })}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  let next = setField(draft, 'trigger', proposal.trigger, Date.now());
                  next = setField(next, 'response', proposal.response, Date.now());
                  update(next);
                  setProposal(null);
                }}
                style={({ pressed }) => [styles.inlineAction, { borderColor: accent }, pressed && styles.pressed]}>
                <ThemedText type="small" style={{ color: accent }}>{t('obstacle.check.useProposal')}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setProposal(null)}
                style={({ pressed }) => [styles.inlineAction, { borderColor: theme.hairline }, pressed && styles.pressed]}>
                <ThemedText type="small" style={{ color: theme.textMuted }}>{t('obstacle.check.keepMine')}</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: refining }}
            disabled={refining}
            onPress={() => void refine()}
            style={({ pressed }) => [
              styles.flag,
              { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
              pressed && styles.pressed,
            ]}>
            <Ionicons name="chatbubbles-outline" size={18} color={accent} />
            <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>
              {refining ? t('obstacle.check.refining') : t('obstacle.check.refine')}
            </ThemedText>
          </Pressable>
        )}

        {/* NO per-action disclosure, by the founder's instruction (2026-08-23): we do not narrate
            what is being sent or ask permission at the moment of use. The promise is made once, at
            sign-up — raw text a person wrote is never handed on — and it is kept by what this call
            actually sends, which is the two lines and the obstacle and nothing else (`refine.ts`,
            asserted by its tests). What remains here is only the honest failure line. */}
        {refineFailed ? (
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            {t('obstacle.check.refineFailed')}
          </ThemedText>
        ) : null}
      </ToolStep>
    );
  }

  // ── The confirmed sentence ────────────────────────────────────────────────
  const result = shown ?? draft;
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.icon} />
          <ThemedText type="small" style={{ color: theme.textMuted }}>{t('obstacle.steps.result')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close', { ns: 'common' })}
            onPress={close}
            hitSlop={8}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText
            style={[styles.title, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(22 * displayScale()) }]}>
            {t('obstacle.result.title')}
          </ThemedText>

          {result ? (
            <View style={[styles.sentence, { backgroundColor: tint, borderColor: accent }]}>
              <ThemedText
                style={[
                  styles.sentenceText,
                  { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(20 * displayScale()) },
                ]}>
                {t('obstacle.sentence', { trigger: result.trigger, response: result.response })}
              </ThemedText>
            </View>
          ) : null}

          {result?.wish ? (
            <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>{t('obstacle.result.wanted')}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>{result.wish}</ThemedText>
              {result.obstacle ? (
                <ThemedText type="small" style={{ color: theme.textMuted }}>
                  {t('obstacle.result.getsInTheWay', { obstacle: result.obstacle })}
                </ThemedText>
              ) : null}
            </View>
          ) : null}

          <ThemedText type="small" style={[styles.line, { color: theme.textMuted }]}>
            {t('obstacle.result.private')}
          </ThemedText>
        </ScrollView>

        <View style={styles.footer}>
          {result ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDraft(result);
                setShown(null);
                setStep('builder');
              }}
              style={({ pressed }) => [styles.primary, { backgroundColor: accent }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>{t('obstacle.result.edit')}</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDraft(null);
              setShown(null);
              setStep('opening');
            }}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <ThemedText type="small" style={{ color: theme.textMuted }}>{t('obstacle.result.startOver')}</ThemedText>
          </Pressable>
          {result ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                store.remove(result.id);
                setDraft(null);
                setShown(null);
                setStep('opening');
              }}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <ThemedText type="small" style={{ color: theme.danger }}>{t('obstacle.result.delete')}</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  icon: { padding: Spacing.two, minWidth: 38 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three },
  title: { textAlign: START_TEXT_ALIGN },
  line: { textAlign: START_TEXT_ALIGN, lineHeight: 20 },
  sentence: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three },
  sentenceText: { textAlign: START_TEXT_ALIGN, lineHeight: 28 },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  block: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.one },
  proposal: { flex: 1, gap: Spacing.two },
  inlineAction: {
    borderWidth: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two, gap: Spacing.two },
  primary: { borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
  secondary: { paddingVertical: Spacing.two, alignItems: 'center' },
  pressed: { opacity: 0.75 },
});
