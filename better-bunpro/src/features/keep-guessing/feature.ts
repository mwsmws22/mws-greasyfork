import { fillAnswerInput, findAnswerInput, findSubmitButton } from '../../bunpro/quiz-dom';
import { readQuizState, type QuizState } from '../../bunpro/quiz-state';
import { reviewKey } from '../../bunpro/review';
import { injectStyles } from '../../styles';
import { areKeystrokesClaimed } from '../../ui/keystrokes';
import type { Feature } from '../registry';
import { takeAcceptedOfficial } from './accepted-guess';
import { markGuessWrong } from './feedback';
import { gradeAnswer } from './grading';

const SUBMIT_KEY = 'Enter';

/** Submitting a rejected guess unchanged is how you give up and see the answer. */
let lastRejected: { reviewKey: string; guess: string } | null = null;

export const keepGuessingFeature: Feature = {
  id: 'keep-guessing',
  title: 'Keep guessing after a wrong answer',
  description:
    'On a review you type an English translation or a reading into, Bunpro reveals the answer ' +
    'the moment you get it wrong. With this on, a wrong answer is not submitted at all: your ' +
    'text stays in the box so you can try again. To give up and see the answer, either clear ' +
    'the box and press Enter, or press Enter again on the same wrong answer. Because a guess ' +
    'this catches never reaches Bunpro, the review is graded on the answer you finally submit.',
  enabledByDefault: true,

  start() {
    injectStyles();
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('click', onClick, true);
  },

  stop() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('click', onClick, true);
    lastRejected = null;
  },
};

/**
 * Bunpro submits on Enter through the answer form and through a hotkey it listens
 * for on `document`, and both are downstream of the capture phase here.
 */
function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== SUBMIT_KEY || event.repeat || hasModifier(event) || areKeystrokesClaimed()) {
    return;
  }
  swallowIfWrong(event);
}

/** The arrow beside the field submits the same answer the keyboard does. */
function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Node) || findSubmitButton()?.contains(target) !== true) {
    return;
  }
  swallowIfWrong(event);
}

function swallowIfWrong(event: Event): void {
  if (!isWrongGuess()) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  markGuessWrong();
}

function isWrongGuess(): boolean {
  const input = findAnswerInput();
  const state = readQuizState();
  if (!input || !isAwaitingTypedAnswer(state)) {
    return false;
  }

  const review = reviewKey(state);
  if (!review) {
    return false;
  }

  const guess = input.value.trim();
  const official = takeAcceptedOfficial(review, guess);
  if (official !== null) {
    lastRejected = null;
    if (official !== guess) {
      fillAnswerInput(official);
    }
    return false;
  }
  if (lastRejected?.reviewKey === review && lastRejected.guess === guess) {
    lastRejected = null;
    return false;
  }
  if (gradeAnswer(state.questionMode, state.answers, guess) !== 'rejected') {
    return false;
  }

  lastRejected = { reviewKey: review, guess };
  return true;
}

/** Once a question has been answered, Enter moves on and is none of our business. */
function isAwaitingTypedAnswer(state: QuizState): boolean {
  return state.inputMode === 'manual' && !state.isPostAttempt && !state.isRevealing;
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}
