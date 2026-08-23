/**
 * ToolOpening — the one opening screen every tool from 2026-08-21 onward begins with.
 *
 * IT IS A SHARED COMPONENT BECAUSE IT IS A SHARED RULE. The founder's UX rules
 * (Tools_Documentation/README.md §5) say every first-use flow opens with the tool's name, an
 * inviting sentence, WHAT THE USER WILL GET beside a target icon, HOW LONG beside a clock, and a
 * visible Start — and that Start must be reachable **without scrolling** on the smallest supported
 * viewport. Seven tools implementing that separately is seven chances to get it wrong; the rule
 * lives here once, and the illustration is what shrinks when space runs out, never the content.
 *
 * HOW THE NO-SCROLL PROMISE IS KEPT. The content is a plain column, not a ScrollView: the two info
 * cards and the route list are compact by construction, and the Start action is PINNED to the
 * bottom outside the scrolling area. If a very large accessibility text size overflows the middle,
 * that middle scrolls on its own and Start stays where it is — which is the approved responsive
 * fallback rather than a broken promise.
 *
 * ROUTES. When a tool has more than one way in, §5 requires the words "Choose one of the options",
 * one card per route with its own time, and the choice made BEFORE Start. Pass `routes`; pass none
 * and the screen shows a single Start.
 *
 * Presentational only (Engineering Bible §19) — copy and behaviour come from the caller.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';

export interface ToolOpeningRoute {
  id: string;
  title: string;
  /** What this route is for, in one line. */
  blurb: string;
  /** Its own estimate, because routes differ in length. */
  time: string;
  /**
   * A route that exists in the design but cannot run yet. It stays VISIBLE and unselectable, with
   * `note` saying plainly why — the same honesty the Inbox's compose button uses. A route that is
   * silently missing makes the tool look smaller than it is; a route that pretends to work is worse.
   */
  disabled?: boolean;
  note?: string;
}

export interface ToolOpeningProps {
  /** The tool's name. */
  title: string;
  /** The inviting sentence under it. */
  lead: string;
  /** What the person walks away with — the target-icon card. */
  outcomeLabel: string;
  outcome: string;
  /** How long it takes — the clock-icon card. */
  timeLabel: string;
  time: string;
  /** The heading above the route list, when there are routes. */
  chooseLabel?: string;
  routes?: readonly ToolOpeningRoute[];
  startLabel: string;
  /** Called with the chosen route id, or undefined when the tool has a single way in. */
  onStart: (routeId?: string) => void;
  onClose: () => void;
  closeLabel: string;
  /** The tool's family accent + tint, from `core/tools/families`. */
  accent: ThemeColor;
  tint: ThemeColor;
  /** Optional decorative element behind the header. It is the FIRST thing to give up space. */
  decoration?: React.ReactNode;
}

export function ToolOpening({
  title,
  lead,
  outcomeLabel,
  outcome,
  timeLabel,
  time,
  chooseLabel,
  routes,
  startLabel,
  onStart,
  onClose,
  closeLabel,
  accent,
  tint,
  decoration,
}: ToolOpeningProps) {
  const theme = useTheme();
  const accentColor = theme[accent];
  const tintColor = theme[tint];
  const [chosen, setChosen] = useState<string | undefined>(
    routes?.find((r) => !r.disabled)?.id,
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {decoration ? <View style={styles.decoration}>{decoration}</View> : null}

        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.middle}
          contentContainerStyle={styles.middleContent}
          showsVerticalScrollIndicator={false}>
          <ThemedText
            style={[
              styles.title,
              { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(28 * displayScale()) },
            ]}>
            {title}
          </ThemedText>
          <ThemedText style={[styles.lead, { color: theme.textMuted }]}>{lead}</ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <View style={styles.cardHead}>
              <Ionicons name="locate-outline" size={16} color={accentColor} />
              <ThemedText type="smallBold" style={{ color: theme.text }}>{outcomeLabel}</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textMuted }}>{outcome}</ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <View style={styles.cardHead}>
              <Ionicons name="time-outline" size={16} color={accentColor} />
              <ThemedText type="smallBold" style={{ color: theme.text }}>{timeLabel}</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textMuted }}>{time}</ThemedText>
          </View>

          {routes && routes.length > 0 ? (
            <>
              {chooseLabel ? (
                <ThemedText type="small" style={[styles.choose, { color: theme.textMuted }]}>
                  {chooseLabel}
                </ThemedText>
              ) : null}
              {routes.map((route) => {
                const selected = route.id === chosen && !route.disabled;
                return (
                  <Pressable
                    key={route.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled: route.disabled }}
                    disabled={route.disabled}
                    accessibilityLabel={[route.title, route.blurb, route.time, route.note]
                      .filter(Boolean)
                      .join('. ')}
                    onPress={() => setChosen(route.id)}
                    style={({ pressed }) => [
                      styles.route,
                      {
                        backgroundColor: selected ? tintColor : theme.backgroundElement,
                        borderColor: selected ? accentColor : theme.hairline,
                        opacity: route.disabled ? 0.55 : 1,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.routeHead}>
                      <ThemedText type="smallBold" style={{ color: theme.text }}>{route.title}</ThemedText>
                      <ThemedText type="small" style={{ color: route.disabled ? theme.textMuted : accentColor }}>
                        {route.time}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={{ color: theme.textMuted }}>{route.blurb}</ThemedText>
                    {route.note ? (
                      <ThemedText type="small" style={{ color: theme.textMuted }}>{route.note}</ThemedText>
                    ) : null}
                  </Pressable>
                );
              })}
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={startLabel}
            onPress={() => onStart(chosen)}
            style={({ pressed }) => [
              styles.start,
              { backgroundColor: accentColor },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>{startLabel}</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  decoration: { ...StyleSheet.absoluteFillObject },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  close: { padding: Spacing.two },
  middle: { flex: 1 },
  middleContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three, gap: Spacing.three },
  title: { textAlign: START_TEXT_ALIGN, marginTop: Spacing.two },
  lead: { textAlign: START_TEXT_ALIGN, lineHeight: 22 },
  card: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.one },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  choose: { textAlign: START_TEXT_ALIGN, marginTop: Spacing.one },
  route: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three, gap: Spacing.one },
  routeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two },
  start: { borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
  pressed: { opacity: 0.75 },
});
