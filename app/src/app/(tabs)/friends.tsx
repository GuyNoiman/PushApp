/**
 * Friends — the POC social / Allies pillar surface (05_Social), a first-class
 * bottom-nav TAB (v14 mockup screen-09, `Friends_Screen.md`). A help-first friend
 * list: "Needs your cheer" (Journeys you're an Ally of, prioritized) then "Your
 * friends" A–Z (the full Support Circle — cheer-needing friends also appear
 * here, per the finalized visual design). Each row opens a neutral 3-dot menu
 * (Cheer / Gift / Message); "Needs your cheer" rows show the coral Cheer pill
 * directly instead.
 *
 * Presentational only — it reads SocialProvider state and calls its actions; no
 * social/business logic lives here (Engineering Bible §19). Only a progress
 * SUMMARY is ever shared; reflections and the "why" never leave the device.
 * Allies are NOT shown here (they live in Inbox + a Journey's settings) — this
 * screen is the Support Circle / Friend list only (Friend ≠ Ally, see
 * Friends_Screen.md "Allies are not shown on this screen").
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FriendRow } from '@/components/friends/FriendRow';
import type { FriendMenuItem } from '@/components/friends/FriendActionMenu';
import { InboxEmpty } from '@/components/inbox/InboxEmpty';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { AllyProgress, Friend } from '@/core/social';
import { useTheme } from '@/hooks/use-theme';
import { useSocial } from '@/state/SocialProvider';

const CORAL = Colors.light.coral;
const INK = Colors.light.text;

// A small warm palette for the avatar circles, cycled by id so every friend
// gets a stable, distinct tint (Design System §2 role accents) — same scheme
// as Inbox so a person reads consistently across screens.
const AVATAR_TINTS: { bg: string; ink: string }[] = [
  { bg: Colors.light.coralTint, ink: Colors.light.coralStrong },
  { bg: Colors.light.goldTint, ink: Colors.light.goldStrong },
  { bg: Colors.light.purpleTint, ink: Colors.light.purpleStrong },
  { bg: Colors.light.tealTint, ink: Colors.light.tealStrong },
  { bg: Colors.light.blueTint, ink: Colors.light.blueStrong },
  { bg: Colors.light.pinkTint, ink: Colors.light.pink },
];

function tintFor(seed: string): { bg: string; ink: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
}

/** A friend's display name: their Buddy name if set, else their @handle. */
function friendName(friend: Friend): string {
  return friend.profile.buddySummary?.name?.trim() || `@${friend.profile.handle}`;
}

