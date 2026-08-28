/**
 * The service registry of PRD §6.3 — configuration, so a service can be added
 * without redesigning the page.
 *
 * Every entry declares what would MEASURE it (`signal`). An entry with a null
 * signal is not an omission to be tidied up later; it is the page stating, in
 * data, that this service exists and nothing checks it yet. Those render gray,
 * and the count of them appears in the banner.
 */

export const SERVICES = Object.freeze([
  {
    id: 'app',
    name: 'Mobile application',
    signal: null,
    metric: 'Installations without a blocking failure (24h)',
    blockedBy: 'Needs crash data. Sentry is wired; §6.2 also needs an install count, which nothing reports yet.',
  },
  {
    id: 'db',
    name: 'Supabase database / API',
    signal: 'db',
    metric: 'Reachability and round-trip latency of one authenticated read',
  },
  {
    id: 'auth',
    name: 'Authentication',
    signal: 'auth',
    metric: 'The console’s own session refresh — if it works, auth is up',
  },
  {
    id: 'storage',
    name: 'Storage',
    signal: null,
    metric: 'Used capacity, failed upload/open rate',
    blockedBy: 'No attachment has ever been written; the bucket has no traffic to measure.',
  },
  {
    id: 'coach',
    name: 'Coach / AI gateway',
    signal: 'coach',
    metric: 'Cumulative usage, and how many accounts used it in 24h',
  },
  {
    id: 'e2ee',
    name: 'Encrypted messaging transport',
    signal: null,
    metric: 'Delivery and decryption failure rate',
    blockedBy: 'A failure rate needs a counter, and no counter is written. Ciphertext is not a health signal.',
  },
  {
    id: 'push',
    name: 'Notification delivery',
    signal: null,
    metric: 'Delivery rate',
    blockedBy: 'Reminders are local notifications on the device. There is no remote push to measure yet.',
  },
  {
    id: 'updates',
    name: 'Expo / EAS updates',
    signal: 'updates',
    metric: 'Most recent published update, from the version registry',
  },
  {
    id: 'backups',
    name: 'Backups and recovery checks',
    signal: null,
    metric: 'Last successful backup, last restore test',
    blockedBy: 'Supabase’s free tier takes daily backups; nothing here reads their status, and no restore has been tested.',
  },
  {
    id: 'oauth',
    name: 'Apple and Google sign-in',
    signal: null,
    metric: 'Failure rate of the provider handshake',
    blockedBy: 'A failed handshake never reaches a table. Wiring it is a client change, not a query.',
  },
  {
    id: 'jobs',
    name: 'Scheduled jobs',
    signal: null,
    metric: 'Last run and outcome of each pg_cron job',
    blockedBy: 'cron.job_run_details is not readable through the API by an ordinary role.',
  },
  {
    id: 'kpis',
    name: 'KPI stream',
    signal: 'kpis',
    metric: 'Most recent event accepted',
  },
  {
    id: 'cost',
    name: 'Capacity and cost',
    signal: null,
    metric: 'Free-tier headroom across Supabase, EAS and Sentry',
    blockedBy: 'Three vendors’ quota APIs, none of them wired. Today this is checked by a person.',
  },
]);
