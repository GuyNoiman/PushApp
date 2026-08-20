/**
 * ConnectionNotice — the calm, honest card a screen shows when this device has no session and the
 * parts that need the server are therefore off.
 *
 * It is deliberately NOT an error dialog and NOT a blocker. The app genuinely works offline: the
 * Journeys, the Buddy, the Coins and the Missions are all on the device and untouched. So the card
 * says what does NOT work (the coach, the Support Circle) rather than "an error occurred", and it
 * offers the one action that can change the situation.
 *
 * Two shapes, one component:
 *  · `banner` — a quiet strip near the top of a screen that still works (Home). Dismissible.
 *  · `block`  — the whole content of a screen that cannot honestly do its job (the Coach).
 *
 * Presentational only: the caller owns the fact (see {@link ../../hooks/useServerConnection}) and
 * the copy, so the same card can speak differently on Home and in the Coach.
 */
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ConnectionNoticeProps {
  title: string;
  body: string;
  /** Ask for a session again. Omitted ⇒ no retry button (nothing to retry). */
  onRetry?: () => void;
  /** True while a retry is in flight — the button shows it is working instead of looking dead. */
  retrying?: boolean;
  /** Offered only where the screen still works without a session; the Coach has no dismiss. */
  onDismiss?: () => void;
  variant?: 'banner' | 'block';
}

export function ConnectionNotice({
  title,
  body,
  onRetry,
  retrying = false,
  onDismiss,
  variant = 'banner',
}: ConnectionNoticeProps) {
  const theme = useTheme();
  const { t } = useTranslation('common');
  const block = variant === 'block';

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.card,
        block && styles.cardBlock,
        { backgroundColor: theme.goldTint, borderColor: theme.hairline },
      ]}>
      <View style={styles.headRow}>
        <Ionicons
          name="cloud-offline-outline"
          size={block ? 28 : 20}
          color={theme.goldStrong}
        />
        <ThemedText type={block ? 'displaySmall' : 'smallBold'} style={styles.title}>
          {title}
        </ThemedText>
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dismiss')}
            onPress={onDismiss}
            hitSlop={10}>
            <Ionicons name="close" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ThemedText type="small" style={[styles.body, { color: theme.textSecondary }]}>
        {body}
      </ThemedText>

      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          // A STABLE label: the visible text swaps to "Connecting…" mid-retry, and a label that moves
          // under a screen reader (or a test) is a label you cannot address.
          accessibilityLabel={t('connection.retry')}
          accessibilityState={{ disabled: retrying }}
          disabled={retrying}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: theme.tint },
            pressed && styles.retryPressed,
            retrying && styles.retryBusy,
          ]}>
          {retrying ? <ActivityIndicator size="small" color={theme.backgroundElement} /> : null}
          <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
            {retrying ? t('connection.retrying') : t('connection.retry')}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardBlock: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  body: {
    lineHeight: 20,
  },
  retry: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  retryPressed: {
    opacity: 0.85,
  },
  retryBusy: {
    opacity: 0.7,
  },
});
