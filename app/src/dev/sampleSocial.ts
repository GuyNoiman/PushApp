/**
 * DEV-ONLY sample social data (2026-08-07). Until the real social backend is wired
 * and populated, screens fall back to THIS sample so the founder can see how the
 * people surfaces look *with* data. Purely presentational — never persisted, never
 * sent anywhere. Import it and use it ONLY when the real social lists are empty
 * (see `useSampleWhenEmpty` helper), so a real user with real Allies never sees it.
 *
 * Split into the two Circle tabs the design calls for:
 *   - `needHelp`      — friends who've gone quiet / are at risk → a Nudge (amber).
 *   - `deservePraise` — friends who just moved forward → a Cheer (turquoise).
 */

export interface SampleFriend {
  id: string;
  name: string;
  /** 1–2 letter monogram for the avatar. */
  initials: string;
  /** A short, human status line (no AI-isms, no em-dashes). */
  status: string;
  /** The shared Journey this relates to. */
  journey: string;
}

export const sampleNeedHelp: SampleFriend[] = [
  { id: 'nh1', name: 'Ronit Levi', initials: 'RL', status: "Quiet for 4 days on 'Run 5km'", journey: 'Run 5km' },
  { id: 'nh2', name: 'Amir Cohen', initials: 'AC', status: 'Missed 2 steps this week', journey: 'Sleep better' },
  { id: 'nh3', name: 'Dana Peretz', initials: 'DP', status: 'Slipped after a strong start', journey: 'Daily journaling' },
];

export const sampleDeservePraise: SampleFriend[] = [
  { id: 'dp1', name: 'Yael Bar', initials: 'YB', status: 'Just reached Milestone 2 on Stay Active', journey: 'Stay Active' },
  { id: 'dp2', name: 'Noa Shani', initials: 'NS', status: 'Kept a 10 day streak going', journey: 'Morning runs' },
  { id: 'dp3', name: 'Tom Alon', initials: 'TA', status: 'Finished their first full week', journey: 'Push-Up Progression' },
];

/** Pending connection requests + recent activity, for the Inbox sample. */
export interface SampleInboxItem {
  id: string;
  name: string;
  initials: string;
  kind: 'request' | 'cheer' | 'nudge';
  text: string;
  when: string;
}

export const sampleInbox: SampleInboxItem[] = [
  { id: 'ib1', name: 'Maya Gold', initials: 'MG', kind: 'request', text: 'wants to be your Ally', when: '2h' },
  { id: 'ib2', name: 'Yael Bar', initials: 'YB', kind: 'cheer', text: 'cheered your Run 5km step', when: '5h' },
  { id: 'ib3', name: 'Amir Cohen', initials: 'AC', kind: 'nudge', text: 'nudged you to keep going', when: '1d' },
];

/** True when the real list is empty and we should show the sample instead. */
export function useSampleWhenEmpty<T>(real: readonly T[], sample: T[]): T[] {
  return real.length > 0 ? [...real] : sample;
}
