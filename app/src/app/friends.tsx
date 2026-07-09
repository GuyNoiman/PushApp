/**
 * Friends — the POC social / Allies pillar surface (05_Social). A pushed screen
 * (mirrors missions.tsx) with the full circle flow: pick a handle, grow your
 * Support Circle, share a Journey with chosen Allies at a visibility level, and
 * cheer the Journeys you're an Ally of.
 *
 * Presentational only — it reads SocialProvider state and calls its actions; no
 * social/business logic lives here (Engineering Bible §19). Only a progress
 * SUMMARY is ever shared; reflections and the "why" never leave the device.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { AllyProgress, Friend, Visibility } from '@/core/social';
import type { Journey } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { useSocial } from '@/state/SocialProvider';

/** Warm accent shared with Missions / Shop (teal). */
const TEAL = '#0E8177';

const VISIBILITY_LABELS: Record<Visibility, string> = {
  progress: 'Progress',
  full: 'Full',
  anonymous: 'Anonymous',
};

export default function FriendsScreen() {
  const router = useRouter();
  const social = useSocial();
  const { snapshot } = useApp();

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const accepted = social.friends.filter((f) => f.status === 'accepted');
  const incoming = social.friends.filter((f) => f.status === 'pending' && f.direction === 'incoming');
  const activeJourneys = (snapshot?.journeys ?? []).filter((j) => !j.completedAt);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">Friends</ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={dismiss}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Close
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Your Support Circle. Only a progress summary is ever shared — never your reflections.
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {social.error && (
            <ThemedView type="backgroundElement" style={styles.errorBanner}>
              <ThemedText type="small" themeColor="textSecondary">
                {social.error}
              </ThemedText>
            </ThemedView>
          )}

          {social.incomingCheers.length > 0 && (
            <ThemedView type="backgroundSelected" style={styles.cheerBanner}>
              <ThemedText type="smallBold">
                🎉 You&apos;ve been cheered {social.incomingCheers.length}×
              </ThemedText>
            </ThemedView>
          )}

          {social.needsHandle ? (
            <HandleSetup onSave={social.setHandle} />
          ) : (
            <Section title="Your handle">
              <ThemedText type="default">@{social.profile?.handle}</ThemedText>
            </Section>
          )}

          <Section title="Add a friend">
            <AddFriend onAdd={social.addFriendByHandle} disabled={social.needsHandle} />
          </Section>

          {incoming.length > 0 && (
            <Section title="Requests">
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
            </Section>
          )}

          <Section title="Your Support Circle">
            {accepted.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No Buddies yet. Add someone by their handle above.
              </ThemedText>
            ) : (
              <View style={styles.list}>
                {accepted.map((f) => (
                  <ThemedView key={f.profile.id} type="backgroundElement" style={styles.friendRow}>
                    <ThemedText type="smallBold">@{f.profile.handle}</ThemedText>
                    {f.direction === 'outgoing' && f.status === 'pending' && (
                      <ThemedText type="small" themeColor="textSecondary">
                        Pending
                      </ThemedText>
                    )}
                  </ThemedView>
                ))}
              </View>
            )}
          </Section>

          <Section title="Share a Journey">
            {activeJourneys.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No active Journeys to share yet.
              </ThemedText>
            ) : accepted.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Add a Buddy first, then pick who becomes an Ally.
              </ThemedText>
            ) : (
              <View style={styles.list}>
                {activeJourneys.map((journey) => (
                  <ShareJourney
                    key={journey.id}
                    journey={journey}
                    friends={accepted}
                    onShare={social.setAllies}
                  />
                ))}
              </View>
            )}
          </Section>

          <Section title="Supporting">
            {social.allyProgress.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                When a Buddy makes you an Ally, their Journey shows up here to cheer.
              </ThemedText>
            ) : (
              <View style={styles.list}>
                {social.allyProgress.map((ap) => (
                  <AllyRow
                    key={`${ap.owner.id}:${ap.journeyId}`}
                    ally={ap}
                    onCheer={() => social.sendCheer(ap.owner.id, ap.journeyId)}
                  />
                ))}
              </View>
            )}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ── Sections ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function HandleSetup({ onSave }: { onSave: (handle: string) => void }) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  return (
    <Section title="Pick a handle">
      <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
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
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        <PrimaryButton label="Save" disabled={value.trim().length === 0} onPress={() => onSave(value)} />
      </View>
    </Section>
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
        placeholder="friend's handle"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
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
    <ThemedView type="backgroundElement" style={styles.friendRow}>
      <ThemedText type="smallBold">@{friend.profile.handle}</ThemedText>
      <View style={styles.rowActions}>
        <PrimaryButton label="Accept" onPress={onAccept} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decline ${friend.profile.handle}`}
          onPress={onDecline}
          style={({ pressed }) => [styles.ghostButton, { borderColor: theme.backgroundSelected }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Decline
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function ShareJourney({
  journey,
  friends,
  onShare,
}: {
  journey: Journey;
  friends: Friend[];
  onShare: (journeyId: string, allyIds: string[], visibility: Visibility) => void;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('progress');

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <ThemedView type="backgroundElement" style={styles.shareCard}>
      <ThemedText type="smallBold" numberOfLines={1}>
        {journey.title}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        Allies
      </ThemedText>
      <View style={styles.chips}>
        {friends.map((f) => {
          const on = selected.includes(f.profile.id);
          return (
            <Pressable
              key={f.profile.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => toggle(f.profile.id)}
              style={[styles.chip, { backgroundColor: on ? TEAL : theme.background }]}>
              <ThemedText type="small" style={on ? styles.chipOnText : undefined}>
                @{f.profile.handle}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Visibility
      </ThemedText>
      <View style={styles.chips}>
        {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => {
          const on = visibility === v;
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setVisibility(v)}
              style={[styles.chip, { backgroundColor: on ? TEAL : theme.background }]}>
              <ThemedText type="small" style={on ? styles.chipOnText : undefined}>
                {VISIBILITY_LABELS[v]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label="Share Journey" onPress={() => onShare(journey.id, selected, visibility)} />
    </ThemedView>
  );
}

function AllyRow({ ally, onCheer }: { ally: AllyProgress; onCheer: () => void }) {
  const theme = useTheme();
  const pct = Math.round(Math.max(0, Math.min(1, ally.progress)) * 100);
  const title = ally.visibility === 'anonymous' || !ally.title ? 'A Journey' : ally.title;
  return (
    <ThemedView type="backgroundElement" style={styles.allyCard}>
      <View style={styles.allyMain}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          @{ally.owner.handle} · {pct}%
        </ThemedText>
        <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
          <View style={[styles.progressFill, { backgroundColor: TEAL, width: `${pct}%` }]} />
        </View>
      </View>
      <PrimaryButton label="Cheer 🎉" onPress={onCheer} />
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
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: TEAL }, disabled && styles.disabled, pressed && styles.pressed]}>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  errorBanner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  cheerBanner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    marginBottom: Spacing.one,
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
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  shareCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  chipOnText: {
    color: '#ffffff',
  },
  allyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  allyMain: {
    flex: 1,
    gap: Spacing.one,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  primaryButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
  },
  ghostButton: {
    borderRadius: Spacing.three,
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
