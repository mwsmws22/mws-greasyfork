import { synonymWorthAdding } from '../../bunpro/synonyms';
import type { QuizState } from '../../bunpro/quiz-state';

/**
 * Only a wrong typed vocab translation has a synonym that is meaningful to add:
 * grammar has none, a cloze answer is a conjugation, and a correct answer is
 * already accepted.
 */
export function shouldOfferSynonym(state: QuizState): boolean {
  return (
    state.reviewable?.type === 'vocab' &&
    state.inputMode === 'manual' &&
    state.questionMode === 'translate' &&
    state.isPostAttempt &&
    !state.isCorrect &&
    synonymWorthAdding(state.submittedAnswer ?? '', state.answers)
  );
}