export default function FriendsScreen() {
  const social = useSocial();
  const theme = useTheme();

  const accepted = useMemo(() => social.friends.filter((f) => f.status === 'accepted'), [social.friends]);
  const incoming = useMemo(
    () => social.friends.filter((f) => f.status === 'pending' && f.direction === 'incoming'),
    [social.friends],
  );

  // "Needs your cheer" — Journeys the user is an Ally of, not yet cheered on
  // this update (best-effort: every ally-progress row the user can act on now;
  // there is no per-cheer "already cheered" flag in the gateway yet).
  const needsCheer = social.allyProgress;

  // "Your friends" — full Support Circle, A–Z. Cheer-needing friends also
  // appear here (Friends_Screen.md, finalized visual design 2026-07-06).
  const friendsAZ = useMemo(
    () => [...accepted].sort((a, b) => friendName(a).localeCompare(friendName(b))),
    [accepted],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <ThemedText type="title">Friends</ThemedText>
          <View style={[styles.invitePill, { backgroundColor: theme.purpleTint }]}>
            <ThemedText type="smallBold" style={{ color: theme.purpleStrong }}>
              + Invite
            </ThemedText>
          </View>
        </View>

        {!social.enabled ? (
          <InboxEmpty
            emoji="🤝"
            title="Your Support Circle"
            subtitle="Turn on the social pillar to add friends, see who needs a cheer, and grow your Support Circle here."
          />
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {social.error && (
              <ThemedView type="backgroundElement" style={[styles.errorBanner, { borderColor: theme.hairline }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {social.error}
                </ThemedText>
              </ThemedView>
            )}

            {social.incomingCheers.length > 0 && (
              <ThemedView type="backgroundSelected" style={styles.cheerBanner}>
                <ThemedText type="smallBold">You&apos;ve been cheered {social.incomingCheers.length}×</ThemedText>
              </ThemedView>
            )}

            {social.needsHandle ? (
              <HandleSetup onSave={social.setHandle} />
            ) : (
              <View style={styles.handleRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  @{social.profile?.handle}
                </ThemedText>
              </View>
            )}

            <AddFriend onAdd={social.addFriendByHandle} disabled={social.needsHandle} />

            {incoming.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
                  Requests
                </ThemedText>
                <View style={styles.list}>
                  {incoming.map((f) => (
                    <IncomingRow
                      key={f.profile.id}
                      friend={f}
                      onAccept={() => social.respondToFriend(f.profile.id, true)}
                      onDecline={() => social.respondToFriend(f.profile.id, false)}
                    />
                  ))}
                </View>
              </View>
            )}

            {needsCheer.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="smallBold" style={[styles.sec, { color: theme.goldStrong }]}>
                  Needs your cheer <ThemedText type="small" themeColor="textMuted">({needsCheer.length})</ThemedText>
                </ThemedText>
                <View style={styles.list}>
                  {needsCheer.map((ap) => (
                    <NeedsCheerRow
                      key={`${ap.owner.id}:${ap.journeyId}`}
                      ally={ap}
                      onCheer={() => social.sendCheer(ap.owner.id, ap.journeyId)}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <ThemedText type="smallBold" style={[styles.sec, { color: theme.goldStrong }]}>
                Your friends <ThemedText type="small" themeColor="textMuted">({friendsAZ.length})</ThemedText>
              </ThemedText>
              {friendsAZ.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No friends yet. Add someone by their handle above and grow your Support Circle.
                </ThemedText>
              ) : (
                <View style={styles.list}>
                  {friendsAZ.map((f) => {
                    const tint = tintFor(f.profile.id);
                    const level = f.profile.buddySummary?.level;
                    return (
                      <FriendRow
                        key={f.profile.id}
                        name={friendName(f)}
                        subtitle={level ? `Lv ${level}` : undefined}
                        tint={tint.bg}
                        tintInk={tint.ink}
                        menuItems={menuFor(friendName(f), () => {
                          const journeyId = needsCheer.find((ap) => ap.owner.id === f.profile.id)?.journeyId;
                          if (journeyId) void social.sendCheer(f.profile.id, journeyId);
                        })}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

// ── Rows ────────────────────────────────────────────────────────────────────

function NeedsCheerRow({ ally, onCheer }: { ally: AllyProgress; onCheer: () => void }) {
  const tint = tintFor(ally.owner.id);
  const pct = Math.round(Math.max(0, Math.min(1, ally.progress)) * 100);
  const title = ally.visibility === 'anonymous' || !ally.title ? 'a Journey' : ally.title;
  return (
    <FriendRow
      name={ally.owner.buddySummary?.name?.trim() || `@${ally.owner.handle}`}
      subtitle={`${pct}% on ${title}`}
      tint={tint.bg}
      tintInk={tint.ink}
      needsCheer
      onCheer={onCheer}
      menuItems={[]}
    />
  );
}

/** The neutral 3-dot menu items (Cheer / Gift / Message). Gift and Message have
 * no gateway action yet (SocialGateway has no gift/DM methods) — they're inert
 * placeholders, not invented calls, until that surface exists. */
function menuFor(name: string, onCheer: () => void): FriendMenuItem[] {
  return [
    { key: 'cheer', label: 'Cheer', icon: 'notifications-outline', onPress: onCheer },
    { key: 'gift', label: 'Gift', icon: 'gift-outline', onPress: () => {}, disabled: true },
    { key: 'message', label: 'Message', icon: 'mail-outline', onPress: () => {}, disabled: true },
  ];
}

function HandleSetup({ onSave }: { onSave: (handle: string) => void }) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary">
        Friends find you by this handle. No real name needed.
      </ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="yourhandle"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}
        />
        <PrimaryButton label="Save" disabled={value.trim().length === 0} onPress={() => onSave(value)} />
      </View>
    </View>
  );
}

function AddFriend({ onAdd, disabled }: { onAdd: (handle: string) => void; disabled: boolean }) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const submit = () => {
    if (value.trim().length === 0) return;
    onAdd(value);
    setValue('');
  };
  return (
    <View style={styles.inputRow}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Add a friend by handle"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
          disabled && styles.disabled,
        ]}
      />
      <PrimaryButton label="Add" disabled={disabled || value.trim().length === 0} onPress={submit} />
    </View>
  );
}

function IncomingRow({
  friend,
  onAccept,
  onDecline,
}: {
  friend: Friend;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.friendRow, { borderColor: theme.hairline }]}>
      <ThemedText type="smallBold">{friendName(friend)}</ThemedText>
      <View style={styles.rowActions}>
        <PrimaryButton label="Accept" onPress={onAccept} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decline ${friend.profile.handle}`}
          onPress={onDecline}
          style={({ pressed }) => [styles.ghostButton, { borderColor: theme.hairline }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Decline
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: CORAL }, disabled && styles.disabled, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={styles.primaryLabel}>
        {label}
      </ThemedText>
    </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  invitePill: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  errorBanner: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  cheerBanner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
  },
  handleRow: {
    flexDirection: 'row',
  },
  section: {
    gap: Spacing.two,
  },
  sec: {
    textTransform: 'none',
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  primaryButton: {
    borderRadius: Radius.button,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: INK,
  },
  ghostButton: {
    borderRadius: Radius.button,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
