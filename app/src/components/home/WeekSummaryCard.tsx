/**
 * WeekSummaryCard — the week as a chapter, not as another list (2026-08-19 redesign).
 *
 * Home now tells the week twice on purpose, and the two are doing different jobs: the day strip
 * answers *what is on today*, and this answers *how is my week going*. The founder specified it as a
 * new module with three numbers — Steps done since the week began, the day streak, and the share of
 * this week's Steps that are done — over a dusk.
 *
 * WHY THIS IS THE ONE PICTURE-LIKE SURFACE IN THE APP. Everything else on Home is about a task. This
 * is about a stretch of time, and a horizon is what makes a stretch of time feel like one. It is
 * drawn in code rather than shipped as an image for three reasons that all matter here: it re-tones
 * for the light theme instead of looking like a photograph pasted onto paper, it stays sharp at any
 * screen size, and it costs nothing to download — which is what lets the whole redesign travel over
 * the air to a build that is already on the partner's phone.
 *
 * THE SENTENCE IS NOT A COMPLIMENT. It reports the week back: wide open, just started, building,
 * strong, finished. A card that says "amazing work!" at 8% would be the app flattering someone
 * instead of telling them where they are, and this product's whole promise is the second thing.
 *
 * Presentational only — the caller supplies the numbers.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { moodFor } from '@/core/util/weekByDay';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export function WeekSummaryCard({
  done,
  total,
  streak,
}: {
  /** Steps reported done since the week began. */
  done: number;
  /** Every Step this week holds. */
  total: number;
  /** The current day streak. */
  streak: number;
}) {
  const theme = useTheme();
  const { t } = useAddressedTranslation('home');
  const dark = useColorScheme() === 'dark';
  const progress = total > 0 ? done / total : 0;
  const pct = Math.round(progress * 100);
  const mood = moodFor(done, total);
  // Ink is chosen for the DUSK, not from the page: in light the card is a warm peach that near-black
  // still reads on, and in dark it is an evening that wants near-white. Either way it is the card's
  // own contrast, never the theme's text colour landing on an unrelated ground.
  const ink = dark ? '#F4EDE7' : '#2A1F1A';
  const inkSoft = dark ? 'rgba(244,237,231,0.72)' : 'rgba(42,31,26,0.66)';
  const trackColor = dark ? 'rgba(244,237,231,0.18)' : 'rgba(42,31,26,0.14)';

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[theme.sunsetFrom, theme.sunsetMid, theme.sunsetTo]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.card}>
        {/* The dusk itself: a sun with its halo, and two ridges. Texture, never content — it is
            hidden from screen readers, which have the numbers below in words. */}
        <View
          style={styles.scene}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Svg width="100%" height="100%" viewBox="0 0 340 84" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={theme.sunsetSun} stopOpacity={dark ? 0.55 : 0.45} />
                <Stop offset="1" stopColor={theme.sunsetSun} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="276" cy="74" r="40" fill="url(#halo)" />
            <Circle cx="276" cy="74" r="10" fill={theme.sunsetSun} opacity={dark ? 0.85 : 0.7} />
            <Path
              d="M0 84 C46 66 88 74 130 64 C176 53 212 62 248 56 C286 49 314 59 340 52 L340 84 Z"
              fill={dark ? '#1C1522' : '#E4C6AE'}
              opacity={dark ? 0.92 : 0.7}
            />
            <Path
              d="M0 84 C54 76 96 80 140 76 C190 70 226 77 264 72 C300 67 320 74 340 70 L340 84 Z"
              fill={dark ? '#120E18' : '#D9B49B'}
              opacity={dark ? 0.96 : 0.8}
            />
          </Svg>
        </View>

        <ThemedText type="displaySmall" style={{ color: ink }}>
          {t('week.summary.title')}
        </ThemedText>
        <ThemedText type="small" style={{ color: inkSoft }}>
          {t(`week.summary.mood.${mood}`)}
        </ThemedText>

        <View style={[styles.track, { backgroundColor: trackColor }]}>
          <View
            style={[styles.fill, { backgroundColor: theme.sunsetSun, width: `${Math.max(pct, 2)}%` }]}
          />
        </View>

        <View style={styles.stats}>
          <Stat icon="checkmark-done" value={String(done)} label={t('week.summary.done')} ink={ink} soft={inkSoft} />
          <Stat icon="flame" value={String(streak)} label={t('week.summary.streak')} ink={ink} soft={inkSoft} />
          <Stat icon="star" value={`${pct}%`} label={t('week.summary.progress')} ink={ink} soft={inkSoft} />
        </View>
      </LinearGradient>
    </View>
  );
}

/** One number and what it counts. The label is always present: a bare number is a riddle. */
function Stat({
  icon,
  value,
  label,
  ink,
  soft,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  ink: string;
  soft: string;
}) {
  return (
    <View style={styles.stat} accessibilityLabel={`${value} ${label}`}>
      <View style={styles.statHead}>
        <Ionicons name={icon} size={14} color={soft} />
        <ThemedText type="subtitle" style={[styles.statValue, { color: ink }]}>
          {value}
        </ThemedText>
      </View>
      <ThemedText type="small" numberOfLines={2} style={{ color: soft }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.four,
  },
  // Rounder and quieter than a normal card: this one is a picture, and a picture with a tight
  // corner radius reads as a banner.
  card: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.one,
    overflow: 'hidden',
  },
  // The scene is a BAND along the bottom, not a full-card wash: a sun in the middle of the card
  // would sit behind the numbers and make them hard to read, which is the one thing a decorative
  // ground may never do. Here it sets behind the ridges, under the copy.
  scene: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    height: 84,
  },
  track: {
    height: 4,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.two,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  statValue: {
    fontVariant: ['tabular-nums'],
  },
});
