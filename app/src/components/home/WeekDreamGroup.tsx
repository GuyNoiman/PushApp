/**
 * WeekDreamGroup — one Dream's slice of "This week" (revised 2026-08-07, third
 * founder round: "keep the Dream grouping and the visual connection, but give every
 * Step its OWN distinct card with a small gap — hint that each is individually
 * swipeable"). A labelled Dream header sits above the Dream's pending Steps, which
 * are strung along a TURQUOISE LEFT RAIL (a vertical line with a node dot per Step)
 * so the eye still reads "these Steps all serve this Dream" — BUT each Step is now a
 * SEPARATE floating card with a vertical GAP between them (not one fused panel), so
 * each reads as its own individually-actionable card. A subtle grip on the right
 * edge hints the card can be swiped aside.
 *
 * Each actionable Step keeps its ⋯ report affordance; tapping a card opens the report
 * sheet (Done · Partial · Couldn't · Postpone · Reschedule). Presentational only — the
 * caller resolves the Dream title, the per-Step meta, and the press handlers.
 *
 * Step Dependencies (Slice 8): a Step still WAITING on an unmet dependency is never a
 * tappable card. When its predecessor is present in this same group it folds into a
 * DECK — an equal-size, blank card layer stacked directly behind the actionable
 * predecessor (matching the approved pager deck, Step_Dependency_Cards.html Rev 2).
 * When the predecessor isn't in this group (e.g. it's up in Today's focus), the
 * waiting Step shows as a calm, non-interactive "waiting" card instead. Either way a
 * gentle hint below explains what opens it up — framed as coming-up-next, never
 * "locked / blocked".
 */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { SwipeableStepRow } from '@/components/home/SwipeableStepRow';
import { StepStatusChip } from '@/components/home/StepStatusChip';
import { StepStreakBadge } from '@/components/home/StepStreakBadge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { StepStatus } from '@/core/status/stepStatus';
import type { StreakRole } from '@/core/util/urgency';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

const RAIL_W = 26;
// Per-layer offset of a waiting card behind its predecessor — ~10px down + ~10px toward the
// reading-direction's TRAILING edge, per the approved deck mockup (Step_Dependency_Cards.html Rev 2).
const STACK_OFFSET = 10;

/** One Step row inside a Dream group. */
export interface WeekStepView {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  done: boolean;
  /** The Step's derived reporting status (D36) — shows a calm Partial / Not-completed chip. */
  status: StepStatus;
  /**
   * Which side of the streak rule this Step's Journey is on right now (D26.4, surfaced per Open Work
   * 1.1). Derived by `core.streakRole()` — the same predicate the StreakEngine resets on.
   */
  streakRole?: StreakRole;
  /** True when the Step sits in a closed (past) week — swipe report actions are disabled (D36). */
  locked: boolean;
  /** True when the Step is WAITING on an unmet dependency (Step Dependencies) — non-interactive. */
  waiting: boolean;
  /** The predecessor Step id this Step depends on, if any — used to fold it behind that predecessor. */
  dependsOnStepId?: string;
  /** The predecessor's title, for the waiting hint when the predecessor isn't shown in this group. */
  predecessorTitle?: string;
  onPress: () => void;
  /** Swipe-right → report done (fires Home's confetti). */
  onDone: () => void;
  /** Swipe-left Postpone button. */
  onPostpone: () => void;
  /** Swipe-left Let-go button. */
  onLetGo: () => void;
}

/**
 * A render group for the rail: one FRONT card (actionable, or — when the waiting Step's predecessor
 * isn't in this group — the waiting Step itself), plus the waiting dependents that fold as blank deck
 * layers behind it. `frontIsWaiting` marks the second, non-interactive case.
 */
interface StackGroup {
  front: WeekStepView;
  waiting: WeekStepView[];
  frontIsWaiting: boolean;
}

/**
 * Fold a group's ordered Steps into stacks: each waiting Step attaches behind the Step it depends on
 * (its predecessor) when that predecessor is present here; predecessors sort earlier, so the chain is
 * consumed when we reach the front. A waiting Step whose predecessor isn't in this group becomes its
 * own non-interactive front. Pure arrangement — no state, mirrors the pager's computeWeekLayout intent.
 */
function arrangeStacks(steps: WeekStepView[]): StackGroup[] {
  const consumed = new Set<string>();
  const groups: StackGroup[] = [];
  for (const s of steps) {
    if (consumed.has(s.key)) continue;
    const waiting: WeekStepView[] = [];
    let cursor = s.key;
    for (;;) {
      const dep = steps.find((x) => x.waiting && x.dependsOnStepId === cursor && !consumed.has(x.key));
      if (!dep) break;
      waiting.push(dep);
      consumed.add(dep.key);
      cursor = dep.key;
    }
    consumed.add(s.key);
    groups.push({ front: s, waiting, frontIsWaiting: s.waiting });
  }
  return groups;
}

