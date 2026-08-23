/**
 * My Support Map — five moments, and who you would want beside you in each of them.
 *
 * EIGHT SCREENS (PRD §6): the opening, the five guided situations, the map, and a review of who
 * could be invited.
 *
 * IT NEVER TOUCHES THE SOCIAL GRAPH. Naming somebody here adds no Friend, no Ally, no Support Circle
 * member and sends nothing. They never learn how they were categorised. The map is a private picture
 * of a perception, and the person on it has not agreed to anything (PRD §1, §9, §13).
 *
 * IT WORKS WITH ZERO FRIENDS AND NO CONTACTS PERMISSION. Typed names carry the whole tool, and
 * "nobody comes to mind right now" is offered on every screen as a real answer rather than a skip.
 *
 * INVITATIONS ARE HONEST ABOUT NOT EXISTING YET. The delivery path they need has not been built
 * (`PRD/Future/Tool_Invitation_Inbox_and_Push_Delivery_PRD.md`), so the review screen says so
 * instead of showing a button that quietly does nothing.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ToolChoiceCard } from '@/components/tools/ToolChoiceCard';
import { ToolOpening } from '@/components/tools/ToolOpening';
import { ToolStep } from '@/components/tools/ToolStep';
import { ToolTextField } from '@/components/tools/ToolTextField';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { paletteOfTool } from '@/core/tools/rooms';
import {
  addFriendPerson,
  addManualPerson,
  confirmMap,
  invitablePeople,
  isSupportMapRecord,
  peopleInRole,
  removePerson,
  rolesOfPerson,
  startMap,
  SUPPORT_ROLES,
  toggleRole,
  unfilledRoles,
  type SupportMapRecord,
  type SupportRole,
} from '@/core/tools/supportMap/model';
import { createId } from '@/core/util/id';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';
import { useSocial } from '@/state/SocialProvider';
import { useToolRecords } from '@/state/ToolRecordsStore';

type Step = 'opening' | SupportRole | 'result' | 'invite';
/** The tool wears its ROOM's colour — see `core/tools/rooms.ts`. */
const PALETTE = paletteOfTool('supportMap');

