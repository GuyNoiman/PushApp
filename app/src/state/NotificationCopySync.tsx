/**
 * NotificationCopySync — the SINGLE re-resolution trigger for notification copy.
 *
 * Reminder copy is resolved at reconcile time (see `core/notify/reminderCopy`), from three inputs:
 * the active LANGUAGE, the FORM OF ADDRESS (D31) and the COMMUNICATION STYLE (D40). Changing any of
 * them must reach reminders that are ALREADY scheduled on the device — otherwise the user switches
 * the app to Hebrew, or picks a new style, and keeps getting the old wording until they happen to
 * edit the rule. Rather than three separate re-schedule paths scattered across Settings screens,
 * every one of them lands here: one effect, one key, one call to `core.reconcileNotificationCopy()`.
 *
 * Renders nothing. It lives in the tree only to observe React state (the i18n language and the
 * profile) and push it into the framework-free scheduler.
 *
 * Gated on `ready && hydrated`: before the core has loaded there is nothing to reconcile, and
 * before the profile has hydrated the values in hand are boot DEFAULTS — acting on them would
 * reconcile once with the wrong style and again a moment later with the real one.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useApp } from '@/state/AppProvider';
import { useProfile } from '@/state/ProfileProvider';

export function NotificationCopySync() {
  const { core, ready } = useApp();
  const { profile, hydrated } = useProfile();
  // `useTranslation` (not the bare i18n instance) so a language change actually re-renders this
  // component — that re-render is what makes the effect below fire.
  const { i18n } = useTranslation();
  const language = i18n.language;
  const { addressForm, communicationProfile } = profile;

  useEffect(() => {
    if (!ready || !hydrated) return;
    core.reconcileNotificationCopy();
    // `core` is stable for the app's lifetime; the three copy inputs are the real trigger. The
    // first run after both gates open is intentional: it re-resolves whatever was scheduled in a
    // previous session against the preferences this session actually booted with.
  }, [core, ready, hydrated, language, addressForm, communicationProfile]);

  return null;
}
