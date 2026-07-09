/**
 * Representative sample content for the Explore discovery surface (v14 mockup
 * screen-04). There is no marketplace backend yet — these plausible entries exist
 * purely for design fidelity, so the carousels have real-looking shape and rhythm.
 * When the marketplace ships, this file is replaced by live data; nothing here is
 * business logic (Engineering Bible §19).
 */
import type { BuddyStage } from '@/core/types/domain';
import type { ThemeColor } from '@/constants/theme';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** An `accent` names a role-mapped colour token (Design System §2, colour = meaning). */
type Accent = Extract<ThemeColor, 'teal' | 'coral' | 'purple' | 'gold' | 'pink' | 'blue'>;

/** "For you" — text-first Journey tiles. A slim top image band (a decorative icon
 *  for now) + name + duration + step count. */
export type JourneyPick = {
  id: string;
  name: string;
  duration: string;
  steps: string;
  /** Decorative band icon (stands in for the creator's uploaded cover image). */
  icon: IoniconName;
  /** Role colour for the band + icon. */
  accent: Accent;
};

export const forYou: JourneyPick[] = [
  { id: 'j-couch10k', name: 'Couch to 10k', duration: '6 weeks', steps: '24 steps', icon: 'flame', accent: 'teal' },
  { id: 'j-sleep', name: 'Sleep better', duration: '21 days', steps: 'Daily', icon: 'moon', accent: 'purple' },
  { id: 'j-savings', name: 'First $1k saved', duration: '3 months', steps: '12 steps', icon: 'wallet', accent: 'gold' },
  { id: 'j-mindful', name: 'Calm mornings', duration: '4 weeks', steps: '28 steps', icon: 'leaf', accent: 'pink' },
  { id: 'j-strength', name: 'Push-up hero', duration: '30 days', steps: 'Daily', icon: 'barbell', accent: 'coral' },
];

/** "Top creators" — round buddy-avatar cards. Their own Buddy + level badge, the
 *  @username, a registrations count ("42k joined"), and a journeys-created count. */
export type Creator = {
  id: string;
  handle: string;
  /** Their own Buddy's stage, for the avatar. */
  stage: BuddyStage;
  level: number;
  joined: string;
  journeys: string;
};

export const topCreators: Creator[] = [
  { id: 'c-maya', handle: '@maya.runs', stage: 'companion', level: 24, joined: '42k joined', journeys: '18 journeys' },
  { id: 'c-dan', handle: '@coach.dan', stage: 'sprout', level: 17, joined: '27k joined', journeys: '9 journeys' },
  { id: 'c-lena', handle: '@lena.calm', stage: 'guardian', level: 31, joined: '55k joined', journeys: '22 journeys' },
  { id: 'c-theo', handle: '@theo.money', stage: 'hatchling', level: 12, joined: '14k joined', journeys: '6 journeys' },
];

/** "From brands" — wide cards: logo mark + brand name + a featured Journey name. */
export type BrandPack = {
  id: string;
  brand: string;
  journey: string;
  /** Emoji stands in for the brand's uploaded logo. */
  logo: string;
  accent: Accent;
};

export const fromBrands: BrandPack[] = [
  { id: 'b-nike', brand: 'Stride Co.', journey: 'Run your first 5k', logo: '👟', accent: 'coral' },
  { id: 'b-headspace', brand: 'StillMind', journey: '10 days of calm', logo: '🧘', accent: 'purple' },
  { id: 'b-nourish', brand: 'Nourish', journey: 'Eat the rainbow', logo: '🥗', accent: 'teal' },
  { id: 'b-finte', brand: 'Sprout Bank', journey: 'Budget in 2 weeks', logo: '🌱', accent: 'gold' },
];
