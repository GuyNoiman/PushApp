/**
 * What Worked for Me? — one real moment that went well, what helped it, what the person themselves
 * did, and one small thing worth trying again.
 *
 * THE SIX SCREENS (PRD §4): the opening with its two routes, the moment, the supporting conditions,
 * the person's own contribution, the reusable idea, and the record.
 *
 * WHAT THE COPY REFUSES TO DO. It never says a condition CAUSED the outcome — the result reads "may
 * have helped", because one good Tuesday is evidence, not a law. It never awards anything, never
 * touches a Journey or a Step, and it never insists the person take credit: a success that came from
 * luck or from somebody else is allowed to stay that way (PRD §9).
 *
 * NOTHING IS REQUIRED BUT ONE MOMENT. Conditions, contribution and the idea are each skippable, and
 * skipping is a real answer rather than an unfinished one.
 *
 * PRIVACY (G1, D66): everything here stays on the device and nothing in the app reads it.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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
  addMoment,
  canAddMoment,
  canConfirm,
  confirmRecord,
  filledMoments,
  hasConditions,
  history,
  isWhatWorkedRecord,
  setMoment,
  setOptional,
  startRecord,
  SUPPORT_CONDITIONS,
  toggleCondition,
  type WhatWorkedPeriod,
  type WhatWorkedRecord,
} from '@/core/tools/whatWorked/model';
import { createId } from '@/core/util/id';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';
import { useProfile } from '@/state/ProfileProvider';
import { useToolRecords } from '@/state/ToolRecordsStore';

type Step = 'opening' | 'moment' | 'conditions' | 'contribution' | 'idea' | 'result';
const SEQUENCE: Step[] = ['moment', 'conditions', 'contribution', 'idea'];
/** The tool wears its ROOM's colour — see `core/tools/rooms.ts`. */
const PALETTE = paletteOfTool('whatWorked');
const TEXT_MAX = 200;

