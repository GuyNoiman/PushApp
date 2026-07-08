/**
 * useBuddyMoments — presentational glue that turns one-off Buddy domain events
 * into transient UI state for whichever screen is showing (Home or the Buddy
 * screen). It subscribes to the bus ONLY while the screen is focused, so a
 * backgrounded-but-still-mounted tab never fires a celebration over another tab
 * (NativeTabs keep visited screens mounted). No business logic lives here — it
 * reads events and holds local UI state (Engineering Bible §19); all reward /
 * level / stage math stays in the engines.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { AppCore } from '@/core/AppCore';
import type { EventOf } from '@/core/events/events';
import type { BuddyStage } from '@/core/types/domain';

/** The reward a check-in just earned — each screen renders its own banner line. */
export interface BuddyReaction {
  gainedXp: number;
  gainedCoins: number;
}

/** Everything the evolution reveal needs to name the new stage (no raw ids). */
export interface BuddyReveal {
  buddyName: string;
  toStage: BuddyStage;
  toStageDisplayName: string;
}

/** How long a reaction banner lingers before it auto-dismisses. */
const REACTION_DURATION_MS = 2600;

/**
 * The reward clause for a celebration banner, e.g. `+5 XP · +10 🪙`. Includes the
 * XP clause ONLY when XP was gained and the Coins clause ONLY when Coins were
 * gained — so a Coins-only reward (Missions / Login, which never grant XP) never
 * reads a misleading "+0 XP". Returns null when nothing was gained (no banner).
 */
export function formatReactionReward({ gainedXp, gainedCoins }: BuddyReaction): string | null {
  const parts: string[] = [];
  if (gainedXp > 0) parts.push(`+${gainedXp} XP`);
  if (gainedCoins > 0) parts.push(`+${gainedCoins} 🪙`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function useBuddyMoments(core: AppCore): {
  reaction: BuddyReaction | null;
  reveal: BuddyReveal | null;
  dismissReveal: () => void;
} {
  const [reaction, setReaction] = useState<BuddyReaction | null>(null);
  const [reveal, setReveal] = useState<BuddyReveal | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissReveal = useCallback(() => setReveal(null), []);

  // Subscribe only while focused: useFocusEffect cleans up on blur/unmount, so
  // exactly one (visible) screen ever reacts to a moment.
  useFocusEffect(
    useCallback(() => {
      const onReacted = (e: EventOf<'BuddyReacted'>) => {
        setReaction({ gainedXp: e.gainedXp, gainedCoins: e.gainedCoins });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setReaction(null), REACTION_DURATION_MS);
      };
      const onEvolved = (e: EventOf<'BuddyEvolved'>) => {
        // The reveal supersedes any pending reaction banner.
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        setReaction(null);
        setReveal({
          buddyName: e.buddy.name,
          toStage: e.toStage,
          toStageDisplayName: core.stageDisplayName(e.toStage),
        });
      };
      core.bus.on('BuddyReacted', onReacted);
      core.bus.on('BuddyEvolved', onEvolved);
      return () => {
        core.bus.off('BuddyReacted', onReacted);
        core.bus.off('BuddyEvolved', onEvolved);
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
      };
    }, [core]),
  );

  return { reaction, reveal, dismissReveal };
}