export default function SupportMapScreen() {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const store = useToolRecords('supportMap', isSupportMapRecord);
  const social = useSocial();

  const accent = theme[PALETTE.accent];
  const tint = theme[PALETTE.tint];

  const [step, setStep] = useState<Step>('opening');
  const [map, setMap] = useState<SupportMapRecord | null>(null);
  const [typed, setTyped] = useState('');

  const confirmedMap = useMemo(
    () => store.records.filter((m) => m.status === 'confirmed').sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0))[0],
    [store.records],
  );

  const friends = useMemo(
    () => social.friends.filter((f) => f.status === 'accepted'),
    [social.friends],
  );

  useEffect(() => {
    if (!store.ready || step !== 'opening' || map) return;
    if (confirmedMap) {
      setMap(confirmedMap);
      setStep('result');
    }
  }, [store.ready, confirmedMap, step, map]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tools');
  }, []);

  const update = useCallback(
    (next: SupportMapRecord) => {
      setMap(next);
      store.put(next);
    },
    [store],
  );

  const begin = useCallback(() => {
    update(startMap(createId('smap'), Date.now()));
    setStep(SUPPORT_ROLES[0]);
  }, [update]);

  const common = {
    accentColor: accent,
    onClose: close,
    backLabel: t('back', { ns: 'common' }),
    closeLabel: t('close', { ns: 'common' }),
  };

  if (!store.ready) return <ThemedView style={styles.container} />;

  if (step === 'opening') {
    return (
      <ToolOpening
        title={t('supportMap.title')}
        lead={t('supportMap.intro.lead')}
        outcomeLabel={t('opening.outcomeLabel')}
        outcome={t('supportMap.intro.outcome')}
        timeLabel={t('opening.timeLabel')}
        time={t('supportMap.intro.time')}
        startLabel={t('opening.start')}
        onStart={begin}
        onClose={close}
        closeLabel={t('close', { ns: 'common' })}
        accent={PALETTE.accent}
        tint={PALETTE.tint}
      />
    );
  }

  if ((SUPPORT_ROLES as readonly string[]).includes(step) && map) {
    const role = step as SupportRole;
    const index = SUPPORT_ROLES.indexOf(role);
    const chosen = peopleInRole(map, role);
    const next = SUPPORT_ROLES[index + 1];

    const advance = () => {
      setTyped('');
      if (next) {
        setStep(next);
        return;
      }
      const done = confirmMap(map, Date.now());
      update(done);
      setStep('result');
    };

    return (
      <ToolStep
        {...common}
        stepLabel={t('supportMap.steps.scenario', { current: index + 1, total: SUPPORT_ROLES.length })}
        progress={(index + 1) / SUPPORT_ROLES.length}
        question={t(`supportMap.roles.${role}.question`)}
        help={t(`supportMap.roles.${role}.help`)}
        onBack={index === 0 ? undefined : () => setStep(SUPPORT_ROLES[index - 1])}
        primaryLabel={next ? t('supportMap.continue') : t('supportMap.finish')}
        onPrimary={advance}
        secondaryLabel={chosen.length === 0 ? t('supportMap.noOne') : undefined}
        onSecondary={chosen.length === 0 ? advance : undefined}>
        {/* People already on the map — a person named once is offered in every later moment. */}
        {map.people.map((person) => (
          <ToolChoiceCard
            key={person.id}
            label={person.label}
            detail={person.source === 'friend' ? t('supportMap.inCircle') : undefined}
            selected={map.roles[role].includes(person.id)}
            onPress={() => update(toggleRole(map, role, person.id, Date.now()))}
            accentColor={accent}
            tintColor={tint}
          />
        ))}

        {/* The Support Circle, for anyone not on the map yet. */}
        {friends
          .filter((f) => !map.people.some((p) => p.source === 'friend' && p.friendId === f.profile.id))
          .map((friend) => {
            const name = friend.profile.buddySummary?.name?.trim() || `@${friend.profile.handle}`;
            return (
              <ToolChoiceCard
                key={friend.profile.id}
                label={name}
                detail={t('supportMap.inCircle')}
                selected={false}
                onPress={() => {
                  const personId = createId('sp');
                  const withPerson = addFriendPerson(map, personId, friend.profile.id, name, Date.now());
                  update(toggleRole(withPerson, role, personId, Date.now()));
                }}
                accentColor={accent}
                tintColor={tint}
              />
            );
          })}

        <ThemedText type="small" style={{ color: theme.textMuted }}>{t('supportMap.orType')}</ThemedText>
        <ToolTextField
          value={typed}
          onChangeText={setTyped}
          placeholder={t('supportMap.typePlaceholder')}
          accessibilityLabel={t('supportMap.typeLabel')}
          maxChars={60}
          multiline={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: typed.trim().length === 0 }}
          disabled={typed.trim().length === 0}
          onPress={() => {
            const personId = createId('sp');
            const withPerson = addManualPerson(map, personId, typed, Date.now());
            update(toggleRole(withPerson, role, personId, Date.now()));
            setTyped('');
          }}
          style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}>
          <Ionicons name="add" size={16} color={typed.trim().length === 0 ? theme.textMuted : accent} />
          <ThemedText type="small" style={{ color: typed.trim().length === 0 ? theme.textMuted : accent }}>
            {t('supportMap.addName')}
          </ThemedText>
        </Pressable>
        <ThemedText type="small" style={{ color: theme.textMuted }}>{t('supportMap.privateNames')}</ThemedText>
      </ToolStep>
    );
  }

  if (step === 'invite' && map) {
    const invitable = invitablePeople(map);
    return (
      <ToolStep
        {...common}
        stepLabel={t('supportMap.steps.invite')}
        question={t('supportMap.invite.question')}
        help={t('supportMap.invite.help')}
        onBack={() => setStep('result')}
        primaryLabel={t('supportMap.invite.done')}
        onPrimary={() => setStep('result')}>
        {invitable.map((person) => (
          <View
            key={person.id}
            style={[styles.inviteRow, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>{person.label}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textMuted }}>{t('supportMap.invite.soon')}</ThemedText>
          </View>
        ))}
        {invitable.length === 0 ? (
          <ThemedText type="small" style={{ color: theme.textMuted }}>{t('supportMap.invite.nobody')}</ThemedText>
        ) : null}
        {/* Said plainly rather than shown as a button that does nothing. */}
        <View style={[styles.notice, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.textMuted} />
          <ThemedText type="small" style={{ color: theme.textMuted, flex: 1 }}>
            {t('supportMap.invite.notYet')}
          </ThemedText>
        </View>
      </ToolStep>
    );
  }

  // ── The map ────────────────────────────────────────────────────────────────
  const gaps = map ? unfilledRoles(map) : [];
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.icon} />
          <ThemedText type="small" style={{ color: theme.textMuted }}>{t('supportMap.steps.result')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close', { ns: 'common' })}
            onPress={close}
            hitSlop={8}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText
            style={[styles.title, { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) }]}>
            {t('supportMap.result.title')}
          </ThemedText>

          {/* The list IS the map, not an accessibility afterthought: it reads in order, names every
              person and every role, and needs no colour to be understood (PRD §7, §12). */}
          {map
            ? SUPPORT_ROLES.map((role) => {
                const people = peopleInRole(map, role);
                return (
                  <View
                    key={role}
                    style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
                    <ThemedText type="smallBold" style={{ color: theme.text }}>{t(`supportMap.roles.${role}.label`)}</ThemedText>
                    {people.length === 0 ? (
                      <ThemedText type="small" style={{ color: theme.textMuted }}>{t('supportMap.result.gap')}</ThemedText>
                    ) : (
                      people.map((person) => (
                        <View key={person.id} style={styles.personRow}>
                          <View style={[styles.avatar, { backgroundColor: tint }]}>
                            <ThemedText type="smallBold" style={{ color: accent }}>
                              {person.label.trim().charAt(0).toUpperCase()}
                            </ThemedText>
                          </View>
                          <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>{person.label}</ThemedText>
                          <ThemedText type="small" style={{ color: theme.textMuted }}>
                            {rolesOfPerson(map, person.id).length > 1
                              ? t('supportMap.result.alsoElsewhere', { count: rolesOfPerson(map, person.id).length - 1 })
                              : ''}
                          </ThemedText>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${t('supportMap.result.remove')}: ${person.label}`}
                            onPress={() => update(removePerson(map, person.id, Date.now()))}
                            hitSlop={8}>
                            <Ionicons name="close" size={16} color={theme.textMuted} />
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                );
              })
            : null}

          {gaps.length > 0 ? (
            <ThemedText type="small" style={[styles.line, { color: theme.textMuted }]}>
              {t('supportMap.result.gapsNote')}
            </ThemedText>
          ) : null}

          <ThemedText type="small" style={[styles.line, { color: theme.textMuted }]}>
            {t('supportMap.result.private')}
          </ThemedText>
        </ScrollView>

        <View style={styles.footer}>
          {map && invitablePeople(map).length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('invite')}
              style={({ pressed }) => [styles.primary, { backgroundColor: accent }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>{t('supportMap.result.invite')}</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => map && setStep(SUPPORT_ROLES[0])}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <ThemedText type="small" style={{ color: theme.textMuted }}>{t('supportMap.result.edit')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={begin}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <ThemedText type="small" style={{ color: theme.textMuted }}>{t('supportMap.result.startOver')}</ThemedText>
          </Pressable>
          {map ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                store.remove(map.id);
                setMap(null);
                setStep('opening');
              }}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <ThemedText type="small" style={{ color: theme.danger }}>{t('supportMap.result.delete')}</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  icon: { padding: Spacing.two, minWidth: 38 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three },
  title: { textAlign: START_TEXT_ALIGN },
  line: { textAlign: START_TEXT_ALIGN, lineHeight: 20 },
  block: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  avatar: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two, gap: Spacing.two },
  primary: { borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
  secondary: { paddingVertical: Spacing.two, alignItems: 'center' },
  pressed: { opacity: 0.75 },
});
