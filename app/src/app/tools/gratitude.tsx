/**
 * Gratitude Log — five things from the period that just passed, kept privately and read by nobody.
 *
 * THE FIVE SCREENS (PRD §5): the opening with its two rhythms, the five entries, an optional choice
 * of one to look at closely, an optional note about why it mattered, and the record itself.
 *
 * WHAT IS DELIBERATELY ABSENT, because the absence IS the product: no streak, no missed-day marker,
 * no catch-up, no target, no analysis of what was written. A person who writes five things on
 * Tuesday and nothing again for a month opens this screen to a warm invitation, not a reckoning.
 *
 * FIVE IS A FLOOR, NOT A TARGET. Four entries save as a draft and wait. The Save action is disabled
 * rather than hidden, and it says how many are left — an action that vanishes leaves people
 * wondering what they did wrong.
 *
 * PRIVACY (G1, D66): everything typed here stays on the device. No coach context, no themes, no
 * mood inference, no summary. See {@link ../../state/GratitudeStore}.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ToolOpening } from '@/components/tools/ToolOpening';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { paletteOfTool } from '@/core/tools/rooms';
import {
  addEntry,
  canAddEntry,
  canConfirm,
  chooseDeepened,
  confirmRecord,
  entryPoint,
  ENTRY_MAX_CHARS,
  history,
  filledCount,
  filledEntries,
  MIN_ENTRIES,
  perceivedLength,
  promptsFor,
  setEntryText,
  setWhyNote,
  startRecord,
  WHY_MAX_CHARS,
  type GratitudeCadence,
  type GratitudeRecord,
} from '@/core/tools/gratitude/model';
import { createId } from '@/core/util/id';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';
import { isGratitudeRecord } from '@/core/tools/gratitude/model';
import { useToolRecords } from '@/state/ToolRecordsStore';
import { useProfile } from '@/state/ProfileProvider';

type Step = 'opening' | 'entries' | 'deepen' | 'why' | 'result';

/** The tool wears its ROOM's colour — see `core/tools/rooms.ts`. */
const PALETTE = paletteOfTool('gratitude');

