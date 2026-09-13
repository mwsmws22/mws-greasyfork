import type { QuizState, ReviewableRef } from './quiz-state';

/** Anything stored per term is stored independently of the session it was seen in. */
export function termKey(term: ReviewableRef): string {
  return `${term.type}:${term.id}`;
}

/** The same term in a later session is a different review. */
export function reviewKey(state: QuizState): string | null {
  const { reviewable, sessionId } = state;
  return reviewable && sessionId ? `${termKey(reviewable)}@${sessionId}` : null;
}