export function WeekDreamGroup({
  title,
  isDream,
  steps,
}: {
  title: string;
  /** True when the group is a real Dream (compass marker); false = a lone Journey. */
  isDream: boolean;
  steps: WeekStepView[];
}) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';

  const groups = useMemo(() => arrangeStacks(steps), [steps]);

  // Measure each FRONT card row so the rail can connect node CENTRES only — its ends are the first and
  // last dots, not a line that overshoots them. A lone front (no group) gets no rail and no node: there
  // is nothing to connect, so the column stays empty. Deck layers are absolute and never change a row's
  // measured height, so the node stays centred on the actionable card even when a deck sits behind it.
  const [rowFrames, setRowFrames] = useState<Record<number, { y: number; h: number }>>({});
  const onRowLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setRowFrames((prev) => {
      const cur = prev[i];
      if (cur && cur.y === y && cur.h === height) return prev;
      return { ...prev, [i]: { y, h: height } };
    });
  };

  const multi = groups.length > 1;
  const first = rowFrames[0];
  const last = rowFrames[groups.length - 1];
  const railReady = multi && first != null && last != null;
  const railTop = first ? first.y + first.h / 2 : 0;
  const railHeight = railReady ? last.y + last.h / 2 - railTop : 0;

  const dir = isRTL() ? -1 : 1;

  /** The card body — shared by the interactive Pressable and the non-interactive waiting card. */
  const cardInner = (row: WeekStepView, waiting: boolean) => (
    <>
      <View style={[styles.tile, { backgroundColor: row.done ? theme.tint : theme.tealTint }]}>
        <Ionicons
          name={row.done ? 'checkmark' : row.icon}
          size={15}
          color={row.done ? onAccent : theme.tint}
        />
      </View>

      <View style={styles.main}>
        <ThemedText type="smallBold" numberOfLines={1} style={{ color: theme.text }}>
          {row.title}
        </ThemedText>
        {row.meta.length > 0 && (
          <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary }}>
            {row.meta}
          </ThemedText>
        )}
        {/* Same badge, same derivation as the focus stack — a Step's streak meaning must not depend
            on which section of Home it happens to be sitting in. A done Step is past the question;
            a WAITING one is not actionable yet, so neither carries it. */}
        {row.streakRole && !row.done && !waiting ? (
          <View style={styles.badgeRow}>
            <StepStreakBadge role={row.streakRole} />
          </View>
        ) : null}
      </View>

      {!row.done && !waiting && <StepStatusChip status={row.status} />}

      {row.done ? (
        <View style={[styles.check, { backgroundColor: theme.tint }]}>
          <Ionicons name="checkmark" size={13} color={onAccent} />
        </View>
      ) : waiting ? null : (
        <View style={styles.dots} accessibilityElementsHidden>
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.textMuted} />
        </View>
      )}

      {/* Subtle grip — hints the card can be swiped aside (actionable cards only). */}
      {!waiting && (
        <View style={[styles.grip, { backgroundColor: theme.hairline }]} accessibilityElementsHidden />
      )}
    </>
  );

  /** The front card for a group: a non-interactive waiting card, or the swipeable actionable card. */
  const renderFront = (g: StackGroup) => {
    if (g.frontIsWaiting) {
      return (
        <View
          accessible
          accessibilityLabel={t('dependents.waiting.a11y', {
            ns: 'journey',
            predecessor: g.front.predecessorTitle ?? '',
          })}
          style={[
            styles.card,
            styles.waitingCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
          ]}>
          {cardInner(g.front, true)}
        </View>
      );
    }
    const row = g.front;
    return (
      <SwipeableStepRow
        enabled={!row.done && !row.locked}
        onDone={row.onDone}
        onPostpone={row.onPostpone}
        onLetGo={row.onLetGo}
        containerStyle={styles.swipe}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            row.done ? t('step.doneA11y', { title: row.title }) : t('step.report', { title: row.title })
          }
          onPress={row.onPress}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.hairline,
              shadowColor: '#000',
              opacity: row.done ? 0.55 : 1,
            },
            pressed && styles.pressed,
          ]}>
          {cardInner(row, false)}
        </Pressable>
      </SwipeableStepRow>
    );
  };

  return (
    <View style={styles.group}>
      {/* Dream label — the head of the rail. */}
      <View style={styles.header}>
        <View style={[styles.marker, { backgroundColor: theme.tealTint }]}>
          <Ionicons name={isDream ? 'compass' : 'flag'} size={13} color={theme.tint} />
        </View>
        <ThemedText type="smallBold" numberOfLines={1} style={[styles.title, { color: theme.text }]}>
          {title}
        </ThemedText>
      </View>

      {/* The Dream's Steps: separate cards strung along one rail that connects the dots (only when
          there is more than one front to connect). Waiting Steps fold into decks / waiting cards. */}
      <View style={styles.rows}>
        {railReady && (
          <View
            style={[styles.rail, { backgroundColor: theme.tint, top: railTop, height: railHeight }]}
          />
        )}

        {groups.flatMap((g, i) => {
          const notLast = i < groups.length - 1;
          const hasHint = g.waiting.length > 0 || g.frontIsWaiting;
          const deckClear = g.waiting.length * STACK_OFFSET;
          const rowMb = deckClear > 0 ? deckClear : hasHint || notLast ? Spacing.two : 0;
          const hintText = g.frontIsWaiting
            ? t('dependents.waiting.orphanHint', {
                ns: 'journey',
                predecessor: g.front.predecessorTitle ?? '',
              })
            : t('dependents.waiting.hint', {
                ns: 'journey',
                count: g.waiting.length,
                predecessor: g.front.title,
              });
          const hintA11y = t('dependents.waiting.a11y', {
            ns: 'journey',
            predecessor: g.frontIsWaiting ? g.front.predecessorTitle ?? '' : g.front.title,
          });

          const elems = [
            <View key={g.front.key} onLayout={onRowLayout(i)} style={[styles.rowWrap, { marginBottom: rowMb }]}>
              <View style={styles.railCol}>
                {multi && (
                  <View
                    style={[styles.node, { backgroundColor: theme.tint, borderColor: theme.background }]}
                  />
                )}
              </View>

              <View style={styles.deckShell}>
                {/* Equal-size blank card layers behind the front — nearest → farthest, offset down +
                    trailing (mirrors under RTL via `dir`). Decorative and non-interactive. */}
                {g.waiting.map((w, n) => (
                  <View
                    key={w.key}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      styles.blank,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.hairline,
                        transform: [
                          { translateX: dir * (n + 1) * STACK_OFFSET },
                          { translateY: (n + 1) * STACK_OFFSET },
                        ],
                      },
                    ]}
                  />
                ))}
                {renderFront(g)}
              </View>
            </View>,
          ];

          if (hasHint) {
            elems.push(
              <View
                key={`${g.front.key}-hint`}
                accessible
                accessibilityLabel={hintA11y}
                style={[styles.hintRow, { marginBottom: notLast ? Spacing.two : 0 }]}>
                <Ionicons
                  name={isRTL() ? 'chevron-back' : 'chevron-forward'}
                  size={13}
                  color={theme.textSecondary}
                  style={styles.hintIcon}
                />
                <ThemedText type="small" style={[styles.hintText, { color: theme.textSecondary }]}>
                  {hintText}
                </ThemedText>
              </View>,
            );
          }

          return elems;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Its own line under the meta — the compact week row has no horizontal room to spare, and the
  // `binding` label is a phrase, not a word.
  badgeRow: {
    flexDirection: 'row',
    marginTop: Spacing.half,
  },
  group: {
    marginTop: Spacing.three,
    marginHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    paddingStart: 3,
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 13.5,
  },
  rows: {
    position: 'relative',
  },
  rail: {
    // top + height are set dynamically so the line spans node-centre to node-centre.
    position: 'absolute',
    start: RAIL_W / 2 - 1,
    width: 2,
    opacity: 0.3,
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // The deck area takes the remaining row width beside the rail; the front card fills it, and the
  // blank layers sit absolutely behind it (a translate never resizes them — always equal-size).
  deckShell: {
    flex: 1,
    position: 'relative',
  },
  blank: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
    borderRadius: Radius.card,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  swipe: {
    alignSelf: 'stretch',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
    marginTop: Spacing.one,
    paddingStart: RAIL_W,
  },
  hintIcon: {
    marginTop: 2,
  },
  hintText: {
    flex: 1,
  },
  railCol: {
    width: RAIL_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    paddingStart: Spacing.three,
    paddingEnd: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  // A waiting card reads calm and out-of-reach without a padlock or grey-disabled control: the same
  // white-card family, just softened. It carries no ⋯ / grip because there is nothing to act on yet.
  waitingCard: {
    opacity: 0.7,
  },
  tile: {
    width: 30,
    height: 30,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: {
    width: 3,
    height: 18,
    borderRadius: Radius.pill,
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.6,
  },
});
