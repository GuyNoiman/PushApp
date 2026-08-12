/**
 * useCommunicationQuiz — the flow + persistence for the Communication Style questionnaire (PRD §5/§7).
 * Owns the answer state and the page cursor, SAVES after every page and RESUMES after a restart (PRD
 * §5), runs the conditional tie-break (PRD §7 Ties), and on Save writes the chosen style to the ONE
 * account preference in {@link ProfileProvider}. Skip/exit leaves the previously saved/default style
 * untouched — nothing is applied until Save — while in-progress work stays persisted so a later
 * re-entry RESUMES where it left off (PRD §5); only Save (or a Retake) clears it.
 *
 * The screens that consume this stay presentational (Engineering Bible §19): they render the `phase`
 * and call the actions. Scoring is the pure {@link ../core/communication/communicationProfile} module;
 * this hook only sequences it and handles I/O.
 *
 * PRIVACY (PRD §12): the questionnaire is a private adaptation preference. In-progress answers live in
 * a dedicated on-device key, cleared on Save/Retake; only the resulting style id is kept, in the
 * profile blob (exported/deleted with the account). Nothing here is social or analytics.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  breakTie,
  scoreAnswers,
  type CommunicationProfileId,
} from '@/core/communication/communicationProfile';
import {
  COMMUNICATION_EVENTS,
  COMMUNICATION_QUESTIONNAIRE_VERSION,
  orderedAnswers,
  type CommunicationAnswers,
  type CommunicationEventId,
} from '@/core/communication/questionnaire';
import { useProfile } from '@/state/ProfileProvider';

/** The on-device key holding in-progress questionnaire work (cleared on finish/skip). */
export const COMMUNICATION_QUIZ_KEY = 'pushapp.communicationQuiz';

/** Where the flow currently sits. `intro` is the standalone opener; `result` previews before Save. */
type Cursor = 'intro' | number | 'tieBreak' | 'result';

/** Persisted in-progress shape (PRD §5 resume). Never holds the final preference — that's the profile. */
interface QuizProgress {
  version: number;
  answers: CommunicationAnswers;
  cursor: Cursor;
  /** The style a `result`/`tieBreak` resolved to (a tie-break choice isn't recoverable from votes alone). */
  pendingResult?: CommunicationProfileId;
}

/** The render-ready view of the current page. */
export type CommunicationQuizPhase =
  | { kind: 'loading' }
  | { kind: 'intro' }
  | { kind: 'question'; index: number; total: number; event: CommunicationEventId }
  | { kind: 'tieBreak'; styles: CommunicationProfileId[] }
  | { kind: 'result'; styleId: CommunicationProfileId };

export interface CommunicationQuizController {
  phase: CommunicationQuizPhase;
  /** The chosen style for the current question, if any (drives selected-state). */
  answerFor: (event: CommunicationEventId) => CommunicationProfileId | undefined;
  /** Begin the six pages (from the intro). */
  start: () => void;
  /** Record a choice for the given event (does not advance — the footer's Continue does). */
  select: (event: CommunicationEventId, styleId: CommunicationProfileId) => void;
  /** Resolve the tie-break by choosing among the tied styles (PRD §7 Ties). */
  chooseTieBreak: (styleId: CommunicationProfileId) => void;
  /** Advance from the current question page (scores + branches to tie-break/result on the last page). */
  next: () => void;
  /** Step back a page (Back edits the previous answer — PRD §5). */
  back: () => void;
  /** Save the previewed result to the account preference and clear progress (PRD §8 Save). */
  save: () => void;
  /** Discard answers and restart from the first question (PRD §8 Try again). */
  retry: () => void;
  /** Discard answers and return to the standalone intro (a fresh Retake from Settings — PRD §3). */
  restart: () => void;
}

/** True for a real question-page index. */
function isQuestionIndex(cursor: Cursor): cursor is number {
  return typeof cursor === 'number';
}

