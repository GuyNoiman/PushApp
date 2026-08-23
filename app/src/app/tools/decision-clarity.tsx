/**
 * What Really Matters to Me? — the four sides of one difficult decision, revealed one at a time, and
 * a sentence at the end that belongs to the person rather than to the app.
 *
 * NINE SCREENS (PRD §5): the opening, the question itself, the four sides in a fixed order, what
 * matters most, what became clearer, and the result.
 *
 * THE NEUTRALITY IS THE FEATURE, and it is enforced in three places at once: the model exports
 * nothing that scores (see its header), the four side screens are identical in weight and wording,
 * and the result lays them out in the same fixed order rather than sorting by how much was written.
 * A tool that quietly reveals which way it thinks you are leaning is a tool people stop telling the
 * truth to.
 *
 * CHANGING THE QUESTION MID-FLOW IS ASKED ABOUT, never silently absorbed: answers written about one
 * decision do not automatically belong to another (PRD §10).
 *
 * PRIVACY: the topic, the four sides and the clarity statement are private on-device content. The
 * coach sees them only through a deliberate, previewed share, which is not part of this screen.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ToolChoiceCard } from '@/components/tools/ToolChoiceCard';
import { ToolEntryList } from '@/components/tools/ToolEntryList';
import { ToolOpening } from '@/components/tools/ToolOpening';
import { ToolStep } from '@/components/tools/ToolStep';
import { ToolTextField } from '@/components/tools/ToolTextField';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { paletteOfTool } from '@/core/tools/rooms';
import {
  addEntry,
  allEntries,
  canConfirm,
  confirmReflection,
  DECISION_SIDES,
  history,
  isDecisionReflection,
  MAX_CONSIDERATIONS,
  movePriority,
  removeEntry,
  setClarity,
  setTopic,
  startReflection,
  togglePriority,
  topicChangedMeaningfully,
  type DecisionReflection,
  type DecisionSide,
} from '@/core/tools/decisionClarity/model';
import { createId } from '@/core/util/id';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';
import { useToolRecords } from '@/state/ToolRecordsStore';

type Step = 'opening' | 'topic' | DecisionSide | 'priorities' | 'clarity' | 'result';
const SEQUENCE: Step[] = ['topic', ...DECISION_SIDES, 'priorities', 'clarity'];
/** The tool wears its ROOM's colour — see `core/tools/rooms.ts`. */
const PALETTE = paletteOfTool('decisionClarity');