export default function GratitudeScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useToolRecords('gratitude', isGratitudeRecord);
  const cadence: GratitudeCadence = store.prefs.cadence === 'weekly' ? 'weekly' : 'daily';
  const { profile } = useProfile();
  const weekStartDay = profile.weekStartDay;

  const accent = theme[PALETTE.accent];
  const tint = theme[PALETTE.tint];

  const [step, setStep] = useState<Step>('opening');
  const [record, setRecord] = useState<GratitudeRecord | null>(null);
  /** The confirmed record being READ (returning, or just finished). */
  const [shown, setShown] = useState<GratitudeRecord | null>(null);

  // Returning: open this period's draft, or the newest confirmed record (PRD §6).
  useEffect(() => {
    if (!store.ready || step !== 'opening' || record || shown) return;
    const point = entryPoint(store.records, cadence, Date.now(), weekStartDay);
    if (point.kind === 'draft') {
      setRecord(point.record);
      setStep('entries');
    } else if (point.kind === 'latest') {
      setShown(point.record);
      setStep('result');
    }
  }, [store.ready, store.records, cadence, weekStartDay, step, record, shown]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tools');
  }, []);

  /** Every keystroke is saved. A ritual that loses four lines to a phone call is done once. */
  const update = useCallback(
    (next: GratitudeRecord) => {
      setRecord(next);
      store.put(next);
    },
    [store],
  );

  const begin = useCallback(
    (routeId?: string) => {
      const chosenCadence: GratitudeCadence = routeId === 'weekly' ? 'weekly' : 'daily';
      store.setPref('cadence', chosenCadence);
      const fresh = startRecord(
        createId('grat'),
        chosenCadence,
        Date.now(),
        (i) => createId(`ge${i}`),
        weekStartDay,
      );
      setShown(null);
      update(fresh);
      setStep('entries');
    },
    [store, update, weekStartDay],
  );

  const written = useMemo(() => history(store.records), [store.records]);
  const prompts = useMemo(() => promptsFor(written.length), [written.length]);

  if (!store.ready) return <ThemedView style={styles.container} />;

  if (step === 'opening') {
    return (
      <ToolOpening
        title={t('gratitude.title')}
        lead={t('gratitude.intro.lead')}
        outcomeLabel={t('opening.outcomeLabel')}
        outcome={t('gratitude.intro.outcome')}
        timeLabel={t('opening.timeLabel')}
        time={t('gratitude.intro.time')}
        chooseLabel={t('opening.chooseLabel')}
        routes={[
          { id: 'daily', title: t('gratitude.routes.daily.title'), blurb: t('gratitude.routes.daily.blurb'), time: t('gratitude.routes.daily.time') },
          { id: 'weekly', title: t('gratitude.routes.weekly.title'), blurb: t('gratitude.routes.weekly.blurb'), time: t('gratitude.routes.weekly.time') },
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

  const header = (label: string, onBack?: () => void) => (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back', { ns: 'common' })}
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
          <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
        </Pressable>
      ) : (
        <View style={styles.icon} />
      )}
      <ThemedText type="small" style={{ color: theme.textMuted }}>{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('close', { ns: 'common' })}
        onPress={close}
        hitSlop={8}
        style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
        <Ionicons name="close" size={22} color={theme.textMuted} />
      </Pressable>
    </View>
  );

  // ── The five entries ───────────────────────────────────────────────────────
  if (step === 'entries' && record) {
    const filled = filledCount(record);
    const remaining = Math.max(0, MIN_ENTRIES - filled);
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {header(t('gratitude.steps.entries'))}
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ThemedText
              style={[styles.question, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) }]}>
              {record.cadence === 'weekly' ? t('gratitude.entries.promptWeekly') : t('gratitude.entries.promptDaily')}
            </ThemedText>
            <ThemedText type="small" style={[styles.body, { color: theme.textMuted }]}>
              {t('gratitude.entries.help')}
            </ThemedText>

            {/* Five lights: structure, not a score (PRD §11). Paired with the numbers below. */}
            <View
              style={styles.lights}
              accessibilityRole="progressbar"
              accessibilityLabel={t('gratitude.entries.progress', { filled, total: MIN_ENTRIES })}>
              {Array.from({ length: MIN_ENTRIES }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.light,
                    { backgroundColor: i < filled ? accent : theme.hairline },
                  ]}
                />
              ))}
            </View>

            {record.entries.map((entry, index) => (
              <View key={entry.id} style={styles.entryRow}>
                <ThemedText type="small" style={{ color: theme.textMuted, minWidth: 16 }}>
                  {index + 1}
                </ThemedText>
                <TextInput
                  value={entry.text}
                  onChangeText={(text) => update(setEntryText(record, entry.id, text, Date.now()))}
                  placeholder={t('gratitude.entries.placeholder')}
                  placeholderTextColor={theme.textMuted}
                  maxLength={ENTRY_MAX_CHARS * 2}
                  accessibilityLabel={t('gratitude.entries.itemLabel', { index: index + 1 })}
                  style={[
                    styles.input,
                    { color: theme.text, borderBottomColor: theme.hairline, textAlign: START_TEXT_ALIGN },
                  ]}
                />
                {perceivedLength(entry.text) > ENTRY_MAX_CHARS ? (
                  <ThemedText type="small" style={{ color: theme.danger }}>
                    {perceivedLength(entry.text) - ENTRY_MAX_CHARS}
                  </ThemedText>
                ) : null}
              </View>
            ))}

            {canAddEntry(record) ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => update(addEntry(record, createId('ge'), Date.now()))}
                style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}>
                <Ionicons name="add" size={16} color={accent} />
                <ThemedText type="small" style={{ color: accent }}>{t('gratitude.entries.add')}</ThemedText>
              </Pressable>
            ) : null}

            <View style={[styles.prompts, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>{t('gratitude.prompts.title')}</ThemedText>
              {prompts.map((id) => (
                <ThemedText key={id} type="small" style={{ color: theme.textMuted }}>
                  · {t(`gratitude.prompts.${id}`)}
                </ThemedText>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canConfirm(record) }}
              disabled={!canConfirm(record)}
              onPress={() => setStep('deepen')}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: canConfirm(record) ? accent : theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: canConfirm(record) ? theme.background : theme.textMuted }}>
                {canConfirm(record)
                  ? t('gratitude.entries.save')
                  : t('gratitude.entries.remaining', { count: remaining })}
              </ThemedText>
            </Pressable>
            <ThemedText type="small" style={[styles.footnote, { color: theme.textMuted }]}>
              {t('gratitude.entries.draftSaved')}
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Look at one closely (optional) ─────────────────────────────────────────
  if (step === 'deepen' && record) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {header(t('gratitude.steps.deepen'), () => setStep('entries'))}
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ThemedText
              style={[styles.question, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) }]}>
              {t('gratitude.deepen.prompt')}
            </ThemedText>
            <ThemedText type="small" style={[styles.body, { color: theme.textMuted }]}>
              {t('gratitude.deepen.help')}
            </ThemedText>

            {filledEntries(record).map((entry) => {
              const selected = entry.id === record.deepenedEntryId;
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() =>
                    update(chooseDeepened(record, selected ? undefined : entry.id, Date.now()))
                  }
                  style={({ pressed }) => [
                    styles.choice,
                    {
                      backgroundColor: selected ? tint : theme.backgroundElement,
                      borderColor: selected ? accent : theme.hairline,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" style={{ color: theme.text }}>{entry.text}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep(record.deepenedEntryId ? 'why' : 'result')}
              style={({ pressed }) => [styles.primary, { backgroundColor: accent }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                {t('gratitude.deepen.continue')}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const finished = confirmRecord(chooseDeepened(record, undefined, Date.now()), Date.now());
                update(finished);
                setShown(finished);
                setStep('result');
              }}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <ThemedText type="small" style={{ color: theme.textMuted }}>{t('gratitude.deepen.skip')}</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Why it mattered (optional) ─────────────────────────────────────────────
  if (step === 'why' && record) {
    const note = record.whyNote ?? '';
    const over = perceivedLength(note) > WHY_MAX_CHARS;
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {header(t('gratitude.steps.why'), () => setStep('deepen'))}
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ThemedText
              style={[styles.question, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) }]}>
              {t('gratitude.why.prompt')}
            </ThemedText>
            <ThemedText type="small" style={[styles.body, { color: theme.textMuted }]}>
              {t('gratitude.why.help')}
            </ThemedText>
            <TextInput
              value={note}
              onChangeText={(text) => update(setWhyNote(record, text, Date.now()))}
              placeholder={t('gratitude.why.placeholder')}
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={WHY_MAX_CHARS * 2}
              accessibilityLabel={t('gratitude.why.prompt')}
              style={[
                styles.textarea,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: over ? theme.danger : theme.hairline, textAlign: START_TEXT_ALIGN },
              ]}
            />
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const finished = confirmRecord(record, Date.now());
                update(finished);
                setShown(finished);
                setStep('result');
              }}
              style={({ pressed }) => [styles.primary, { backgroundColor: accent }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                {t('gratitude.why.save')}
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── The record ─────────────────────────────────────────────────────────────
  const result = shown ?? record;
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {header(t('gratitude.steps.result'))}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.crest, { backgroundColor: tint }]}>
            <Ionicons name="sparkles-outline" size={22} color={accent} />
          </View>
          <ThemedText
            style={[styles.question, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) }]}>
            {t('gratitude.result.title', { count: result ? filledEntries(result).length : MIN_ENTRIES })}
          </ThemedText>
          <ThemedText type="small" style={[styles.body, { color: theme.textMuted }]}>
            {t('gratitude.result.private')}
          </ThemedText>

          {result
            ? filledEntries(result).map((entry, index) => (
                <View key={entry.id} style={styles.resultRow}>
                  <ThemedText type="small" style={{ color: accent, minWidth: 16 }}>{index + 1}</ThemedText>
                  <View style={styles.resultText}>
                    <ThemedText type="small" style={{ color: theme.text }}>{entry.text}</ThemedText>
                    {entry.id === result.deepenedEntryId && result.whyNote ? (
                      <ThemedText type="small" style={{ color: theme.textMuted }}>{result.whyNote}</ThemedText>
                    ) : null}
                  </View>
                </View>
              ))
            : null}
        </ScrollView>

        <View style={styles.footer}>
          {result && result.status === 'confirmed' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRecord(result);
                setShown(null);
                setStep('entries');
              }}
              style={({ pressed }) => [styles.primary, { backgroundColor: accent }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>{t('gratitude.result.edit')}</ThemedText>
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
            <ThemedText type="small" style={{ color: theme.textMuted }}>{t('gratitude.result.startNew')}</ThemedText>
          </Pressable>
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
  question: { textAlign: START_TEXT_ALIGN },
  body: { textAlign: START_TEXT_ALIGN, lineHeight: 20 },
  lights: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginVertical: Spacing.two },
  light: { width: 12, height: 12, borderRadius: Radius.pill },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { flex: 1, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, fontSize: 15 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  prompts: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.one },
  choice: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three },
  textarea: { minHeight: 120, borderRadius: Radius.input, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, fontSize: 15 },
  crest: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  resultRow: { flexDirection: 'row', gap: Spacing.two },
  resultText: { flex: 1, gap: Spacing.one },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two, gap: Spacing.two },
  primary: { borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
  secondary: { paddingVertical: Spacing.two, alignItems: 'center' },
  footnote: { textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
