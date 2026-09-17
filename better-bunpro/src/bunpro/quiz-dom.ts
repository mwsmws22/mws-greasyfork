import { watchBodyRemounts } from '../dom/remount';

/**
 * The quiz and the (optional) item-detail panel are both `<article>` elements
 * inside `#js-quiz`, so every selector here excludes the detail panel.
 */
const QUIZ_ARTICLE = '#js-quiz article:not(.bp-reviewable-root)';

export function findQuizArticle(): HTMLElement | null {
  return document.querySelector<HTMLElement>(QUIZ_ARTICLE);
}

export function findQuestionSection(): HTMLElement | null {
  return document.querySelector(`${QUIZ_ARTICLE} > section`);
}

/**
 * In a cloze question the sentence *is* the question, so Bunpro renders it as
 * pieces either side of the blank rather than as a sentence card.
 */
export function findClozeSentence(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`${QUIZ_ARTICLE} .bp-quiz-question > .text-center`);
}

export function findClozeTense(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`${QUIZ_ARTICLE} .bp-quiz-question > p.bp-quiz-tense`);
}

/** The sentence translation under the question; its hidden twin is the nuance hint. */
export function findQuestionTranslation(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `${QUIZ_ARTICLE} .bp-quiz-trans:not(.bp-quiz-trans--hint)`,
  );
}

/** Bunpro names its own sentence card after the study question it is showing. */
const NATIVE_CARD_ID_PREFIX = 'study-question-';

export function findNativeSentenceCard(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `${QUIZ_ARTICLE} > section aside[id^="${NATIVE_CARD_ID_PREFIX}"]`,
  );
}

export function hasNativeSentenceCard(): boolean {
  return findNativeSentenceCard() !== null;
}

export function nativeSentenceId(): number | null {
  const card = findNativeSentenceCard();
  if (!card) {
    return null;
  }
  const id = Number(card.id.slice(NATIVE_CARD_ID_PREFIX.length));
  return Number.isFinite(id) ? id : null;
}

/**
 * The typed-answer field. Bunpro binds it to a romaji-to-kana converter for
 * Japanese questions, so its value is already kana by the time it is submitted.
 */
export function findAnswerInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('#js-manual-input');
}

/**
 * Writes through the native value setter so React's onInput sees the change.
 * Assigning `.value` alone leaves Bunpro's state on the previous text.
 */
