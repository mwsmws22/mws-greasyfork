import type { QuizState } from '../bunpro/quiz-state';
import { reviewKey } from '../bunpro/review';

/**
 * A sentence is only ever on screen once the answer has been revealed as
 * correct, so this doubles as the identity of whatever card is displayed.
 */
export function solvedReviewKey(state: QuizState): string | null {
  return state.isRevealing && state.isCorrect ? reviewKey(state) : null;
}
