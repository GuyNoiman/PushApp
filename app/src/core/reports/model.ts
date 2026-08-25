/**
 * A user report — what a person chose to tell us, and the small set of facts that go with it.
 *
 * Built to `04_Product/PRD/Operational_Monitoring_Admin_Console_PRD.md` §8.
 *
 * ── WHY THIS IS THE FIRST THING BUILT, BEFORE ANY CRASH SDK ────────────────────────────────────
 *
 * Because a crash tells you that something threw, and a person tells you what they were trying to
 * do. The space-bar bug of 2026-08-25 is the case in point: nothing threw, no monitoring would have
 * caught it, and it reached us because the founder typed it into a chat. Anybody else would simply
 * have decided the app was broken and stopped.
 *
 * ── THE LINE THIS MODULE HOLDS ─────────────────────────────────────────────────────────────────
 *
 * §11.4 lists what may never ride telemetry, and the way to guarantee most of it is to have nowhere
 * to put it. So: **the description is the only free text here, and it exists because somebody chose
 * to write it.** Everything else is an allowlist ({@link ReportDiagnostics}) whose every field is
 * named in §8.3 — a version, a platform, an id. There is no `extra`, no `context`, no `state`, and
 * nothing that reads the app's own data. A future call site cannot attach a Journey title, because
 * the type has no field it would fit in.
 *
 * Pure TypeScript — no React, no storage, no clock reads, no vendor.
 */

/**
 * The categories (§8.2), minus one. `payment` is in the PRD as "Payment problem **when billing
 * exists**", and billing does not — offering it would invite reports about something the product
 * cannot yet do to anybody.
 */
export const REPORT_CATEGORIES = [
  'not_working',
  'account',
  'content',
  'other_user',
  'suggestion',
  'feedback',
  'other',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/** How long a description may be. Long enough to explain something; short enough to stay a report. */
export const DESCRIPTION_MAX_CHARS = 2000;
/** Below this it is not yet a report — and saying so beats sending "asdf" to a person to answer. */
export const DESCRIPTION_MIN_CHARS = 10;

/**
 * The facts that travel WITH the report. Every one of them is named in §8.3.
 *
 * Note what is absent and must stay absent: no user id (the row carries it separately, and only when
 * they are signed in), no device identifier that survives a reinstall, no route parameters, no
 * screen state, no free text of any kind.
 */
export interface ReportDiagnostics {
  appVersion?: string;
  build?: string;
  /** The over-the-air update actually running — the answer to "which copy of the app is this". */
  runtimeId?: string;
  platform?: 'ios' | 'android' | 'web';
  osVersion?: string;
  locale?: string;
  /** Where the report was started from, as a closed value — never a route with parameters. */
  source?: ReportSource;
}

/** The entry points (§8.1). A closed set, because "source" is exactly the kind of field that grows. */
export const REPORT_SOURCES = ['settings', 'errorState', 'profile'] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

export interface ReportDraft {
  category: ReportCategory;
  description: string;
  /** Where a reply goes. Prefilled from the account when there is one; always editable (§8.3). */
  contactEmail?: string;
}

export type ReportProblem = 'tooShort' | 'noCategory' | 'badEmail';

/**
 * Is this sendable, and if not, what is missing?
 *
 * The email is OPTIONAL and only validated when present: somebody who wants to tell us something and
 * not be written back to is allowed to do exactly that, and refusing their report until they hand
 * over an address would be collecting a contact detail in exchange for listening.
 */
export function checkReport(draft: ReportDraft): ReportProblem[] {
  const problems: ReportProblem[] = [];
  if (!REPORT_CATEGORIES.includes(draft.category)) problems.push('noCategory');
  if (draft.description.trim().length < DESCRIPTION_MIN_CHARS) problems.push('tooShort');
  const email = draft.contactEmail?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('badEmail');
  return problems;
}

/** Trim to what is sendable: edges cleaned, length capped. The wording itself is never altered. */
export function sendableDescription(text: string): string {
  return text.trim().slice(0, DESCRIPTION_MAX_CHARS);
}
