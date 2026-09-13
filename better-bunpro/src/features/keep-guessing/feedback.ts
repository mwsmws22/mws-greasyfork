/**
 * A swallowed guess never reaches Bunpro, so nothing on the page would otherwise
 * react to it. This paints the same red Bunpro paints a wrong answer and shakes
 * the field once. The red stays for as long as the rejected text does, and goes
 * the moment it is edited.
 */
import { findAnswerConsole, findAnswerInput } from '../../bunpro/quiz-dom';

const WRONG_CLASS = 'bb-wrong-guess';
const CORRECT_CLASS = 'bb-correct-guess';
const SHAKE_CLASS = 'bb-shaking';
/**
 * Bunpro's own classes for a graded answer. Their red/green text classes cannot
 * be borrowed the same way: the field keeps `text-primary-fg`, which is declared
 * later in their stylesheet and so wins, hence the colour in `bb-*-guess`.
 */
const BUNPRO_INCORRECT_CLASS = 'bp-quiz-console--incorrect';
const BUNPRO_CORRECT_CLASS = 'bp-quiz-console--correct';
const WATCHED_ATTRIBUTE = 'bbWatched';

export function markGuessWrong(): void {
  const input = findAnswerInput();
  const answerConsole = findAnswerConsole();
  if (!input || !answerConsole) {
    return;
  }
  watchField(input);
  input.classList.remove(CORRECT_CLASS);
  input.classList.add(WRONG_CLASS);
  answerConsole.classList.remove(BUNPRO_CORRECT_CLASS);
  answerConsole.classList.add(BUNPRO_INCORRECT_CLASS);
  shake(input);
}

export function markGuessCorrect(): void {
  const input = findAnswerInput();
  const answerConsole = findAnswerConsole();
  if (!input || !answerConsole) {
    return;
  }
  watchField(input);
  input.classList.remove(WRONG_CLASS);
  input.classList.add(CORRECT_CLASS);
  answerConsole.classList.remove(BUNPRO_INCORRECT_CLASS);
  answerConsole.classList.add(BUNPRO_CORRECT_CLASS);
}

/**
 * Bunpro writes the field's classes afresh whenever it answers a question, which
 * clears the mark on its own; this is for a guess abandoned before then.
 */
function clearMark(): void {
  findAnswerInput()?.classList.remove(WRONG_CLASS, CORRECT_CLASS);
  findAnswerConsole()?.classList.remove(BUNPRO_INCORRECT_CLASS, BUNPRO_CORRECT_CLASS);
}

function shake(input: HTMLElement): void {
  input.classList.remove(SHAKE_CLASS);
  /** Reading the layout lets the shake replay for a second rejected guess. */
  void input.offsetWidth;
  input.classList.add(SHAKE_CLASS);
}

/** Bunpro rebuilds the field between questions, so each one is wired once. */
function watchField(input: HTMLElement): void {
  if (input.dataset[WATCHED_ATTRIBUTE]) {
    return;
  }
  input.dataset[WATCHED_ATTRIBUTE] = 'true';
  input.addEventListener('input', clearMark);
  input.addEventListener('animationend', () => input.classList.remove(SHAKE_CLASS));
}
