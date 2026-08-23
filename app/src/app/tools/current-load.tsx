/**
 * What Am I Carrying Right Now? — one finished week, a hundred tiles, and no verdict.
 *
 * SEVEN SCREENS (PRD §7): the opening with its two routes, the week itself, the allocation mosaic,
 * energy per area, the area that got too little room, one small shift, and the map.
 *
 * WHAT IT WILL NOT DO. It does not read the calendar, does not import Journey activity, does not
 * reschedule anything, and does not call anybody productive, lazy, balanced or overloaded. It also
 * refuses to speak about a TREND until three comparable weeks exist — two points make a line through
 * anything, and a story about somebody's life is not ours to invent.
 *
 * ONLY FINISHED WEEKS. The week being lived is never offered: nobody can describe a week they are
 * standing in the middle of, and asking them to would produce a tidy answer rather than a true one.
 *
 * ACCESSIBILITY: the mosaic is one way in and the plus/minus rows beside it are the other. Nothing
 * requires a drag, and every area states its number in words.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoadMosaic } from '@/components/tools/LoadMosaic';
import { ToolChoiceCard } from '@/components/tools/ToolChoiceCard';
import { ToolOpening } from '@/components/tools/ToolOpening';
import { ToolStep } from '@/components/tools/ToolStep';
import { ToolTextField } from '@/components/tools/ToolTextField';
import { displayFont, displayScale } from '@/constants/displayFont';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  addUnits,
  canConfirm,
  confirmSnapshot,
  dominantAreas,
  draining,
  eligibleWeeks,
  energising,
  history,
  isCurrentLoadSnapshot,
  LOAD_CATEGORIES,
  remainingUnits,
  setEnergy,
  setExperiment,
  setRepresentative,
  setUnderAllocated,
  startSnapshot,
  TOTAL_UNITS,
  type CategoryCode,
  type CurrentLoadSnapshot,
  type EnergyRating,
} from '@/core/tools/currentLoad/model';
import { paletteOfTool } from '@/core/tools/rooms';
import { createId } from '@/core/util/id';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';
import { useProfile } from '@/state/ProfileProvider';
import { useToolRecords } from '@/state/ToolRecordsStore';

type Step = 'opening' | 'week' | 'allocate' | 'energy' | 'missing' | 'shift' | 'result';
const SEQUENCE: Step[] = ['week', 'allocate', 'energy', 'missing', 'shift'];
/** The tool wears its ROOM's colour — see `core/tools/rooms.ts`. */
const PALETTE = paletteOfTool('currentLoad');
const ENERGY_STEPS: EnergyRating[] = [-2, -1, 0, 1, 2];

/**
 * One hue per area. Drawn from the palette's existing accents rather than new colour: these mark
 * WHICH AREA, never how well it went, so they must not read as good or bad (PRD §12).
 */
const AREA_TINTS: Record<string, keyof typeof Colors.light> = {
  work: 'teal',
  family: 'purple',
  health: 'success',
  relationships: 'coral',
  dreams: 'blue',
  rest: 'gold',
  errands: 'tealStrong',
  scattered: 'purpleStrong',
};