export function useCommunicationQuiz(): CommunicationQuizController {
  const { setCommunicationProfile } = useProfile();
  const [ready, setReady] = useState(false);
  const [answers, setAnswers] = useState<CommunicationAnswers>({});
  const [cursor, setCursor] = useState<Cursor>('intro');
  const [pendingResult, setPendingResult] = useState<CommunicationProfileId | undefined>(undefined);

  // Load any in-progress work once so an interrupted questionnaire resumes where it left off (PRD §5).
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(COMMUNICATION_QUIZ_KEY);
        if (mounted && raw) {
          const saved = JSON.parse(raw) as Partial<QuizProgress>;
          if (saved.version === COMMUNICATION_QUESTIONNAIRE_VERSION && saved.answers && saved.cursor !== undefined) {
            setAnswers(saved.answers);
            setCursor(saved.cursor);
            setPendingResult(saved.pendingResult);
          }
        }
      } catch {
        // A read failure just means starting fresh — never crash the questionnaire.
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** Persist the whole in-progress snapshot (save-after-every-page — PRD §5). */
  const persist = useCallback((next: QuizProgress) => {
    void AsyncStorage.setItem(COMMUNICATION_QUIZ_KEY, JSON.stringify(next)).catch(() => {
      // A write failure only costs resume-across-restart — don't crash the flow.
    });
  }, []);

  /** Apply a state transition and persist it in one place (keeps state + storage in lockstep). */
  const commit = useCallback(
    (nextAnswers: CommunicationAnswers, nextCursor: Cursor, nextPending?: CommunicationProfileId) => {
      setAnswers(nextAnswers);
      setCursor(nextCursor);
      setPendingResult(nextPending);
      persist({
        version: COMMUNICATION_QUESTIONNAIRE_VERSION,
        answers: nextAnswers,
        cursor: nextCursor,
        pendingResult: nextPending,
      });
    },
    [persist],
  );

  const clearProgress = useCallback(() => {
    void AsyncStorage.removeItem(COMMUNICATION_QUIZ_KEY).catch(() => {});
  }, []);

  const start = useCallback(() => commit(answers, 0, pendingResult), [answers, pendingResult, commit]);

  const select = useCallback(
    (event: CommunicationEventId, styleId: CommunicationProfileId) => {
      commit({ ...answers, [event]: styleId }, cursor, pendingResult);
    },
    [answers, cursor, pendingResult, commit],
  );

  const next = useCallback(() => {
    if (!isQuestionIndex(cursor)) return;
    if (cursor < COMMUNICATION_EVENTS.length - 1) {
      commit(answers, cursor + 1);
      return;
    }
    // Last page: score. A clear winner goes to the preview; a tie runs the tie-break page (PRD §7).
    const score = scoreAnswers(orderedAnswers(answers));
    if (score.primary) {
      commit(answers, 'result', score.primary);
    } else {
      commit(answers, 'tieBreak');
    }
  }, [answers, cursor, commit]);

  const lastQuestion = COMMUNICATION_EVENTS.length - 1;

  const back = useCallback(() => {
    if (isQuestionIndex(cursor)) {
      commit(answers, cursor > 0 ? cursor - 1 : 'intro');
      return;
    }
    if (cursor === 'tieBreak') {
      commit(answers, lastQuestion);
      return;
    }
    if (cursor === 'result') {
      // A tie-derived result steps back to its tie-break page; a clear winner steps back to Q6.
      const tied = scoreAnswers(orderedAnswers(answers)).leaders.length > 1;
      commit(answers, tied ? 'tieBreak' : lastQuestion);
    }
  }, [answers, cursor, commit, lastQuestion]);

  const chooseTieBreak = useCallback(
    (styleId: CommunicationProfileId) => commit(answers, 'result', styleId),
    [answers, commit],
  );

  // The single resolved style shown on the result page AND written on Save — one source of truth, so
  // the preview can never diverge from what gets saved. `pendingResult` (a clear winner or a tie-break
  // choice) wins; otherwise fall back to the deterministic Warm-first tie-break over the tally, which
  // also covers a corrupted resume (cursor==='result' with no pendingResult).
  const resolvedResult = useMemo<CommunicationProfileId>(
    () => pendingResult ?? breakTie(scoreAnswers(orderedAnswers(answers)).leaders),
    [pendingResult, answers],
  );

  const save = useCallback(() => {
    setCommunicationProfile(resolvedResult);
    clearProgress();
  }, [resolvedResult, setCommunicationProfile, clearProgress]);

  const retry = useCallback(() => commit({}, 0, undefined), [commit]);

  const restart = useCallback(() => commit({}, 'intro', undefined), [commit]);

  const phase = useMemo<CommunicationQuizPhase>(() => {
    if (!ready) return { kind: 'loading' };
    if (cursor === 'intro') return { kind: 'intro' };
    if (cursor === 'result') {
      return { kind: 'result', styleId: resolvedResult };
    }
    if (cursor === 'tieBreak') {
      return { kind: 'tieBreak', styles: scoreAnswers(orderedAnswers(answers)).leaders };
    }
    return {
      kind: 'question',
      index: cursor,
      total: COMMUNICATION_EVENTS.length,
      event: COMMUNICATION_EVENTS[cursor],
    };
  }, [ready, cursor, resolvedResult, answers]);

  const answerFor = useCallback((event: CommunicationEventId) => answers[event], [answers]);

  return { phase, answerFor, start, select, chooseTieBreak, next, back, save, retry, restart };
}
