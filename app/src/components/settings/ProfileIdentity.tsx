/**
 * ProfileIdentity — the Profile section header on the Settings tab. Moved here
 * from Circle (founder feedback 2026-08-07): a user's identity now lives in
 * Settings, not in the friends list.
 *
 * It shows a monogram avatar, a display-name placeholder ("from sign-in"), and
 * the auto-generated, editable `@username`:
 *   · A friendly username is AUTO-GENERATED (`adjective-animal-####`) once on
 *     first load — a new user never invents one. A real backend handle, when
 *     present, always wins over the local one.
 *   · Tapping the pencil opens an inline editor with LIVE uniqueness validation
 *     (against the same demo reserved set + sample names Circle used); Save is
 *     enabled only when the name is valid and unique, then persists via
 *     `social.setHandle`.
 *
 * The pure generation/validation logic is reused from `core/social/username`;
 * this component owns only state + rendering (Engineering Bible §19).
 *
 * TODO(auth): signing in with Apple/Google will later supply a real display name,
 * avatar and identity here; until then the display name is a placeholder and the
 * username is a local, editable handle that persists through the existing
 * setHandle path once the social backend is wired.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { generateUsername, normalizeUsername, RESERVED_WORDS, usernameError } from '@/core/social/username';
import { Radius, Spacing } from '@/constants/theme';
import { sampleDeservePraise, sampleNeedHelp } from '@/dev/sampleSocial';
import { useTheme } from '@/hooks/use-theme';
import { useSocial } from '@/state/SocialProvider';

/** 1–2 letter monogram from a username (skips a leading @). */
function initialsFor(name: string): string {
  const clean = name.replace(/^@/, '').trim();
  const parts = clean.split(/[-\s]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function ProfileIdentity() {
  const theme = useTheme();
  const social = useSocial();

  // The demo "taken" registry: the sample friends' names + a few reserved words,
  // normalized. Editing a username validates against this local set.
  // TODO(auth): real uniqueness check needs the backend registry.
  const takenUsernames = useMemo<ReadonlySet<string>>(() => {
    const set = new Set<string>(RESERVED_WORDS.map(normalizeUsername));
    for (const f of [...sampleNeedHelp, ...sampleDeservePraise]) set.add(normalizeUsername(f.name));
    return set;
  }, []);

  const persisted = social.profile?.handle ?? '';
  // Generated once — the initializer runs on first render only, so it survives
  // every re-render (stable across re-renders).
  const [generated] = useState(generateUsername);
  const [localSaved, setLocalSaved] = useState<string | null>(null);
  const username = persisted || localSaved || generated;

  const [editing, setEditing] = useState(false);

  const save = (next: string) => {
    const clean = next.trim();
    setLocalSaved(clean);
    // Persist through the existing handle-set path when the backend is wired;
    // a harmless no-op in guest/POC mode (SocialProvider returns inert defaults).
    void social.setHandle(clean);
    setEditing(false);
  };

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
        Profile
      </ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: theme.tealTint }]}>
            <ThemedText type="subtitle" style={{ color: theme.tealStrong }}>
              {initialsFor(username)}
            </ThemedText>
          </View>

          <View style={styles.identity}>
            {/* Display name is a placeholder until sign-in supplies a real one. */}
            <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
              Your name (from sign-in)
            </ThemedText>
            <View style={styles.usernameRow}>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.username}>
                @{username}
              </ThemedText>
              {!editing && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit username"
                  onPress={() => setEditing(true)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.editButton,
                    { backgroundColor: theme.tealTint },
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons name="pencil" size={14} color={theme.tealStrong} />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {editing && <UsernameEditor current={username} taken={takenUsernames} onSave={save} />}
      </View>
    </View>
  );
}

/** Edit mode: a pre-filled input with live uniqueness validation + Save. */
function UsernameEditor({
  current,
  taken,
  onSave,
}: {
  current: string;
  taken: ReadonlySet<string>;
  onSave: (username: string) => void;
}) {
  const theme = useTheme();
  const [value, setValue] = useState(current);
  // Live validation: empty/too-short or a collision with the demo registry.
  const error = usernameError(value, taken);
  return (
    <View style={[styles.editor, { borderTopColor: theme.hairline }]}>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="yourusername"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.background,
              borderColor: error ? theme.danger : theme.hairline,
            },
          ]}
        />
        {/* Only a unique, valid name can be saved. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          disabled={error !== null}
          onPress={() => onSave(value)}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: theme.teal },
            error !== null && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Save
          </ThemedText>
        </Pressable>
      </View>
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          This is how friends find you.
        </ThemedText>
      )}
    </View>
  );
}

const AVATAR = 52;

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  title: {
    paddingHorizontal: Spacing.one,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  identity: {
    flex: 1,
    gap: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  username: {
    flexShrink: 1,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  editor: {
    borderTopWidth: 1,
    padding: Spacing.three,
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
  saveButton: {
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
