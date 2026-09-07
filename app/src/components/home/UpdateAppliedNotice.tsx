/**
 * "You are now on update 17" — shown once, the first time a new update actually runs.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────────
 *
 * The most expensive recurring failure on this project is not a bug in the app. It is two people
 * testing a version that is not the one that was published, reporting things that were fixed days
 * ago, and nobody able to tell from the device which copy they are looking at. It has cost more than
 * a week (founder, 2026-09-07: "we keep putting changes in and neither of us can see them").
 *
 * {@link UpdateAvailableBanner} answers the opposite question — *your build can no longer receive
 * updates* — and Settings › About answers *which one is running* for somebody who thinks to look.
 * Nobody thinks to look. So the moment an update first runs, it says so, on the first screen, in a
 * number a person can hold in their head and say out loud across a room.
 *
 * ── WHY IT DOES NOT STAY ───────────────────────────────────────────────────────────────────────
 *
 * A permanent version stamp on Home is developer furniture in a product about somebody's life. This
 * appears once per update, is dismissible, and never returns for that number — the fact stays
 * available in Settings › About, which is where a fact belongs once it has been announced.
 *
 * The acknowledgement is stored by NUMBER rather than by a flag, so the next update announces itself
 * without anything having to reset anything.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { OTA_VERSION } from '@/core/update/otaVersion';
import { readRunningBundle } from '@/core/util/buildInfo';

/** The highest update number this person has already been told about. */
export const UPDATE_SEEN_KEY = 'pushapp.updateSeen.v1';

export function UpdateAppliedNotice() {
  const theme = useTheme();
  const { t, i18n } = useTranslation('settings');
  const [show, setShow] = useState(false);
  const [published, setPublished] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const bundle = readRunningBundle();
      // Development has no update mechanism, and the bundle a build shipped with was never
      // "published" — announcing either would be announcing nothing.
      if (bundle.kind !== 'update') return;
      let seen = 0;
      try {
        seen = Number((await AsyncStorage.getItem(UPDATE_SEEN_KEY)) ?? 0);
      } catch {
        // A storage that cannot be read is not a reason to stay silent — the worst case is saying it
        // twice, and the whole point is that it is said at all.
      }
      if (!alive || !(OTA_VERSION > seen)) return;
      setPublished(bundle.createdAt ?? null);
      setShow(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    void AsyncStorage.setItem(UPDATE_SEEN_KEY, String(OTA_VERSION)).catch(() => {});
  };

  const when = published
    ? published.toLocaleString(i18n.language, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <View
      accessibilityRole="summary"
      style={[styles.row, { backgroundColor: theme.tealTint, borderRadius: Radius.card }]}>
      <Ionicons name="checkmark-circle-outline" size={20} color={theme.teal} />
      <View style={styles.text}>
        <ThemedText type="smallBold" style={{ color: theme.teal }}>
          {t('app.updateApplied', { n: OTA_VERSION })}
        </ThemedText>
        {when ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('app.updatePublished', { date: when })}
          </ThemedText>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.updateDismiss')}
        onPress={dismiss}
        hitSlop={10}>
        <Ionicons name="close" size={18} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  text: { flex: 1, gap: 1 },
});
