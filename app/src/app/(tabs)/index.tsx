/**
 * Home — action-based (Home_Screen.md "Finalized visual design", mockup v14
 * screen-01). It answers "what should I do now?" (not a list of Journeys).
 *
 * Layout is two zones (Home_Screen.md §"draggable panel over a frozen top"):
 * a FROZEN top (never scrolls) — the floating ResourceBar, the greeting speech
 * bubble + Buddy flanked by four area buttons, all sitting on the forest scene
 * wash — and a draggable "Week's steps" panel on top of it: full-width, square
 * top corners, cream background, taking a larger share of the screen than a
 * plain content card. Dragging the panel's grabber up expands it over more of
 * the frozen top; only the Steps list inside the panel scrolls. Checking a Step
 * calls the AppCore facade; the engines run and the Buddy reacts on screen.
 *
 * Presentational only — no business logic lives here (Engineering Bible §19).
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyAvatar } from '@/components/buddy/BuddyAvatar';
import { EvolveReveal } from '@/components/buddy/EvolveReveal';
import { GlossyTile } from '@/components/GlossyTile';
import { DevRecoveryPanel } from '@/components/journey/DevRecoveryPanel';
import { RecoveryFlow } from '@/components/journey/RecoveryFlow';
import { ReasonHistorySheet } from '@/components/journey/ReasonHistorySheet';
import { StepCard } from '@/components/journey/StepCard';
import { featureFlags } from '@/core/config/featureFlags';
import { ResourceBar } from '@/components/ResourceBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeekStepsSheet } from '@/components/WeekStepsSheet';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import { formatReactionReward, useBuddyMoments } from '@/hooks/use-buddy-moments';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

// TODO(data model): Grace Tokens are not yet tracked in AppState — no GraceTokenEngine
// exists yet. Render a placeholder until one lands (see ResourceBar's `graceTokens` prop).
const GRACE_TOKENS_PLACEHOLDER = 2;

// The frozen top's forest wash — same sky→ground pairing as BuddyScene, lightened
// per Home_Screen.md ("lightened slightly so buttons/objects stay prominent") since
// Home's top zone is much shorter than the full Buddy-tab scene and carries more
// foreground UI (ResourceBar + buttons) on top of it.
const HOME_SCENE_SKY = '#DEEFE8';
const HOME_SCENE_GROUND = '#B7DEB2';

// The four area buttons carry crisp, white, monochrome icons on their glossy 3D
// faces (mockup screen-01) — not colourful emoji, which clash with the tile colour.
const TILE_ICON_SIZE = 26;
const TILE_ICON_COLOR = '#FFFFFF';

// The Week's-steps sheet's resting vs. fully-dragged-open heights are derived at
// runtime from MEASURED layout (see below): the collapsed sheet is exactly the
// stage height minus the frozen top's real height, so the full Buddy scene + all
// four area buttons + the greeting bubble are ALWAYS visible when collapsed (the
// old fixed `windowHeight * 0.56` guessed too tall and buried the lower tiles +
// Buddy base — founder's on-device report). These window-fraction values are only
// fallbacks used for the first frame, before onLayout has measured the stage.
const windowHeight = Dimensions.get('window').height;
const SHEET_COLLAPSED_FALLBACK = Math.round(windowHeight * 0.48);
const SHEET_EXPANDED_FALLBACK = Math.round(windowHeight * 0.82);
// Never let the measured collapsed height collapse to nothing on a very short
// frozen top (e.g. mid-loading) — keep at least a third of the screen for Steps.
const SHEET_MIN_COLLAPSED_HEIGHT = Math.round(windowHeight * 0.34);
// Breathing room between the bottom of the frozen top (Buddy name pill) and the
// top edge of the collapsed cream panel, matching the mockup's small gap.
const SHEET_TOP_GAP = Spacing.three;

export default function HomeScreen() {
  const { core, snapshot, ready } = useApp();
  const router = useRouter();
  const theme = useTheme();

  // Measured layout drives the sheet heights (see SHEET_* constants): the stage
  // is the whole draggable-area box; the "top zone" is the frozen forest top
  // (ResourceBar + greeting + Buddy + area buttons). Collapsing the sheet to
  // exactly `stage − topZone` guarantees the full Buddy scene stays visible on
  // every device instead of being buried by a fixed-fraction guess.
  const [stageHeight, setStageHeight] = useState(0);
  const [topZoneHeight, setTopZoneHeight] = useState(0);

  const collapsedHeight =
    stageHeight > 0 && topZoneHeight > 0
      ? Math.max(
          SHEET_MIN_COLLAPSED_HEIGHT,
          Math.round(stageHeight - topZoneHeight - SHEET_TOP_GAP),
        )
      : SHEET_COLLAPSED_FALLBACK;
  const expandedHeight = Math.max(
    collapsedHeight + Spacing.six,
    stageHeight > 0 ? Math.round(stageHeight * 0.92) : SHEET_EXPANDED_FALLBACK,
  );

  // One-off Buddy moments. The evolution reveal is owned by the EvolveReveal
  // modal below; the reaction shows a small, non-childish celebration banner.
  const { reaction, reveal, dismissReveal } = useBuddyMoments(core);
  const reward = reaction ? formatReactionReward(reaction) : null;
  const celebration = reward ? `Nice — ${reward}` : null;

  // The greeting bubble is the Buddy speaking to the USER, so it should show the
  // user's name (mockup: "Hello, Guy"). AppState has no user profile/name yet, so
  // fall back to a warm default. TODO(data model): wire real user name once profiles land.
  const userName = 'friend';

  // The ⋯ menu and the recovery sheets are driven from Home (StepCard stays
  // presentational). `menuStep` is the Step whose three-dots menu is open;
  // `recoveryStep` is the Step in the Miss-Recovery loop (Postpone → reason → times),
  // reached via the menu OR a swipe-left on the card; `historyStep` is the Step whose
  // "see past reasons" view is open.
  const [menuStep, setMenuStep] = useState<TodayStep | null>(null);
  const [recoveryStep, setRecoveryStep] = useState<TodayStep | null>(null);
  const [historyStep, setHistoryStep] = useState<TodayStep | null>(null);

  // The full week's list INCLUDING done Steps (so a checked-in Step stays visible,
  // marked done, instead of vanishing — Home_Screen.md). getTodaySteps still drives
  // the actionable count elsewhere; this superset drives the Home feed. Completed
  // Steps sink to the very bottom (dimmed + green sealed wash), with the actionable
  // (pending) Steps on top (Home_Screen.md).
  const orderedSteps = useMemo(() => {
    const week: TodayStep[] = snapshot?.weekSteps ?? [];
    const rank = (item: TodayStep) => (item.step.done ? 1 : 0);
    return [...week].sort((a, b) => rank(a) - rank(b));
  }, [snapshot?.weekSteps]);

  // A small "{done}/{total}" read-out beside the "Week's steps" title — derived
  // from the SAME weekSteps the list renders (done = step.done), so the count and
  // the list can never disagree.
  const weekTotal = orderedSteps.length;
  const weekDone = orderedSteps.filter((item) => item.step.done).length;

  return (
    <ThemedView style={styles.container}>
      {/* Exclude the bottom edge: the native tab bar already owns the home-indicator
          inset, so insetting here too would leave a dead strip between the sheet and
          the tab bar (founder's "empty gap" report). The sheet sits flush above it. */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View
          style={styles.stage}
          onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}>
          {/* ── Frozen top: never scrolls. The forest scene wash sits behind the
              ResourceBar + greeting + Buddy + area buttons (Home_Screen.md: "the
              whole screen sits on the forest background, same scene as the Buddy
              tab"). The Week's-steps sheet below is a separate, draggable layer
              on top of this — dragging it never scrolls this zone. */}
          <View style={[styles.scene, { backgroundColor: HOME_SCENE_SKY }]}>
            <View style={[styles.ground, { backgroundColor: HOME_SCENE_GROUND }]} />

            <View
              style={styles.sceneContent}
              onLayout={(e) => setTopZoneHeight(e.nativeEvent.layout.height)}>
              <ResourceBar
                level={snapshot?.buddy.level ?? 1}
                xpInto={snapshot?.buddy.xpIntoLevel ?? 0}
                xpForNext={snapshot?.buddy.xpForNextLevel ?? 1}
                coins={snapshot?.buddy.coins ?? 0}
                graceTokens={GRACE_TOKENS_PLACEHOLDER}
                onAddCoins={() => router.push('/shop')}
              />

              {!ready || !snapshot ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Loading…
                </ThemedText>
              ) : (
                <View style={styles.buddyRow}>
                  {/* Left column: My Journeys (replaces the old Friends/Cheer tile —
                      Friends stays reachable via the bottom tab) + Achievements. */}
                  <View style={styles.abCol}>
                    <GlossyTile
                      color="blue"
                      accessibilityLabel="My Journeys"
                      onPress={() => router.push('/journeys')}>
                      <MaterialCommunityIcons name="map-marker-path" size={TILE_ICON_SIZE} color={TILE_ICON_COLOR} />
                    </GlossyTile>
                    <GlossyTile
                      color="teal"
                      accessibilityLabel="Achievements"
                      onPress={() => router.push('/achievements')}>
                      <Ionicons name="trophy" size={TILE_ICON_SIZE} color={TILE_ICON_COLOR} />
                    </GlossyTile>
                  </View>

                  <View style={styles.buddyCol}>
                    <View style={[styles.greetBubble, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="subtitle" style={styles.greetText}>
                        Hello, {userName}
                      </ThemedText>
                      <View
                        style={[styles.greetTail, { borderTopColor: theme.backgroundElement }]}
                      />
                    </View>
                    <BuddyAvatar stage={snapshot.buddy.stage} size={120} />
                    <View style={[styles.stagePill, { backgroundColor: theme.tealTint }]}>
                      <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                        {snapshot.buddy.name}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Right column: Missions (moved from the left so it sits on the
                      right of the Buddy — founder decision 2026-07-14) + Consistency. */}
                  <View style={styles.abCol}>
                    <GlossyTile
                      color="gold"
                      accessibilityLabel={
                        snapshot.claimableRewards > 0
                          ? `Missions — ${snapshot.claimableRewards} to claim`
                          : 'Missions'
                      }
                      badge={snapshot.claimableRewards}
                      onPress={() => router.push('/missions')}>
                      <MaterialCommunityIcons name="target" size={TILE_ICON_SIZE} color={TILE_ICON_COLOR} />
                    </GlossyTile>
                    <GlossyTile
                      color="pink"
                      accessibilityLabel="Consistency"
                      // TODO: consistency screen — no route exists yet.
                      onPress={() => {}}>
                      <Ionicons name="flame" size={TILE_ICON_SIZE} color={TILE_ICON_COLOR} />
                    </GlossyTile>
                  </View>
                </View>
              )}

              {celebration && (
                <View style={[styles.celebration, { backgroundColor: theme.successTint }]}>
                  <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                    {celebration}
                  </ThemedText>
                </View>
              )}

              {/* DEV-ONLY: the Miss-Recovery mock toggles (home/away · busy/free).
                  Hidden unless featureFlags.devMockRecovery is on (off in prod). */}
              {featureFlags.devMockRecovery && <DevRecoveryPanel />}
            </View>
          </View>

          {/* ── Draggable "Week's steps" panel — the only thing that scrolls/drags. */}
          {ready && snapshot && (
            <WeekStepsSheet collapsedHeight={collapsedHeight} expandedHeight={expandedHeight}>
              <View style={styles.panelHeader}>
                <View style={styles.panelHeaderTitle}>
                  <ThemedText type="subtitle" style={{ color: theme.text }}>
                    Week&apos;s steps
                  </ThemedText>
                  {/* Progress read-out — how many of this week's Steps are done,
                      out of the total. Derived from the same weekSteps feed. */}
                  {weekTotal > 0 && (
                    <ThemedText type="smallBold" themeColor="textMuted">
                      {weekDone}/{weekTotal}
                    </ThemedText>
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create a new Journey"
                  onPress={() => router.push('/journey/new')}
                  style={({ pressed }) => [
                    styles.createButton,
                    { backgroundColor: theme.coral },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={[styles.plus, { color: theme.text }]}>
                    +
                  </ThemedText>
                </Pressable>
              </View>

              {orderedSteps.length === 0 ? (
                <View style={styles.empty}>
                  <ThemedText type="default">All caught up 🎉</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    You&apos;ve checked in on every Step. Your Buddy is proud.
                  </ThemedText>
                </View>
              ) : (
                <FlatList
                  data={orderedSteps}
                  keyExtractor={(item) => item.step.id}
                  // flex:1 gives the list a BOUNDED height so it scrolls INSIDE the
                  // sheet (was unbounded → it overflowed/clipped and wouldn't scroll,
                  // and the trailing padding read as dead space). Content packs from
                  // the top (default flex-start), so pending → missed → done cards
                  // flow contiguously with only the normal card gap between them.
                  style={styles.stepListBox}
                  contentContainerStyle={styles.stepList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <StepCard
                      item={item}
                      status={item.step.done ? 'done' : 'pending'}
                      onCheckIn={(journeyId, stepId) => core.checkInStep(journeyId, stepId)}
                      onReschedule={() => setRecoveryStep(item)}
                      // The ⋯ menu is only meaningful on a pending Step (Mark done /
                      // Postpone / see past reasons); a completed card's dots stay inert.
                      onOpenMenu={item.step.done ? undefined : () => setMenuStep(item)}
                    />
                  )}
                />
              )}
            </WeekStepsSheet>
          )}
        </View>
      </SafeAreaView>

      {reveal && (
        <EvolveReveal
          visible
          buddyName={reveal.buddyName}
          toStage={reveal.toStage}
          toStageDisplayName={reveal.toStageDisplayName}
          onCollect={dismissReveal}
        />
      )}

      {/* ⋯ menu for a pending Step: Mark done (check-in), Postpone (the Miss-Recovery
          loop), or See past reasons. Presented from Home so StepCard stays
          presentational. */}
      {menuStep && (
        <StepActionSheet
          stepTitle={menuStep.step.title}
          stepDescription={menuStep.step.description}
          onMarkDone={() => {
            core.checkInStep(menuStep.journeyId, menuStep.step.id);
            setMenuStep(null);
          }}
          onPostpone={() => {
            setRecoveryStep(menuStep);
            setMenuStep(null);
          }}
          onSeePastReasons={() => {
            setHistoryStep(menuStep);
            setMenuStep(null);
          }}
          // TODO(data model): no Step-editing flow/route exists yet — closes for
          // now. Wire to a real edit screen once Steps become editable.
          onEditStep={() => setMenuStep(null)}
          onClose={() => setMenuStep(null)}
        />
      )}

      {/* The Miss-Recovery loop (Postpone → what happened? → propose times). Mounted
          per Step so its internal stage resets cleanly each time it opens. */}
      {recoveryStep && (
        <RecoveryFlow step={recoveryStep} core={core} onClose={() => setRecoveryStep(null)} />
      )}

      <ReasonHistorySheet
        visible={historyStep !== null}
        stepTitle={historyStep?.step.title ?? ''}
        entries={historyStep ? core.getReasonHistory(historyStep.step.id) : []}
        onClose={() => setHistoryStep(null)}
      />
    </ThemedView>
  );
}

/**
 * StepActionSheet — the ⋯ menu for a pending Step (founder decision 2026-07-14):
 * a bottom sheet with "Mark done", "Postpone", "See past reasons", "Step details"
 * and "Edit step". Kept local to Home since it only orchestrates Home's state;
 * StepCard stays presentational. "Step details" swaps the sheet into a read-only
 * details panel (title + description); the rest fire their action and close.
 */
function StepActionSheet({
  stepTitle,
  stepDescription,
  onMarkDone,
  onPostpone,
  onSeePastReasons,
  onEditStep,
  onClose,
}: {
  stepTitle: string;
  stepDescription?: string;
  onMarkDone: () => void;
  onPostpone: () => void;
  onSeePastReasons: () => void;
  onEditStep: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const description = stepDescription?.trim();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Dismiss menu" style={styles.menuBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.menuSheet, { backgroundColor: theme.backgroundElement }]}
          onPress={() => {}}>
          {showDetails ? (
            // Read-only details panel: title always, description only when present.
            <View style={styles.menuDetails}>
              <ThemedText type="subtitle" style={{ color: theme.text }}>
                {stepTitle}
              </ThemedText>
              {description ? (
                <ThemedText type="default" themeColor="textSecondary">
                  {description}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textMuted">
                  No description yet.
                </ThemedText>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => setShowDetails(false)}
                style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
                <ThemedText type="default" style={{ color: theme.text }}>
                  Back
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <ThemedText
                type="smallBold"
                themeColor="textMuted"
                numberOfLines={1}
                style={styles.menuTitle}>
                {stepTitle}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mark done"
                onPress={onMarkDone}
                style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                <Ionicons name="checkmark-circle-outline" size={22} color={theme.tealStrong} />
                <ThemedText type="default" style={{ color: theme.text }}>
                  Mark done
                </ThemedText>
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: theme.hairline }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Postpone"
                onPress={onPostpone}
                style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                <Ionicons name="calendar-outline" size={22} color={theme.goldStrong} />
                <ThemedText type="default" style={{ color: theme.text }}>
                  Postpone
                </ThemedText>
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: theme.hairline }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See past reasons"
                onPress={onSeePastReasons}
                style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                <Ionicons name="time-outline" size={22} color={theme.tealStrong} />
                <ThemedText type="default" style={{ color: theme.text }}>
                  See past reasons
                </ThemedText>
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: theme.hairline }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Step details"
                onPress={() => setShowDetails(true)}
                style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                <Ionicons name="information-circle-outline" size={22} color={theme.tealStrong} />
                <ThemedText type="default" style={{ color: theme.text }}>
                  Step details
                </ThemedText>
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: theme.hairline }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit step"
                onPress={onEditStep}
                style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                <Ionicons name="pencil-outline" size={22} color={theme.textSecondary} />
                <ThemedText type="default" style={{ color: theme.text }}>
                  Edit step
                </ThemedText>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  stage: {
    flex: 1,
    position: 'relative',
  },

  // ── Frozen top / forest scene ──────────────────────────────────────────
  scene: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    transform: [{ scaleX: 1.6 }],
  },
  sceneContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },

  // ── Buddy cluster ──────────────────────────────────────────────────────
  buddyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  abCol: {
    gap: Spacing.three,
  },
  buddyCol: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  greetBubble: {
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
    shadowColor: '#283C1E',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  greetText: {
    fontSize: 18,
  },
  greetTail: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  stagePill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },

  // ── Steps panel ────────────────────────────────────────────────────────
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  panelHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.6,
  },
  stepListBox: {
    flex: 1,
  },
  stepList: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    // The sheet now sits flush above the native tab bar (which owns the safe-area
    // inset), so the list only needs a small trailing pad for the last card — not
    // the full tab-bar inset, which previously left dead space at the list's foot.
    paddingBottom: Spacing.four,
  },
  celebration: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  empty: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    marginHorizontal: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },

  // ── ⋯ Step action sheet ────────────────────────────────────────────────
  menuBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 20, 18, 0.45)',
  },
  menuSheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
    gap: Spacing.one,
  },
  menuTitle: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  menuDetails: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
