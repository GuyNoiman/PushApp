/**
 * StepStreakBadge — the small marker that SHOWS which side of the streak rule a Step sits on
 * (Open Work 1.1). It changes no rule; it makes an existing one visible.
 *
 * The rule (D26.4) has always been that only a Step whose Journey has NO SLACK LEFT this week can
 * break the streak. On screen, though, a Step with slack and a Step without it rendered identically
 * — so a missed Step whose streak still rose read as a bug. A rule the user cannot see is a rule the
 * user cannot trust.
 *
 *   • `recommended` — today's suggestion, with room left in the week behind it. Missing it costs
 *     nothing. The token is the CALM teal one, and it is deliberately not muted-grey: a recommended
 *     Step is the real work of the day, not an optional extra.
 *   • `binding`     — the week has run out of slack, so this session is what holds it together. The
 *     token is the warm GOLD role (the same non-failure amber a Partial uses), NEVER `danger`: this
 *     is arithmetic about the week, not a verdict on the person, and it must never read as a threat.
 *
 * Both states carry an icon + a word, never colour alone. The `binding` state is announced with the
 * consequence spelled out, because that sentence is the whole point of the badge.
 *
 * Shared by TodayFocusCard and WeekDreamGroup so the visual is defined ONCE and can't drift, exactly
 * like {@link StepStatusChip}. Presentational only (Engineering Bible §19) — the role is DERIVED by
 * `core.streakRole()`, which reads the same predicate the StreakEngine resets on.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { StreakRole } from '@/core/util/urgency';
import { useTheme } from '@/hooks/use-theme';

export function StepStreakBadge({ role }: { role: StreakRole }) {
  const theme = useTheme();
  const { t } = useTranslation('home');

  const binding = role === 'binding';
  // Gold for `binding` (warm attention, the Partial role) — never `danger`. Teal for `recommended`.
  const ink = binding ? theme.goldStrong : theme.tealStrong;
  const bg = binding ? theme.goldTint : theme.tealTint;
  const icon = binding ? 'link' : 'star-outline';
  const label = t(binding ? 'streakRole.binding.label' : 'streakRole.recommended.label');

  return (
    <View
      accessible
      accessibilityLabel={t(binding ? 'streakRole.binding.a11y' : 'streakRole.recommended.a11y')}
      style={[styles.badge, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={11} color={ink} />
      <ThemedText type="small" style={[styles.label, { color: ink }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.chip,
  },
  label: {
    fontSize: 11,
  },
});
