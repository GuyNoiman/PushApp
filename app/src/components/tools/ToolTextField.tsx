/**
 * ToolTextField — the one text input the tools share: a bordered box, an optional counter, and a
 * limit measured the way a person counts characters rather than the way UTF-16 does.
 *
 * WHY THE LIMIT IS SOFT. `maxLength` on a native input silently swallows the keystroke that would
 * cross it, which reads as a broken keyboard mid-sentence. Here the box turns and the counter says
 * how far over it is, and the SCREEN decides whether that blocks its primary action. People are
 * allowed to overshoot while they think.
 *
 * Presentational only (Engineering Bible §19).
 */
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';


import { perceivedLength } from '@/core/tools/text';

export interface ToolTextFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel: string;
  /** Multi-line by default: these are reflections, not form fields. */
  multiline?: boolean;
  /** The soft limit. Over it, the field marks itself and the counter appears. */
  maxChars?: number;
  minHeight?: number;
  autoFocus?: boolean;
}

export function ToolTextField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  multiline = true,
  maxChars,
  minHeight = 96,
  autoFocus,
}: ToolTextFieldProps) {
  const theme = useTheme();
  const length = maxChars === undefined ? 0 : perceivedLength(value);
  const over = maxChars !== undefined && length > maxChars;

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.input,
          {
            minHeight: multiline ? minHeight : undefined,
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: over ? theme.danger : theme.hairline,
            textAlign: START_TEXT_ALIGN,
          },
        ]}
      />
      {maxChars !== undefined && length > maxChars * 0.8 ? (
        <ThemedText type="small" style={{ color: over ? theme.danger : theme.textMuted, textAlign: 'right' }}>
          {length} / {maxChars}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  input: {
    borderRadius: Radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
