/**
 * SignInFailureNotice — the one sentence a sign-in screen says when signing in did not work, and the
 * way to try again.
 *
 * Shared by the first run's account screen and Settings › Sign in, for the same reason
 * `ProviderButton` is: two copies of what a failure looks like is two places for a raw error to come
 * back. It takes a {@link SignInFailure} — a provider and a word from a closed set — and has no way to
 * render anything else. The words are sentences in `settings.signIn.failure` (see
 * `core/auth/signInNotice` for which failure says which).
 *
 * "Try again" retries the SAME provider, because that is the button the person pressed.
 *
 * Presentational only (Engineering Bible §19).
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { SignInFailure } from '@/core/auth/signInNotice';
import { useTheme } from '@/hooks/use-theme';

/** Brand names, not copy: they read the same in every language. */
const PROVIDER_NAME = { apple: 'Apple', google: 'Google' } as const;

export function SignInFailureNotice({
  failure,
  disabled,
  onTryAgain,
}: {
  failure: SignInFailure | null;
  disabled: boolean;
  onTryAgain: (provider: SignInFailure['provider']) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('settings');
  if (!failure) return null;

  const tryAgain = t('signIn.failure.tryAgain');
  return (
    <View accessibilityRole="alert" style={styles.notice}>
      <ThemedText type="small" style={[styles.centred, { color: theme.danger }]}>
        {t(`signIn.failure.${failure.notice}`, { provider: PROVIDER_NAME[failure.provider] })}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tryAgain}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={8}
        onPress={() => onTryAgain(failure.provider)}
        style={({ pressed }) => [styles.tryAgain, pressed && styles.pressed, disabled && styles.dimmed]}>
        <ThemedText type="smallBold" style={{ color: theme.teal }}>
          {tryAgain}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  centred: {
    textAlign: 'center',
  },
  tryAgain: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  dimmed: {
    opacity: 0.4,
  },
});
