/**
 * PartialNoteSheet — the OPTIONAL free-text note revealed when a Step is reported Partial
 * (Daily Step Reporting, D35 §6 / D36). Reuses the ReasonSheet TextInput pattern. The note is
 * never mandatory: an empty note is valid and Save works with nothing typed, so a Partial report
 * stays a fast one-tap action. Whatever is typed stays ON-DEVICE only (ReasonEntry.note, G1) — the
 * placeholder reassures the user of that.
 *
 * Presentational only (Engineering Bible §19): it reports the note upward; the engine stores it.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export function PartialNoteSheet({
  visible,
  stepTitle,
  onSave,
  onBack,
}: {
  visible: boolean;
  stepTitle: string;
  /** Save the (optional) on-device-only note. `undefined` when the field is left empty. */
  onSave: (note?: string) => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';
  const [note, setNote] = useState('');

  const close = () => setNote('');
  const save = () => {
    const trimmed = note.trim();
    onSave(trimmed ? trimmed : undefined);
    close();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        close();
        onBack();
      }}>
      {/* The sheet sits on the bottom edge, so the keyboard would cover the note field outright —
          lift the whole sheet above it (Device QA A3). A ScrollView's keyboard inset can't help
          here: there is no scroll body, so KeyboardAvoidingView is the right tool. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          accessibilityLabel={t('dismiss', { ns: 'common' })}
          style={styles.backdrop}
          onPress={() => {
            close();
            onBack();
          }}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            <ThemedText type="subtitle" numberOfLines={2} style={styles.title}>
              {stepTitle}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('report.partialNote.title')}
            </ThemedText>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('report.partialNote.placeholder')}
              placeholderTextColor={theme.textMuted}
              multiline
              style={[
                styles.input,
                { borderColor: theme.hairline, color: theme.text, backgroundColor: theme.background },
              ]}
            />
            <ThemedText type="small" themeColor="textMuted">
              {t('report.partialNote.optional')}
            </ThemedText>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('back', { ns: 'common' })}
                onPress={() => {
                  close();
                  onBack();
                }}
                style={({ pressed }) => [styles.button, styles.ghost, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('back', { ns: 'common' })}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('report.partialNote.save')}
                onPress={save}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: onAccent }}>
                  {t('report.partialNote.save')}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 20, 18, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontFamily: FontFamily.headingBold,
  },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.input,
    padding: Spacing.three,
    textAlignVertical: 'top',
    fontFamily: FontFamily.bodyRegular,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  button: {
    minWidth: 96,
    height: 44,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.6,
  },
});
