/**
 * DevRecoveryPanel — a HIDDEN, dev-only control for exercising the Miss-Recovery loop
 * in Expo Go at $0. Rendered ONLY when `featureFlags.devMockRecovery` is on (off in
 * production). It flips the in-memory mock device env — home/away and busy/free — so
 * the founder can watch the reschedule gate drop or keep proposed times.
 *
 * The toggled values are transient and never persisted or synced (G4). Presentational
 * only: it calls the facade's dev setters; no business logic here (Bible §19).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/hooks/use-theme';

export function DevRecoveryPanel() {
  const { core } = useApp();
  const theme = useTheme();
  const [away, setAway] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleAway = () => {
    const next = !away;
    setAway(next);
    core.setMockLocation(next ? 'away' : 'home');
  };
  const toggleBusy = () => {
    const next = !busy;
    setBusy(next);
    core.setMockBusy(next);
  };

  return (
    <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <ThemedText type="small" themeColor="textMuted">
        DEV · recovery mock
      </ThemedText>
      <View style={styles.row}>
        <Pill label={away ? 'Away' : 'Home'} active={away} theme={theme} onPress={toggleAway} />
        <Pill label={busy ? 'Busy' : 'Free'} active={busy} theme={theme} onPress={toggleBusy} />
      </View>
    </View>
  );
}

function Pill({
  label,
  active,
  theme,
  onPress,
}: {
  label: string;
  active: boolean;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Toggle ${label}`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.pill,
        { borderColor: active ? theme.coral : theme.hairline },
        active && { backgroundColor: theme.coralTint },
      ]}>
      <ThemedText type="smallBold" style={{ color: active ? theme.coralStrong : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pill: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
