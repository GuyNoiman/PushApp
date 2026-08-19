/**
 * Sign-in (Settings › Account) — linking the device's session to a real Apple or Google identity
 * (Auth_Backend_Proposal P4/P5).
 *
 * WHAT SIGNING IN IS FOR, and what it is not: the app already works fully without it. Everything is
 * on the device, and an anonymous session already carries the user's whole record. Signing in makes
 * that record RECOVERABLE — a new phone, a reinstall — and it is what a Support Circle needs in
 * order to know who is who. So the screen says that, and it never pressures: there is no wall here,
 * and the person can close it and go on using the app exactly as before.
 *
 * BUTTONS, not the native Apple component: `AppleAuthentication.AppleAuthenticationButton` is a
 * native view, and importing it here would pull a native module into a screen that must also render
 * in Expo Go, on web and under jest. These follow Apple's Human Interface Guidelines for a custom
 * button instead — the Apple mark, the exact wording, black on light / white on dark, full width,
 * matched corner radius — which Apple permits.
 *
 * A provider that this build cannot do is HIDDEN, not shown broken (Apple also requires its button
 * be absent where sign-in is unavailable). A CANCEL shows nothing at all: closing a sheet is not an
 * error, and the person is simply back here.
 *
 * Presentational (Engineering Bible §19): the identity work belongs to AuthProvider → AuthGateway →
 * nativeIdentity. This screen only asks, waits, and reports.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { isAppleSignInAvailable, isGoogleSignInAvailable } from '@/core/auth/nativeIdentity';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useAuth } from '@/state/AuthProvider';

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const { t } = useTranslation('settings');
  const { status, error, signInWithApple, signInWithGoogle } = useAuth();

  // Which providers THIS build can actually run. Apple's check is async (it asks the OS), so both
  // start hidden and appear once known — a button that cannot work must never be offered.
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleAvailable] = useState(() => isGoogleSignInAvailable());
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  useEffect(() => {
    let mounted = true;
    void isAppleSignInAvailable().then((ok) => {
      if (mounted) setAppleAvailable(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Signed in ⇒ the screen has done its job; step back to where the user came from.
  useEffect(() => {
    if (status === 'authenticated') router.back();
  }, [status, router]);

  const run = async (provider: 'apple' | 'google') => {
    if (busy) return;
    setBusy(provider);
    try {
      // AuthProvider swallows a cancel and surfaces anything else through `error` — nothing to
      // catch here, and nothing to show for a person who simply closed the sheet.
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
    } finally {
      setBusy(null);
    }
  };

  const nothingAvailable = !appleAvailable && !googleAvailable;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="title">{t('signIn.title')}</ThemedText>
        </View>

        <View style={styles.content}>
          <ThemedText type="default" style={styles.lead}>
            {t('signIn.lead')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
            {t('signIn.body')}
          </ThemedText>

          {appleAvailable ? (
            <ProviderButton
              icon="logo-apple"
              label={t('account.apple')}
              busy={busy === 'apple'}
              disabled={busy !== null}
              // Apple's HIG: black on a light background, white on a dark one.
              background={dark ? '#FFFFFF' : '#000000'}
              foreground={dark ? '#000000' : '#FFFFFF'}
              onPress={() => void run('apple')}
            />
          ) : null}

          {googleAvailable ? (
            <ProviderButton
              icon="logo-google"
              label={t('account.google')}
              busy={busy === 'google'}
              disabled={busy !== null}
              // Google's guidelines: a neutral surface with a visible outline, not a filled brand colour.
              background={theme.backgroundElement}
              foreground={theme.text}
              borderColor={theme.hairline}
              onPress={() => void run('google')}
            />
          ) : null}

          {nothingAvailable ? (
            <ThemedText type="small" themeColor="textMuted" style={styles.note}>
              {t('signIn.unavailable')}
            </ThemedText>
          ) : null}

          {/* A real failure is said plainly and stays on screen; the user's data is untouched. */}
          {error ? (
            <ThemedText type="small" style={[styles.note, { color: theme.danger }]}>
              {error}
            </ThemedText>
          ) : null}

          <ThemedText type="small" themeColor="textMuted" style={styles.note}>
            {t('signIn.privacy')}
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/** One full-width provider button. Layout is direction-aware; Yoga mirrors the row under RTL. */
function ProviderButton({
  icon,
  label,
  busy,
  disabled,
  background,
  foreground,
  borderColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  busy: boolean;
  disabled: boolean;
  background: string;
  foreground: string;
  borderColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.provider,
        { backgroundColor: background },
        borderColor ? { borderWidth: 1, borderColor } : null,
        pressed && styles.pressed,
        disabled && !busy && styles.dimmed,
      ]}>
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          <Ionicons name={icon} size={20} color={foreground} />
          <ThemedText style={[styles.providerLabel, { color: foreground }]}>{label}</ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.one,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  lead: {
    fontFamily: FontFamily.headingBold,
  },
  body: {
    marginBottom: Spacing.two,
  },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.button,
  },
  providerLabel: {
    fontSize: 15,
    fontFamily: FontFamily.headingBold,
  },
  note: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  dimmed: {
    opacity: 0.4,
  },
});
