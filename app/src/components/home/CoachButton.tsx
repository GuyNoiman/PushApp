/**
 * CoachButton — Home's PRIMARY way in: an inviting HERO card for "Talk to your
 * coach" (revised 2026-08-07, third founder round: "make it distinctive, not a
 * generic pill"). It reads as the clear primary action via a distinctive turquoise
 * treatment — a soft teal-tinted panel with a strong accent LEFT EDGE and a filled
 * turquoise coach ORB — plus a title and a warm one-line subtitle inviting the user
 * in. Larger and unmistakable next to the calmer cards below it.
 *
 * Presentational only; the caller supplies the navigation (→ '/coach').
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export function CoachButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Talk to your coach"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.tealTint,
          borderColor: theme.tint,
          shadowColor: '#000',
        },
        pressed && styles.pressed,
      ]}>
      {/* Strong accent edge — marks this as the primary action. */}
      <View style={[styles.edge, { backgroundColor: theme.tint }]} />

      {/* Filled turquoise coach orb. */}
      <View style={[styles.orb, { backgroundColor: theme.tint }]}>
        <Ionicons name="chatbubble-ellipses" size={22} color={onAccent} />
      </View>

      <View style={styles.body}>
        <ThemedText style={[styles.title, { color: theme.tealStrong }]}>
          Talk to your coach
        </ThemedText>
        <ThemedText type="small" numberOfLines={2} style={{ color: theme.textSecondary }}>
          Plan a goal, adjust your week, or think it through
        </ThemedText>
      </View>

      <Ionicons name="chevron-forward" size={20} color={theme.tint} style={styles.arrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    paddingLeft: Spacing.four,
    borderRadius: Radius.card + 4,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  orb: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  arrow: {
    opacity: 0.85,
  },
  pressed: {
    opacity: 0.85,
  },
});
