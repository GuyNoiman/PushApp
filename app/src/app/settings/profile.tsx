/**
 * My Profile (Own_Profile, D34) — the PRIVATE self-view/edit screen. The user sees and edits ALL their
 * fields here: display name, `@username`, country, birth date, and form of address. This is distinct
 * from the Friend Profile (P1), which shows only a public subset; the private fields (country, birth
 * date, form of address) never leave this screen for a friend-facing payload.
 *
 * The unified {@link '@/state/ProfileProvider'} is the source of truth; `@username` still goes through
 * the social layer (`setHandle`) for its uniqueness/backend semantics. Phase 1 = these fields; the
 * profile photo is Phase 2. Presentational + local edit state only (Engineering Bible §19).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { countryName } from '@/core/profile/countries';
import { getSimulatedUser } from '@/core/profile/simulatedUser';
import { generateUsername, normalizeUsername, RESERVED_WORDS, usernameError } from '@/core/social/username';
import { sampleDeservePraise, sampleNeedHelp } from '@/dev/sampleSocial';
import { useTheme } from '@/hooks/use-theme';
import type { AddressForm } from '@/i18n/addressForm';
import { DateWheel, fromIsoDate, toIsoDate, type DateParts } from '@/components/DateWheel';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';
import { useProfile } from '@/state/ProfileProvider';
import { useSocial } from '@/state/SocialProvider';

const ADDRESS_FORM_ORDER: readonly AddressForm[] = ['neutral', 'feminine', 'masculine'];
// The ISO-date validator that used to live here is gone with the text field: a wheel cannot produce
// 31 February, because the day column is rebuilt from the chosen month and year (`DateWheel`). There
// is no invalid state left to validate, and therefore no "that isn't a real date" hint to show.

/** 1–2 letter monogram from a name/username (skips a leading @). */
function initialsFor(name: string): string {
  const clean = name.replace(/^@/, '').trim();
  const parts = clean.split(/[-\s]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export default function MyProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { i18n } = useTranslation('settings');
  // Form-of-address–aware `t` (D31) so the private-scope note addresses the user in their gender;
  // every non-gendered key simply falls back to its base.
  const { t } = useAddressedTranslation('settings');
  const { profile, setDisplayName, setBirthDate, setAddressForm, setWeekStartDay: _w } = useProfile();
  void _w;
  const social = useSocial();
  const simUser = getSimulatedUser();

  const persistedHandle = social.profile?.handle ?? '';
  const [generated] = useState(generateUsername);
  const [localHandle, setLocalHandle] = useState<string | null>(null);
  const username = persistedHandle || localHandle || generated;

  const signInName = simUser.signedIn && simUser.name ? simUser.name : null;
  const shownName = profile.displayName ?? signInName;

  const cycleAddressForm = () =>
    setAddressForm(ADDRESS_FORM_ORDER[(ADDRESS_FORM_ORDER.indexOf(profile.addressForm) + 1) % 3]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="title">{t('profile.title')}</ThemedText>
        </View>

        {/* Keyboard-safe: the birth-date editor is the LAST row, so it needs the keyboard inset +
            scroll-to-focused-field to be typed into at all (Device QA A3). */}
        <KeyboardSafeScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar (photo = Phase 2 → initials for now) + the private-scope note. */}
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: theme.tealTint }]}>
              <ThemedText type="title" style={{ color: theme.tealStrong }}>
                {initialsFor(shownName ?? username)}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textMuted" style={styles.privateNote}>
              {t('profile.privateNote')}
            </ThemedText>
          </View>

          {/* Name + @username — the editable identity card. */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <NameField
              label={t('profile.name')}
              value={profile.displayName}
              fallback={signInName}
              placeholder={t('profile.nameEditPlaceholder')}
              onSave={setDisplayName}
            />
            <View style={[styles.cardDivider, { backgroundColor: theme.hairline }]} />
            <UsernameField
              label={t('profile.username')}
              username={username}
              onSave={(next) => {
                setLocalHandle(next);
                void social.setHandle(next);
              }}
            />
          </View>

          {/* Structured fields. */}
          <SettingsSection title={t('profile.title')}>
            <SettingsRow
              icon="flag-outline"
              label={t('profile.country')}
              value={countryName(profile.country, i18n.language)}
              onPress={() => router.push('/settings/country')}
            />
            <BirthDateRow
              label={t('profile.birthDate')}
              value={profile.birthDate}
              notSpecified={t('profile.birthDateNotSpecified')}
              onSave={setBirthDate}
            />
            <SettingsRow
              icon="chatbubble-ellipses-outline"
              label={t('profile.addressForm')}
              detail={t('app.addressFormDetail')}
              value={t(`app.addressFormValue.${profile.addressForm}`)}
              onPress={cycleAddressForm}
            />
          </SettingsSection>
        </KeyboardSafeScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Inline-editable display name (commits on submit/blur; empty clears back to the sign-in fallback). */
function NameField({
  label,
  value,
  fallback,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | null;
  fallback: string | null;
  placeholder: string;
  onSave: (name: string | null) => void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState(value ?? '');
  const commit = () => onSave(draft.trim() ? draft.trim() : null);
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commit}
        onSubmitEditing={commit}
        placeholder={fallback ?? placeholder}
        placeholderTextColor={theme.textMuted}
        textAlign={START_TEXT_ALIGN}
        style={[styles.fieldInput, { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.background }]}
      />
    </View>
  );
}

