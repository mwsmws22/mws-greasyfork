import type { QuizState, ReviewableRef } from '../../bunpro/quiz-state';

/**
 * Sentences are fetched as soon as the term is known so the card can appear
 * in the same reveal as Bunpro's definition, instead of waiting on the API.
 */
export function termToPrefetch(state: QuizState): ReviewableRef | null {
  if (state.reviewable?.type !== 'vocab' || state.questionMode !== 'translate') {
    return null;
  }
  return state.sessionId ? state.reviewable : null;
}

/** Only after a correct reveal, and only when Bunpro itself left the slot empty. */
export function termToShow(state: QuizState, hasNativeSentence: boolean): ReviewableRef | null {
  const term = termToPrefetch(state);
  if (!term || !state.isRevealing || !state.isCorrect || hasNativeSentence) {
    return null;
  }
  return term;
}
