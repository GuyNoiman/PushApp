/**
 * SupportBoard — Home's "Give support" area (revised 2026-08-07, third founder round:
 * "make it TWO real tabs, and tell me WHY each person needs me"). Replaces the old
 * two-stacked-groups CircleGroup with a single SEGMENTED CONTROL of two switchable
 * tabs — only one group of people shows at a time:
 *
 *   "Needs support"  (default / open first) — friends who've gone quiet or slipped;
 *                     AMBER accent, a Nudge button.
 *   "Deserve praise" — friends who just moved forward; TURQUOISE accent, a Cheer button.
 *
 * The active tab carries the turquoise underline. Each row is a PERSON, not a task:
 * a round monogram avatar + name + the WHY/status line (surfaced, never hidden) + a
 * single action button. Presentational only — the caller supplies both people lists
 * and their press handlers; the only state here is which tab is open.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SupportTone = 'nudge' | 'cheer';

/** One person in the board, with the reason they surfaced. */
export interface SupportPerson {
  key: string;
  initials: string;
  name: string;
  /** The WHY line, e.g. "Quiet for 4 days on 'Run 5km'". Always shown. */
  status: string;
  onPress: () => void;
}

const ACTION_ICON: Record<SupportTone, keyof typeof Ionicons.glyphMap> = {
  nudge: 'hand-left',
  cheer: 'heart',
};

export function SupportBoard({
  needSupport,
  deservePraise,
}: {
  needSupport: SupportPerson[];
  deservePraise: SupportPerson[];
}) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const [tab, setTab] = useState<SupportTone>('nudge');

  // Localized labels for the two tones (kept inside so they follow language changes).
  const tabLabel = (tone: SupportTone) => t(`support.tab.${tone}`);
  const actionLabel = (tone: SupportTone) => t(`support.action.${tone}`);

  const people = tab === 'nudge' ? needSupport : deservePraise;
  // Amber = a quiet friend who needs reaching; turquoise = someone to celebrate.
  const accent = tab === 'nudge' ? theme.gold : theme.tint;
  const accentTint = tab === 'nudge' ? theme.goldTint : theme.tealTint;

  return (
    <View style={styles.board}>
      {/* ── Segmented control: two switchable tabs, turquoise underline on active ── */}
      <View style={[styles.tabs, { borderBottomColor: theme.hairline }]}>
        {(['nudge', 'cheer'] as const).map((tone) => {
          const active = tone === tab;
          const count = tone === 'nudge' ? needSupport.length : deservePraise.length;
          return (
            <Pressable
              key={tone}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t('support.tabA11y', { label: tabLabel(tone), count })}
              onPress={() => setTab(tone)}
              style={styles.tab}>
              <ThemedText
                type="smallBold"
                style={[styles.tabLabel, { color: active ? theme.text : theme.textSecondary }]}>
                {tabLabel(tone)}
              </ThemedText>
              <View
                style={[
                  styles.tabCount,
                  { backgroundColor: active ? theme.backgroundSelected : 'transparent' },
                ]}>
                <ThemedText type="smallBold" style={[styles.tabCountText, { color: theme.textSecondary }]}>
                  {count}
                </ThemedText>
              </View>
              {/* Active underline — always the turquoise brand tint. */}
              {active && <View style={[styles.underline, { backgroundColor: theme.tint }]} />}
            </Pressable>
          );
        })}
      </View>

      {/* ── Rows for the open tab ── */}
      {people.length === 0 ? (
        <View style={styles.empty}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {tab === 'nudge' ? t('support.empty.nudge') : t('support.empty.cheer')}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.rows}>
          {people.map((p) => (
            <View
              key={p.key}
              style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <View style={[styles.avatar, { backgroundColor: accentTint, borderColor: accent }]}>
                <ThemedText type="smallBold" style={[styles.initials, { color: theme.text }]}>
                  {p.initials}
                </ThemedText>
              </View>

              <View style={styles.who}>
                <ThemedText type="smallBold" numberOfLines={1} style={{ color: theme.text }}>
                  {p.name}
                </ThemedText>
                {/* The WHY line — surfaced on every row, never hidden. */}
                <ThemedText type="small" numberOfLines={2} style={{ color: theme.textSecondary }}>
                  {p.status}
                </ThemedText>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('support.actionA11y', { action: actionLabel(tab), name: p.name })}
                onPress={p.onPress}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: accentTint },
                  pressed && styles.pressed,
                ]}>
                <Ionicons name={ACTION_ICON[tab]} size={13} color={accent} />
                <ThemedText type="smallBold" style={[styles.actionText, { color: accent }]}>
                  {actionLabel(tab)}
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    marginTop: Spacing.one,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    marginEnd: Spacing.four,
  },
  tabLabel: {
    fontSize: 14,
  },
  tabCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  underline: {
    position: 'absolute',
    start: 0,
    end: Spacing.four,
    bottom: -1,
    height: 2,
    borderRadius: Radius.pill,
  },
  rows: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 14,
  },
  who: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.button,
  },
  actionText: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.6,
  },
  empty: {
    marginHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
