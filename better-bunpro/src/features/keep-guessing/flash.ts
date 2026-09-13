/**
 * A swallowed guess never reaches Bunpro, so nothing on the page would otherwise
 * react to it. This borrows Bunpro's own incorrect colour and adds a shake, so
 * pressing Enter still feels answered.
 */
import { findAnswerInput } from '../../bunpro/quiz-dom';

const SHAKE_CLASS = 'bb-wrong-guess';
const BUNPRO_INCORRECT_CLASS = 'text-incorrect';
const WATCHED_ATTRIBUTE = 'bbFlashing';

export function flashWrongGuess(): void {
  const input = findAnswerInput();
  if (!input) {
    return;
  }
  clearFlash(input);
  /** Reading the layout restarts the animation for a guess rejected twice in a row. */
  void input.offsetWidth;
  watchForFlashEnd(input);
  input.classList.add(SHAKE_CLASS, BUNPRO_INCORRECT_CLASS);
}

export function clearFlash(input: HTMLElement): void {
  input.classList.remove(SHAKE_CLASS, BUNPRO_INCORRECT_CLASS);
}

/** Bunpro rebuilds the field between questions, so each one is watched once. */
function watchForFlashEnd(input: HTMLElement): void {
  if (input.dataset[WATCHED_ATTRIBUTE]) {
    return;
  }
  input.dataset[WATCHED_ATTRIBUTE] = 'true';
  input.addEventListener('animationend', () => clearFlash(input));
}
