/**
 * Missions — the "return loop" (POC pillar 4, the POC subset of
 * 04_Product/UX/Missions_Modal.md). One centered, floating modal (dimmed scrim +
 * cream card, screen-16/17 of mockup_v14) with two top-level tabs: **Missions**
 * (Daily / Weekly sub-tabs, nested under it) and **Login** (a 7-day reward rail).
 * Missions and the Login reward grant **Coins only, never XP**. Opened from the
 * Missions button on Home and presented as a modal over the tabs.
 *
 * Presentational only — it reads the snapshot / facade and calls claimMission /
 * claimLoginReward. No Mission, reward, or rollover logic lives here (Engineering
 * Bible §19); the MissionEngine owns it all. Warm palette (cream / gold accents).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import type { LoginDayView, MissionView } from '@/core/engines/MissionEngine';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

// Missions is a reward surface: rewards read in GOLD, the Claim CTA is CORAL
// (Design System §2 — gold = coins/rewards, coral = primary CTA).
const GOLD = Colors.light.gold;
const GOLD_STRONG = Colors.light.goldStrong;
const GOLD_TINT = Colors.light.goldTint;
const CORAL = Colors.light.coral;
const CREAM = Colors.light.cream;
const INK = Colors.light.text;

type TopTab = 'missions' | 'login';
type MissionTab = 'daily' | 'weekly';

export default function MissionsScreen() {
  const { core } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();

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
    <Pressable style={styles.scrim} accessibilityLabel="Close" onPress={dismiss}>
      {/* Inner press swallows taps so the card body doesn't dismiss. */}
      <Pressable style={styles.cardWrap} onPress={() => {}}>
        <View style={[styles.card, { backgroundColor: CREAM, maxHeight: windowHeight * 0.82 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={dismiss}
            style={[styles.closeButton, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ✕
            </ThemedText>
          </Pressable>

          <View style={[styles.topTabs, { borderBottomColor: theme.hairline }]}>
            <TopTabButton label="Missions" active={topTab === 'missions'} onPress={() => setTopTab('missions')} />
            <TopTabButton label="Login" active={topTab === 'login'} onPress={() => setTopTab('login')} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {topTab === 'missions' ? (
              <>
                <View style={[styles.subTabs, { backgroundColor: theme.backgroundSelected }]}>
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
              </>
            ) : (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={styles.loginIntro}>
                  Show up each day — the reward grows.
                </ThemedText>
                <View style={styles.rail}>
                  {login.days.map((day) => (
                    <LoginDayTile key={day.day} day={day} />
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    login.claimableToday ? `Claim ${login.todayCoins} Coins` : 'Login reward already claimed today'
                  }
                  disabled={!login.claimableToday}
                  onPress={() => core.claimLoginReward()}
                  style={[styles.loginClaim, { backgroundColor: CORAL }, !login.claimableToday && styles.disabled]}>
                  <ThemedText type="smallBold" style={styles.claimInk}>
                    {login.claimableToday ? 'Claim' : 'Claimed ✓'}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Pressable>
  );
}

function TopTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={styles.topTab}>
      <ThemedText type="subtitle" style={[styles.topTabLabel, !active && styles.topTabInactive]}>
        {label}
      </ThemedText>
      {/* Gold underline marks the active top tab (reward domain). */}
      {active && <View style={[styles.topTabUnderline, { backgroundColor: GOLD }]} />}
    </Pressable>
  );
}

function SubTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.subTab, active && styles.subTabActive]}>
      <ThemedText type="smallBold" style={active ? styles.subTabActiveText : styles.subTabInactiveText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** One Mission: title + progress bar & count on the left, reward + state in a fixed right column. */
function MissionRow({ mission, onClaim }: { mission: MissionView; onClaim: () => void }) {
  const ratio = Math.max(0, Math.min(1, mission.progress / mission.target));
  const muted = mission.claimed;

  return (
    <View style={[styles.missionCard, muted && styles.missionCardMuted]}>
      <View style={styles.missionMain}>
        <View style={styles.snRow}>
          <ThemedText type="smallBold" numberOfLines={2} themeColor={muted ? 'textSecondary' : 'text'} style={styles.missionTitle}>
            {mission.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {mission.progress}/{mission.target}
          </ThemedText>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: muted ? '#EEEAE1' : GOLD_TINT }]}>
          <View style={[styles.progressFill, { backgroundColor: muted ? '#C9C2B4' : GOLD, width: `${ratio * 100}%` }]} />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.missionReward}>
        <View style={[styles.rewardChip, { backgroundColor: muted ? '#EDEAE3' : GOLD_TINT }]}>
          <ThemedText type="smallBold" style={{ color: muted ? '#9A9A93' : GOLD_STRONG }}>
            🪙 +{mission.rewardCoins}
          </ThemedText>
        </View>
        {mission.claimed ? (
          <View style={styles.claimedPill}>
            <ThemedText type="small" themeColor="textSecondary">
              ✓ Claimed
            </ThemedText>
          </View>
        ) : mission.done ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Claim ${mission.rewardCoins} Coins`}
            onPress={onClaim}
            style={[styles.claimPill, { backgroundColor: CORAL }]}>
            <ThemedText type="smallBold" style={styles.claimInk}>
              Claim
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const LOGIN_TILE_STYLE: Record<LoginDayView['status'], { bg: string; text: string; border?: string }> = {
  claimed: { bg: '#E9F3EC', text: '#6a8a72' },
  today: { bg: '#FCE7B0', text: GOLD_STRONG, border: '#E9B23E' },
  upcoming: { bg: '#F1EDE4', text: '#AEA697' },
};

/** One tile of the Login reward rail: day label · divider · prize, shaded by status. */
function LoginDayTile({ day }: { day: LoginDayView }) {
  const look = LOGIN_TILE_STYLE[day.status];
  return (
    <View
      style={[
        styles.rr,
        { backgroundColor: look.bg },
        look.border ? { borderWidth: 2, borderColor: look.border } : null,
      ]}>
      <ThemedText type="small" style={[styles.rrDay, { color: look.text }]}>
        Day {day.day}
      </ThemedText>
      <View style={styles.rrDivider} />
      <View style={styles.rrPrize}>
        <ThemedText type="smallBold" style={{ color: look.text }}>
          🪙 {day.coins}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(40,30,20,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    borderRadius: 22,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    overflow: 'hidden',
    shadowColor: '#28190A',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  topTabs: {
    flexDirection: 'row',
    gap: Spacing.four,
    borderBottomWidth: 2,
    paddingHorizontal: Spacing.four,
    paddingRight: Spacing.six,
  },
  topTab: {
    paddingBottom: Spacing.two,
  },
  topTabLabel: {
    lineHeight: 26,
  },
  topTabInactive: {
    opacity: 0.4,
  },
  topTabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -2,
    height: 3,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  subTabs: {
    flexDirection: 'row',
    gap: Spacing.one,
    borderRadius: 11,
    padding: 3,
    marginBottom: Spacing.three,
  },
  subTab: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 9,
    alignItems: 'center',
  },
  subTabActive: {
    backgroundColor: '#fff',
    shadowColor: 'rgba(70,50,25,0.3)',
    shadowOpacity: 1,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  subTabActiveText: {
    color: GOLD_STRONG,
  },
  subTabInactiveText: {
    color: Colors.light.textSecondary,
  },
  list: {
    gap: Spacing.two,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#F1ECE3',
    padding: Spacing.two + 2,
    gap: Spacing.two,
  },
  missionCardMuted: {
    opacity: 0.75,
  },
  missionMain: {
    flex: 1,
    gap: 5,
  },
  snRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  missionTitle: {
    flex: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#EEE7D6',
  },
  missionReward: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  rewardChip: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
  },
  claimedPill: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one + 2,
    borderRadius: 10,
    backgroundColor: '#EDEAE3',
  },
  claimPill: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one + 3,
    borderRadius: 10,
  },
  claimInk: {
    color: INK,
  },
  loginIntro: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  rail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  rr: {
    width: '23%',
    flexGrow: 1,
    borderRadius: 12,
    alignItems: 'center',
    gap: 3,
    paddingVertical: Spacing.two,
    paddingHorizontal: 2,
  },
  rrDay: {
    fontWeight: '700' as const,
  },
  rrDivider: {
    width: '72%',
    height: 1,
    backgroundColor: 'rgba(90,60,20,0.16)',
  },
  rrPrize: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  loginClaim: {
    borderRadius: 13,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
