/**
 * "A newer version is available" — the notice that exists because nothing else
 * could say it.
 *
 * ── WHY IT IS ON HOME AND NOT IN SETTINGS ────────────────────────────────
 *
 * A phone whose runtime has moved on cannot receive updates, and from the device
 * that is indistinguishable from being up to date. It stayed invisible for three
 * days once, while a tester reported bugs that had been fixed twice. A line in
 * Settings would have stayed invisible too — somebody who does not suspect a
 * problem does not go looking for it. This is the one case that earns a banner
 * on the first screen.
 *
 * ── AND WHY IT IS STILL POLITE ───────────────────────────────────────────
 *
 * It is dismissible, it never returns in the same session, and it says what to
 * do rather than that something is wrong. It appears ONLY on a definite answer:
 * an unreachable network, a malformed manifest or an unknown platform all render
 * nothing, because a notice that is wrong once is a notice nobody believes
 * again.
 *
 * Presentational (Engineering Bible §19): the decision is made by
 * {@link useUpdateStanding}; this renders it.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUpdateStanding } from '@/hooks/use-update-standing';
import { START_TEXT_ALIGN } from '@/i18n/rtl';

export function UpdateAvailableBanner() {
  const theme = useTheme();
  const { t } = useTranslation('common');
  const standing = useUpdateStanding();
  const [dismissed, setDismissed] = useState(false);

  if (standing.state !== 'behind' || dismissed) return null;

  // The install page rather than the artifact: on Android the file downloads and
  // then Play Protect has to be talked through, and that page is where the
  // instructions live. A raw APK link drops somebody into the dialog with no
  // explanation.
  const open = () => {
    const url = standing.latest.installPage ?? standing.latest.installUrl;
    if (url) void Linking.openURL(url);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.teal }]}>
      <View style={styles.row}>
        <Ionicons name="arrow-down-circle-outline" size={20} color={theme.teal} />
        <ThemedText type="subtitle" style={[styles.grow, { textAlign: START_TEXT_ALIGN }]}>
          {t('updateAvailable.title')}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: START_TEXT_ALIGN }}>
        {t('updateAvailable.body')}
      </ThemedText>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('updateAvailable.cta')}
          onPress={open}
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
            {t('updateAvailable.cta')}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('updateAvailable.dismiss')}
          onPress={() => setDismissed(true)}
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('updateAvailable.dismiss')}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  grow: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  primary: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Radius.pill },
  ghost: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.two },
  pressed: { opacity: 0.7 },
});
