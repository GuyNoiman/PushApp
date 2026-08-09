/**
 * useNotificationPermission — reads the OS notification-permission status for the Settings row (E2),
 * so it reflects REALITY instead of a static "On". Re-reads whenever the screen refocuses (e.g. after
 * the user returns from the OS settings), and degrades to `undetermined` on web / unsupported
 * platforms / any failure rather than crashing. `request()` prompts once (a no-op if already decided)
 * and refreshes the status.
 *
 * Presentational glue (Engineering Bible §19): local UI state only; the scheduling engine owns the
 * actual notification lifecycle.
 */
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useState } from 'react';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export function useNotificationPermission(): {
  status: NotificationPermission;
  request: () => Promise<void>;
} {
  const [status, setStatus] = useState<NotificationPermission>('undetermined');

  const read = useCallback(async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      const s = settings.status;
      setStatus(s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'undetermined');
    } catch {
      // Web / unsupported / not-yet-configured — treat as not decided rather than crash.
      setStatus('undetermined');
    }
  }, []);

  // Re-read on focus so returning from the OS settings (or first mount) refreshes the row.
  useFocusEffect(
    useCallback(() => {
      void read();
    }, [read]),
  );

  const request = useCallback(async () => {
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // Unsupported platform — leave the status as read.
    }
    await read();
  }, [read]);

  return { status, request };
}