export default function WhatWorkedScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useToolRecords('whatWorked', isWhatWorkedRecord);
  const { profile } = useProfile();

  const accent = theme[PALETTE.accent];
  const tint = theme[PALETTE.tint];

  const [step, setStep] = useState<Step>('opening');
  const [record, setRecord] = useState<WhatWorkedRecord | null>(null);
  const [shown, setShown] = useState<WhatWorkedRecord | null>(null);

  const records = useMemo(() => history(store.records), [store.records]);

  // Returning opens the newest confirmed record, not a blank form (PRD §6).
  useEffect(() => {
    if (!store.ready || step !== 'opening' || record || shown) return;
    const latest = records[0];
    if (latest) {
      setShown(latest);
      setStep('result');
    }
  }, [store.ready, records, step, record, shown]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tools');
  }, []);

  const update = useCallback(
    (next: WhatWorkedRecord) => {
      setRecord(next);
      store.put(next);
    },
    [store],
  );

  const begin = useCallback(
    (routeId?: string) => {
      const periodType: WhatWorkedPeriod = routeId === 'week' ? 'week' : 'day';
      setShown(null);
      update(startRecord(createId('ww'), periodType, Date.now(), profile.weekStartDay));
      setStep('moment');
    },
    [update, profile.weekStartDay],
  );

  const finish = useCallback(
    (from: WhatWorkedRecord) => {
      const done = confirmRecord(from, Date.now());
      update(done);
      setShown(done);
      setStep('result');
    },
    [update],
  );

  const progressOf = (current: Step) => (SEQUENCE.indexOf(current) + 1) / SEQUENCE.length;
  const common = {
    accentColor: accent,
    onClose: close,
    backLabel: t('back', { ns: 'common' }),
    closeLabel: t('close', { ns: 'common' }),
  };

  if (!store.ready) return <ThemedView style={styles.container} />;

  if (step === 'opening') {
    return (
      <ToolOpening
        title={t('whatWorked.title')}
        lead={t('whatWorked.intro.lead')}
        outcomeLabel={t('opening.outcomeLabel')}
        outcome={t('whatWorked.intro.outcome')}
        timeLabel={t('opening.timeLabel')}
        time={t('whatWorked.intro.time')}
        chooseLabel={t('opening.chooseLabel')}
        routes={[
          { id: 'day', title: t('whatWorked.routes.day.title'), blurb: t('whatWorked.routes.day.blurb'), time: t('whatWorked.routes.day.time') },
          { id: 'week', title: t('whatWorked.routes.week.title'), blurb: t('whatWorked.routes.week.blurb'), time: t('whatWorked.routes.week.time') },
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

  if (step === 'moment' && record) {
    const weekly = record.periodType === 'week';
    return (
      <ToolStep
        {...common}
        stepLabel={t('whatWorked.steps.moment')}
        progress={progressOf('moment')}
        question={weekly ? t('whatWorked.moment.questionWeek') : t('whatWorked.moment.questionDay')}
        help={t('whatWorked.moment.help')}
        primaryLabel={t('whatWorked.saveContinue')}
        primaryDisabled={!canConfirm(record)}
        onPrimary={() => setStep('conditions')}
        footnote={t('whatWorked.autosave')}>
        {record.moments.map((moment, index) => (
          <ToolTextField
            key={index}
            value={moment}
            onChangeText={(text) => update(setMoment(record, index, text, Date.now()))}
            placeholder={t('whatWorked.moment.placeholder')}
            accessibilityLabel={t('whatWorked.moment.label', { index: index + 1 })}
            maxChars={TEXT_MAX}
            autoFocus={index === 0}
          />
        ))}
        {canAddMoment(record) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => update(addMoment(record, Date.now()))}
            style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}>
            <Ionicons name="add" size={16} color={accent} />
            <ThemedText type="small" style={{ color: accent }}>{t('whatWorked.moment.add')}</ThemedText>
          </Pressable>
        ) : null}
      </ToolStep>
    );
  }

  if (step === 'conditions' && record) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('whatWorked.steps.conditions')}
        progress={progressOf('conditions')}
        question={t('whatWorked.conditions.question')}
        help={t('whatWorked.conditions.help')}
        onBack={() => setStep('moment')}
        primaryLabel={t('whatWorked.saveContinue')}
        onPrimary={() => setStep('contribution')}>
        {SUPPORT_CONDITIONS.map((condition) => (
          <ToolChoiceCard
            key={condition}
            label={t(`whatWorked.conditions.options.${condition}`)}
            selected={record.conditions.includes(condition)}
            onPress={() => update(toggleCondition(record, condition, Date.now()))}
            accentColor={accent}
            tintColor={tint}
          />
        ))}
        <ToolTextField
          value={record.customCondition ?? ''}
          onChangeText={(text) => update(setOptional(record, 'customCondition', text, Date.now()))}
          placeholder={t('whatWorked.conditions.customPlaceholder')}
          accessibilityLabel={t('whatWorked.conditions.customLabel')}
          maxChars={TEXT_MAX}
          multiline={false}
        />
      </ToolStep>
    );
  }

  if (step === 'contribution' && record) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('whatWorked.steps.contribution')}
        progress={progressOf('contribution')}
        question={t('whatWorked.contribution.question')}
        help={t('whatWorked.contribution.help')}
        onBack={() => setStep('conditions')}
        primaryLabel={t('whatWorked.saveContinue')}
        onPrimary={() => setStep('idea')}
        secondaryLabel={t('whatWorked.skip')}
        onSecondary={() => setStep('idea')}>
        <ToolTextField
          value={record.ownContribution ?? ''}
          onChangeText={(text) => update(setOptional(record, 'ownContribution', text, Date.now()))}
          placeholder={t('whatWorked.contribution.placeholder')}
          accessibilityLabel={t('whatWorked.contribution.question')}
          maxChars={TEXT_MAX}
        />
      </ToolStep>
    );
  }

  if (step === 'idea' && record) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('whatWorked.steps.idea')}
        progress={progressOf('idea')}
        question={t('whatWorked.idea.question')}
        help={t('whatWorked.idea.help')}
        onBack={() => setStep('contribution')}
        primaryLabel={t('whatWorked.finish')}
        onPrimary={() => finish(record)}
        secondaryLabel={t('whatWorked.skip')}
        onSecondary={() => finish(setOptional(record, 'repeatIdea', '', Date.now()))}>
        <ToolTextField
          value={record.repeatIdea ?? ''}
          onChangeText={(text) => update(setOptional(record, 'repeatIdea', text, Date.now()))}
          placeholder={t('whatWorked.idea.placeholder')}
          accessibilityLabel={t('whatWorked.idea.question')}
          maxChars={TEXT_MAX}
        />
      </ToolStep>
    );
  }

  // ── The record ─────────────────────────────────────────────────────────────
  const result = shown ?? record;
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.icon} />
          <ThemedText type="small" style={{ color: theme.textMuted }}>{t('whatWorked.steps.result')}</ThemedText>
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
          <View style={[styles.crest, { backgroundColor: tint }]}>
            <Ionicons name="checkmark" size={22} color={accent} />
          </View>
          <ThemedText
            style={[styles.title, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) }]}>
            {t('whatWorked.result.title')}
          </ThemedText>

          {result ? (
            <>
              {filledMoments(result).map((moment, index) => (
                <ThemedText key={index} type="small" style={[styles.line, { color: theme.text }]}>
                  {moment}
                </ThemedText>
              ))}

              {hasConditions(result) ? (
                <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
                  {/* "may have helped" — never "because of". One good day is evidence, not a law. */}
                  <ThemedText type="smallBold" style={{ color: theme.text }}>{t('whatWorked.result.mayHaveHelped')}</ThemedText>
                  {result.conditions.map((condition) => (
                    <ThemedText key={condition} type="small" style={{ color: theme.textMuted }}>
                      · {t(`whatWorked.conditions.options.${condition}`)}
                    </ThemedText>
                  ))}
                  {result.customCondition ? (
                    <ThemedText type="small" style={{ color: theme.textMuted }}>· {result.customCondition}</ThemedText>
                  ) : null}
                </View>
              ) : null}

              {result.ownContribution ? (
                <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>{t('whatWorked.result.yourPart')}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>{result.ownContribution}</ThemedText>
                </View>
              ) : null}

              {result.repeatIdea ? (
                <View style={[styles.block, { backgroundColor: tint, borderColor: accent }]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>{t('whatWorked.result.tryAgain')}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.text }}>{result.repeatIdea}</ThemedText>
                </View>
              ) : null}
            </>
          ) : null}

          <ThemedText type="small" style={[styles.line, { color: theme.textMuted }]}>
            {t('whatWorked.result.private')}
          </ThemedText>

          {records.length > 1 ? (
            <View style={styles.historyBlock}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>{t('whatWorked.result.history')}</ThemedText>
              {records.slice(0, 5).map((past) => (
                <Pressable
                  key={past.id}
                  accessibilityRole="button"
                  onPress={() => setShown(past)}
                  style={({ pressed }) => [styles.historyRow, { borderColor: theme.hairline }, pressed && styles.pressed]}>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {filledMoments(past)[0] ?? ''}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {result ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRecord(result);
                setShown(null);
                setStep('moment');
              }}
              style={({ pressed }) => [styles.primary, { backgroundColor: accent }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>{t('whatWorked.result.edit')}</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRecord(null);
              setShown(null);
              setStep('opening');
            }}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <ThemedText type="small" style={{ color: theme.textMuted }}>{t('whatWorked.result.startOver')}</ThemedText>
          </Pressable>
          {result ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                store.remove(result.id);
                setRecord(null);
                setShown(null);
                setStep('opening');
              }}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <ThemedText type="small" style={{ color: theme.danger }}>{t('whatWorked.result.delete')}</ThemedText>
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
  crest: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { textAlign: START_TEXT_ALIGN },
  line: { textAlign: START_TEXT_ALIGN, lineHeight: 20 },
  block: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.one },
  historyBlock: { gap: Spacing.two },
  historyRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two, gap: Spacing.two },
  primary: { borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
  secondary: { paddingVertical: Spacing.two, alignItems: 'center' },
  pressed: { opacity: 0.75 },
});
