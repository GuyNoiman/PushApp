/**
 * The user's reply for an "options" stage: selectable option cards (each with a
 * turquoise check when selected) plus a dashed "Other, type your own" row that
 * expands into a free-text field. Matches the reflect-goals-back / focus-one step
 * in mature_proposal.html.
 *
 * Presentational + local UI state only. Selection is owned by the screen (so it
 * persists once the stage resolves); the "Other" field's open/draft state is
 * ephemeral and kept here. `disabled` locks the block after the user has answered.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import type { CoachOption } from '@/components/coach/coachScript';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CoachOptions({
  prompt,
  options,
  selectedIds,
  multiSelect,
  allowOther,
  continueLabel,
  disabled,
  onSelect,
  onAdvance,
  onSubmitOther,
}: {
  prompt: string;
  options: CoachOption[];
  selectedIds: string[];
  multiSelect: boolean;
  allowOther: boolean;
  continueLabel?: string;
  disabled: boolean;
  /** Toggle (multi) or set (single) the selection for `id`. */
  onSelect: (id: string) => void;
  /** Commit the current selection and move the conversation forward. */
  onAdvance: () => void;
  /** The user typed their own answer instead of picking a card. */
  onSubmitOther: (text: string) => void;
}) {
  const theme = useTheme();
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const hasSelection = selectedIds.length > 0;

  const pickOption = (id: string) => {
    if (disabled) return;
    onSelect(id);
    // Single-focus: choosing a card is the answer, so advance straight away.
    if (!multiSelect) onAdvance();
  };

  const submitOther = () => {
    const trimmed = otherText.trim();
    if (trimmed.length === 0) return;
    onSubmitOther(trimmed);
  };

  return (
    <View style={styles.wrap}>
      <ThemedText type="small" themeColor="textMuted" style={styles.prompt}>
        {prompt}
      </ThemedText>

      {options.map((opt) => {
        const selected = selectedIds.includes(opt.id);
        const deferred = !!opt.canDefer && !selected && hasSelection;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={opt.title}
            disabled={disabled}
            onPress={() => pickOption(opt.id)}
            style={({ pressed }) => [
              styles.card,
              { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
              selected && { borderColor: theme.teal, backgroundColor: theme.tealTint },
              pressed && !disabled && styles.pressed,
            ]}>
            <View
              style={[
                styles.check,
                { borderColor: theme.hairline },
                selected && { borderColor: theme.teal, backgroundColor: theme.teal },
              ]}>
              {selected && <Ionicons name="checkmark" size={13} color={theme.backgroundElement} />}
            </View>
            <View style={styles.cardText}>
              <ThemedText type="smallBold">{opt.title}</ThemedText>
              {!!opt.meta && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.cardMeta}>
                  {opt.meta}
                </ThemedText>
              )}
              {deferred && (
                <View style={[styles.deferTag, { backgroundColor: theme.background }]}>
                  <Ionicons name="time-outline" size={11} color={theme.textMuted} />
                  <ThemedText type="small" themeColor="textMuted" style={styles.deferText}>
                    Saved for later
                  </ThemedText>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}

      {allowOther &&
        (otherOpen ? (
          <View style={[styles.otherOpen, { borderColor: theme.teal, backgroundColor: theme.backgroundElement }]}>
            <TextInput
              value={otherText}
              onChangeText={setOtherText}
              editable={!disabled}
              autoFocus
              placeholder="Type your own…"
              placeholderTextColor={theme.textMuted}
              returnKeyType="send"
              onSubmitEditing={submitOther}
              style={[styles.otherInput, { color: theme.text }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              disabled={disabled || otherText.trim().length === 0}
              onPress={submitOther}
              style={({ pressed }) => [
                styles.otherSend,
                { backgroundColor: theme.teal },
                (disabled || otherText.trim().length === 0) && styles.dim,
                pressed && styles.pressed,
              ]}>
              <Ionicons name="arrow-up" size={16} color={theme.backgroundElement} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Other, type your own"
            disabled={disabled}
            onPress={() => setOtherOpen(true)}
            style={({ pressed }) => [
              styles.otherRow,
              { borderColor: theme.hairline },
              pressed && !disabled && styles.pressed,
            ]}>
            <Ionicons name="add" size={15} color={theme.textMuted} />
            <ThemedText type="small" themeColor="textMuted">
              Other, type your own
            </ThemedText>
          </Pressable>
        ))}

      {multiSelect && !disabled && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={continueLabel ?? 'Continue'}
          disabled={!hasSelection}
          onPress={onAdvance}
          style={({ pressed }) => [
            styles.continue,
            { backgroundColor: theme.teal },
            !hasSelection && styles.dim,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
            {continueLabel ?? 'Continue'}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  prompt: {
    fontFamily: 'Inter_600SemiBold',
    marginTop: Spacing.one,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
    borderRadius: Radius.card,
    borderWidth: 1.4,
    padding: Spacing.three - 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardMeta: {
    marginTop: 2,
  },
  deferTag: {
    marginTop: Spacing.two,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.chip,
  },
  deferText: {
    fontFamily: 'Inter_600SemiBold',
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    paddingVertical: Spacing.three - 3,
    paddingHorizontal: Spacing.three - 2,
  },
  otherOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1.4,
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.three - 2,
    paddingRight: Spacing.one,
  },
  otherInput: {
    flex: 1,
    height: 40,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  otherSend: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continue: {
    marginTop: Spacing.one,
    height: 44,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  dim: {
    opacity: 0.4,
  },
});
