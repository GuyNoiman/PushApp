/**
 * OnboardingQuestionPage — the BODY of one of the six question pages (PRD §6). Data-driven from the
 * question config: renders selectable option cards (single or multi, honouring the select limit),
 * a revealed free-text field when the "Other" option is chosen, the text-only Q2, and Q6's always-
 * available optional free-text add-on. The footer (Continue / Skip) is owned by the flow container.
 *
 * Presentational only (Engineering Bible §19): selection + free text live in the container's answer
 * model; this component reads them and calls back. It never persists or translates free text.
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';
import type { OnboardingQuestion } from '@/core/onboarding/questions';

export function OnboardingQuestionPage({
  question,
  selected,
  atLimit,
  freeText,
  onToggle,
  onChangeText,
}: {
  question: OnboardingQuestion;
  /** Currently-selected option ids. */
  selected: string[];
  /** True when a multi-select is at its limit (unselected options read as inert). */
  atLimit: boolean;
  /** The question's free text (Q2 outcome, an "Other" clarification, or Q6 constraints). */
  freeText: string;
  onToggle: (optionId: string) => void;
  onChangeText: (text: string) => void;
}) {
  const theme = useTheme();
  // Form-of-address–aware `t` (D31): the q3–q6 self-description options are FIRST-person about the
  // user (Hebrew genders "אני יודע/יודעת", "אני יכול/יכולה"), so they resolve the gendered variant;
  // every non-gendered string falls back to its base.
  const { t } = useAddressedTranslation('onboarding');
  const base = `questions.${question.id}`;

  const otherSelected = question.options.some((o) => o.isOther && selected.includes(o.id));
  const showOtherField = question.freeText === 'onOther' && otherSelected;

  return (
    <View style={styles.wrap}>
      <ThemedText type="subtitle">{t(`${base}.title`)}</ThemedText>
      {question.select !== 'text' ? (
        <ThemedText type="small" themeColor="textMuted">
          {t(`${base}.hint`)}
        </ThemedText>
      ) : null}

      {/* Text-only question (Q2). */}
      {question.select === 'text' ? (
        <View style={styles.textBlock}>
          <TextInput
            value={freeText}
            onChangeText={onChangeText}
            multiline
            placeholder={t(`${base}.placeholder`)}
            placeholderTextColor={theme.textMuted}
            textAlign={isRTL() ? 'right' : 'left'}
            style={[
              styles.multiline,
              { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t(`${base}.helper`)}
          </ThemedText>
        </View>
      ) : null}

      {/* Option cards (single / multi). */}
      {question.options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        const inert = !isSelected && atLimit; // at the "up to two" limit — this pick is unavailable
        return (
          <Pressable
            key={opt.id}
            accessibilityRole={question.select === 'single' ? 'radio' : 'checkbox'}
            accessibilityState={{ selected: isSelected, disabled: inert }}
            accessibilityLabel={t(`${base}.options.${opt.id}`)}
            disabled={inert}
            onPress={() => onToggle(opt.id)}
            style={({ pressed }) => [
              styles.card,
              { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
              isSelected && { borderColor: theme.teal, backgroundColor: theme.tealTint },
              inert && styles.dim,
              pressed && !inert && styles.pressed,
            ]}>
            <View
              style={[
                styles.check,
                question.select === 'single' && styles.radio,
                { borderColor: theme.hairline },
                isSelected && { borderColor: theme.teal, backgroundColor: theme.teal },
              ]}>
              {isSelected ? <Ionicons name="checkmark" size={13} color={theme.backgroundElement} /> : null}
            </View>
            <ThemedText type="smallBold" style={styles.cardText}>
              {t(`${base}.options.${opt.id}`)}
            </ThemedText>
          </Pressable>
        );
      })}

      {/* "Other" free text, revealed when the terminal option is chosen. */}
      {showOtherField ? (
        <View style={styles.textBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            {t(`${base}.otherReveal`)}
          </ThemedText>
          <TextInput
            value={freeText}
            onChangeText={onChangeText}
            multiline
            placeholder={t(`${base}.otherReveal`)}
            placeholderTextColor={theme.textMuted}
            textAlign={isRTL() ? 'right' : 'left'}
            style={[
              styles.multiline,
              { color: theme.text, borderColor: theme.teal, backgroundColor: theme.backgroundElement },
            ]}
          />
        </View>
      ) : null}

      {/* Q6's optional free-text add-on ("anything the Coach should take into account"). */}
      {question.freeText === 'optional' ? (
        <View style={[styles.addon, { borderTopColor: theme.hairline }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t(`${base}.freeTextTitle`)}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {t(`${base}.freeTextHelper`)}
          </ThemedText>
          <TextInput
            value={freeText}
            onChangeText={onChangeText}
            multiline
            placeholder={t(`${base}.freeTextPlaceholder`)}
            placeholderTextColor={theme.textMuted}
            textAlign={isRTL() ? 'right' : 'left'}
            style={[
              styles.multiline,
              { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  textBlock: { gap: Spacing.two, marginTop: Spacing.one },
  multiline: {
    minHeight: 88,
    borderRadius: Radius.input,
    borderWidth: 1.4,
    padding: Spacing.three,
    fontSize: 15,
    textAlignVertical: 'top',
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
    borderRadius: 6,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radio: { borderRadius: 11 },
  cardText: { flex: 1, minWidth: 0 },
  addon: { gap: Spacing.two, marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: 1 },
  dim: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
