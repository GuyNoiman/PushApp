/**
 * Placeholder Buddy faces per evolution stage — presentational only, no art
 * assets yet (POC). Shared by every Buddy surface so the look stays consistent.
 */
import type { BuddyStage } from '@/core/types/domain';

export const STAGE_FACE: Record<BuddyStage, string> = {
  egg: '🥚',
  hatchling: '🐣',
  sprout: '🌱',
  companion: '🐥',
  guardian: '🦅',
};
