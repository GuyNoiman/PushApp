/**
 * Friend Profile (Friend_Profile_PRD.md) — one accepted friend in one place, answering a single
 * question: how can I understand and support this person? Identity, the neutral relationship
 * summary, and only the Active Journeys THIS viewer was invited to see, plus the two honest
 * actions (Cheer · Remove friend).
 *
 * A pushed detail screen (not a modal): it has a destructive sub-flow and a real back stack.
 * Sibling of `journey/[id]` / `dream/[id]` and wears the same header + SafeAreaView shell.
 *
 * Four states, all required by PRD §6:
 *   · loading      — a spinner while the profile (and the friendship) is verified;
 *   · not-connected — the friendship is gone/never existed (removed, blocked, deleted). A calm card
 *     with ZERO shared data. Branching on the ERROR TYPE, never its message: `NotFriendsError` is an
 *     authorization STATE we render on purpose, and its message is English-only;
 *   · error        — anything else, with Retry. Offline included;
 *   · loaded.
 *
 * NO stale render by design: the provider drops a lapsed cache entry before refetching, so a failed
 * refresh shows the error state rather than data the viewer may no longer be allowed to see. NOT in
 * this screen either (PRD §4.6, founder 2026-08-13): the Level and the Achievements entry — B1/B3
 * are Future, and rendering a number from the experimental XP code would tell a friend something
 * about a real person that is guaranteed to change meaning later. The seams stay; the surfaces don't.
 *
 * Presentational only (Engineering Bible §19): it reads/acts through SocialProvider and the pure
 * `friendActions` rule, and holds nothing but its own view state.
 */
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { displayName } from '@/components/friends/avatar';
import { FriendActionMenu, type FriendMenuItem } from '@/components/friends/FriendActionMenu';
import { FriendProfileHeader } from '@/components/friends/FriendProfileHeader';
import { RelationshipSummaryCard } from '@/components/friends/RelationshipSummaryCard';
import { RemoveFriendSheet } from '@/components/friends/RemoveFriendSheet';
import { SharedJourneysList } from '@/components/friends/SharedJourneysList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
// From the modules, not the `@/core/social` barrel: both are runtime VALUES (an `instanceof` check
// and the actions rule), and the barrel pulls the Supabase-backed gateway in with them.
import { friendActions } from '@/core/social/friendProfile';
import { NotFriendsError, type FriendProfileView } from '@/core/social/SocialGateway';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useSocial } from '@/state/SocialProvider';

type LoadState = 'loading' | 'loaded' | 'notConnected' | 'error';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const social = useSocial();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('friendProfile');

  const [view, setView] = useState<FriendProfileView | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [removeOpen, setRemoveOpen] = useState(false);

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/friends' as Href));

  const load = useCallback(
    async (force = false) => {
      if (!id) return;
      setState('loading');
      try {
        setView(await social.loadFriendProfile(id, { force }));
        setState('loaded');
      } catch (e) {
        // Branch on the TYPE. `NotFriendsError.message` is English and never rendered.
        setView(null);
        setState(e instanceof NotFriendsError ? 'notConnected' : 'error');
      }
    },
    // `social` is a fresh object each provider render; depending on the one action we call keeps
    // this from re-running (and refetching) on unrelated social state changes.
    [id, social.loadFriendProfile], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    void load();
  }, [load]);

  const name = view ? displayName(view.profile) : '';
  // The Journey a Cheer would land on: the most recently updated one they shared with us. With
  // nothing shared there is no Cheer action at all — `cheers_send_ally` requires an Ally row, so
  // the database would refuse it (the pure rule owns this; the screen just renders what it returns).
  const cheerTarget = view?.sharedActive[0] ?? null;
  // Driven off the pure rule, so a menu item can only exist for an action the rule allows — no
  // dead entry, and no i18n key for an action we don't ship (there is no message item, D29/D40).
  const actions = view ? friendActions(cheerTarget !== null) : [];
  const items: FriendMenuItem[] = [];
  if (view && cheerTarget && actions.includes('cheer')) {
    items.push({
      key: 'cheer',
      label: t('actions.cheer'),
      icon: 'heart-outline',
      onPress: () => void social.sendCheer(view.profile.id, cheerTarget.journeyId),
    });
  }
  if (view && actions.includes('remove')) {
    items.push({
      key: 'remove',
      label: t('actions.remove'),
      icon: 'person-remove-outline',
      onPress: () => setRemoveOpen(true),
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          onBack={dismiss}
          eyebrow={t('eyebrow')}
          title={name}
          backLabel={t('backA11y')}
          trailing={view ? <FriendActionMenu friendName={name} items={items} /> : null}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {state === 'loading' ? (
            <View accessibilityLabel={t('loadingA11y')} style={styles.centerBlock}>
              <ActivityIndicator color={theme.tealStrong} />
            </View>
          ) : state === 'notConnected' ? (
            // ZERO data here on purpose: no handle, no name, no Journey. The person may have
            // removed us, blocked us, or deleted their account.
            <MessageCard title={t('notConnected.title')} body={t('notConnected.body')} />
          ) : state === 'error' ? (
            <MessageCard
              title={t('error.title')}
              // We never render the raw gateway string: it is English-only and covers the expected
              // "Not signed in." guest state, which should read as "try again", not as breakage.
              body={t('error.body')}
              action={{ label: t('error.retry'), onPress: () => void load(true) }}
            />
          ) : view ? (
            <>
              <FriendProfileHeader profile={view.profile} />
              <RelationshipSummaryCard relationship={view.relationship} friendName={name} />
              <SharedJourneysList journeys={view.sharedActive} />
            </>
          ) : null}
        </ScrollView>

        {view ? (
          <RemoveFriendSheet
            visible={removeOpen}
            friendName={name}
            loadImpact={() => social.loadUnfriendImpact(view.profile.id)}
            onCancel={() => setRemoveOpen(false)}
            onConfirm={() => social.removeFriend(view.profile.id)}
            onRemoved={() => {
              // The provider already purged the cache and refreshed the Circle list; this profile
              // is no longer reachable, so leave it rather than re-rendering it as "not connected".
              setRemoveOpen(false);
              dismiss();
            }}
          />
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

/** A calm full-width card for the not-connected / error states, with one optional recovery action. */
function MessageCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.messageCard, { borderColor: theme.hairline }]}>
      <ThemedText type="default" style={styles.centered}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
        {body}
      </ThemedText>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: theme.tealTint },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
            {action.label}
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

/** Back chip + a small eyebrow over the friend's name, with room for one trailing control. */
function Header({
  onBack,
  eyebrow,
  title,
  backLabel,
  trailing,
}: {
  onBack: () => void;
  eyebrow: string;
  title: string;
  backLabel: string;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={({ pressed }) => [
          styles.backChip,
          { backgroundColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}>
        {/* '›' mirrored so "back" always points where we came from (LTR: left, RTL: right). */}
        <ThemedText
          type="subtitle"
          themeColor="textSecondary"
          style={[styles.backGlyph, { transform: [{ scaleX: isRTL() ? 1 : -1 }] }]}>
          ›
        </ThemedText>
      </Pressable>
      <View style={styles.headerText}>
        <ThemedText type="small" themeColor="textMuted" style={styles.eyebrow}>
          {eyebrow}
        </ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary" numberOfLines={1}>
          {title}
        </ThemedText>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  backChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    lineHeight: 26,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  eyebrow: {
    letterSpacing: 1.5,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  centerBlock: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  messageCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
