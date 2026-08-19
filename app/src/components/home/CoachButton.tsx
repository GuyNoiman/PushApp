/**
 * CoachButton — Home's PRIMARY way in: an inviting HERO card for "Talk to your
 * coach" (revised 2026-08-07, third founder round: "make it distinctive, not a
 * generic pill"). It stays the clear primary action, and it is still the only card
 * on Home that is allowed to be loud.
 *
 * THE LIGHTNESS PASS (2026-08-19) changed how it gets there. The tinted panel, the
 * hard accent edge and the drop shadow were three devices all shouting the same
 * thing; now a single soft gradient does it, and the coach ORB carries the identity
 * — a glowing bead with a halo, drawn in code so it re-tones between the two themes
 * instead of being a picture that only suits one of them. The founder's mockup puts
 * a luminous orb here, and a glow is a promise of something alive at the other end.
 *
 * Presentational only; the caller supplies the navigation (→ '/coach').
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { displayFont, displayScale } from '@/constants/displayFont';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CoachButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('coach.title')}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <LinearGradient
        colors={[theme.tealTint, theme.backgroundElement]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: theme.hairline }]}>
        <View style={styles.orb} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width={56} height={56} viewBox="0 0 56 56">
            <Defs>
              <RadialGradient id="coachHalo" cx="50%" cy="50%" r="50%">
                <Stop offset="0.4" stopColor={theme.tint} stopOpacity={0.5} />
                <Stop offset="1" stopColor={theme.tint} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="28" cy="28" r="28" fill="url(#coachHalo)" />
            <Circle cx="28" cy="28" r="17" fill={theme.tint} opacity={0.14} />
            <Circle cx="28" cy="28" r="17" stroke={theme.tint} strokeWidth={1.5} fill="none" />
          </Svg>
          <View style={styles.orbGlyph}>
            <Ionicons name="sparkles" size={20} color={theme.tealStrong} />
          </View>
        </View>

        <View style={styles.body}>
          {/* The eyebrow names WHO is speaking, so the line below can be short and human rather than
              a label. It is the one place on Home where the app introduces someone. */}
          <ThemedText type="small" style={[styles.eyebrow, { color: theme.tealStrong }]}>
            {t('coach.eyebrow')}
          </ThemedText>
          <ThemedText
            numberOfLines={2}
            style={[
              styles.title,
              {
                color: theme.text,
                fontFamily: displayFont(),
                fontSize: Math.round(18 * displayScale()),
              },
            ]}>
            {t('coach.ready')}
          </ThemedText>
        </View>

        {/* A real button, not a chevron: the mockup asks for something you press, and an arrow at
            the end of a card reads as "there is more here" rather than "start a conversation". */}
        <View style={[styles.cta, { backgroundColor: theme.tint }]}>
          <Ionicons name="chatbubble-ellipses" size={15} color={onAccent} />
          <ThemedText type="smallBold" style={{ color: onAccent }}>
            {t('coach.cta')}
          </ThemedText>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.four,
  },
  // One soft gradient instead of a tint plus an edge plus a shadow: the card is still the loudest
  // thing on Home, but it says so once.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  orb: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlyph: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
  title: {
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.85,
  },
});
