/**
 * FriendProfileHeader — identity, and nothing more (Friend_Profile_PRD §4.1): the monogram avatar,
 * the display name, and the @handle. Every private field the PRD bars (email, age, country, gender,
 * form of address, auth provider) is absent BY CONSTRUCTION, not by filtering: `public.profiles`
 * stores only `id, handle, buddy_summary, created_at`, so none of it can even arrive here.
 *
 * NO PHOTO — the app has no profile photo anywhere yet (the user's own is Phase 2 in
 * ProfileProvider, and `profiles` has no photo column), so PRD §5's "initials when no photo exists"
 * is satisfied exactly, and read-only by construction. Seam: swap the monogram for an Image when
 * photos land, still read-only for a friend.
 *
 * NO LEVEL — deferred out of the MVP slice with B1 Leveling (PRD §4.6, founder 2026-08-13). The
 * seam stays on the wire (`profile.buddySummary.level`); this header simply never reads it, so
 * switching it on later is one line and no rework.
 *
 * Presentational only (Engineering Bible §19).
 */
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { displayName, initialsFor, tintFor } from '@/components/friends/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { SocialProfile } from '@/core/social';
import { useTheme } from '@/hooks/use-theme';

export function FriendProfileHeader({ profile }: { profile: SocialProfile }) {
  const theme = useTheme();
  const { t } = useTranslation('friendProfile');
  const name = displayName(profile);
  // Seeded from the stable profile id (never the name), so a person keeps the same tint on every
  // screen and a rename doesn't recolour them.
  const tint = tintFor(theme, profile.id);

  return (
    <View style={styles.header}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('avatarA11y', { name })}
        style={[styles.avatar, { backgroundColor: tint.bg }]}>
        <ThemedText type="title" style={[styles.initials, { color: tint.ink }]}>
          {initialsFor(name)}
        </ThemedText>
      </View>

      <View style={styles.text}>
        <ThemedText type="title" numberOfLines={2} style={styles.name}>
          {name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          @{profile.handle}
        </ThemedText>
      </View>
    </View>
  );
}

const AVATAR = 72;

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    // No fixed height anywhere in this header, so the whole block grows with Dynamic Type.
    lineHeight: 34,
  },
  text: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  name: {
    textAlign: 'center',
  },
});
