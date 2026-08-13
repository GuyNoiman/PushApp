/**
 * JourneySupportCircle — the owner's Support Circle panel on the Journey detail screen
 * (Journey Support Circle, D2). Invite a friend to support this Journey with a permission
 * BUNDLE, see each member's status, and cancel/remove/resend or switch bundle.
 *
 * Consent-gated (D2): an invite starts `requested`; NO Journey data is visible until the
 * recipient accepts (enforced server-side by RLS — this UI only reflects state). The
 * **Companion** bundle is offered ONLY for coach-created Journeys ({@link isCompanionEligible});
 * on a manual Journey it is disabled with a short reason, so a user-typed Step title can never
 * be shared. Presentational only — it reads/acts through SocialProvider (Engineering Bible §19).
 *
 * Renders nothing when the social pillar is off, so the four local pillars are untouched.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { isCompanionEligible, type AllyBundle, type AllyMember, type Friend } from '@/core/social';
import type { Journey, JourneyStatus } from '@/core/types/domain';
import { resolveJourneyStatus } from '@/core/util/journeyStatus';
import { useTheme } from '@/hooks/use-theme';
import { useSocial } from '@/state/SocialProvider';

/** A friend's display name: their Buddy name if set, else their @handle (matches Inbox). */
function friendName(friend: Friend): string {
  return friend.profile.buddySummary?.name?.trim() || `@${friend.profile.handle}`;
}
function memberName(member: AllyMember): string {
  return member.profile.buddySummary?.name?.trim() || `@${member.profile.handle}`;
}

/**
 * @param journeyStatus the Journey's lifecycle status; when omitted it is resolved from the Journey.
 *   A `completed` or `frozen` Journey hides the Invite CTA (no new Allies on a finished/paused
 *   Journey) while still listing existing members read-only.
 */
export function JourneySupportCircle({
  journey,
  journeyStatus,
}: {
  journey: Journey;
  journeyStatus?: JourneyStatus;
}) {
  const social = useSocial();
  const theme = useTheme();
  const { t } = useTranslation('journey');

  const [members, setMembers] = useState<AllyMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  // Distinguish "load failed" from genuinely "no members yet" so an offline blip never reads as
  // an empty circle. Set when reload() surfaces an error; cleared on a successful load.
  const [loadFailed, setLoadFailed] = useState(false);

  // Don't invite new Allies to a Journey that's over or paused (D2). Members still render read-only.
  const status = journeyStatus ?? resolveJourneyStatus(journey);
  const isCompleted = status === 'completed';
  const isFrozen = status === 'frozen';
  const canInvite = !isCompleted && !isFrozen;

  const eligible = isCompanionEligible(journey);
  const acceptedFriends = useMemo(
    () => social.friends.filter((f) => f.status === 'accepted'),
    [social.friends],
  );

  const reload = useCallback(async () => {
    if (!social.enabled) return;
    try {
      setMembers(await social.listJourneyAllies(journey.id));
      setLoadFailed(false);
    } catch {
      // The provider already surfaced the message; here we only flag the failed load so the
      // panel shows a calm retry line instead of the empty state.
      setLoadFailed(true);
    }
  }, [social, journey.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // The friends still invitable here — those not already listed as a member.
  const memberIds = useMemo(() => new Set(members.map((m) => m.profile.id)), [members]);
  const invitable = useMemo(
    () => acceptedFriends.filter((f) => !memberIds.has(f.profile.id)),
    [acceptedFriends, memberIds],
  );

  // The social pillar is off (no backend): render nothing so local pillars are untouched.
  if (!social.enabled) return null;

  const act = async (fn: () => Promise<void>) => {
    await fn();
    await reload();
  };

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold" style={[styles.blockLabel, { color: theme.goldStrong }]}>
        {t('supportCircle.title')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('supportCircle.subtitle')}
      </ThemedText>

      {loadFailed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('supportCircle.retry')}
          onPress={() => void reload()}
          hitSlop={6}
          style={({ pressed }) => [styles.loadErrorRow, pressed && styles.pressed]}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.textMuted} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('supportCircle.loadError')}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.tealStrong }}>
            {t('supportCircle.retry')}
          </ThemedText>
        </Pressable>
      ) : members.length === 0 ? (
        <ThemedText type="small" themeColor="textMuted" style={styles.emptyLine}>
          {t('supportCircle.empty')}
        </ThemedText>
      ) : (
        <View style={styles.memberList}>
          {members.map((member) => (
            <MemberRow
              key={member.profile.id}
              member={member}
              eligible={eligible}
              onCancel={() => act(() => social.cancelInvite(journey.id, member.profile.id))}
              onRemove={() => act(() => social.removeAlly(journey.id, member.profile.id))}
              onResend={(bundle) => act(() => social.inviteAlly(journey.id, member.profile.id, bundle))}
              onSwitch={(bundle) => act(() => social.changeAllyBundle(journey.id, member.profile.id, bundle))}
            />
          ))}
        </View>
      )}

      {canInvite ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('supportCircle.inviteA11y')}
            onPress={() => setInviteOpen(true)}
            style={({ pressed }) => [
              styles.inviteRow,
              { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <Ionicons name="person-add-outline" size={18} color={theme.tealStrong} />
            <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
              {t('supportCircle.invite')}
            </ThemedText>
          </Pressable>

          <InviteModal
            visible={inviteOpen}
            onClose={() => setInviteOpen(false)}
            friends={invitable}
            eligible={eligible}
            onInvite={async (allyId, bundle) => {
              setInviteOpen(false);
              await act(() => social.inviteAlly(journey.id, allyId, bundle));
            }}
          />
        </>
      ) : (
        <ThemedText type="small" themeColor="textMuted" style={styles.closedNote}>
          {t(isCompleted ? 'supportCircle.closedForCompleted' : 'supportCircle.pausedNote')}
        </ThemedText>
      )}
    </View>
  );
}

