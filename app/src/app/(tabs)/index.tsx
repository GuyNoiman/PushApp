/**
 * Home — action-based (v14 mockup screen-01). It answers "what should I do now?"
 * (not a list of Journeys): a floating resource bar, a greeting speech bubble +
 * the Buddy flanked by four area buttons, and this week's Steps as check-off
 * cards in a warm cream panel. Checking a Step calls the AppCore facade; the
 * engines run and the Buddy reacts on screen.
 *
 * Presentational only — no business logic lives here (Engineering Bible §19).
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyAvatar } from '@/components/buddy/BuddyAvatar';
import { EvolveReveal } from '@/components/buddy/EvolveReveal';
import { GlossyTile } from '@/components/GlossyTile';
import { StepCard } from '@/components/journey/StepCard';
import { ResourceBar } from '@/components/ResourceBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { featureFlags } from '@/core/config/featureFlags';
import { formatReactionReward, useBuddyMoments } from '@/hooks/use-buddy-moments';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { useSocial } from '@/state/SocialProvider';

// TODO(data model): Grace Tokens are not yet tracked in AppState — no GraceTokenEngine
// exists yet. Render a placeholder until one lands (see ResourceBar's `graceTokens` prop).
const GRACE_TOKENS_PLACEHOLDER = 2;

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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
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
            <>
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
                  <BuddyAvatar stage={snapshot.buddy.stage} size={140} />
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

              {celebration && (
                <View style={[styles.celebration, { backgroundColor: theme.successTint }]}>
                  <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                    {celebration}
                  </ThemedText>
                </View>
              )}

              <View style={[styles.panel, { backgroundColor: theme.cream }]}>
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

                {snapshot.todaySteps.length === 0 ? (
                  <View style={styles.empty}>
                    <ThemedText type="default">All caught up 🎉</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      You&apos;ve checked in on every Step. Your Buddy is proud.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.stepList}>
                    {snapshot.todaySteps.map((item) => (
                      <StepCard
                        key={item.step.id}
                        item={item}
                        onCheckIn={(journeyId, stepId) => core.checkInStep(journeyId, stepId)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
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
  panel: {
    borderRadius: Radius.card + 4,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    gap: Spacing.two,
    alignItems: 'center',
  },
});
