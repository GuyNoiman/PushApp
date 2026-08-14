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
 *
 * ARCHIVED 2026-08-14 — see ./README.md.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { LoginDayView, MissionView } from '@/core/engines/MissionEngine';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

// Missions is a reward surface: rewards read in gold, the Claim CTA is coral
// (Design System §2 — gold = coins/rewards, coral = primary CTA). All accent
// values are read from the active theme so the modal works in light and dark.

type TopTab = 'missions' | 'login';
type MissionTab = 'daily' | 'weekly';

export default function MissionsScreen() {
  const { core } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('missions');
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
    <Pressable style={styles.scrim} accessibilityLabel={t('close', { ns: 'common' })} onPress={dismiss}>
      {/* Inner press swallows taps so the card body doesn't dismiss. */}
      <Pressable style={styles.cardWrap} onPress={() => {}}>
        <View style={[styles.card, { backgroundColor: theme.cream, maxHeight: windowHeight * 0.82 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close', { ns: 'common' })}
            onPress={dismiss}
            style={[styles.closeButton, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ✕
            </ThemedText>
          </Pressable>

          <View style={[styles.topTabs, { borderBottomColor: theme.hairline }]}>
            <TopTabButton label={t('tabs.missions')} active={topTab === 'missions'} onPress={() => setTopTab('missions')} />
            <TopTabButton label={t('tabs.login')} active={topTab === 'login'} onPress={() => setTopTab('login')} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {topTab === 'missions' ? (
              <>
                <View style={[styles.subTabs, { backgroundColor: theme.backgroundSelected }]}>
                  <SubTabButton label={t('cadence.daily')} active={missionTab === 'daily'} onPress={() => setMissionTab('daily')} />
                  <SubTabButton label={t('cadence.weekly')} active={missionTab === 'weekly'} onPress={() => setMissionTab('weekly')} />
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
                  {t('loginIntro')}
                </ThemedText>
                <View style={styles.rail}>
                  {login.days.map((day) => (
                    <LoginDayTile key={day.day} day={day} />
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    login.claimableToday
                      ? t('claimA11y', { count: login.todayCoins })
                      : t('alreadyClaimedA11y')
                  }
                  disabled={!login.claimableToday}
                  onPress={() => core.claimLoginReward()}
                  style={[styles.loginClaim, { backgroundColor: theme.coral }, !login.claimableToday && styles.disabled]}>
                  <ThemedText type="smallBold" style={styles.claimInk}>
                    {login.claimableToday ? t('claim') : t('claimed')}
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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={styles.topTab}>
      <ThemedText type="subtitle" style={[styles.topTabLabel, !active && styles.topTabInactive]}>
        {label}
      </ThemedText>
      {/* Gold underline marks the active top tab (reward domain). */}
      {active && <View style={[styles.topTabUnderline, { backgroundColor: theme.gold }]} />}
    </Pressable>
  );
}

function SubTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
  const theme = useTheme();
  const { t } = useTranslation('missions');
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
        <View style={[styles.progressTrack, { backgroundColor: muted ? theme.backgroundSelected : theme.goldTint }]}>
          {/* Muted (claimed) fill keeps its warm-grey wash — no matching token; reads on light and dark. */}
          <View style={[styles.progressFill, { backgroundColor: muted ? '#C9C2B4' : theme.gold, width: `${ratio * 100}%` }]} />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.missionReward}>
        <View style={[styles.rewardChip, { backgroundColor: muted ? theme.backgroundSelected : theme.goldTint }]}>
          <ThemedText type="smallBold" style={{ color: muted ? theme.textMuted : theme.goldStrong }}>
            🪙 +{mission.rewardCoins}
          </ThemedText>
        </View>
        {mission.claimed ? (
          <View style={styles.claimedPill}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('claimedCheck')}
            </ThemedText>
          </View>
        ) : mission.done ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('claimA11y', { count: mission.rewardCoins })}
            onPress={onClaim}
            style={[styles.claimPill, { backgroundColor: theme.coral }]}>
            <ThemedText type="smallBold" style={styles.claimInk}>
              {t('claim')}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// Login-rail tile look by status, keyed to the active theme so tints flip to dark
// washes and text stays readable. (Was a bespoke light-only palette; the claimed
// text shifted from a sage green to the `success` token and the muted tones to
// neutral tokens so the rail carries on dark.)
function loginTileLook(
  c: ReturnType<typeof useTheme>,
): Record<LoginDayView['status'], { bg: string; text: string; border?: string }> {
  return {
    claimed: { bg: c.successTint, text: c.success },
    today: { bg: c.goldTint, text: c.goldStrong, border: c.gold },
    upcoming: { bg: c.backgroundSelected, text: c.textMuted },
  };
}

/** One tile of the Login reward rail: day label · divider · prize, shaded by status. */
function LoginDayTile({ day }: { day: LoginDayView }) {
  const theme = useTheme();
  const { t } = useTranslation('missions');
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const look = loginTileLook(theme)[day.status];
  return (
    <View
      style={[
        styles.rr,
        { backgroundColor: look.bg },
        look.border ? { borderWidth: 2, borderColor: look.border } : null,
      ]}>
      <ThemedText type="small" style={[styles.rrDay, { color: look.text }]}>
        {t('day', { day: day.day })}
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

const makeStyles = (c: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
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
    backgroundColor: c.backgroundElement,
    shadowColor: 'rgba(70,50,25,0.3)',
    shadowOpacity: 1,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  subTabActiveText: {
    color: c.goldStrong,
  },
  subTabInactiveText: {
    color: c.textSecondary,
  },
  list: {
    gap: Spacing.two,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.backgroundElement,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.hairline,
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
    backgroundColor: c.hairline,
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
    backgroundColor: c.backgroundSelected,
  },
  claimPill: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one + 3,
    borderRadius: 10,
  },
  claimInk: {
    color: c.text,
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