export function fillAnswerInput(value: string): void {
  const input = findAnswerInput();
  if (!input || input.value === value) {
    return;
  }
  writeAnswerInput(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const PLACEHOLDER_BACKUP = 'bbPlaceholder';

/**
 * After a graded answer React ignores input events, so this only paints the
 * field and its placeholder. The same box is reused for the next question,
 * so `clearAnswerIfShowing` has to take the paint off when the quiz moves on.
 */
export function showAnswerInput(value: string): void {
  const input = findAnswerInput();
  if (!input) {
    return;
  }
  if (input.dataset[PLACEHOLDER_BACKUP] === undefined) {
    input.dataset[PLACEHOLDER_BACKUP] = input.placeholder;
  }
  input.placeholder = value;
  if (input.value !== value) {
    writeAnswerInput(input, value);
  }
}

/** Undoes `showAnswerInput` if that text is still what the field is showing. */
export function clearAnswerIfShowing(value: string): void {
  const input = findAnswerInput();
  if (!input) {
    return;
  }
  if (input.placeholder === value) {
    const original = input.dataset[PLACEHOLDER_BACKUP];
    if (original !== undefined) {
      input.placeholder = original;
      delete input.dataset[PLACEHOLDER_BACKUP];
    }
  }
  if (input.value === value) {
    fillAnswerInput('');
  }
}

function writeAnswerInput(input: HTMLInputElement, value: string): void {
  const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  native?.call(input, value);
}

/** Submits the answer, then becomes the button that moves on to the next question. */
export function findSubmitButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.InputManual__button');
}

/** Retracts the last graded answer so the same review can be submitted again. */
export function findUndoButton(): HTMLElement | null {
  return document.querySelector('svg[data-name="UNDO"]')?.closest('button') ?? null;
}

const UNDO_WARNING_ID = 'quiz-undo';
const SKIP_UNDO_MODAL_CLASS = 'bb-skipping-undo-modal';
const UNDO_PROMPT_WAIT_MS = 400;
/** Bunpro auto-dismisses the undo toast after 2s (`isDelayedClose`). */
const UNDO_TOAST_MS = 2200;

let restoreUndoFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Bunpro's undo warning is the only dialog that mounts a `#quiz-undo`
 * "don't show again" checkbox. Confirm is the last full-width action; cancel
 * is the first. Never click the checkbox: that would hide the warning for
 * later real undos.
 */
export function findUndoConfirmButton(): HTMLElement | null {
  const warning = document.getElementById(UNDO_WARNING_ID);
  const dialog = warning?.closest('article[role="dialog"]');
  if (!dialog) {
    return null;
  }
  const actions = dialog.querySelectorAll<HTMLElement>('button.w-full');
  return actions.length > 0 ? (actions[actions.length - 1] ?? null) : null;
}

/** Whether the "answer undone" toast should stay on screen after we click Undo. */
export type UndoFeedback = 'silent' | 'visible';

/**
 * Retracts the last graded answer. If Bunpro asks to confirm, accept that
 * prompt without ticking "don't show again". Silent undos also hide the
 * "answer undone" toast; visible ones leave it, the same as Backspace.
 */
export function undoGradedAnswer(feedback: UndoFeedback = 'silent'): void {
  const undo = findUndoButton();
  if (!undo) {
    return;
  }
  if (feedback === 'silent') {
    hideUndoFeedback();
  } else {
    showUndoFeedback();
  }
  undo.click();
  const confirm = findUndoConfirmButton();
  if (confirm) {
    confirm.click();
    return;
  }
  waitForUndoConfirm();
}

function hideUndoFeedback(): void {
  document.documentElement.classList.add(SKIP_UNDO_MODAL_CLASS);
  if (restoreUndoFeedbackTimer !== null) {
    window.clearTimeout(restoreUndoFeedbackTimer);
  }
  restoreUndoFeedbackTimer = window.setTimeout(showUndoFeedback, UNDO_TOAST_MS);
}

function waitForUndoConfirm(): void {
  const stop = watchBodyRemounts(() => {
    const confirm = findUndoConfirmButton();
    if (!confirm) {
      return;
    }
    window.clearTimeout(timeout);
    stop();
    confirm.click();
  });
  const timeout = window.setTimeout(() => {
    stop();
  }, UNDO_PROMPT_WAIT_MS);
}

function showUndoFeedback(): void {
  restoreUndoFeedbackTimer = null;
  document.documentElement.classList.remove(SKIP_UNDO_MODAL_CLASS);
}

/** The row around the field, which Bunpro outlines in red for a wrong answer. */
export function findAnswerConsole(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.InputManual');
}

/**
 * Bunpro's term-audio controls — quiz answer bar and/or the Details
 * pitch-accent play button. Both can be on screen after a review answer.
 */
export function findTermAudioControls(): HTMLElement[] {
  const controls: HTMLElement[] = [];
  const answer = findAnswerBarAudioControl();
  if (answer) {
    controls.push(answer);
  }
  const details = findDetailsPitchPlay();
  if (details && !controls.includes(details)) {
    controls.push(details);
  }
  return controls;
}

/** First term-audio control (answer bar preferred). Prefer {@link findTermAudioControls}. */
export function findTermAudioControl(): HTMLElement | null {
  return findTermAudioControls()[0] ?? null;
}

/** Play / pause / close at the left of the typed-answer console. */
export function findAnswerBarAudioControl(): HTMLElement | null {
  const answerConsole = findAnswerConsole();
  if (!answerConsole) {
    return null;
  }
  for (const name of ['PLAY_CIRCLE_FILLED', 'PAUSE', 'CANCEL'] as const) {
    const button = answerConsole.querySelector(`button:has(svg[data-name="${name}"])`);
    if (button instanceof HTMLElement) {
      return button;
    }
  }
  return null;
}

/** Pitch-accent speaker in the vocabulary Details section. */
export function findDetailsPitchPlay(): HTMLElement | null {
  const root = document.querySelector('.DetailsPitchAccent');
  const button = root?.querySelector('button:has(svg[data-name="PLAY_CIRCLE_FILLED"])');
  return button instanceof HTMLElement ? button : null;
}

/**
 * Play buttons on Info / vocabulary-page Examples list cards.
 * Scoped to `.bp-reviewable-root` so the quiz's on-screen sentence card is left alone.
 */
export function findExamplesListPlayControls(): HTMLElement[] {
  const root = document.querySelector('.bp-reviewable-root');
  if (!root) {
    return [];
  }
  const controls: HTMLElement[] = [];
  for (const card of root.querySelectorAll(`[id^="${NATIVE_CARD_ID_PREFIX}"]`)) {
    for (const button of card.querySelectorAll('button[title="Play audio"]')) {
      if (button instanceof HTMLElement) {
        controls.push(button);
      }
    }
  }
  return controls;
}

/** Study-question id from an Examples list play button's card, or null. */
export function studyQuestionIdOfPlayControl(control: HTMLElement): number | null {
  const card = control.closest(`[id^="${NATIVE_CARD_ID_PREFIX}"]`);
  if (!(card instanceof HTMLElement)) {
    return null;
  }
  const raw = card.id.slice(NATIVE_CARD_ID_PREFIX.length);
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

/** The typed-answer console; the wrong guess sits in here after grading. */
export function findQuizConsole(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`${QUIZ_ARTICLE} .bp-quiz-console`);
}

/** The Hotkey Guide article Bunpro mounts in `#modal-portal`. */
export function findHotkeyGuideArticle(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '#modal-portal article.grid.gap-24.text-secondary-fg',
  );
}

/** The row holding Bunpro's Exit / Quiz settings / Styling / Dictionary icons. */
export function findQuizToolbar(): HTMLElement | null {
  const rows = document.querySelectorAll<HTMLElement>(`${QUIZ_ARTICLE} > header ul`);
  for (const row of rows) {
    if (row.querySelector('button, a')) {
      return row;
    }
  }
  return null;
}
