/**
 * Tools — the fifth tab, in the slot the Inbox left on 2026-08-20.
 *
 * WHAT IT IS FOR, in the founder's words: *"games and questionnaires for the user"*, including the
 * onboarding questionnaire, *"so the user can redo it if they want"*. The through-line is that
 * everything here is something you DO inside the app and come out of knowing yourself a little
 * better — the opposite of Home, which is about the world outside the app and what you promised to
 * do in it.
 *
 * THE SHAPE IS HIS REFERENCE, THE STYLE IS OURS. He sent a bright children's-app screen: a hero
 * illustration over a two-column grid of tiles. The grid is exactly right and it is what this
 * builds; the cartoon is not, because this app talks to adults about things they have failed at
 * before, and a jolly mascot would be the wrong voice at the wrong moment. So the hero is a calm
 * horizon drawn in code, in the same language as the week's dusk.
 *
 * WHAT IS LIVE IS WHAT EXISTS. Two tiles work. The rest are marked as coming and are NOT pressable —
 * they are a roadmap the user can see, not buttons that answer a tap with nothing. The moment one
 * lands it becomes live; nothing else about the screen changes.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabScrollView } from '@/components/ui/TabScrollView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** One tile. `href` present ⇒ it works; absent ⇒ it is on the way and says so. */
interface Tool {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: Href;
}

const TOOLS: readonly Tool[] = [
  { key: 'questionnaire', icon: 'list-outline', href: '/questionnaire' as Href },
  { key: 'communication', icon: 'chatbubbles-outline', href: '/settings/communication-style' as Href },
  { key: 'reflection', icon: 'create-outline' },
  { key: 'breathe', icon: 'leaf-outline' },
  { key: 'strengths', icon: 'sparkles-outline' },
  { key: 'timer', icon: 'timer-outline' },
  { key: 'kindness', icon: 'heart-outline' },
  { key: 'hardDay', icon: 'medkit-outline' },
];

export default function ToolsScreen() {
  const router = useRouter();
  const { t } = useTranslation('tools');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <TabScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hero />

          <View style={styles.header}>
            <ThemedText type="display">{t('title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('subtitle')}
            </ThemedText>
          </View>

          <View style={styles.grid}>
            {TOOLS.map((tool) => (
              <Tile
                key={tool.key}
                label={t(`items.${tool.key}`)}
                icon={tool.icon}
                onPress={tool.href ? () => router.push(tool.href!) : undefined}
                soonLabel={t('soon')}
              />
            ))}
          </View>

          <ThemedText type="small" themeColor="textMuted" style={styles.foot}>
            {t('footnote')}
          </ThemedText>
        </TabScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * The horizon at the top of the screen — the same code-drawn language as the week's summary card,
 * for the same reasons: it re-tones between the themes, stays sharp at any size, and weighs nothing,
 * so the whole tab travels over the air.
 */
function Hero() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  return (
    <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient
        colors={[theme.sunsetFrom, theme.sunsetMid, theme.sunsetTo]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.heroFill}>
        <Svg width="100%" height="100%" viewBox="0 0 340 150" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id="toolsHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={theme.sunsetSun} stopOpacity={dark ? 0.5 : 0.4} />
              <Stop offset="1" stopColor={theme.sunsetSun} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="252" cy="52" r="46" fill="url(#toolsHalo)" />
          <Circle cx="252" cy="52" r="13" fill={theme.sunsetSun} opacity={dark ? 0.9 : 0.75} />
          {/* A paper plane, not a mascot: the idea of going somewhere, drawn with three strokes. */}
          <Path
            d="M74 92 L150 62 L120 106 L110 90 Z"
            fill={dark ? '#F4EDE7' : '#3B2C24'}
            opacity={0.9}
          />
          <Path d="M110 90 L150 62" stroke={theme.sunsetSun} strokeWidth="2" opacity={0.8} />
          <Path
            d="M0 150 C60 126 110 136 160 124 C214 111 258 122 340 110 L340 150 Z"
            fill={dark ? '#1C1522' : '#E4C6AE'}
            opacity={dark ? 0.9 : 0.7}
          />
        </Svg>
      </LinearGradient>
    </View>
  );
}

/** One tool tile. Without `onPress` it renders as a calm "coming" tile and cannot be tapped. */
function Tile({
  label,
  icon,
  onPress,
  soonLabel,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  soonLabel: string;
}) {
  const theme = useTheme();
  const soon = onPress === undefined;

  const body = (
    <>
      <View style={[styles.tile, { backgroundColor: soon ? theme.backgroundSelected : theme.tealTint }]}>
        <Ionicons name={icon} size={20} color={soon ? theme.textMuted : theme.tealStrong} />
      </View>
      <View style={styles.tileText}>
        <ThemedText
          type="displaySmall"
          numberOfLines={2}
          style={{ color: soon ? theme.textMuted : theme.text }}>
          {label}
        </ThemedText>
        {soon ? (
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            {soonLabel}
          </ThemedText>
        ) : null}
      </View>
    </>
  );

  if (soon) {
    return (
      <View
        // Announced as unavailable rather than silently inert, so a screen-reader user is not left
        // tapping a tile that will never answer.
        accessibilityLabel={`${label}. ${soonLabel}`}
        style={[styles.card, styles.soonCard, { borderColor: theme.hairline }]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
        pressed && styles.pressed,
      ]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  content: { paddingBottom: BottomTabInset + Spacing.six },
  hero: {
    height: 150,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroFill: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  // Two per row, and the gap is subtracted so the pair fits any width without a hardcoded phone size.
  card: {
    width: '48%',
    flexGrow: 1,
    minHeight: 108,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  soonCard: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { gap: 1 },
  foot: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  pressed: { opacity: 0.85 },
});
