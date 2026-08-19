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
 *     (monogram avatar, name, a human status line, and ONE Cheer action), and the
 *     whole row opens that friend's profile (Friend_Profile_PRD §8 criterion 1).
 *     Populated from the real social lists; until the user has friends the list
 *     is replaced by an INVITING empty state (founder device pass 2026-08-17) —
 *     an SVG of two figures standing together, the reason a circle helps, and one
 *     way in. It never implies the user is failing on their own.
 *
 * The list is a list of PEOPLE, one row per ACCEPTED friend (`buildCircleRows`) —
 * not one row per shared Journey, which used to hide a friend who shared nothing
 * and show a friend who shared two Journeys twice. Shared progress folds in as the
 * status line and the Cheer target only.
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
import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { displayName, initialsFor, tintFor } from '@/components/friends/avatar';
import { TogetherIllustration } from '@/components/friends/TogetherIllustration';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabScrollView } from '@/components/ui/TabScrollView';
import { getCardShareGateway } from '@/core/share';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
// From the module, not the `@/core/social` barrel: this is a runtime VALUE, and the barrel pulls
// the Supabase-backed gateway in with it.
import { buildCircleRows, type CircleRow } from '@/core/social/circleRows';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';
import { useSocial } from '@/state/SocialProvider';

export default function FriendsScreen() {
  const social = useSocial();
  const theme = useTheme();
  const router = useRouter();
  // Addressed, not plain: the invite message is written TO the user's friends in the user's own
  // voice ("I'm using PushApp…"), which inflects by gender in Hebrew (D31).
  const { t } = useAddressedTranslation('circle');

  const [showAdd, setShowAdd] = useState(false);

  const signedIn = social.enabled && !social.needsHandle && !!social.profile;

  // ── Your friends ← the accepted Support Circle, one row per PERSON. Shared ally
  // progress folds in as each row's status line and Cheer target (the pure builder
  // owns that arithmetic; this screen owns the copy). ──
  const rows = useMemo(
    () => buildCircleRows(social.friends, social.allyProgress),
    [social.friends, social.allyProgress],
  );

  // INVITE was a button that did nothing — it has been in the header since the 2026-08-07 redesign
  // with an empty handler. It now opens the OS share sheet with the one thing a friend actually needs
  // to find you: your username. Sharing is the interim path the acquisition PRD allows until real
  // invite links exist (Invite_Friend_Acquisition_PRD), and it degrades honestly — a platform with no
  // share sheet resolves `unavailable` and nothing is claimed to have been sent.
  const shareInvite = useCallback(() => {
    const handle = social.profile?.handle?.trim();
    void getCardShareGateway().shareText(
      handle ? t('inviteMessage', { handle }) : t('inviteMessageNoHandle'),
    );
  }, [social.profile?.handle, t]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <View style={styles.headerText}>
            <ThemedText type="display" numberOfLines={1}>
              {t('title')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('subtitle')}
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <HeaderButton label={t('invite')} icon="share-outline" onPress={shareInvite} />
            <HeaderButton label={t('add')} icon="person-add-outline" onPress={() => setShowAdd((v) => !v)} active={showAdd} />
          </View>
        </View>

        {/* Keyboard-safe: the Add-a-friend field lives INSIDE this list, so Add must be tappable
            on the first tap and the rows under the keyboard must stay reachable (Device QA A3).
            Tab-aware: tapping the Circle tab while already on it returns this list to the top. */}
        <TabScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <EmptyState
              title={t('empty.title')}
              body={t('empty.body')}
              cta={t('empty.cta')}
              onCta={() => setShowAdd(true)}
            />
          ) : (
            <View style={styles.list}>
              {rows.map((row) => {
                const cheer = row.cheerTarget;
                return (
                  <PersonRow
                    key={row.id}
                    row={row}
                    onOpen={() => router.push(`/friend/${row.id}` as Href)}
                    onCheer={cheer ? () => void social.sendCheer(cheer.toId, cheer.journeyId) : undefined}
                  />
                );
              })}
            </View>
          )}
        </TabScrollView>
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

/**
 * One person in the Support Circle. The whole card opens their profile; the Cheer pill is a
 * nested action that only exists when there is a Journey to cheer ON — offering it otherwise
 * would be a button the database is guaranteed to refuse.
 */
function PersonRow({
  row,
  onOpen,
  onCheer,
}: {
  row: CircleRow;
  onOpen: () => void;
  onCheer?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('circle');
  const tint = tintFor(theme, row.id);
  const name = displayName(row.profile);
  // One simple, friendly action per person: Cheer (teal). Amber is reserved for
  // urgency elsewhere; this is the general Support Circle list.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('openProfileA11y', { name })}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.avatar, { backgroundColor: tint.bg }]}>
        <ThemedText type="smallBold" style={{ color: tint.ink }}>
          {initialsFor(name)}
        </ThemedText>
      </View>

      <View style={styles.main}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {statusLine(row, t)}
        </ThemedText>
      </View>

      {onCheer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('cheerA11y', { name })}
          onPress={onCheer}
          style={({ pressed }) => [
            styles.actionPill,
            { backgroundColor: theme.teal },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            {t('cheer')}
          </ThemedText>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/**
 * The human status line for a row. The builder hands us DATA; the copy lives here. A masked
 * (Encourager) title becomes the neutral "a Journey" placeholder rather than a guess.
 */
function statusLine(row: CircleRow, t: TFunction<'circle'>): string {
  if (row.status.kind === 'none') return t('noSharedJourney');
  const title = row.status.title ?? t('aJourney');
  return row.status.kind === 'one'
    ? t('progressStatus', { pct: row.status.pct, title })
    : t('progressStatusMulti', { pct: row.status.pct, title, journeys: row.status.count });
}

/**
 * The empty Support Circle. It INVITES rather than reports (founder device pass 2026-08-17): a small
 * drawing of two figures standing together, the honest reason a circle helps (people keep going more
 * often when a friend knows what they're working on), and one way in. It says nothing about how the
 * user is doing on their own — nobody is failing here, they just haven't added anyone yet.
 */
function EmptyState({
  title,
  body,
  cta,
  onCta,
}: {
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.empty, { borderColor: theme.hairline }]}>
      <TogetherIllustration />
      <View style={styles.emptyCopy}>
        <ThemedText type="default" style={styles.emptyText}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          {body}
        </ThemedText>
      </View>
      <PrimaryButton label={cta} onPress={onCta} />
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
        textAlign={START_TEXT_ALIGN}
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
  // The title and its line share a column so the buttons stay pinned to the top of the block.
  headerText: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
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
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
  },
  emptyCopy: {
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
