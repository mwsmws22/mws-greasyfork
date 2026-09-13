import type { QuizState, ReviewableRef } from '../bunpro/quiz-state';

/** Rotation is stored per term, independently of the session it was seen in. */
export function termKey(term: ReviewableRef): string {
  return `${term.type}:${term.id}`;
}

/** The same term in a later session is a different review, and gets a new sentence. */
export function reviewKey(state: QuizState): string | null {
  const { reviewable, sessionId } = state;
  return reviewable && sessionId ? `${termKey(reviewable)}@${sessionId}` : null;
}

/**
 * A sentence is only ever on screen once the answer has been revealed as
 * correct, so this doubles as the identity of whatever card is displayed.
 */
export function solvedReviewKey(state: QuizState): string | null {
  return state.isRevealing && state.isCorrect ? reviewKey(state) : null;
}
