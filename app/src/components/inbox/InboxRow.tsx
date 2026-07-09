/**
 * InboxRow — one IG-style conversation row in the Inbox (v14 mockup screen-15):
 * a rounded tinted avatar, a Baloo name, an Inter preview line with a muted
 * timestamp, and a coral unread dot on the right. Conversations are ROWS, not
 * cards (Inbox_Screen.md — "IG-style rows, not cards"). Optional inline actions
 * (Accept / Decline) render beneath the preview for actionable items like an
 * incoming friend request.
 *
 * Presentational only — it takes data + callbacks; no social/business logic lives
 * here (Engineering Bible §19).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CORAL = Colors.light.coral;
const INK = Colors.light.text;

export interface InboxRowAction {
  label: string;
  onPress: () => void;
  /** 'primary' = filled coral CTA; 'ghost' = bordered secondary. */
  variant?: 'primary' | 'ghost';
}

export interface InboxRowData {
  id: string;
  /** Display name (Baloo). Falls back to handle. */
  name: string;
  /** Preview / last-message line (Inter). */
  preview: string;
  /** Muted relative timestamp, e.g. "2h" · "1d". Optional. */
  timestamp?: string;
  /** Coral unread dot + bolder preview when true. */
  unread?: boolean;
  /** A rounded tint for the initial-circle avatar. */
  tint: string;
  /** Ink colour for the initial glyph, paired with `tint`. */
  tintInk: string;
  /** Inline actions (e.g. Accept a friend request). Rendered under the preview. */
  actions?: InboxRowAction[];
}

export function InboxRow({ row, onPress }: { row: InboxRowData; onPress?: () => void }) {
  const theme = useTheme();
  const initial = firstGlyph(row.name);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.name}. ${row.preview}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}>
      <View style={[styles.avatar, { backgroundColor: row.tint }]}>
        <ThemedText style={[styles.avatarGlyph, { color: row.tintInk }]}>{initial}</ThemedText>
      </View>

      <View style={styles.main}>
        <View style={styles.nameRow}>
          <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
            {row.name}
          </ThemedText>
        </View>

        <ThemedText
          type="small"
          themeColor={row.unread ? 'text' : 'textSecondary'}
          style={[styles.preview, row.unread && styles.previewUnread]}
          numberOfLines={2}>
          {row.preview}
          {row.timestamp ? (
            <ThemedText type="small" themeColor="textMuted">
              {'  ·  '}
              {row.timestamp}
            </ThemedText>
          ) : null}
        </ThemedText>

        {row.actions && row.actions.length > 0 && (
          <View style={styles.actions}>
            {row.actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.actionButton,
                  action.variant === 'ghost'
                    ? [styles.ghost, { borderColor: theme.hairline }]
                    : { backgroundColor: CORAL },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="smallBold"
                  themeColor={action.variant === 'ghost' ? 'textSecondary' : undefined}
                  style={action.variant === 'ghost' ? undefined : styles.primaryLabel}>
                  {action.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {row.unread && <View style={[styles.dot, { backgroundColor: CORAL }]} />}
    </Pressable>
  );
}

/** First visible character for the initial-circle avatar (skips a leading @). */
function firstGlyph(name: string): string {
  const clean = name.replace(/^@/, '').trim();
  return (clean[0] ?? '?').toUpperCase();
}

const AVATAR = 52;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    lineHeight: 28,
  },
  main: {
    flex: 1,
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flexShrink: 1,
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewUnread: {
    fontFamily: FontFamily.bodySemiBold,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionButton: {
    borderRadius: Radius.button,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    borderWidth: 1,
  },
  primaryLabel: {
    color: INK,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: Spacing.three,
  },
});