/** `@username` with live uniqueness validation, reusing the shared username logic. */
function UsernameField({
  label,
  username,
  onSave,
}: {
  label: string;
  username: string;
  onSave: (username: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('settings');
  const [draft, setDraft] = useState(username);
  const taken = useMemo<ReadonlySet<string>>(() => {
    const set = new Set<string>(RESERVED_WORDS.map(normalizeUsername));
    for (const f of [...sampleNeedHelp, ...sampleDeservePraise]) set.add(normalizeUsername(f.name));
    return set;
  }, []);
  const error = usernameError(draft, taken);
  const changed = normalizeUsername(draft) !== normalizeUsername(username);
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.usernameRow}>
        <ThemedText type="default" style={styles.at}>
          @
        </ThemedText>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          autoCapitalize="none"
          autoCorrect={false}
          textAlign={START_TEXT_ALIGN}
          style={[
            styles.fieldInput,
            styles.usernameInput,
            { color: theme.text, backgroundColor: theme.background, borderColor: error ? theme.danger : theme.hairline },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('save', { ns: 'common' })}
          disabled={!!error || !changed}
          onPress={() => onSave(draft.trim())}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: theme.teal },
            (!!error || !changed) && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            {t('save', { ns: 'common' })}
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText type="small" themeColor={error ? undefined : 'textSecondary'} style={error ? { color: theme.danger } : undefined}>
        {error ?? t('profile.usernameHelp')}
      </ThemedText>
    </View>
  );
}

/** Birth-date row: shows the date (or "Not specified"); tapping reveals an inline YYYY-MM-DD editor. */
function BirthDateRow({
  label,
  value,
  notSpecified,
  onSave,
}: {
  label: string;
  value: string | null;
  notSpecified: string;
  onSave: (iso: string | null) => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation('settings');
  const [editing, setEditing] = useState(false);
  // The wheel opens on what is already stored, so reopening the editor shows the saved date rather
  // than an arbitrary default. With nothing stored it opens on a plausible adult birth year — never
  // on today, which would suggest the user was born this morning.
  const stored = fromIsoDate(value);
  const thisYear = new Date().getFullYear();
  const [parts, setParts] = useState<DateParts>(
    stored ?? { year: thisYear - 30, month: 1, day: 1 },
  );

  // Month names in the active language, from the platform rather than a translated list of twelve.
  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleDateString(i18n.language, { month: 'long' }),
      ),
    [i18n.language],
  );

  const commit = () => {
    onSave(toIsoDate(parts));
    setEditing(false);
  };

  return (
    <>
      <SettingsRow
        icon="calendar-outline"
        label={label}
        value={value ?? notSpecified}
        onPress={() => setEditing((e) => !e)}
      />
      {editing && (
        <View style={[styles.inlineEditor, { borderTopColor: theme.hairline, flexDirection: 'column', gap: Spacing.two }]}>
          <DateWheel value={parts} monthNames={monthNames} thisYear={thisYear} onChange={setParts} />
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {/* Clearing stays possible: a birth date is optional, and a wheel with no empty row
                would otherwise make "not specified" unreachable once a date had been set. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={notSpecified}
              onPress={() => {
                onSave(null);
                setEditing(false);
              }}
              style={({ pressed }) => [styles.saveButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                {notSpecified}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('save', { ns: 'common' })}
              onPress={commit}
              style={({ pressed }) => [styles.saveButton, { flex: 1, backgroundColor: theme.teal }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                {t('save', { ns: 'common' })}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

const AVATAR = 76;

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  backButton: { padding: Spacing.one },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  avatarWrap: { alignItems: 'center', gap: Spacing.two },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateNote: { textAlign: 'center', paddingHorizontal: Spacing.four },
  card: { borderRadius: Radius.card, borderWidth: 1, overflow: 'hidden' },
  cardDivider: { height: 1, marginHorizontal: Spacing.three },
  field: { padding: Spacing.three, gap: Spacing.two },
  fieldInput: {
    height: 44,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  at: { opacity: 0.6 },
  usernameInput: { flex: 1 },
  saveButton: {
    borderRadius: Radius.button,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  invalidHint: { paddingHorizontal: Spacing.four },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.6 },
});
