/**
 * ToolEntryList — "write a line, add it, write another": the input shape used wherever a tool
 * collects several short entries on one screen rather than one long paragraph.
 *
 * WHY SEVERAL SHORT ONES. A decision's four sides, a week's supporting conditions and a map's roles
 * are all lists in a person's head. Forcing them into one text box loses the boundaries the person
 * already drew, and the boundaries are what a later screen can point at.
 *
 * EMPTY IS ALWAYS ALLOWED. The list never insists; "nothing comes to mind right now" is a complete
 * answer in every tool that uses this (each PRD says so separately), so there is no minimum here and
 * no warning when the list is empty.
 *
 * Presentational only (Engineering Bible §19).
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ToolTextField } from '@/components/tools/ToolTextField';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';

export interface ToolEntryListProps {
  entries: readonly { id: string; text: string }[];
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  inputLabel: string;
  accentColor: string;
  maxChars?: number;
  /** Shown when the list is empty — an invitation, never a warning. */
  emptyHint?: string;
}

export function ToolEntryList({
  entries,
  onAdd,
  onRemove,
  placeholder,
  addLabel,
  removeLabel,
  inputLabel,
  accentColor,
  maxChars = 160,
  emptyHint,
}: ToolEntryListProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  const commit = () => {
    if (draft.trim().length === 0) return;
    onAdd(draft.trim());
    setDraft('');
  };

  return (
    <View style={styles.wrap}>
      {entries.map((entry) => (
        <View
          key={entry.id}
          style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
          <ThemedText type="small" style={[styles.text, { color: theme.text }]}>{entry.text}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${removeLabel}: ${entry.text}`}
            onPress={() => onRemove(entry.id)}
            hitSlop={8}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <Ionicons name="close" size={16} color={theme.textMuted} />
          </Pressable>
        </View>
      ))}

      {entries.length === 0 && emptyHint ? (
        <ThemedText type="small" style={[styles.text, { color: theme.textMuted }]}>{emptyHint}</ThemedText>
      ) : null}

      <ToolTextField
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        accessibilityLabel={inputLabel}
        maxChars={maxChars}
        multiline={false}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: draft.trim().length === 0 }}
        disabled={draft.trim().length === 0}
        onPress={commit}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <Ionicons name="add" size={16} color={draft.trim().length === 0 ? theme.textMuted : accentColor} />
        <ThemedText type="small" style={{ color: draft.trim().length === 0 ? theme.textMuted : accentColor }}>
          {addLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  text: { flex: 1, textAlign: START_TEXT_ALIGN },
  add: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  pressed: { opacity: 0.75 },
});