export default function CurrentLoadScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useToolRecords('currentLoad', isCurrentLoadSnapshot);
  const { profile } = useProfile();

  const accent = theme[PALETTE.accent];
  const tint = theme[PALETTE.tint];

  const [step, setStep] = useState<Step>('opening');
  const [snapshot, setSnapshot] = useState<CurrentLoadSnapshot | null>(null);
  const [shown, setShown] = useState<CurrentLoadSnapshot | null>(null);
  const [selected, setSelected] = useState<CategoryCode | null>('work');

  const records = useMemo(() => history(store.records), [store.records]);
  const weeks = useMemo(
    () => eligibleWeeks(Date.now(), profile.weekStartDay),
    [profile.weekStartDay],
  );

  useEffect(() => {
    if (!store.ready || step !== 'opening' || snapshot || shown) return;
    const latest = records[0];
    if (latest) {
      setShown(latest);
      setStep('result');
    }
  }, [store.ready, records, step, snapshot, shown]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tools');
  }, []);

  const update = useCallback(
    (next: CurrentLoadSnapshot) => {
      setSnapshot(next);
      store.put(next);
    },
    [store],
  );

  const begin = useCallback(
    (routeId?: string) => {
      setShown(null);
      const week = weeks[0];
      if (!week) return;
      update(startSnapshot(createId('load'), week, Date.now()));
      // "Last week" goes straight to the tiles; "another week" stops to choose one first.
      setStep(routeId === 'choose' ? 'week' : 'allocate');
    },
    [update, weeks],
  );

  const labelFor = useCallback(
    (code: CategoryCode) => {
      const known = (LOAD_CATEGORIES as readonly string[]).includes(code);
      if (known) return t(`currentLoad.areas.${code}`);
      const custom = snapshot?.allocations.find((a) => a.code === code)?.customLabel;
      return custom ?? t('currentLoad.areas.custom');
    },
    [snapshot, t],
  );

  const colorFor = useCallback(
    (code: CategoryCode) => {
      const key = AREA_TINTS[code];
      return key ? (theme[key] as string) : accent;
    },
    [theme, accent],
  );

  const weekLabel = useCallback(
    (week: { weekStart: number; weekEnd: number }) => {
      const from = new Date(week.weekStart);
      const to = new Date(week.weekEnd);
      const fmt = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}`;
      return `${fmt(from)} – ${fmt(to)}`;
    },
    [],
  );

  const common = {
    accentColor: accent,
    onClose: close,
    backLabel: t('back', { ns: 'common' }),
    closeLabel: t('close', { ns: 'common' }),
  };
  const progressOf = (current: Step) => (SEQUENCE.indexOf(current) + 1) / SEQUENCE.length;

  if (!store.ready) return <ThemedView style={styles.container} />;

  if (step === 'opening') {
    return (
      <ToolOpening
        title={t('currentLoad.title')}
        lead={t('currentLoad.intro.lead')}
        outcomeLabel={t('opening.outcomeLabel')}
        outcome={t('currentLoad.intro.outcome')}
        timeLabel={t('opening.timeLabel')}
        time={t('currentLoad.intro.time')}
        chooseLabel={t('opening.chooseLabel')}
        routes={[
          { id: 'last', title: t('currentLoad.routes.last.title'), blurb: t('currentLoad.routes.last.blurb'), time: t('currentLoad.routes.last.time') },
          { id: 'choose', title: t('currentLoad.routes.choose.title'), blurb: t('currentLoad.routes.choose.blurb'), time: t('currentLoad.routes.choose.time') },
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

  if (step === 'week' && snapshot) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('currentLoad.steps.week')}
        progress={progressOf(step)}
        question={t('currentLoad.week.question')}
        help={t('currentLoad.week.help')}
        primaryLabel={t('currentLoad.continue')}
        onPrimary={() => setStep('allocate')}>
        {weeks.map((week, index) => (
          <ToolChoiceCard
            key={week.weekStart}
            label={index === 0 ? t('currentLoad.week.lastWeek') : t('currentLoad.week.earlier')}
            detail={weekLabel(week)}
            selected={snapshot.weekStart === week.weekStart}
            onPress={() =>
              update({ ...snapshot, weekStart: week.weekStart, weekEnd: week.weekEnd, updatedAt: Date.now() })
            }
            accentColor={accent}
            tintColor={tint}
            role="radio"
          />
        ))}
        <ThemedText type="smallBold" style={{ color: theme.text }}>{t('currentLoad.week.representative')}</ThemedText>
        {(['yes', 'unsure', 'no'] as const).map((value) => (
          <ToolChoiceCard
            key={value}
            label={t(`currentLoad.week.rep.${value}`)}
            selected={snapshot.representative === value}
            onPress={() => update(setRepresentative(snapshot, value, Date.now()))}
            accentColor={accent}
            tintColor={tint}
            role="radio"
          />
        ))}
      </ToolStep>
    );
  }

  if (step === 'allocate' && snapshot) {
    const left = remainingUnits(snapshot);
    return (
      <ToolStep
        {...common}
        stepLabel={t('currentLoad.steps.allocate')}
        progress={progressOf(step)}
        question={t('currentLoad.allocate.question')}
        help={t('currentLoad.allocate.help')}
        onBack={() => setStep('week')}
        primaryLabel={
          canConfirm(snapshot) ? t('currentLoad.continue') : t('currentLoad.allocate.remaining', { count: left })
        }
        primaryDisabled={!canConfirm(snapshot)}
        onPrimary={() => setStep('energy')}
        footnote={t('currentLoad.allocate.noHours')}>
        <LoadMosaic
          allocations={snapshot.allocations}
          colorFor={colorFor}
          selected={selected}
          onGive={() => (selected ? update(addUnits(snapshot, selected, 1, Date.now())) : undefined)}
          onTakeBack={(code) => update(addUnits(snapshot, code, -1, Date.now()))}
          accessibilityLabel={t('currentLoad.allocate.gridLabel', { used: TOTAL_UNITS - left, total: TOTAL_UNITS })}
        />

        {LOAD_CATEGORIES.map((code) => {
          const units = snapshot.allocations.find((a) => a.code === code)?.units ?? 0;
          const isSelected = selected === code;
          return (
            <View key={code} style={styles.areaRow}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${labelFor(code)}. ${t('currentLoad.allocate.unitsLabel', { count: units })}`}
                onPress={() => setSelected(code)}
                style={({ pressed }) => [
                  styles.areaName,
                  { borderColor: isSelected ? accent : 'transparent' },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.swatch, { backgroundColor: colorFor(code) }]} />
                <ThemedText type="small" style={{ color: theme.text }}>{labelFor(code)}</ThemedText>
              </Pressable>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('currentLoad.allocate.less')} ${labelFor(code)}`}
                  onPress={() => update(addUnits(snapshot, code, -5, Date.now()))}
                  hitSlop={6}>
                  <Ionicons name="remove-circle-outline" size={22} color={theme.textMuted} />
                </Pressable>
                <ThemedText type="smallBold" style={[styles.units, { color: theme.text }]}>{units}</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('currentLoad.allocate.more')} ${labelFor(code)}`}
                  onPress={() => {
                    setSelected(code);
                    update(addUnits(snapshot, code, 5, Date.now()));
                  }}
                  hitSlop={6}>
                  <Ionicons name="add-circle-outline" size={22} color={left > 0 ? accent : theme.textMuted} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ToolStep>
    );
  }

  if (step === 'energy' && snapshot) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('currentLoad.steps.energy')}
        progress={progressOf(step)}
        question={t('currentLoad.energy.question')}
        help={t('currentLoad.energy.help')}
        onBack={() => setStep('allocate')}
        primaryLabel={t('currentLoad.continue')}
        onPrimary={() => setStep('missing')}>
        {snapshot.allocations.map((allocation) => (
          <View key={allocation.code} style={styles.energyBlock}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>{labelFor(allocation.code)}</ThemedText>
            <View style={styles.energyRow}>
              {ENERGY_STEPS.map((rating) => {
                const active = snapshot.energy[allocation.code] === rating;
                return (
                  <Pressable
                    key={rating}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${labelFor(allocation.code)}: ${t(`currentLoad.energy.scale.${rating}`)}`}
                    onPress={() => update(setEnergy(snapshot, allocation.code, rating, Date.now()))}
                    style={({ pressed }) => [
                      styles.energyStep,
                      {
                        backgroundColor: active ? accent : theme.backgroundElement,
                        borderColor: active ? accent : theme.hairline,
                      },
                      pressed && styles.pressed,
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.energyLegend}>
              <ThemedText type="small" style={{ color: theme.textMuted }}>{t('currentLoad.energy.scale.-2')}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>{t('currentLoad.energy.scale.2')}</ThemedText>
            </View>
          </View>
        ))}
      </ToolStep>
    );
  }

  if (step === 'missing' && snapshot) {
    return (
      <ToolStep
        {...common}
        stepLabel={t('currentLoad.steps.missing')}
        progress={progressOf(step)}
        question={t('currentLoad.missing.question')}
        help={t('currentLoad.missing.help')}
        onBack={() => setStep('energy')}
        primaryLabel={t('currentLoad.continue')}
        onPrimary={() => setStep('shift')}>
        {snapshot.allocations.map((allocation) => (
          <ToolChoiceCard
            key={allocation.code}
            label={labelFor(allocation.code)}
            selected={snapshot.underAllocated === allocation.code}
            onPress={() =>
              update(
                setUnderAllocated(
                  snapshot,
                  snapshot.underAllocated === allocation.code ? undefined : allocation.code,
                  Date.now(),
                ),
              )
            }
            accentColor={accent}
            tintColor={tint}
            role="radio"
          />
        ))}
        <ToolChoiceCard
          label={t('currentLoad.missing.none')}
          selected={snapshot.underAllocated === undefined}
          onPress={() => update(setUnderAllocated(snapshot, undefined, Date.now()))}
          accentColor={accent}
          tintColor={tint}
          role="radio"
        />
      </ToolStep>
    );
  }

  if (step === 'shift' && snapshot) {
    const finish = (withExperiment: boolean) => {
      const base = withExperiment ? snapshot : setExperiment(snapshot, '', Date.now());
      const done = confirmSnapshot(base, Date.now());
      update(done);
      setShown(done);
      setStep('result');
    };
    return (
      <ToolStep
        {...common}
        stepLabel={t('currentLoad.steps.shift')}
        progress={progressOf(step)}
        question={t('currentLoad.shift.question')}
        help={t('currentLoad.shift.help')}
        onBack={() => setStep('missing')}
        primaryLabel={t('currentLoad.finish')}
        onPrimary={() => finish(true)}
        secondaryLabel={t('currentLoad.shift.skip')}
        onSecondary={() => finish(false)}>
        <ToolTextField
          value={snapshot.experiment ?? ''}
          onChangeText={(text) => update(setExperiment(snapshot, text, Date.now()))}
          placeholder={t('currentLoad.shift.placeholder')}
          accessibilityLabel={t('currentLoad.shift.question')}
          maxChars={200}
        />
      </ToolStep>
    );
  }

  // ── The map ────────────────────────────────────────────────────────────────
  const result = shown ?? snapshot;
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.icon} />
          <ThemedText type="small" style={{ color: theme.textMuted }}>{t('currentLoad.steps.result')}</ThemedText>
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
            style={[styles.title, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) }]}>
            {t('currentLoad.result.title')}
          </ThemedText>
          {result ? (
            <ThemedText type="small" style={[styles.line, { color: theme.textMuted }]}>
              {weekLabel(result)}
            </ThemedText>
          ) : null}

          {result ? (
            <>
              <LoadMosaic
                allocations={result.allocations}
                colorFor={colorFor}
                selected={null}
                onGive={() => {}}
                onTakeBack={() => {}}
                accessibilityLabel={t('currentLoad.result.gridLabel')}
              />

              <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
                {result.allocations.map((allocation) => (
                  <View key={allocation.code} style={styles.legendRow}>
                    <View style={[styles.swatch, { backgroundColor: colorFor(allocation.code) }]} />
                    <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>{labelFor(allocation.code)}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textMuted }}>{allocation.units}</ThemedText>
                  </View>
                ))}
              </View>

              {/* Description in the person's own terms. No verdict, and no word about balance. */}
              <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
                <ThemedText type="small" style={{ color: theme.text }}>
                  {t('currentLoad.result.mostRoom', {
                    areas: dominantAreas(result).map(labelFor).join(', '),
                  })}
                </ThemedText>
                {energising(result).length > 0 ? (
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {t('currentLoad.result.gaveEnergy', { areas: energising(result).map(labelFor).join(', ') })}
                  </ThemedText>
                ) : null}
                {draining(result).length > 0 ? (
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {t('currentLoad.result.tookEnergy', { areas: draining(result).map(labelFor).join(', ') })}
                  </ThemedText>
                ) : null}
                {result.underAllocated ? (
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {t('currentLoad.result.tooLittle', { area: labelFor(result.underAllocated) })}
                  </ThemedText>
                ) : null}
              </View>

              {result.experiment ? (
                <View style={[styles.block, { backgroundColor: tint, borderColor: accent }]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>{t('currentLoad.result.experiment')}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.text }}>{result.experiment}</ThemedText>
                </View>
              ) : null}
            </>
          ) : null}

          <ThemedText type="small" style={[styles.line, { color: theme.textMuted }]}>
            {t('currentLoad.result.private')}
          </ThemedText>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSnapshot(null);
              setShown(null);
              setStep('opening');
            }}
            style={({ pressed }) => [styles.primary, { backgroundColor: accent }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>{t('currentLoad.result.another')}</ThemedText>
          </Pressable>
          {result ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                store.remove(result.id);
                setSnapshot(null);
                setShown(null);
                setStep('opening');
              }}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <ThemedText type="small" style={{ color: theme.danger }}>{t('currentLoad.result.delete')}</ThemedText>
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
  block: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  areaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  areaName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  units: { minWidth: 28, textAlign: 'center' },
  energyBlock: { gap: Spacing.two },
  energyRow: { flexDirection: 'row', gap: Spacing.two },
  energyStep: { flex: 1, height: 28, borderRadius: Radius.chip, borderWidth: 1 },
  energyLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two, gap: Spacing.two },
  primary: { borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
  secondary: { paddingVertical: Spacing.two, alignItems: 'center' },
  pressed: { opacity: 0.75 },
});
