import { findAnswerInput, findUndoButton, undoGradedAnswer } from '../../bunpro/quiz-dom';
import { readQuizState, watchQuizState, type QuizState } from '../../bunpro/quiz-state';
import { reviewKey } from '../../bunpro/review';
import { injectStyles } from '../../styles';
import { areKeystrokesClaimed, hasModifier } from '../../ui/keystrokes';
import type { Feature } from '../registry';
import { pendingRestoreAction, restoreWrongAnswer, shouldEnterEditOnLeft } from './edit';

const EDIT_KEY = 'ArrowLeft';

let stopWatchingQuiz: (() => void) | null = null;
let pending: { review: string | null; text: string; lefts: number } | null = null;
let restoreTimer: ReturnType<typeof setTimeout> | null = null;

export const editOnLeftFeature: Feature = {
  id: 'edit-on-left',
  title: 'Edit a wrong answer with Left Arrow',
  description:
    'After a wrong typed answer, `Left Arrow` undoes without deleting — the full guess stays so ' +
    'you can fix a mistake in the middle. (`Backspace` still deletes the last character.)',
  enabledByDefault: true,

  start() {
    injectStyles();
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
    window.addEventListener('keydown', onKeyDown, true);
  },

  stop() {
    window.removeEventListener('keydown', onKeyDown, true);
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    forgetPending();
  },
};

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== EDIT_KEY || hasModifier(event)) {
    return;
  }
  if (pending) {
    event.preventDefault();
    event.stopPropagation();
    pending.lefts += 1;
    return;
  }
  if (event.repeat || areKeystrokesClaimed() || !findUndoButton()) {
    return;
  }
  const state = readQuizState();
  if (!shouldEnterEditOnLeft(state)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  pending = {
    review: reviewKey(state),
    text: state.submittedAnswer ?? findAnswerInput()?.value ?? '',
    lefts: 1,
  };
  undoGradedAnswer('visible');
}

function onQuizStateChange(state: QuizState): void {
  if (!pending) {
    return;
  }
  const action = pendingRestoreAction(pending.review, reviewKey(state), state.isPostAttempt);
  if (action === 'wait') {
    return;
  }
  if (action === 'forget') {
    forgetPending();
    return;
  }
  applyPendingRestore();
  replayRestoreAfterReact(pending);
}

function applyPendingRestore(): void {
  if (!pending) {
    return;
  }
  restoreWrongAnswer(pending.text, pending.lefts);
}

function replayRestoreAfterReact(session: NonNullable<typeof pending>): void {
  if (restoreTimer !== null) {
    window.clearTimeout(restoreTimer);
  }
  restoreTimer = window.setTimeout(() => {
    restoreTimer = null;
    if (pending === session) {
      applyPendingRestore();
      pending = null;
    }
  }, 0);
}

function forgetPending(): void {
  pending = null;
  if (restoreTimer !== null) {
    window.clearTimeout(restoreTimer);
    restoreTimer = null;
  }
}
