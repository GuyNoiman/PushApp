/**
 * Circle — the POC social / Allies pillar surface (05_Social), a first-class
 * bottom-nav TAB labelled "Circle" (the Support Circle). Mature redesign
 * 2026-08-07, reworked per founder feedback: neutrals + the single teal accent
 * (amber reserved for urgency), no coral/gold chrome.
 *
 * Structure (founder feedback 2026-08-07, reverted from the two-tab split):
 *   · A header row with the title and TWO buttons — "Invite" and "Add"
 *     (add-by-username). Tapping "Add" reveals the username input instead of it
 *     sitting inline by default.
 *   · A SINGLE "Your friends" list — the Support Circle. Each person is a row
 *     (monogram avatar, name, a human status line, and ONE Cheer action).
 *     Populated from the real social lists; a calm empty state shows until the
 *     user has friends.
 *
 * The user's own identity (the editable @username) NO LONGER lives here — it
 * moved to the Settings tab's Profile section (founder feedback 2026-08-07).
 * Circle keeps only its title, the Invite / Add buttons, and the friends list.
 *
 * The earlier "Need help" / "Deserve praise" segmented split now lives on the
 * Home page; Circle is one simple friends view again.
 *
 * Presentational only — it reads SocialProvider state and calls its actions; no
 * social/business logic lives here (Engineering Bible §19). Only a progress
 * SUMMARY is ever shared; reflections and the "why" never leave the device.
 * Incoming requests and cheers now live in the Inbox tab (Friend ≠ Ally) — this
 * screen is the Support Circle / help-first people list only.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useSocial } from '@/state/SocialProvider';

// A small warm palette for the monogram avatars, cycled by id so every person
// gets a stable, distinct tint (Design System §2 role accents) — same scheme as
// Inbox so a person reads consistently across screens. Built from the ACTIVE
// theme so the tints adapt in dark mode.
function avatarTints(c: ReturnType<typeof useTheme>): { bg: string; ink: string }[] {
  return [
    { bg: c.coralTint, ink: c.coralStrong },
    { bg: c.goldTint, ink: c.goldStrong },
    { bg: c.purpleTint, ink: c.purpleStrong },
    { bg: c.tealTint, ink: c.tealStrong },
    { bg: c.blueTint, ink: c.blueStrong },
    { bg: c.pinkTint, ink: c.pink },
  ];
}

function tintFor(c: ReturnType<typeof useTheme>, seed: string): { bg: string; ink: string } {
  const tints = avatarTints(c);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return tints[Math.abs(hash) % tints.length];
}

/** 1–2 letter monogram from a display name (skips a leading @). */
function initialsFor(name: string): string {
  const clean = name.replace(/^@/, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

/** A person row in the Circle list. Each real row carries a Cheer target via `onAction`. */
interface CircleRowModel {
  id: string;
  name: string;
  initials: string;
  status: string;
  onAction?: () => void;
}

export default function FriendsScreen() {
  const social = useSocial();
  const theme = useTheme();
  const { t } = useTranslation('circle');

  const [showAdd, setShowAdd] = useState(false);

  const signedIn = social.enabled && !social.needsHandle && !!social.profile;

  // ── Your friends ← real ally progress (each can get a Cheer via sendCheer). The
  // single list merges what used to be the two tabs so the Circle reads as one Support
  // Circle (the Need-help / Deserve-praise split now lives on Home). ──
  const rows = useMemo<CircleRowModel[]>(
    () =>
      social.allyProgress.map((ap) => {
        const name = ap.owner.buddySummary?.name?.trim() || `@${ap.owner.handle}`;
        const pct = Math.round(Math.max(0, Math.min(1, ap.progress)) * 100);
        const title = ap.visibility === 'anonymous' || !ap.title ? t('aJourney') : ap.title;
        return {
          id: `${ap.owner.id}:${ap.journeyId}`,
          name,
          initials: initialsFor(name),
          status: t('progressStatus', { pct, title }),
          onAction: () => void social.sendCheer(ap.owner.id, ap.journeyId),
        };
      }),
    [social, t],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <ThemedText type="title">{t('title')}</ThemedText>
          <View style={styles.headerActions}>
            <HeaderButton label={t('invite')} icon="share-outline" onPress={() => {}} />
            <HeaderButton label={t('add')} icon="person-add-outline" onPress={() => setShowAdd((v) => !v)} active={showAdd} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Surface only GENUINE errors. The backend "Not signed in." is the
              expected guest/POC state (no auth wired yet), not an error the user
              should see — filter it out so it doesn't read as something broken. */}
          {social.error && !/signed in/i.test(social.error) && (
            <ThemedView type="backgroundElement" style={[styles.errorBanner, { borderColor: theme.hairline }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {social.error}
              </ThemedText>
            </ThemedView>
          )}

          {/* Add a FRIEND by their username — revealed by the header "Add" button. */}
          {showAdd && (
            <AddFriend
              onAdd={(username) => {
                social.addFriendByHandle(username);
                setShowAdd(false);
              }}
              disabled={!signedIn}
            />
          )}

          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('yourFriends')}
          </ThemedText>

          {rows.length === 0 ? (
            <EmptyState title={t('empty.title')} body={t('empty.body')} />
          ) : (
            <View style={styles.list}>
              {rows.map((row) => {
                const tint = tintFor(theme, row.id);
                return <PersonRow key={row.id} row={row} tint={tint.bg} tintInk={tint.ink} />;
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ── Header buttons ───────────────────────────────────────────────────────────

function HeaderButton({
  label,
  icon,
  onPress,
  active,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
}) {
  const theme = useTheme();
  // On-accent ink when active (filled teal), else the teal text tone — the icon
  // tracks the label colour so it reads in both light and dark.
  const ink = active ? theme.background : theme.tealStrong;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerButton,
        { backgroundColor: active ? theme.teal : theme.tealTint },
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={16} color={ink} />
      <ThemedText type="smallBold" style={{ color: ink }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ── Person row ───────────────────────────────────────────────────────────────

function PersonRow({ row, tint, tintInk }: { row: CircleRowModel; tint: string; tintInk: string }) {
  const theme = useTheme();
  const { t } = useTranslation('circle');
  // One simple, friendly action per person: Cheer (teal). Amber is reserved for
  // urgency elsewhere; this is the general Support Circle list.
  const accent = theme.teal;
  const label = t('cheer');
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <View style={[styles.avatar, { backgroundColor: tint }]}>
        <ThemedText type="smallBold" style={{ color: tintInk }}>
          {row.initials}
        </ThemedText>
      </View>

      <View style={styles.main}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {row.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {row.status}
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('cheerA11y', { name: row.name })}
        onPress={row.onAction}
        style={({ pressed }) => [styles.actionPill, { backgroundColor: accent }, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={{ color: theme.background }}>
          {label}
        </ThemedText>
      </Pressable>
    </View>
  );
}

// A calm empty state for an empty Support Circle — same card language as the other tabs.
function EmptyState({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.empty, { borderColor: theme.hairline }]}>
      <ThemedText type="default">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
        {body}
      </ThemedText>
    </ThemedView>
  );
}

function AddFriend({ onAdd, disabled }: { onAdd: (username: string) => void; disabled: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation('circle');
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
        placeholder={t('addPlaceholder')}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        autoFocus
        textAlign={isRTL() ? 'right' : 'left'}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
          disabled && styles.disabled,
        ]}
      />
      <PrimaryButton label={t('add')} disabled={disabled || value.trim().length === 0} onPress={submit} />
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.teal }, disabled && styles.disabled, pressed && styles.pressed]}>
      {/* `background` reads as the on-accent ink in both schemes (deep teal on
          light → pale ink; bright teal on dark → near-black ink). */}
      <ThemedText type="smallBold" style={{ color: theme.background }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const AVATAR = 44;

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  errorBanner: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
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
  list: {
    gap: Spacing.two,
  },
  empty: {
    alignSelf: 'stretch',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  main: {
    flex: 1,
    gap: 1,
  },
  actionPill: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    borderRadius: Radius.button,
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
