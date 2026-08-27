/**
 * TechnicalNote — one line of the coach explaining itself (technical mode, 2026-08-27).
 *
 * ── WHY IT LOOKS NOTHING LIKE A COACH BUBBLE ──────────────────────────────────────────────────
 *
 * Because it is not the coach talking to the person. It is the product talking about itself, and a
 * reader must be able to tell those apart at a glance and without reading a word — hence the
 * monospaced text, the muted ground and the `[…]` prefix on every single line, which is what the
 * founder asked for and is also the only marker that survives a copy-paste into a message to the
 * domain expert.
 *
 * The prefix is i18n, so it reads `[מידע טכני]` in Hebrew and `[Technical]` in English.
 *
 * Presentational only. It renders text somebody else decided on.
 */
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TechnicalNote({ text }: { text: string }) {
  const theme = useTheme();
  const { t } = useTranslation('coach');
  // Every LINE carries the prefix, not just the first: these notes are multi-line, and a block whose
  // second line is unmarked reads like part of the conversation once it is scrolled or quoted.
  const prefixed = text
    .split('\n')
    .map((line) => `${t('technical.prefix')} ${line}`)
    .join('\n');
  return (
    <View
      style={[styles.note, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <ThemedText type="small" themeColor="textMuted" style={styles.text}>
        {prefixed}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    marginVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  // Monospaced on purpose: ids, keys and axis values are the content, and a proportional face makes
  // `career.proof.roleStory` harder to read and harder to transcribe.
  text: { fontFamily: 'monospace', fontSize: 11, lineHeight: 16 },
});
