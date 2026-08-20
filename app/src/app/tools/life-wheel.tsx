/**
 * Life Wheel — the first real tool in the Tools tab, and the shape every one after it follows:
 * something worth doing on its own, which also leaves the app knowing something ({@link
 * ../../core/tools/lifeWheel/signals}).
 *
 * THE FLOW. Eight areas, one screen each, two questions per screen: how it is going, and how much it
 * matters right now. The wheel sits above them and marks WHERE IN YOUR LIFE the question is — the
 * active sector keeps full colour while the rest drop back, which is the founder's own note on his
 * design. When the eighth is answered the wheel comes back to full strength and becomes the reading.
 *
 * IT IS RESUMABLE, on purpose. Eight areas is more than one sitting for some people, and a tool that
 * loses your answers when the phone rings is a tool taken once. Every answer is written as it is
 * given, and "Save and exit" is a real exit rather than an abandon.
 *
 * DIFFERENT FROM THE REFERENCE TOOL the founder sent, deliberately (his instruction): our wording is
 * our own, the order is ours, and the second question does not exist in the original at all. What
 * that changes is not cosmetic — see the model's header.
 *
 * PRIVACY (G1): the answers are on-device only. Never synced, never logged, never a DomainEvent.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LifeWheelChart, AREA_COLOR } from '@/components/tools/LifeWheelChart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { displayFont, displayScale } from '@/constants/displayFont';
import {
  LIFE_AREAS,
  LIFE_WHEEL_MAX,
  LIFE_WHEEL_MIN,
  answeredCount,
  clampScore,
  isComplete,
  nextArea,
  readWheel,
  recordArea,
  type LifeAreaId,
  type LifeWheelAnswers,
} from '@/core/tools/lifeWheel/model';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useLifeWheel } from '@/state/LifeWheelStore';

export default function LifeWheelScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useLifeWheel();

  /** The area on screen. Follows the store until the person moves, then leads. */
  const [area, setArea] = useState<LifeAreaId | null>(null);
  const [satisfaction, setSatisfaction] = useState(5);
  const [weight, setWeight] = useState(5);
  /** True once the eighth area is answered — the wheel stops being a place marker. */
  const [showResult, setShowResult] = useState(false);

  // Open on the first unanswered area (or the reading, for a wheel already finished).
  useEffect(() => {
    if (!store.ready || area !== null || showResult) return;
    const next = nextArea(store.answers);
    if (next === null) setShowResult(true);
    else setArea(next);
  }, [store.ready, store.answers, area, showResult]);

  // Carry a previous answer back in, so revisiting an area shows what was said rather than 5/5.
  useEffect(() => {
    if (!area) return;
    const previous = store.answers[area];
    setSatisfaction(previous?.satisfaction ?? 5);
    setWeight(previous?.weight ?? 5);
  }, [area, store.answers]);

  const saveAndContinue = useCallback(() => {
    if (!area) return;
    const next = recordArea(store.answers, area, { satisfaction, weight });
    store.save(next);
    const following = nextArea(next);
    if (following === null) {
      setArea(null);
      setShowResult(true);
    } else {
      setArea(following);
    }
  }, [area, satisfaction, weight, store]);

  const values = Object.fromEntries(
    LIFE_AREAS.map((id) => [id, store.answers[id]?.satisfaction]).filter(([, v]) => v !== undefined),
  ) as Partial<Record<LifeAreaId, number>>;

  const reading = showResult ? readWheel(store.answers) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/tools'))}
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Ionicons
              name={isRTL() ? 'chevron-forward' : 'chevron-back'}
              size={22}
              color={theme.text}
            />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText type="displaySmall">{t('lifeWheel.title')}</ThemedText>
            {!showResult ? (
              <ThemedText type="small" style={{ color: theme.tint }}>
                {t('lifeWheel.progress', {
                  current: Math.min(answeredCount(store.answers) + 1, LIFE_AREAS.length),
                  total: LIFE_AREAS.length,
                })}
              </ThemedText>
            ) : null}
          </View>
          {!showResult ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('lifeWheel.saveExit')}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/tools'))}
              style={({ pressed }) => [
                styles.exitButton,
                { borderColor: theme.tint },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" style={{ color: theme.tint }}>
                {t('lifeWheel.saveExit')}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {area && !showResult ? (
            <>
              <ThemedText
                style={[
                  styles.question,
                  { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(22 * displayScale()) },
                ]}>
                {t('lifeWheel.satisfaction', { area: t(`lifeWheel.areas.${area}`) })}
              </ThemedText>
              <ThemedText type="small" style={[styles.blurb, { color: theme.textSecondary }]}>
                {t(`lifeWheel.blurb.${area}`)}
              </ThemedText>

              <View style={styles.wheelWrap}>
                <LifeWheelChart values={{ ...values, [area]: satisfaction }} active={area} />
              </View>

              <Stepper
                label={t('lifeWheel.satisfaction', { area: t(`lifeWheel.areas.${area}`) })}
                low={t('lifeWheel.scale.satisfactionLow')}
                high={t('lifeWheel.scale.satisfactionHigh')}
                value={satisfaction}
                accent={AREA_COLOR[area]}
                onChange={setSatisfaction}
              />

              <ThemedText type="small" style={[styles.secondQuestion, { color: theme.text }]}>
                {t('lifeWheel.weight')}
              </ThemedText>
              <Stepper
                label={t('lifeWheel.weight')}
                low={t('lifeWheel.scale.weightLow')}
                high={t('lifeWheel.scale.weightHigh')}
                value={weight}
                accent={theme.tint}
                onChange={setWeight}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('lifeWheel.saveContinue')}
                onPress={saveAndContinue}
                style={({ pressed }) => [
                  styles.cta,
                  { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {t('lifeWheel.saveContinue')}
                </ThemedText>
                <Ionicons
                  name={isRTL() ? 'chevron-back' : 'chevron-forward'}
                  size={16}
                  color={theme.backgroundElement}
                />
              </Pressable>

              <ThemedText type="small" style={[styles.footnote, { color: theme.textMuted }]}>
                {t('lifeWheel.noRightAnswers')}
              </ThemedText>
            </>
          ) : null}

          {reading ? (
            <>
              <ThemedText
                style={[
                  styles.question,
                  { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) },
                ]}>
                {t('lifeWheel.result.title')}
              </ThemedText>
              <ThemedText type="small" style={[styles.blurb, { color: theme.textSecondary }]}>
                {t('lifeWheel.result.lead')}
              </ThemedText>

              <View style={styles.wheelWrap}>
                <LifeWheelChart values={values} active={null} />
              </View>

              <View style={styles.findings}>
                {reading.pressing.length === 0 ? (
                  <Finding text={t('lifeWheel.result.pressingNone')} />
                ) : reading.pressing.length === 1 ? (
                  <Finding
                    text={t('lifeWheel.result.pressingOne', {
                      area: t(`lifeWheel.areas.${reading.pressing[0].area}`),
                      weight: reading.pressing[0].weight,
                      satisfaction: reading.pressing[0].satisfaction,
                    })}
                  />
                ) : (
                  <Finding
                    text={t('lifeWheel.result.pressingTwo', {
                      first: t(`lifeWheel.areas.${reading.pressing[0].area}`),
                      second: t(`lifeWheel.areas.${reading.pressing[1].area}`),
                    })}
                  />
                )}

                {reading.strongest ? (
                  <Finding
                    text={t('lifeWheel.result.strongest', {
                      area: t(`lifeWheel.areas.${reading.strongest.area}`),
                    })}
                  />
                ) : null}

                {/* Said out loud, because it is the whole difference from the tool this came from. */}
                <Finding text={t('lifeWheel.result.lowButFine')} muted />
                <Finding text={t('lifeWheel.result.next')} muted />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('lifeWheel.result.done')}
                onPress={() => router.replace('/(tabs)/tools')}
                style={({ pressed }) => [
                  styles.cta,
                  { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {t('lifeWheel.result.done')}
                </ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('lifeWheel.result.retake')}
                onPress={() => {
                  store.save({});
                  setShowResult(false);
                  setArea(LIFE_AREAS[0]);
                }}
                style={({ pressed }) => [styles.retake, pressed && styles.pressed]}>
                <ThemedText type="small" style={{ color: theme.tint }}>
                  {t('lifeWheel.result.retake')}
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Finding({ text, muted = false }: { text: string; muted?: boolean }) {
  const theme = useTheme();
  return (
    <ThemedText
      type="small"
      style={[styles.finding, { color: muted ? theme.textMuted : theme.text }]}>
      {text}
    </ThemedText>
  );
}

/**
 * The 0–10 control: a minus, a value, a plus, and the two ends named in words.
 *
 * DELIBERATELY NOT A DRAGGABLE SLIDER. The design shows one, but a slider needs a gesture handler on
 * a track whose width has to be measured, and its value is hard to land precisely with a thumb —
 * while the difference between a 6 and a 7 here is the difference between a finding and nothing. The
 * steppers are exact, reachable one-handed and readable by a screen reader. If the drag is wanted
 * later it is an addition to this control, not a replacement for it.
 */
function Stepper({
  label,
  low,
  high,
  value,
  accent,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number;
  accent: string;
  onChange: (next: number) => void;
}) {
  const theme = useTheme();
  const step = (delta: number) => onChange(clampScore(value + delta));

  return (
    <View style={styles.stepperBlock}>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} −`}
          disabled={value <= LIFE_WHEEL_MIN}
          onPress={() => step(-1)}
          style={({ pressed }) => [
            styles.stepButton,
            { borderColor: theme.hairline },
            (pressed || value <= LIFE_WHEEL_MIN) && styles.pressed,
          ]}>
          <Ionicons name="remove" size={18} color={theme.text} />
        </Pressable>

        <View style={styles.track}>
          <View style={[styles.trackBase, { backgroundColor: theme.backgroundSelected }]} />
          <View
            style={[
              styles.trackFill,
              { backgroundColor: accent, width: `${(value / LIFE_WHEEL_MAX) * 100}%` },
            ]}
          />
          <ThemedText
            accessibilityLabel={`${label}: ${value} / ${LIFE_WHEEL_MAX}`}
            style={[
              styles.value,
              { color: theme.text, fontFamily: displayFont('strong') },
            ]}>
            {value}
            <ThemedText type="small" style={{ color: theme.textMuted }}>{` / ${LIFE_WHEEL_MAX}`}</ThemedText>
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} +`}
          disabled={value >= LIFE_WHEEL_MAX}
          onPress={() => step(1)}
          style={({ pressed }) => [
            styles.stepButton,
            { borderColor: theme.hairline },
            (pressed || value >= LIFE_WHEEL_MAX) && styles.pressed,
          ]}>
          <Ionicons name="add" size={18} color={theme.text} />
        </Pressable>
      </View>
      <View style={styles.ends}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>{low}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textMuted }}>{high}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, alignItems: 'center' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  exitButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  question: { textAlign: 'center', lineHeight: 30 },
  blurb: { textAlign: 'center' },
  wheelWrap: { alignItems: 'center', paddingVertical: Spacing.three },
  secondQuestion: { textAlign: 'center', paddingTop: Spacing.three },
  stepperBlock: { gap: Spacing.one },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  trackBase: { height: 6, borderRadius: 3, alignSelf: 'stretch' },
  trackFill: { position: 'absolute', top: 0, start: 0, height: 6, borderRadius: 3 },
  value: { fontSize: 22, paddingTop: Spacing.one },
  ends: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 52 },
  findings: { gap: Spacing.two, paddingTop: Spacing.two },
  finding: { lineHeight: 21 },
  cta: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.button,
  },
  retake: { alignItems: 'center', paddingVertical: Spacing.three },
  footnote: { textAlign: 'center', paddingTop: Spacing.two },
  pressed: { opacity: 0.6 },
});
