import { fillAnswerInput, findAnswerInput, findSubmitButton } from '../../bunpro/quiz-dom';
import { readQuizState, type QuizState } from '../../bunpro/quiz-state';
import { reviewKey } from '../../bunpro/review';
import { injectStyles } from '../../styles';
import { areKeystrokesClaimed, hasModifier } from '../../ui/keystrokes';
import type { Feature } from '../registry';
import { takeAcceptedOfficial, takeAcceptedOfficialForReview } from './accepted-guess';
import { markGuessWrong } from './feedback';
import { gradeAnswer } from './grading';

const SUBMIT_KEY = 'Enter';

/** Submitting a rejected guess unchanged is how you give up and see the answer. */
let lastRejected: { reviewKey: string; guess: string } | null = null;
let officialSubmitTimer: ReturnType<typeof setTimeout> | null = null;

export const keepGuessingFeature: Feature = {
  id: 'keep-guessing',
  title: "Don't spoil the answer on a wrong guess",
  description:
    'On Manual Translation–style reviews, Bunpro shows the correct answer as soon as you miss — ' +
    'so undo is pointless. With this on, a wrong guess is not submitted: nothing is revealed and ' +
    'your text stays so you can try again. To give up: clear the box and press `Enter`, or press ' +
    '`Enter` again on the same wrong answer.',
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
    if (officialSubmitTimer !== null) {
      window.clearTimeout(officialSubmitTimer);
      officialSubmitTimer = null;
    }
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
  if (submitRememberedAsCorrect(event)) {
    return;
  }
  if (!isWrongGuess()) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  markGuessWrong();
}

/**
 * This session's answer list does not include the synonym we just saved, so
 * submitting that text would still fail. Swap in an official answer after React
 * has seen the input event, then press Bunpro's own submit.
 */
function submitRememberedAsCorrect(event: Event): boolean {
  const input = findAnswerInput();
  const state = readQuizState();
  if (!input || !isAwaitingTypedAnswer(state)) {
    return false;
  }
  const review = reviewKey(state);
  if (!review) {
    return false;
  }
  const official = takeAcceptedOfficial(review, input.value.trim());
  if (official === null) {
    return false;
  }
  lastRejected = null;
  event.preventDefault();
  event.stopPropagation();
  queueOfficialSubmit(official);
  return true;
}

/** Used when adding a synonym: no extra Enter, submit a known-good answer now. */
export function submitAcceptedStandIn(reviewKey: string): boolean {
  const official = takeAcceptedOfficialForReview(reviewKey);
  if (official === null) {
    return false;
  }
  lastRejected = null;
  queueOfficialSubmit(official);
  return true;
}

function queueOfficialSubmit(official: string): void {
  fillAnswerInput(official);
  if (officialSubmitTimer !== null) {
    window.clearTimeout(officialSubmitTimer);
  }
  officialSubmitTimer = window.setTimeout(() => {
    officialSubmitTimer = null;
    fillAnswerInput(official);
    findSubmitButton()?.click();
  }, 0);
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
