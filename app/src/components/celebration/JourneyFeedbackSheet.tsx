/**
 * JourneyFeedbackSheet — the end-of-Journey question, asked as a REQUEST.
 *
 * COPY RULE (founder, 2026-08-18): this is us asking the user for a favour, and it has to read that
 * way. We explain that their answer helps us build better Journeys for them and for other people,
 * and we mean both halves of that. What it must never be:
 *   · a rating prompt ("enjoying PushApp? ⭐⭐⭐⭐⭐") — that asks about US, at the moment they are
 *     thinking about themselves;
 *   · a survey — three taps, all optional, always dismissible;
 *   · an interrogation of a failure. It is asked most importantly of people who STOPPED, and for
 *     them the honest framing is that the plan may have been wrong, not the person.
 *
 * SKIPPING IS A REAL ANSWER: closing this records the ask and it never returns for that Journey
 * (see `core/celebration/journeyFeedback`). There is no second attempt and no "maybe later".
 *
 * PRIVACY: the note is captured here and stored ON-DEVICE ONLY (G1) — the placeholder says so,
 * because a question about why someone gave up on changing their life deserves that said out loud.
 *
 * Presentational only — it reports upward and holds no business logic (Bible §19).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import type { FeedbackHost, Helped } from '@/core/celebration/journeyFeedback';
import { reasonLabel, REASONS } from '@/core/config/reasons';
import type { ReasonId } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';

const HELPED_VALUES: Helped[] = ['yes', 'partly', 'no'];

export function JourneyFeedbackSheet({
  visible,
  journeyTitle,
  host,
  onSubmit,
  onDismiss,
}: {
  visible: boolean;
  journeyTitle: string;
  /** Which moment is asking — it changes the framing, never the question. */
  host: FeedbackHost;
  onSubmit: (input: { helped?: Helped; reasonId?: ReasonId; note?: string }) => void;
  /** Closing without answering. Recorded as asked; never asked again. */
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const [helped, setHelped] = useState<Helped | null>(null);
  const [reasonId, setReasonId] = useState<ReasonId | null>(null);
  const [note, setNote] = useState('');

  // The "what got in the way" row is offered only once the user has said it did NOT fully help.
  // Asking someone who just said "yes, it helped" what went wrong would be the app arguing with
  // them about their own experience.
  const asksWhat = helped === 'partly' || helped === 'no';

  const submit = () => {
    onSubmit({
      ...(helped ? { helped } : {}),
      ...(asksWhat && reasonId ? { reasonId } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setHelped(null);
    setReasonId(null);
    setNote('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <KeyboardSafeView style={styles.flex}>
        <Pressable accessibilityLabel={t('dismiss', { ns: 'common' })} style={styles.backdrop} onPress={onDismiss}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            <ThemedText type="subtitle" style={styles.title}>
              {t(`feedback.title.${host}`)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {journeyTitle}
            </ThemedText>
            {/* The ask itself: why we want this and who it helps. */}
            <ThemedText type="small" themeColor="textSecondary" style={styles.ask}>
              {t('feedback.ask')}
            </ThemedText>

            <ThemedText type="smallBold" style={styles.question}>
              {t('feedback.helpedQuestion')}
            </ThemedText>
            <View style={styles.chips}>
              {HELPED_VALUES.map((value) => {
                const selected = helped === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setHelped(value)}
                    style={[
                      styles.chip,
                      { borderColor: selected ? theme.teal : theme.hairline },
                      selected && { backgroundColor: theme.tealTint },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: selected ? theme.tealStrong : theme.textSecondary }}>
                      {t(`feedback.helped.${value}`)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {asksWhat ? (
              <>
                <ThemedText type="smallBold" style={styles.question}>
                  {t('feedback.whatQuestion')}
                </ThemedText>
                <View style={styles.chips}>
                  {REASONS.map((r) => {
                    const selected = reasonId === r.id;
                    return (
                      <Pressable
                        key={r.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setReasonId(r.id)}
                        style={[
                          styles.chip,
                          { borderColor: selected ? theme.teal : theme.hairline },
                          selected && { backgroundColor: theme.tealTint },
                        ]}>
                        <ThemedText type="small" style={{ color: selected ? theme.tealStrong : theme.textSecondary }}>
                          {reasonLabel(r.id)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('feedback.notePlaceholder')}
              placeholderTextColor={theme.textMuted}
              multiline
              textAlign={START_TEXT_ALIGN}
              style={[styles.input, { borderColor: theme.hairline, color: theme.text, backgroundColor: theme.background }]}
            />

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('feedback.skip')}
                onPress={onDismiss}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('feedback.skip')}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('feedback.send')}
                onPress={submit}
                style={({ pressed }) => [styles.primary, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {t('feedback.send')}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardSafeView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 20, 18, 0.45)' },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  title: { fontFamily: FontFamily.headingBold },
  ask: { marginTop: Spacing.one },
  question: { marginTop: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: Radius.input, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  input: { borderWidth: 1, borderRadius: Radius.input, padding: Spacing.three, minHeight: 72, marginTop: Spacing.two },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.two },
  secondary: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  primary: { height: 44, minWidth: 120, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  pressed: { opacity: 0.6 },
});
