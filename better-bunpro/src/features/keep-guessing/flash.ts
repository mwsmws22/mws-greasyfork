/**
 * A swallowed guess never reaches Bunpro, so nothing on the page would otherwise
 * react to it. This borrows the red outline Bunpro puts around a wrong answer and
 * adds a shake, so pressing Enter still feels answered.
 */
import { findAnswerConsole, findAnswerInput } from '../../bunpro/quiz-dom';

const SHAKE_CLASS = 'bb-wrong-guess';
/**
 * Bunpro's own class for a wrong answer. Their red text class cannot be borrowed
 * the same way: the field keeps `text-primary-fg`, which is declared later in
 * their stylesheet and so wins, hence the colour in `bb-wrong-guess`.
 */
const BUNPRO_INCORRECT_CLASS = 'bp-quiz-console--incorrect';
const WATCHED_ATTRIBUTE = 'bbFlashing';

export function flashWrongGuess(): void {
  const input = findAnswerInput();
  const answerConsole = findAnswerConsole();
  if (!input || !answerConsole) {
    return;
  }
  clearFlash();
  /** Reading the layout restarts the animation for a guess rejected twice in a row. */
  void input.offsetWidth;
  watchForFlashEnd(input);
  input.classList.add(SHAKE_CLASS);
  answerConsole.classList.add(BUNPRO_INCORRECT_CLASS);
}

function clearFlash(): void {
  findAnswerInput()?.classList.remove(SHAKE_CLASS);
  findAnswerConsole()?.classList.remove(BUNPRO_INCORRECT_CLASS);
}

/** Bunpro rebuilds the field between questions, so each one is watched once. */
function watchForFlashEnd(input: HTMLElement): void {
  if (input.dataset[WATCHED_ATTRIBUTE]) {
    return;
  }
  input.dataset[WATCHED_ATTRIBUTE] = 'true';
  input.addEventListener('animationend', clearFlash);
}
