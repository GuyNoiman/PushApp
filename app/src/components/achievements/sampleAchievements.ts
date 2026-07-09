/**
 * Sample Achievements — DESIGN PLACEHOLDER DATA (v14 mockup fidelity).
 *
 * There is NO achievements engine yet (see 04_Product/UX/Achievements_Screen.md).
 * This file exists purely so the Achievements wall and its detail sheet render with
 * representative content matching the finalized mockup. When the real engine lands,
 * these shapes should be replaced by an engine-computed view model and this file
 * deleted. Do NOT wire product logic against it.
 */

/** A predefined trophy/medal the user can earn (identity marker, not currency). */
export interface SampleAchievement {
  id: string;
  /** Short display name shown under the medal. */
  name: string;
  /** The unlock condition, in plain language (also the detail-sheet body). */
  condition: string;
  /** Category tab this medal belongs to. */
  category: 'journeys' | 'social';
  /** Progress toward the target (>= target ⇒ unlocked). */
  progress: number;
  /** Target needed to unlock. */
  target: number;
  /** Emoji glyph shown on the medal face when unlocked. */
  glyph: string;
  /** The reward granted on unlock — shown in the detail sheet. */
  reward: string;
}

/** True once earned. Derived, not stored — keeps the sample data honest. */
export function isUnlocked(a: SampleAchievement): boolean {
  return a.progress >= a.target;
}

/** Remaining toward unlock (never negative). */
export function remaining(a: SampleAchievement): number {
  return Math.max(0, a.target - a.progress);
}

export const SAMPLE_ACHIEVEMENTS: SampleAchievement[] = [
  {
    id: 'runner',
    name: 'Runner',
    condition: 'Finish a run Journey',
    category: 'journeys',
    progress: 1,
    target: 1,
    glyph: '🔥',
    reward: '200 coins',
  },
  {
    id: 'helper',
    name: 'Helper',
    condition: 'Support 10 friends',
    category: 'social',
    progress: 10,
    target: 10,
    glyph: '🤝',
    reward: '250 coins',
  },
  {
    id: 'first-step',
    name: 'First step',
    condition: 'Do a Starter Step',
    category: 'journeys',
    progress: 1,
    target: 1,
    glyph: '✓',
    reward: '100 coins',
  },
  {
    id: 'connector',
    name: 'Connector',
    condition: 'Invite 50 friends to PushApp. Grow the circle that keeps everyone going.',
    category: 'social',
    progress: 18,
    target: 50,
    glyph: '🔗',
    reward: '500 coins + frame',
  },
  {
    id: 'streak-30',
    name: 'Streak 30',
    condition: 'Check in 30 days in a row',
    category: 'journeys',
    progress: 18,
    target: 30,
    glyph: '📅',
    reward: '400 coins',
  },
  {
    id: 'creator',
    name: 'Creator',
    condition: 'Publish a Journey',
    category: 'journeys',
    progress: 0,
    target: 1,
    glyph: '✦',
    reward: '300 coins',
  },
];
