/**
 * motivationCopy — the one impure adapter that gives a selected motivation card its words, in the
 * user's language, form of address (D31) and communication style (D84).
 *
 * Same shape as {@link ../notify/reminderCopy}: the engines that DECIDE stay pure and i18n-free, and
 * exactly one file turns a decision into a sentence. Because the words are resolved at render time
 * rather than baked when the item was chosen, changing language or style updates a card that is
 * already on screen.
 *
 * The style layer is the notifications' own (`key_<styleId>` with the base as fallback), which is
 * why feedback attaches to the item's MEANING rather than to one of its four wordings — otherwise
 * every item would need four times the evidence to learn anything.
 *
 * PRIVACY: the Journey title is interpolated into the card (owner content, on the owner's screen,
 * in-app only — this slice sends no notification). It is never written to the feedback log.
 */
import i18n from '../../i18n';
import { addressContext } from '../../i18n/addressForm';
import { getCommunicationProfile } from '../communication/communicationProfile';
import type { MotivationDoor, MotivationSelection } from './types';

const NS = 'motivation';

/** A card, ready to render. */
export interface MotivationCard {
  itemId: string;
  version: number;
  theme: string;
  title: string;
  body: string;
  /** Where the optional door leads, when the item has one. */
  door?: MotivationDoor;
  /** The Journey a `journey` door opens. */
  journeyId?: string;
}

/**
 * Give a selection its words, or `null` when it cannot be phrased — in which case the caller shows
 * nothing rather than an empty card.
 */
export function buildMotivationCard(selection: MotivationSelection | null): MotivationCard | null {
  if (!selection) return null;
  const { item, facts } = selection;

  const styleId = getCommunicationProfile();
  const tone = styleId ? `_${styleId}` : '';
  const options = {
    ns: NS,
    context: addressContext(),
    stepsDoneTotal: facts.stepsDoneTotal,
    stepsDoneThisWeek: facts.stepsDoneThisWeek,
    streakDays: facts.streakDays,
    daysMoving: facts.daysMoving,
    journeyProgressPct: facts.journeyProgressPct,
    stepsToMilestone: facts.stepsToMilestone,
    daysSinceLastDone: facts.daysSinceLastDone,
    journeyTitle: facts.journeyTitle,
  };

  const title = i18n.t([`${item.id}.title${tone}`, `${item.id}.title`], options);
  const body = i18n.t([`${item.id}.body${tone}`, `${item.id}.body`], options);
  if (!title.trim() || !body.trim()) return null;

  // A `journey` door with no Journey behind it would open nowhere; the card keeps its words and
  // loses the door, rather than being dropped over a link.
  const door = item.door === 'journey' && !facts.journeyId ? undefined : item.door;

  return {
    itemId: item.id,
    version: item.version,
    theme: item.theme,
    title,
    body,
    ...(door ? { door } : {}),
    ...(facts.journeyId ? { journeyId: facts.journeyId } : {}),
  };
}
