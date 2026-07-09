/**
 * Presentational cards for the Explore discovery surface (v14 mockup screen-04).
 * Each row type has a distinct card SHAPE so it reads at a glance (Explore_Screen
 * §"Finalized visual design"): text-first Journey tiles, round creator cards,
 * wide brand cards. No business logic — pure presentation (Engineering Bible §19).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { BuddyAvatar } from '@/components/buddy/BuddyAvatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BrandPack, Creator, JourneyPick } from './sampleContent';

/** "For you" — a text-first Journey tile: slim tinted image band (decorative icon),
 *  then the Journey NAME dominant, then duration and step count with small icons. */
export function JourneyCard({ item }: { item: JourneyPick }) {
  const theme = useTheme();
  const accent = theme[item.accent];
  const band = theme[`${item.accent}Tint` as const];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name} — ${item.duration}, ${item.steps}`}
      style={({ pressed }) => [styles.journeyCard, pressed && styles.pressed]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.journeyCardInner, { borderColor: theme.hairline }]}>
        <View style={[styles.journeyBand, { backgroundColor: band }]}>
          <Ionicons name={item.icon} size={26} color={accent} />
        </View>
        <View style={styles.journeyBody}>
          <ThemedText type="subtitle" numberOfLines={1} style={styles.journeyName}>
            {item.name}
          </ThemedText>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={15} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {item.duration}
            </ThemedText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="git-network-outline" size={15} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {item.steps}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

/** "Top creators" — a round-avatar card: the creator's own Buddy with a blue level
 *  badge (game XP, §2), their @handle, a registrations count, and a journeys count. */
export function CreatorCard({ item }: { item: Creator }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.handle} — level ${item.level}, ${item.joined}, ${item.journeys}`}
      style={({ pressed }) => [styles.creatorCard, pressed && styles.pressed]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.creatorCardInner, { borderColor: theme.hairline }]}>
        <View style={styles.avatarWrap}>
          <BuddyAvatar stage={item.stage} size={84} />
          <View style={[styles.levelBadge, { backgroundColor: theme.blue }]}>
            <ThemedText type="small" style={styles.levelText}>
              Lv {item.level}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="subtitle" numberOfLines={1} style={styles.creatorHandle}>
          {item.handle}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.purpleStrong }}>
          {item.joined}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.journeys}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

/** "From brands" — a wide card: a tinted logo tile, the brand name, and the
 *  featured Journey name below it. */
export function BrandCard({ item }: { item: BrandPack }) {
  const theme = useTheme();
  const band = theme[`${item.accent}Tint` as const];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.brand} — ${item.journey}`}
      style={({ pressed }) => [styles.brandCard, pressed && styles.pressed]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.brandCardInner, { borderColor: theme.hairline }]}>
        <View style={[styles.brandLogo, { backgroundColor: band }]}>
          <ThemedText style={styles.brandLogoEmoji}>{item.logo}</ThemedText>
        </View>
        <View style={styles.brandBody}>
          <ThemedText type="small" themeColor="textSecondary">
            {item.brand}
          </ThemedText>
          <ThemedText type="subtitle" numberOfLines={2} style={styles.brandJourney}>
            {item.journey}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const CARD_SHADOW = {
  shadowColor: '#2E2E2C',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  // "For you" — Journey tile.
  journeyCard: {
    width: 220,
  },
  journeyCardInner: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  journeyBand: {
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  journeyName: {
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },

  // "Top creators" — round-avatar card.
  creatorCard: {
    width: 168,
  },
  creatorCardInner: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    paddingTop: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
    ...CARD_SHADOW,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  levelText: {
    color: '#FFFFFF',
  },
  creatorHandle: {
    lineHeight: 26,
    marginTop: Spacing.one,
  },

  // "From brands" — wide card.
  brandCard: {
    width: 280,
  },
  brandCardInner: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    ...CARD_SHADOW,
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoEmoji: {
    fontSize: 34,
    lineHeight: 40,
  },
  brandBody: {
    flex: 1,
    gap: Spacing.half,
  },
  brandJourney: {
    lineHeight: 26,
  },
});
