import { fillAnswerInput, findAnswerInput } from '../../bunpro/quiz-dom';
import type { QuizState } from '../../bunpro/quiz-state';

/** Left Arrow only re-opens a locked wrong typed answer, not a pass or More Info. */
export function shouldEnterEditOnLeft(state: QuizState): boolean {
  return (
    state.inputMode === 'manual' &&
    state.isPostAttempt &&
    !state.isCorrect &&
    !state.isShowingInfo
  );
}

export function caretIndexAfterLefts(text: string, leftCount: number): number {
  return Math.max(0, text.length - leftCount);
}

export type PendingRestoreAction = 'wait' | 'apply' | 'forget';

/** A leftover restore must not paint the previous guess onto the next question. */
export function pendingRestoreAction(
  pendingReview: string | null,
  currentReview: string | null,
  isPostAttempt: boolean,
): PendingRestoreAction {
  if (pendingReview !== null && currentReview !== null && pendingReview !== currentReview) {
    return 'forget';
  }
  if (isPostAttempt || currentReview === null) {
    return 'wait';
  }
  return 'apply';
}

/** Undo puts the guess back minus a character; this writes the full text and walks the caret. */
export function restoreWrongAnswer(text: string, leftCount: number): void {
  fillAnswerInput(text);
  const input = findAnswerInput();
  if (!input) {
    return;
  }
  const caret = caretIndexAfterLefts(text, leftCount);
  input.focus({ preventScroll: true });
  input.setSelectionRange(caret, caret);
}
