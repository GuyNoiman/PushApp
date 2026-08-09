/**
 * A single chat bubble in the Coach conversation.
 *
 * The two roles are deliberately contrasted so it always reads which turns are
 * the coach's questions vs the user's answers (mature_proposal.html "Coach
 * conversation"):
 *  - `coach` — left-aligned, a muted "pressed-into-surface" flat fill
 *    (`backgroundSelected`), no shadow.
 *  - `user`  — right-aligned, an elevated near-surface card (`backgroundElement`)
 *    with a hairline + a soft shadow.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CoachBubble({
  role,
  text,
  strong,
}: {
  role: 'coach' | 'user';
  text: string;
  /** Emphasise the coach's line (used for the opening question). */
  strong?: boolean;
}) {
  const theme = useTheme();
  const isCoach = role === 'coach';

  return (
    <View style={[styles.row, isCoach ? styles.rowCoach : styles.rowUser]}>
      <View
        style={[
          styles.bubble,
          isCoach
            ? { backgroundColor: theme.backgroundSelected, borderBottomStartRadius: 6 }
            : {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.hairline,
                borderWidth: 1,
                borderBottomEndRadius: 6,
                ...softShadow,
              },
        ]}>
        <ThemedText type="default" style={strong ? styles.strong : undefined}>
          {text}
        </ThemedText>
      </View>
    </View>
  );
}

/** A soft ambient shadow (Design System §5) — separation without gloss. */
const softShadow = {
  shadowColor: '#14161C',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rowCoach: {
    justifyContent: 'flex-start',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.card + 2,
    paddingVertical: Spacing.three - 3,
    paddingHorizontal: Spacing.three,
  },
  strong: {
    fontFamily: 'Inter_600SemiBold',
  },
});
