/**
 * Help and feedback — the one place a person can tell us something is wrong.
 *
 * Built to `04_Product/PRD/Operational_Monitoring_Admin_Console_PRD.md` §8, stage 2 of the
 * implementation plan.
 *
 * ── WHY THIS EXISTS BEFORE ANY CRASH MONITORING ────────────────────────────────────────────────
 *
 * A crash tells you that something threw. A person tells you what they were trying to do. The space
 * bar not working in the questionnaire (2026-08-25) threw nothing at all, no monitoring would ever
 * have seen it, and it reached us because the founder typed it into a chat — anybody else would have
 * decided the app was broken and left.
 *
 * ── WHAT IS DELIBERATELY MISSING HERE, AND WHY ─────────────────────────────────────────────────
 *
 * **The screenshot.** §8.4 makes it a contract, not a feature: strip metadata including location,
 * validate type and size, preview the exact image, and confirm it. Stripping metadata reliably means
 * re-encoding the file, which means `expo-image-manipulator`, which is a native module and needs a
 * build the founder does not want yet. A screenshot picker without the stripping would be a promise
 * we are not keeping, so there is none — it arrives with the same build that carries the crash SDK.
 *
 * The contact email is prefilled from the account when there is one and is always editable; editing
 * it changes this report's reply address and nothing about the account (§8.3).
 *
 * Presentational + local draft state (Engineering Bible §19); the rules live in `core/reports`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  DESCRIPTION_MAX_CHARS,
  REPORT_CATEGORIES,
  checkReport,
  getReportGateway,
  type ReportCategory,
} from '@/core/reports';
import { collectDiagnostics } from '@/core/reports/diagnostics';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';

type Phase = 'writing' | 'sending' | 'sent' | 'failed';

export default function ReportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation('settings');

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  /**
   * §8.3 asks for this to be prefilled from the account "when available", and it is NOT available:
   * `AuthUser` carries an id, an anonymous flag and provider NAMES, and nothing else — the PII
   * boundary (red-line R1) means the app has never held the person's email address. So the field
   * starts empty and is theirs to fill if they want an answer. That is the cost of a boundary we
   * chose on purpose, and the right place to pay it is here rather than by widening the boundary.
   */
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('writing');

  const problems = useMemo(
    () => (category ? checkReport({ category, description, contactEmail: email }) : ['noCategory']),
    [category, description, email],
  );
  const ready = problems.length === 0;

  const send = useCallback(async () => {
    if (!category || !ready) return;
    setPhase('sending');
    const id = await getReportGateway().send(
      { category, description, contactEmail: email },
      collectDiagnostics('settings', i18n.language),
    );
    // A report that silently vanished is worse than a form that admits it failed.
    setPhase(id ? 'sent' : 'failed');
  }, [category, description, email, i18n.language, ready]);

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={dismiss}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="title">{t('report.title')}</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {phase === 'sent' ? (
            <>
              <ThemedText type="displaySmall">{t('report.sentTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {email.trim() ? t('report.sentWithEmail') : t('report.sentNoEmail')}
              </ThemedText>
              <Cta label={t('report.done')} onPress={dismiss} />
            </>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {t('report.intro')}
              </ThemedText>

              <ThemedText type="smallBold">{t('report.categoryLabel')}</ThemedText>
              <View style={styles.categories}>
                {REPORT_CATEGORIES.map((value) => {
                  const on = value === category;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={t(`report.category.${value}`)}
                      onPress={() => setCategory(value)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          borderColor: on ? theme.tint : theme.hairline,
                          backgroundColor: on ? theme.tealTint : theme.backgroundElement,
                        },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="small" style={{ color: on ? theme.tealStrong : theme.text }}>
                        {t(`report.category.${value}`)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText type="smallBold">{t('report.descriptionLabel')}</ThemedText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={DESCRIPTION_MAX_CHARS}
                placeholder={t('report.descriptionPlaceholder')}
                placeholderTextColor={theme.textMuted}
                textAlign={START_TEXT_ALIGN}
                style={[
                  styles.multiline,
                  { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
                ]}
              />

              <ThemedText type="smallBold">{t('report.emailLabel')}</ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder={t('report.emailPlaceholder')}
                placeholderTextColor={theme.textMuted}
                textAlign={START_TEXT_ALIGN}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
                ]}
              />
              <ThemedText type="small" themeColor="textMuted">
                {t('report.emailHint')}
              </ThemedText>

              {/* What goes with it, said before it is sent rather than in a policy nobody opens. */}
              <ThemedText type="small" themeColor="textMuted">
                {t('report.whatWeSend')}
              </ThemedText>

              {problems.includes('badEmail') ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {t('report.badEmail')}
                </ThemedText>
              ) : null}
              {phase === 'failed' ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {t('report.failed')}
                </ThemedText>
              ) : null}

              <Cta
                label={phase === 'sending' ? t('report.sending') : t('report.send')}
                disabled={!ready || phase === 'sending'}
                onPress={() => void send()}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Cta({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: theme.tint },
        (pressed || disabled) && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

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
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  multiline: {
    minHeight: 132,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  input: { borderWidth: 1, borderRadius: Radius.card, padding: Spacing.three },
  cta: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
});
