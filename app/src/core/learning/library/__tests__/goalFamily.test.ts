/**
 * A goal family is the object that lets SEVERAL Journeys exist for one goal — the founder's rule
 * that a differing Milestone arc is a different Journey, not a version of one, needs somewhere for
 * those Journeys to sit together.
 *
 * These tests hold two lines. First, the same content guard rails a definition gets: a family is
 * authored, and its mistakes are silent ones (a member pointing at a Journey nobody wrote, a default
 * that is not a member). Second — and this is the point of the refactor underneath it — choosing a
 * Journey and choosing a version go through the SAME ladder, so a user who was already placed by
 * their profile is not asked again at either level.
 */
import { validateAuthoredArc, type AuthoredArc } from '../authoredArc';
import type { JourneyDefinition } from '../journeyDefinition';
import {
  journeyQuestionsFor,
  selectJourney,
  validateGoalFamily,
  type GoalFamily,
} from '../goalFamily';

const arc = (id: string): AuthoredArc => ({
  milestones: [{ id: 'm0', title: `${id} stage`, titleKey: `test.${id}.m0` }],
  steps: [
    {
      id: 's0',
      milestoneId: 'm0',
      title: `${id} step`,
      titleKey: `test.${id}.s0`,
      estimatedMinutes: 20,
      difficulty: 2,
    },
  ],
});

const journey = (id: string): JourneyDefinition => ({
  id,
  version: 1,
  shape: 'process',
  domain: 'career',
  axes: [],
  variants: [
    {
      id: 'only',
      essence: `The ${id} arc.`,
      essenceKey: `test.${id}.essence`,
      position: {},
      build: { kind: 'process', arc: arc(id) },
    },
  ],
  defaultVariantId: 'only',
});

const JOURNEYS = [journey('clarity'), journey('action'), journey('hybrid')];
const known = (id: string) => JOURNEYS.find((j) => j.id === id);

const FAMILY: GoalFamily = {
  id: 'career.next_step',
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'FIND_DIRECTION',
  bottleneck: 'DIRECTION_EVIDENCE_GAP',
  goal: 'Understand what my next career move is',
  goalKey: 'test.family.goal',
  axes: [
    {
      id: 'certainty',
      questionKey: 'test.family.axis.question',
      values: [
        { id: 'clarityFirst', labelKey: 'test.family.axis.clarity' },
        { id: 'actionFirst', labelKey: 'test.family.axis.action' },
        { id: 'both', labelKey: 'test.family.axis.both' },
      ],
      answeredByProfile: { clarityFirst: 'clarityFirst', actionFirst: 'actionFirst' },
    },
  ],
  members: [
    { id: 'clarity', position: { certainty: ['clarityFirst'] } },
    { id: 'action', position: { certainty: ['actionFirst'] }, profileSignals: { gentleNow: 1 } },
    { id: 'hybrid', position: { certainty: ['both'] } },
  ],
  defaultDefinitionId: 'hybrid',
};

describe('content mistakes that would otherwise ship silently', () => {
  it('accepts a well-formed family, whose members are all real Journeys', () => {
    expect(validateGoalFamily(FAMILY, known)).toEqual([]);
    for (const definition of JOURNEYS) {
      const build = definition.variants[0].build;
      expect(build.kind === 'process' ? validateAuthoredArc(build.arc) : []).toEqual([]);
    }
  });

  it('rejects a member that points at a Journey nobody wrote', () => {
    const family = { ...FAMILY, members: [...FAMILY.members, { id: 'ghost', position: {} }] };
    expect(validateGoalFamily(family, known).join(' ')).toContain('no such Journey');
  });

  it('rejects a default that is not a member, and a family of one', () => {
    expect(validateGoalFamily({ ...FAMILY, defaultDefinitionId: 'clarity2' }, known).join(' ')).toContain(
      'defaultDefinitionId names no member',
    );
    expect(validateGoalFamily({ ...FAMILY, members: [FAMILY.members[0]], defaultDefinitionId: 'clarity' }, known).join(' ')).toContain(
      'fewer than two members',
    );
  });

  it('rejects a position on an axis the family never declared, and an unknown value', () => {
    const undeclared = { ...FAMILY, members: [{ id: 'clarity', position: { pace: ['fast'] } }, FAMILY.members[1]] };
    expect(validateGoalFamily(undeclared, known).join(' ')).toContain('undeclared axis pace');
    const unknown = { ...FAMILY, members: [{ id: 'clarity', position: { certainty: ['someday'] } }, FAMILY.members[1]] };
    expect(validateGoalFamily(unknown, known).join(' ')).toContain('unknown value someday');
  });

  it('rejects a member whose Journey has the wrong shape for the family', () => {
    const recurringJourney: JourneyDefinition = { ...journey('clarity'), shape: 'recurring' };
    const lookup = (id: string) => (id === 'clarity' ? recurringJourney : known(id));
    expect(validateGoalFamily(FAMILY, lookup).join(' ')).toContain('wrong shape');
  });
});

describe('choosing which Journey of the family', () => {
  it('asks its question when nothing places the user, and does not ask once the profile does', () => {
    expect(journeyQuestionsFor(FAMILY).map((q) => q.axisId)).toEqual(['certainty']);
    expect(journeyQuestionsFor(FAMILY, { signals: ['clarityFirst'] })).toEqual([]);
  });

  it('honours an answer, and says which one decided it', () => {
    const choice = selectJourney(FAMILY, { answers: { certainty: 'actionFirst' } });
    expect(choice.definitionId).toBe('action');
    expect(choice.via).toBe('answer');
    expect(choice.signal).toBe('certainty:actionFirst');
  });

  it('reads the profile when there is no answer, without asking again', () => {
    const choice = selectJourney(FAMILY, { signals: ['clarityFirst'] });
    expect(choice.definitionId).toBe('clarity');
    expect(choice.via).toBe('profile');
    expect(choice.signal).toBe('clarityFirst');
  });

  it('falls back to the named default and says so, rather than dressing a cold start as a match', () => {
    const choice = selectJourney(FAMILY);
    expect(choice.definitionId).toBe('hybrid');
    expect(choice.via).toBe('default');
    expect(choice.signal).toBe('default');
  });

  it('lets a rating break a tie the answers and the profile could not', () => {
    const choice = selectJourney(FAMILY, { ratings: { clarity: 0.8, hybrid: 0.2 } });
    expect(choice.definitionId).toBe('clarity');
    expect(choice.via).toBe('rating');
  });

  it('never returns nothing when the answer contradicts every member', () => {
    const choice = selectJourney(FAMILY, { answers: { certainty: 'unheard-of' } });
    expect(FAMILY.members.some((m) => m.id === choice.definitionId)).toBe(true);
  });
});
