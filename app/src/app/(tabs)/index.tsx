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
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyAvatar } from '@/components/buddy/BuddyAvatar';
import { EvolveReveal } from '@/components/buddy/EvolveReveal';
import { GlossyTile } from '@/components/GlossyTile';
import { StepCard } from '@/components/journey/StepCard';
import { ResourceBar } from '@/components/ResourceBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeekStepsSheet } from '@/components/WeekStepsSheet';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { featureFlags } from '@/core/config/featureFlags';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import { formatReactionReward, useBuddyMoments } from '@/hooks/use-buddy-moments';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { useSocial } from '@/state/SocialProvider';

// TODO(data model): Grace Tokens are not yet tracked in AppState — no GraceTokenEngine
// exists yet. Render a placeholder until one lands (see ResourceBar's `graceTokens` prop).
const GRACE_TOKENS_PLACEHOLDER = 2;

// The frozen top's forest wash — same sky→ground pairing as BuddyScene, lightened
// per Home_Screen.md ("lightened slightly so buttons/objects stay prominent") since
// Home's top zone is much shorter than the full Buddy-tab scene and carries more
// foreground UI (ResourceBar + buttons) on top of it.
const HOME_SCENE_SKY = '#E7F5F1';
const HOME_SCENE_GROUND = '#B7DEB2';

// The Week's-steps sheet's resting vs. fully-dragged-open heights, expressed as a
// fraction of the actual STAGE height (measured at runtime, below) — NOT the full
// window. Sizing off the window overshot on device: the notch safe-area inset +
// the bottom tab bar make the stage much shorter than the window, so a window-based
// height rested the panel far too high, covering the Buddy + its area buttons
// (v14 mockup screen-01: the cream panel top sits at ~46% of the stage). The
// collapsed fraction keeps the frozen top's Buddy cluster fully visible while still
// reading as "a larger share of the screen" than a small content card (founder's
// "taller" correction); expanded drags up to cover most of the top.
const SHEET_COLLAPSED_FRACTION = 0.54;
const SHEET_EXPANDED_FRACTION = 0.8;

export default function HomeScreen() {
  const { core, snapshot, ready } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const social = useSocial();

  // One-off Buddy moments. The evolution reveal is owned by the EvolveReveal
  // modal below; the reaction shows a small, non-childish celebration banner.
  const { reaction, reveal, dismissReveal } = useBuddyMoments(core);
  const reward = reaction ? formatReactionReward(reaction) : null;
  const celebration = reward ? `Nice — ${reward}` : null;

  const incomingFriendRequests = featureFlags.social
    ? social.friends.filter((f) => f.status === 'pending' && f.direction === 'incoming').length
    : 0;

  // The greeting bubble is the Buddy speaking to the USER, so it should show the
  // user's name (mockup: "Hello, Guy"). AppState has no user profile/name yet, so
  // fall back to a warm default. TODO(data model): wire real user name once profiles land.
  const userName = 'friend';

  // Swipe-left "missed" reports are visual-only for now — there is no MissEngine /
  // missed-status field on the domain Step yet (TODO: data model). We track a
  // local set of Step ids the user has swiped as missed so the card recolors
  // (Home_Screen.md: "missed → red wash, no mark") without inventing persisted
  // state the engines don't own. Cleared automatically once the Step itself
  // leaves today's list (e.g. checked in later some other way).
  const [locallyMissed, setLocallyMissed] = useState<Set<string>>(new Set());
  const handleMiss = (_journeyId: string, stepId: string) => {
    setLocallyMissed((prev) => new Set(prev).add(stepId));
  };

  // Measure the stage (the area between the safe-area top and the tab bar) so the
  // Week's-steps sheet is sized against the real usable height on this device, not
  // the full window — see SHEET_*_FRACTION above.
  const [stageHeight, setStageHeight] = useState(0);
  const onStageLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== stageHeight) setStageHeight(h);
  };

  const steps: TodayStep[] = snapshot?.todaySteps ?? [];
  // Completed Steps sink to the bottom of the feed, shown disabled (Home_Screen.md).
  const orderedSteps = useMemo(() => {
    return [...steps].sort((a, b) => {
      const aMissed = locallyMissed.has(a.step.id) ? 1 : 0;
      const bMissed = locallyMissed.has(b.step.id) ? 1 : 0;
      return aMissed - bMissed;
    });
  }, [steps, locallyMissed]);

  return (
    <ThemedView style={styles.container}>
      {/* The tab bar already reserves the bottom safe-area inset, so excluding the
          bottom edge here keeps the stage (and the sheet pinned to its bottom)
          flush to the tab bar instead of floating above a safe-area gap. */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.stage} onLayout={onStageLayout}>
          {/* ── Frozen top: never scrolls. The forest scene wash sits behind the
              ResourceBar + greeting + Buddy + area buttons (Home_Screen.md: "the
              whole screen sits on the forest background, same scene as the Buddy
              tab"). The Week's-steps sheet below is a separate, draggable layer
              on top of this — dragging it never scrolls this zone. */}
          <View style={[styles.scene, { backgroundColor: HOME_SCENE_SKY }]}>
            <View style={[styles.ground, { backgroundColor: HOME_SCENE_GROUND }]} />

            <View style={styles.sceneContent}>
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
                      <ThemedText style={styles.tileGlyph}>🎯</ThemedText>
                    </GlossyTile>
                    <GlossyTile
                      color="pink"
                      accessibilityLabel="Consistency"
                      // TODO: consistency screen — no route exists yet.
                      onPress={() => {}}>
                      <ThemedText style={styles.tileGlyph}>🔥</ThemedText>
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

                  <View style={styles.abCol}>
                    {featureFlags.social && (
                      <GlossyTile
                        color="purple"
                        accessibilityLabel="Friends"
                        badge={incomingFriendRequests}
                        onPress={() => router.navigate('/friends')}>
                        <ThemedText style={styles.tileGlyph}>🤝</ThemedText>
                      </GlossyTile>
                    )}
                    <GlossyTile
                      color="teal"
                      accessibilityLabel="Achievements"
                      onPress={() => router.push('/achievements')}>
                      <ThemedText style={styles.tileGlyph}>🏆</ThemedText>
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
            </View>
          </View>

          {/* ── Draggable "Week's steps" panel — the only thing that scrolls/drags.
              Rendered once the stage is measured so its height tracks the real
              usable area on this device (see SHEET_*_FRACTION). */}
          {ready && snapshot && stageHeight > 0 && (
            <WeekStepsSheet
              collapsedHeight={Math.round(stageHeight * SHEET_COLLAPSED_FRACTION)}
              expandedHeight={Math.round(stageHeight * SHEET_EXPANDED_FRACTION)}>
              <View style={styles.panelHeader}>
                <ThemedText type="subtitle" style={{ color: theme.text }}>
                  Week&apos;s steps
                </ThemedText>
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
                  contentContainerStyle={styles.stepList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <StepCard
                      item={item}
                      status={locallyMissed.has(item.step.id) ? 'missed' : 'pending'}
                      onCheckIn={(journeyId, stepId) => core.checkInStep(journeyId, stepId)}
                      onMiss={handleMiss}
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
    </ThemedView>
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
  tileGlyph: {
    fontSize: 24,
    lineHeight: 28,
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
  stepList: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
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
});
