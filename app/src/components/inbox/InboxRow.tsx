/**
 * InboxRow — one Instagram-DM-style conversation row in the Inbox. A row is a
 * clean line — a round monogram avatar (initials; restored per founder feedback
 * 2026-08-07), a bold name, a right-aligned tabular timestamp, an Inter preview
 * line, and a danger unread dot on the right (Design System §status — the same
 * soft coral-red as other unread/urgent badges). Conversations are ROWS, not
 * cards (Inbox_Screen.md — "IG-style rows, not cards"). Optional inline actions
 * (Accept / Decline) render beneath the preview for actionable items like an
 * incoming connection request.
 *
 * REDESIGNED 2026-08-19/20 from the founder's mockup, and it reverses one earlier call: a
 * conversation is a CARD now, not a bare row. `Inbox_Screen.md` said "IG-style rows, not cards", and
 * his mockup for this pass shows cards — with a reason that holds up on the device, where the bare
 * rows had no edges at all against the dark ground and the list read as one undifferentiated column.
 * The name takes the display voice, and the unread dot is TEAL rather than the danger red: an unread
 * message is something waiting, not something wrong.
 *
 * Presentational only — it takes data + callbacks; no social/business logic lives
 * here (Engineering Bible §19).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { displayFont, displayScale } from '@/constants/displayFont';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface InboxRowAction {
  label: string;
  onPress: () => void;
  /** 'primary' = filled coral CTA; 'ghost' = bordered secondary. */
  variant?: 'primary' | 'ghost';
}

export interface InboxRowData {
  id: string;
  /** Display name. Falls back to handle. */
  name: string;
  /** 1–2 letter monogram for the avatar. Derived from `name` when omitted. */
  initials?: string;
  /** Preview / last-message line (Inter). */
  preview: string;
  /** Muted relative timestamp, e.g. "2h" · "1d". Optional. */
  timestamp?: string;
  /** Danger unread dot + bolder name/preview when true. */
  unread?: boolean;
  /**
   * The stable profile id of the person this row is about, when the row is about an ACCEPTED
   * friend. The screen turns it into a tap-through to their Friend Profile. Absent for rows that
   * are not (yet) a friend — an incoming request must not open a profile.
   */
  profileId?: string;
  /** Inline actions (e.g. Accept a connection request). Rendered under the preview. */
  actions?: InboxRowAction[];
}

export function InboxRow({ row, onPress }: { row: InboxRowData; onPress?: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.name}. ${row.preview}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
        pressed && onPress ? styles.pressed : null,
      ]}>
      {/* TODO(avatar): replace initials with the friend's profile photo when profiles land */}
      <View style={[styles.avatar, { backgroundColor: theme.tealTint }]}>
        <ThemedText type="smallBold" style={[styles.avatarText, { color: theme.tint }]}>
          {row.initials ?? initialsFromName(row.name)}
        </ThemedText>
      </View>

      <View style={styles.main}>
        <View style={styles.nameRow}>
          <ThemedText
            themeColor="text"
            style={[
              styles.name,
              { fontFamily: displayFont(), fontSize: Math.round(17 * displayScale()) },
            ]}
            numberOfLines={1}>
            {row.name}
          </ThemedText>
          {row.timestamp ? (
            <ThemedText type="small" themeColor="textMuted" style={styles.timestamp}>
              {row.timestamp}
            </ThemedText>
          ) : null}
        </View>

        <ThemedText
          type="small"
          themeColor={row.unread ? 'text' : 'textSecondary'}
          style={[styles.preview, row.unread && styles.previewUnread]}
          numberOfLines={2}>
          {row.preview}
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
                    : { backgroundColor: theme.coral },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="smallBold"
                  themeColor={action.variant === 'ghost' ? 'textSecondary' : undefined}
                  style={action.variant === 'ghost' ? undefined : { color: theme.text }}>
                  {action.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {row.unread && <View style={[styles.dot, { backgroundColor: theme.tint }]} />}
    </Pressable>
  );
}

/** Up-to-two-letter monogram from a display name, e.g. "Yael Bar" → "YB", "@maya" → "M". */
function initialsFromName(name: string): string {
  const words = name.replace(/^@/, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
  },
  main: {
    flex: 1,
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    lineHeight: 23,
  },
  timestamp: {
    // Tabular figures so timestamps stay column-aligned down the list.
    fontVariant: ['tabular-nums'],
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: Spacing.two,
  },
});