export default function DecisionClarityScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useToolRecords('decisionClarity', isDecisionReflection);

  const accent = theme[PALETTE.accent];
  const tint = theme[PALETTE.tint];

  const [step, setStep] = useState<Step>('opening');
  const [reflection, setReflection] = useState<DecisionReflection | null>(null);
  const [shown, setShown] = useState<DecisionReflection | null>(null);
  /** The topic as it stood when the sides were written, to notice a changed question. */
  const [topicAtStart, setTopicAtStart] = useState('');

  const records = useMemo(() => history(store.records), [store.records]);

  useEffect(() => {
    if (!store.ready || step !== 'opening' || reflection || shown) return;
    const latest = records[0];
    if (latest) {
      setShown(latest);
      setStep('result');
    }
  }, [store.ready, records, step, reflection, shown]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tools');
  }, []);

  const update = useCallback(
    (next: DecisionReflection) => {
      setReflection(next);
      store.put(next);
    },
    [store],
  );

  const begin = useCallback(() => {
    setShown(null);
    setTopicAtStart('');
    update(startReflection(createId('dec'), Date.now()));
    setStep('topic');
  }, [update]);

  const common = {
    accentColor: accent,
    onClose: close,
    backLabel: t('back', { ns: 'common' }),
    closeLabel: t('close', { ns: 'common' }),
  };
  const progressOf = (current: Step) => (SEQUENCE.indexOf(current) + 1) / SEQUENCE.length;
  const stepAfter = (current: Step): Step => SEQUENCE[SEQUENCE.indexOf(current) + 1] ?? 'result';
  const stepBefore = (current: Step): Step | undefined => SEQUENCE[SEQUENCE.indexOf(current) - 1];

  if (!store.ready) return <ThemedView style={styles.container} />;

  if (step === 'opening') {
    return (
      <ToolOpening
        title={t('decisionClarity.title')}
        lead={t('decisionClarity.intro.lead')}
        outcomeLabel={t('opening.outcomeLabel')}
        outcome={t('decisionClarity.intro.outcome')}
        timeLabel={t('opening.timeLabel')}
        time={t('decisionClarity.intro.time')}
        startLabel={t('opening.start')}
        onStart={begin}
        onClose={close}
        closeLabel={t('close', { ns: 'common' })}
        accent={PALETTE.accent}
        tint={PALETTE.tint}
      />
    );
  }

  if (step === 'topic' && reflection) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('decisionClarity.steps.topic')}
        progress={progressOf(step)}
        question={t('decisionClarity.topic.question')}
        help={t('decisionClarity.topic.help')}
        primaryLabel={t('decisionClarity.continue')}
        primaryDisabled={!canConfirm(reflection)}
        onPrimary={() => {
          // The question changed after the sides were written: those answers may belong to a
          // different decision, so the person decides what happens to them (PRD §10).
          if (topicChangedMeaningfully(topicAtStart, reflection.topic)) {
            Alert.alert(
              t('decisionClarity.topicChanged.title'),
              t('decisionClarity.topicChanged.body'),
              [
                {
                  text: t('decisionClarity.topicChanged.keep'),
                  onPress: () => {
                    setTopicAtStart(reflection.topic);
                    setStep(stepAfter('topic'));
                  },
                },
                {
                  text: t('decisionClarity.topicChanged.restart'),
                  style: 'destructive',
                  onPress: () => {
                    const fresh = setTopic(startReflection(createId('dec'), Date.now()), reflection.topic, Date.now());
                    store.remove(reflection.id);
                    setTopicAtStart(fresh.topic);
                    update(fresh);
                    setStep(stepAfter('topic'));
                  },
                },
              ],
            );
            return;
          }
          setTopicAtStart(reflection.topic);
          setStep(stepAfter('topic'));
        }}
        footnote={t('decisionClarity.noRightAnswer')}>
        <ToolTextField
          value={reflection.topic}
          onChangeText={(text) => update(setTopic(reflection, text, Date.now()))}
          placeholder={t('decisionClarity.topic.placeholder')}
          accessibilityLabel={t('decisionClarity.topic.question')}
          maxChars={160}
          autoFocus
        />
      </ToolStep>
    );
  }

  if (reflection && (DECISION_SIDES as readonly string[]).includes(step)) {
    const side = step as DecisionSide;
    return (
      <ToolStep
        {...common}
        stepLabel={t(`decisionClarity.sides.${side}.step`)}
        progress={progressOf(step)}
        question={t(`decisionClarity.sides.${side}.question`)}
        help={t(`decisionClarity.sides.${side}.help`)}
        onBack={() => setStep(stepBefore(step) ?? 'topic')}
        primaryLabel={t('decisionClarity.continue')}
        onPrimary={() => setStep(stepAfter(step))}
        secondaryLabel={t('decisionClarity.nothingComesToMind')}
        onSecondary={() => setStep(stepAfter(step))}>
        <ToolEntryList
          entries={reflection.sides[side]}
          onAdd={(text) => update(addEntry(reflection, side, createId('de'), text, Date.now()))}
          onRemove={(id) => update(removeEntry(reflection, side, id, Date.now()))}
          placeholder={t(`decisionClarity.sides.${side}.placeholder`)}
          addLabel={t('decisionClarity.add')}
          removeLabel={t('decisionClarity.remove')}
          inputLabel={t(`decisionClarity.sides.${side}.question`)}
          accentColor={accent}
          emptyHint={t('decisionClarity.emptyHint')}
        />
      </ToolStep>
    );
  }

  if (step === 'priorities' && reflection) {
    const entries = allEntries(reflection);
    return (
      <ToolStep
        {...common}
        stepLabel={t('decisionClarity.steps.priorities')}
        progress={progressOf(step)}
        question={t('decisionClarity.priorities.question')}
        help={t('decisionClarity.priorities.help', { max: MAX_CONSIDERATIONS })}
        onBack={() => setStep(stepBefore(step) ?? 'topic')}
        primaryLabel={t('decisionClarity.continue')}
        onPrimary={() => setStep(stepAfter(step))}
        secondaryLabel={entries.length === 0 ? undefined : t('decisionClarity.skip')}
        onSecondary={entries.length === 0 ? undefined : () => setStep(stepAfter(step))}>
        {entries.length === 0 ? (
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            {t('decisionClarity.priorities.nothingWritten')}
          </ThemedText>
        ) : null}
        {entries.map(({ side, entry }) => {
          const order = reflection.priorityIds.indexOf(entry.id);
          return (
            <View key={entry.id} style={styles.priorityRow}>
              <View style={styles.priorityCard}>
                <ToolChoiceCard
                  label={entry.text}
                  detail={t(`decisionClarity.sides.${side}.tag`)}
                  selected={order >= 0}
                  onPress={() => update(togglePriority(reflection, entry.id, Date.now()))}
                  accentColor={accent}
                  tintColor={tint}
                  order={order >= 0 ? order + 1 : undefined}
                />
              </View>
              {order >= 0 ? (
                <View style={styles.reorder}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('decisionClarity.moveUp')}
                    onPress={() => update(movePriority(reflection, entry.id, -1, Date.now()))}
                    hitSlop={6}>
                    <Ionicons name="chevron-up" size={18} color={theme.textMuted} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('decisionClarity.moveDown')}
                    onPress={() => update(movePriority(reflection, entry.id, 1, Date.now()))}
                    hitSlop={6}>
                    <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </ToolStep>
    );
  }

  if (step === 'clarity' && reflection) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('decisionClarity.steps.clarity')}
        progress={progressOf(step)}
        question={t('decisionClarity.clarity.question')}
        help={t('decisionClarity.clarity.help')}
        onBack={() => setStep(stepBefore(step) ?? 'topic')}
        primaryLabel={t('decisionClarity.finish')}
        onPrimary={() => {
          const done = confirmReflection(reflection, Date.now());
          update(done);
          setShown(done);
          setStep('result');
        }}
        secondaryLabel={t('decisionClarity.notYet')}
        onSecondary={() => {
          const done = confirmReflection(setClarity(reflection, '', Date.now()), Date.now());
          update(done);
          setShown(done);
          setStep('result');
        }}>
        <ToolTextField
          value={reflection.clarityStatement ?? ''}
          onChangeText={(text) => update(setClarity(reflection, text, Date.now()))}
          placeholder={t('decisionClarity.clarity.placeholder')}
          accessibilityLabel={t('decisionClarity.clarity.question')}
          maxChars={300}
        />
      </ToolStep>
    );
  }

  // ── The result: four sides, same weight, fixed order ───────────────────────
  const result = shown ?? reflection;
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.icon} />
          <ThemedText type="small" style={{ color: theme.textMuted }}>{t('decisionClarity.steps.result')}</ThemedText>
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
            {result?.topic ?? ''}
          </ThemedText>

          {result?.clarityStatement ? (
            <View style={[styles.block, { backgroundColor: tint, borderColor: accent }]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>{t('decisionClarity.result.clearer')}</ThemedText>
              <ThemedText type="small" style={{ color: theme.text }}>{result.clarityStatement}</ThemedText>
            </View>
          ) : null}

          {result
            ? DECISION_SIDES.map((side) => (
                <View
                  key={side}
                  style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>
                    {t(`decisionClarity.sides.${side}.tag`)}
                  </ThemedText>
                  {result.sides[side].length === 0 ? (
                    <ThemedText type="small" style={{ color: theme.textMuted }}>
                      {t('decisionClarity.result.emptySide')}
                    </ThemedText>
                  ) : (
                    result.sides[side].map((entry) => (
                      <ThemedText key={entry.id} type="small" style={{ color: theme.textMuted }}>
                        · {entry.text}
                        {result.priorityIds.includes(entry.id)
                          ? ` — ${t('decisionClarity.result.mattersMost')}`
                          : ''}
                      </ThemedText>
                    ))
                  )}
                </View>
              ))
            : null}

          <ThemedText type="small" style={[styles.line, { color: theme.textMuted }]}>
            {t('decisionClarity.result.private')}
          </ThemedText>
        </ScrollView>

        <View style={styles.footer}>
          {result ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setReflection(result);
                setTopicAtStart(result.topic);
                setShown(null);
                setStep('topic');
              }}
              style={({ pressed }) => [styles.primary, { backgroundColor: accent }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>{t('decisionClarity.result.edit')}</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={begin}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <ThemedText type="small" style={{ color: theme.textMuted }}>{t('decisionClarity.result.another')}</ThemedText>
          </Pressable>
          {result ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                store.remove(result.id);
                setReflection(null);
                setShown(null);
                setStep('opening');
              }}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <ThemedText type="small" style={{ color: theme.danger }}>{t('decisionClarity.result.delete')}</ThemedText>
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
  block: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.one },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  priorityCard: { flex: 1 },
  reorder: { gap: Spacing.one },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two, gap: Spacing.two },
  primary: { borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
  secondary: { paddingVertical: Spacing.two, alignItems: 'center' },
  pressed: { opacity: 0.75 },
});
