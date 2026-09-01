import { consultCareer } from '../consultation';
import { goalFamilyForDiagnosis, journeyDefinition } from '../../../library/definitions';
import type { GoalFamily } from '../../../library/goalFamily';

describe('CareerConsultation', () => {
  it('asks only for the first diagnosis signal that is still missing', () => {
    const result = consultCareer({ schemaVersion: 1 });

    expect(result.kind).toBe('needs_information');
    if (result.kind !== 'needs_information') return;
    expect(result.request.kind).toBe('diagnosis');
    if (result.request.kind === 'diagnosis') {
      expect(result.request.question.signal).toBe('targetClarity');
    }
  });

  it('uses known closed signals instead of asking the user twice', () => {
    const result = consultCareer({
      schemaVersion: 1,
      knownSignals: { targetClarity: 'broad' },
    });

    expect(result.kind).toBe('needs_information');
    if (result.kind !== 'needs_information') return;
    expect(result.request.kind).toBe('journey_fit');
  });

  it('auto-selects the only eligible Journey without activating it', () => {
    const result = consultCareer({
      schemaVersion: 1,
      knownSignals: { targetClarity: 'broad' },
      familyAnswers: { targetNarrowing: 'market' },
    });

    expect(result).toMatchObject({
      kind: 'recommendations',
      recommendedDefinitionId: 'career.jobTarget.postingsFirst',
      autoSelectedDefinitionId: 'career.jobTarget.postingsFirst',
    });
    if (result.kind === 'recommendations') expect(result.items).toHaveLength(1);
  });

  it('does not force a Journey when the diagnosis is unresolved', () => {
    const result = consultCareer({
      schemaVersion: 1,
      diagnosisAnswers: {
        'career.diagnosis.applyNoResponse.target': 'clear',
        'career.diagnosis.applyNoResponse.proof': 'cannotYet',
      },
    });

    expect(result).toEqual({
      kind: 'no_match',
      reason: 'unresolved_diagnosis',
      unresolvedReason: 'capabilityGap',
      temporaryUntil: 'journey_creator_expert',
    });
  });

  it('returns missing_authored_family when the diagnosis has no catalog family', () => {
    const result = consultCareer(
      { schemaVersion: 1, knownSignals: { targetClarity: 'broad' } },
      { familyForDiagnosis: () => undefined, definitionById: journeyDefinition },
    );

    expect(result).toMatchObject({ kind: 'no_match', reason: 'missing_authored_family' });
  });

  it('returns missing_journey_content when every family member disappeared', () => {
    const result = consultCareer(
      {
        schemaVersion: 1,
        knownSignals: { targetClarity: 'broad' },
        familyAnswers: { targetNarrowing: 'market' },
      },
      { familyForDiagnosis: goalFamilyForDiagnosis, definitionById: () => undefined },
    );

    expect(result).toMatchObject({ kind: 'no_match', reason: 'missing_journey_content' });
  });

  it('caps ambiguous recommendations at three and does not invent a winner', () => {
    const real = goalFamilyForDiagnosis('career', 'LAND_ROLE', 'DIRECTION_GAP')!;
    const family: GoalFamily = {
      ...real,
      axes: [],
      members: [
        ...real.members,
        { id: 'career.jobTarget.extra', position: {} },
      ],
    };
    const result = consultCareer(
      { schemaVersion: 1, knownSignals: { targetClarity: 'broad' } },
      {
        familyForDiagnosis: () => family,
        definitionById: (id) => journeyDefinition(id) ?? journeyDefinition(real.members[0].id),
      },
    );

    expect(result.kind).toBe('recommendations');
    if (result.kind !== 'recommendations') return;
    expect(result.items).toHaveLength(3);
    expect(result.recommendedDefinitionId).toBeUndefined();
    expect(result.autoSelectedDefinitionId).toBeUndefined();
  });

  it('does not accept raw text or identity in its typed input contract', () => {
    // Compile-time privacy boundary: neither field exists on CareerConsultationInput.
    consultCareer({
      schemaVersion: 1,
      // @ts-expect-error transcripts must stay with the Coach
      transcript: 'private words',
    });
    consultCareer({
      schemaVersion: 1,
      // @ts-expect-error identity must never cross the Expert boundary
      userId: 'person@example.com',
    });
    consultCareer({
      schemaVersion: 1,
      // @ts-expect-error only the closed matching allowlist may cross this boundary
      profileSignals: ['raw words accidentally stored as a signal'],
    });
  });
});