/** One Support-Circle member: name, bundle, status, and status-appropriate actions. */
function MemberRow({
  member,
  eligible,
  onCancel,
  onRemove,
  onResend,
  onSwitch,
}: {
  member: AllyMember;
  eligible: boolean;
  onCancel: () => void;
  onRemove: () => void;
  onResend: (bundle: AllyBundle) => void;
  onSwitch: (bundle: AllyBundle) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const bundleLabel = t(`supportCircle.${member.bundle}`);

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.memberRow, { borderColor: theme.hairline }]}
      accessibilityLabel={t('supportCircle.memberA11y', {
        name: memberName(member),
        status: t(`supportCircle.status.${member.status}`),
      })}>
      <View style={styles.memberText}>
        <ThemedText type="default" numberOfLines={1}>
          {memberName(member)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {bundleLabel} · {t(`supportCircle.status.${member.status}`)}
        </ThemedText>
      </View>
      <View style={styles.memberActions}>
        {member.status === 'requested' && (
          <MemberAction label={t('supportCircle.cancel')} onPress={onCancel} />
        )}
        {member.status === 'declined' && (
          <MemberAction label={t('supportCircle.resend')} onPress={() => onResend(member.bundle)} />
        )}
        {member.status === 'accepted' && (
          <>
            {member.bundle === 'encourager' && eligible && (
              <MemberAction
                label={t('supportCircle.switchToCompanion')}
                onPress={() => onSwitch('companion')}
              />
            )}
            {member.bundle === 'companion' && (
              <MemberAction
                label={t('supportCircle.switchToEncourager')}
                onPress={() => onSwitch('encourager')}
              />
            )}
            <MemberAction label={t('supportCircle.remove')} onPress={onRemove} destructive />
          </>
        )}
      </View>
    </ThemedView>
  );
}

function MemberAction({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.memberAction, pressed && styles.pressed]}>
      <ThemedText type="small" style={{ color: destructive ? theme.coralStrong : theme.tealStrong }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Pick a friend + a bundle, then send the invite. */
function InviteModal({
  visible,
  onClose,
  friends,
  eligible,
  onInvite,
}: {
  visible: boolean;
  onClose: () => void;
  friends: Friend[];
  eligible: boolean;
  onInvite: (allyId: string, bundle: AllyBundle) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [bundle, setBundle] = useState<AllyBundle>('encourager');

  // Reset the draft each time the sheet opens; a non-eligible Journey can never pre-select Companion.
  useEffect(() => {
    if (visible) {
      setSelectedFriend(null);
      setBundle('encourager');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
          <ThemedText type="subtitle">{t('supportCircle.invite')}</ThemedText>

          {friends.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('supportCircle.noFriends')}
            </ThemedText>
          ) : (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('supportCircle.pickFriend')}
              </ThemedText>
              <View style={styles.pickList}>
                {friends.map((f) => {
                  const selected = selectedFriend === f.profile.id;
                  return (
                    <Pressable
                      key={f.profile.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={friendName(f)}
                      onPress={() => setSelectedFriend(f.profile.id)}
                      style={[
                        styles.pickRow,
                        { borderColor: selected ? theme.teal : theme.hairline },
                        selected && { backgroundColor: theme.tealTint },
                      ]}>
                      <ThemedText type="small">{friendName(f)}</ThemedText>
                      {selected && <Ionicons name="checkmark" size={16} color={theme.tealStrong} />}
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.bundleHeader}>
                {t('supportCircle.bundleLabel')}
              </ThemedText>
              <BundleOption
                label={t('supportCircle.encourager')}
                blurb={t('supportCircle.encouragerBlurb')}
                selected={bundle === 'encourager'}
                onPress={() => setBundle('encourager')}
              />
              <BundleOption
                label={t('supportCircle.companion')}
                blurb={t('supportCircle.companionBlurb')}
                selected={bundle === 'companion'}
                disabled={!eligible}
                disabledHint={t('supportCircle.companionCoachOnly')}
                onPress={() => setBundle('companion')}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('supportCircle.send')}
                disabled={!selectedFriend}
                onPress={() => selectedFriend && onInvite(selectedFriend, bundle)}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: theme.coral },
                  (!selectedFriend || pressed) && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {t('supportCircle.send')}
                </ThemedText>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BundleOption({
  label,
  blurb,
  selected,
  disabled,
  disabledHint,
  onPress,
}: {
  label: string;
  blurb: string;
  selected: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.bundleOption,
        { borderColor: selected && !disabled ? theme.teal : theme.hairline },
        selected && !disabled && { backgroundColor: theme.tealTint },
        disabled && styles.bundleDisabled,
      ]}>
      <View style={styles.bundleText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {disabled && disabledHint ? disabledHint : blurb}
        </ThemedText>
      </View>
      {selected && !disabled && <Ionicons name="checkmark-circle" size={18} color={theme.tealStrong} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  blockLabel: {
    marginBottom: Spacing.half,
  },
  emptyLine: {
    marginTop: Spacing.one,
  },
  closedNote: {
    marginTop: Spacing.one,
  },
  loadErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  memberList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  memberText: {
    flex: 1,
    gap: Spacing.half,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexShrink: 0,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  memberAction: {
    paddingVertical: Spacing.one,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  pickList: {
    gap: Spacing.two,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bundleHeader: {
    marginTop: Spacing.two,
  },
  bundleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  bundleDisabled: {
    opacity: 0.5,
  },
  bundleText: {
    flex: 1,
    gap: Spacing.half,
  },
  sendBtn: {
    marginTop: Spacing.two,
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
