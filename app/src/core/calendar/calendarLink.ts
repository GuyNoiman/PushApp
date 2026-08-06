/**
 * Zero-permission add-to-calendar helper (Miss-Recovery slice, part of the "Forgot"
 * bundle). It builds a Google Calendar "create event" URL and an .ics document from
 * a Step's title + a chosen time — the USER taps to create the event themselves, so
 * the app needs NO calendar-write permission (PRD §5 zero-permission principle).
 *
 * Pure TS — no `expo-calendar`, no permission, no vendor import. The UI opens the
 * URL via expo-linking (the vendor import lives in the component, not core).
 *
 * PRIVACY: built ONLY from the Step title + time the user is already looking at. It
 * carries no reason, no `note`, and no `why` — nothing beyond what the user is
 * scheduling. It writes nothing off-device; opening the link is the user's action.
 */
import type { Step } from '../types/domain';

export interface CalendarLink {
  /** A Google Calendar "create event" URL (opens in the browser/app; no permission). */
  googleUrl: string;
  /** An RFC-5545 .ics document the user can add to any calendar app. */
  ics: string;
}

/** Fallback event length (minutes) when a Step has no estimatedDuration. */
const DEFAULT_DURATION_MIN = 30;

/** Build a calendar link + .ics for a Step at the chosen start time (epoch ms). */
export function buildCalendarLink(step: Step, when: number): CalendarLink {
  const durationMin = step.estimatedDuration ?? DEFAULT_DURATION_MIN;
  const start = when;
  const end = when + durationMin * 60 * 1000;

  const title = step.title;
  const details = step.description ?? '';

  const dates = `${formatUtc(start)}/${formatUtc(end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
  });
  if (details) params.set('details', details);
  const googleUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PushApp//Miss-Recovery//EN',
    'BEGIN:VEVENT',
    `UID:${step.id}@pushapp`,
    `DTSTAMP:${formatUtc(Date.now())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    ...(details ? [`DESCRIPTION:${escapeIcs(details)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return { googleUrl, ics };
}

/** Format an epoch ms as a UTC basic-format timestamp (YYYYMMDDTHHMMSSZ). */
function formatUtc(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

/** Escape the RFC-5545 special characters in a free-text ics value. */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
