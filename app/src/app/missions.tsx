/**
 * Missions — the "return loop" (POC pillar 4, the POC subset of
 * 04_Product/UX/Missions_Modal.md). One centered, floating modal with two
 * top-level tabs: **Missions** (Daily / Weekly sub-tabs) and **Login** (a 7-day
 * reward rail). Missions and the Login reward grant **Coins only, never XP**.
 * Opened from the Missions button on Home and presented as a modal over the tabs.
 *
 * Presentational only — it reads the snapshot / facade and calls claimMission /
 * claimLoginReward. No Mission, reward, or rollover logic lives here (Engineering
 * Bible §19); the MissionEngine owns it all. Warm palette (cream / teal accents).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { LoginDayView, MissionView } from '@/core/engines/MissionEngine';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

/** Warm accents, shared with the Shop, per the UX spec (cream / teal). */
const TEAL = '#0E8177';
const CREAM = '#F6E4C1';

type TopTab = 'missions' | 'login';
type MissionTab = 'daily' | 'weekly';

export default function MissionsScreen() {
  const { core, snapshot } = useApp();
  const router = useRouter();

  const [topTab, setTopTab] = useState<TopTab>('missions');
  const [missionTab, setMissionTab] = useState<MissionTab>('daily');

  // Re-reading on each render keeps progress/claim state live: the snapshot
  // subscription re-renders this screen whenever a claim (or check-in) lands.
  const missions = core.getMissions();
  const login = core.getLoginReward();
  const shown = missions.filter((m) => m.cadence === missionTab);

  // Dismiss safely — router.back() is a no-op with no history (web reload /
  // deep-link straight onto this route), which would otherwise trap the user.
  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.topTabs}>
              <TopTabButton label="Missions" active={topTab === 'missions'} onPress={() => setTopTab('missions')} />
              <TopTabButton label="Login" active={topTab === 'login'} onPress={() => setTopTab('login')} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={dismiss}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Close
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.headerRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Little tasks that earn you Coins.
            </ThemedText>
            <View style={[styles.coinPill, { backgroundColor: CREAM }]}>
              <ThemedText type="smallBold" style={styles.coinText}>
                🪙 {snapshot?.buddy.coins ?? 0}
              </ThemedText>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {topTab === 'missions' ? (
            <>
              <View style={styles.subTabs}>
                <SubTabButton label="Daily" active={missionTab === 'daily'} onPress={() => setMissionTab('daily')} />
                <SubTabButton label="Weekly" active={missionTab === 'weekly'} onPress={() => setMissionTab('weekly')} />
              </View>
              <View style={styles.list}>
                {shown.map((mission) => (
                  <MissionRow
                    key={mission.id}
                    mission={mission}
                    onClaim={() => core.claimMission(mission.id)}
                  />
                ))}
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
                Daily Missions refresh each day; weekly Missions each week.
              </ThemedText>
            </>
          ) : (
            <>
              <View style={styles.list}>
                {login.days.map((day) => (
                  <LoginDayRow key={day.day} day={day} />
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  login.claimableToday ? `Claim ${login.todayCoins} Coins` : 'Login reward already claimed today'
                }
                disabled={!login.claimableToday}
                onPress={() => core.claimLoginReward()}
                style={[styles.loginClaim, { backgroundColor: TEAL }, !login.claimableToday && styles.disabled]}>
                <ThemedText type="smallBold" style={styles.claimLabel}>
                  {login.claimableToday ? 'Claim' : 'Claimed ✓'}
                </ThemedText>
              </Pressable>
              <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
                Come back each day to claim the next reward.
              </ThemedText>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function TopTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}>
      <ThemedText type="subtitle" style={[styles.topTabLabel, !active && styles.topTabInactive]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SubTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.subTab, active && { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** One Mission: title + progress bar & count on the left, reward + state on the right. */
function MissionRow({ mission, onClaim }: { mission: MissionView; onClaim: () => void }) {
  const theme = useTheme();
  const ratio = Math.max(0, Math.min(1, mission.progress / mission.target));

  return (
    <ThemedView type="backgroundElement" style={styles.missionCard}>
      <View style={styles.missionMain}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {mission.title}
        </ThemedText>
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
            <View style={[styles.progressFill, { backgroundColor: TEAL, width: `${ratio * 100}%` }]} />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.progressCount}>
            {mission.progress}/{mission.target}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

      <View style={styles.missionReward}>
        <ThemedText type="smallBold" style={styles.rewardAmount}>
          🪙 {mission.rewardCoins}
        </ThemedText>
        {mission.claimed ? (
          <View style={[styles.reward, styles.claimed]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Claimed ✓
            </ThemedText>
          </View>
        ) : mission.done ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Claim ${mission.rewardCoins} Coins`}
            onPress={onClaim}
            style={[styles.reward, { backgroundColor: TEAL }]}>
            <ThemedText type="smallBold" style={styles.claimLabel}>
              Claim
            </ThemedText>
          </Pressable>
        ) : (
          <View style={[styles.reward, styles.inProgress]}>
            <ThemedText type="small" themeColor="textSecondary">
              In progress
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

/** One tile of the Login reward rail: day label · divider · prize · status shade. */
function LoginDayRow({ day }: { day: LoginDayView }) {
  const theme = useTheme();
  const dimmed = day.status !== 'today';
  return (
    <ThemedView
      type={day.status === 'today' ? 'backgroundSelected' : 'backgroundElement'}
      style={[styles.loginRow, dimmed && styles.loginDimmed]}>
      <ThemedText type="smallBold" style={styles.loginDay}>
        Day {day.day}
      </ThemedText>
      <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
      <View style={styles.loginPrize}>
        <ThemedText type="smallBold">🪙 {day.coins}</ThemedText>
      </View>
      {day.status === 'claimed' && (
        <ThemedText type="small" themeColor="textSecondary">
          ✓
        </ThemedText>
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  topTabs: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  topTabLabel: {
    lineHeight: 40,
  },
  topTabInactive: {
    opacity: 0.35,
  },
  coinPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  coinText: {
    color: '#3A2E17',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  subTabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  subTab: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  list: {
    gap: Spacing.two,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  missionMain: {
    flex: 1,
    gap: Spacing.two,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressCount: {
    minWidth: 36,
    textAlign: 'right',
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
  },
  missionReward: {
    width: 92,
    alignItems: 'center',
    gap: Spacing.two,
  },
  rewardAmount: {
    color: TEAL,
  },
  reward: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inProgress: {
    backgroundColor: 'transparent',
  },
  claimed: {
    backgroundColor: 'transparent',
  },
  claimLabel: {
    color: '#ffffff',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  loginDimmed: {
    opacity: 0.55,
  },
  loginDay: {
    width: 60,
  },
  loginPrize: {
    flex: 1,
  },
  loginClaim: {
    marginTop: Spacing.three,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  footnote: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
