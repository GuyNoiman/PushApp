/**
 * CareerConsultation — the deterministic contract between the Coach and the Career Expert.
 *
 * The Coach remains the only conversational actor. This module receives closed, purpose-bound
 * signals only; it never receives a transcript, free text, identity, another Dream/Journey, or
 * social data. It returns structured judgement and reason codes, never user-facing copy.
 */
import {
  APPLY_NO_RESPONSE,
  nextQuestion,
  outcomeOf,
  type CareerDiagnosisAnswers,
  type CareerDiagnosisQuestion,
  type CareerKnownSignals,
  type UnresolvedReason,
} from './diagnosis';
import { goalFamilyForDiagnosis, journeyDefinition } from '../../library/definitions';
import { journeyQuestionsFor, selectJourney, type GoalFamily } from '../../library/goalFamily';
import type { JourneyDefinition } from '../../library/journeyDefinition';
import type { MatchingProfileSignalId } from '../../library/matchApproach';
import {
  candidatesAmong,
  placeOn,
  type AxisQuestion,
  type SelectionContext,
} from '../../library/selectable';

export interface CareerConsultationInput {
  /** Versioned so stored closed answers can be migrated deliberately. */
  schemaVersion: 1;
  knownSignals?: CareerKnownSignals;
  diagnosisAnswers?: CareerDiagnosisAnswers;
  /** Explicit answers to the chosen goal family's discriminating axes. */
  familyAnswers?: SelectionContext['answers'];
  /** Coarse profile ids, most relevant first. No raw profile fields or prose. */
  profileSignals?: readonly MatchingProfileSignalId[];
  /** Aggregate outcome evidence only; never a person-level history. */
  ratings?: SelectionContext['ratings'];
}

export type CareerInformationRequest =
  | { kind: 'diagnosis'; question: CareerDiagnosisQuestion }
  | { kind: 'journey_fit'; familyId: string; question: AxisQuestion };

export type CareerRecommendationReason =
  | { kind: 'explicit_answer'; signal: string }
  | { kind: 'profile_fit'; signal: string }
  | { kind: 'eligible_for_diagnosis' };

export interface CareerJourneyRecommendation {
  definitionId: string;
  familyId: string;
  reason: CareerRecommendationReason;
}

export type CareerNoMatchReason =
  | 'unresolved_diagnosis'
  | 'missing_authored_family'
  | 'missing_journey_content';

export type CareerConsultationResult =
  | { kind: 'needs_information'; request: CareerInformationRequest }
  | {
      kind: 'recommendations';
      items: CareerJourneyRecommendation[];
      /** Present only when evidence makes one option materially more relevant. */
      recommendedDefinitionId?: string;
      /** One eligible Journey removes the menu, but does not activate/start the Journey. */
      autoSelectedDefinitionId?: string;
    }
  | {
      kind: 'no_match';
      reason: CareerNoMatchReason;
      unresolvedReason?: UnresolvedReason;
      /** Remove this branch when the Journey Creator Expert is connected. */
      temporaryUntil: 'journey_creator_expert';
    };

export interface CareerConsultationDependencies {
  familyForDiagnosis: (domain: string, subtype: string, bottleneck: string) => GoalFamily | undefined;
  definitionById: (id: string) => JourneyDefinition | undefined;
}

const DEFAULT_DEPENDENCIES: CareerConsultationDependencies = {
  familyForDiagnosis: goalFamilyForDiagnosis,
  definitionById: journeyDefinition,
};

/**
 * Consult the Career Expert for the one fully authored APPLY_NO_RESPONSE vertical.
 * Additional Career trees can adopt the same contract without changing the Coach boundary.
 */
export function consultCareer(
  input: CareerConsultationInput,
  dependencies: CareerConsultationDependencies = DEFAULT_DEPENDENCIES,
): CareerConsultationResult {
  const knownSignals = input.knownSignals ?? {};
  const diagnosisAnswers = input.diagnosisAnswers ?? {};
  const missingDiagnosis = nextQuestion(APPLY_NO_RESPONSE, diagnosisAnswers, knownSignals);
  if (missingDiagnosis) {
    return { kind: 'needs_information', request: { kind: 'diagnosis', question: missingDiagnosis } };
  }

  const diagnosis = outcomeOf(APPLY_NO_RESPONSE, diagnosisAnswers, knownSignals);
  if (!diagnosis || diagnosis.kind === 'unresolved') {
    return {
      kind: 'no_match',
      reason: 'unresolved_diagnosis',
      unresolvedReason: diagnosis?.kind === 'unresolved' ? diagnosis.reason : undefined,
      temporaryUntil: 'journey_creator_expert',
    };
  }

  const family = dependencies.familyForDiagnosis('career', diagnosis.subtype, diagnosis.bottleneck);
  if (!family) {
    return {
      kind: 'no_match',
      reason: 'missing_authored_family',
      temporaryUntil: 'journey_creator_expert',
    };
  }

  const context: SelectionContext = {
    answers: input.familyAnswers,
    signals: input.profileSignals,
    ratings: input.ratings,
  };
  const missingFit = journeyQuestionsFor(family, context)[0];
  if (missingFit) {
    return {
      kind: 'needs_information',
      request: { kind: 'journey_fit', familyId: family.id, question: missingFit },
    };
  }

  const placements = placeOn(family.axes, context);
  const candidates = candidatesAmong(family.axes, family.members, placements).filter((member) =>
    Boolean(dependencies.definitionById(member.id)),
  );
  if (candidates.length === 0) {
    return {
      kind: 'no_match',
      reason: 'missing_journey_content',
      temporaryUntil: 'journey_creator_expert',
    };
  }

  const choice = selectJourney(family, context);
  const strongChoice = choice.via === 'answer' || choice.via === 'profile';
  const reason: CareerRecommendationReason =
    choice.via === 'answer'
      ? { kind: 'explicit_answer', signal: choice.signal }
      : choice.via === 'profile'
        ? { kind: 'profile_fit', signal: choice.signal }
        : { kind: 'eligible_for_diagnosis' };
  const items = candidates.slice(0, 3).map((candidate) => ({
    definitionId: candidate.id,
    familyId: family.id,
    reason: candidate.id === choice.definitionId && strongChoice
      ? reason
      : { kind: 'eligible_for_diagnosis' } as const,
  }));

  return {
    kind: 'recommendations',
    items,
    recommendedDefinitionId: strongChoice ? choice.definitionId : undefined,
    autoSelectedDefinitionId: items.length === 1 ? items[0].definitionId : undefined,
  };
}
