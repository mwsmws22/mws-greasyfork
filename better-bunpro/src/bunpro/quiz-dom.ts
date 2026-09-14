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

/**
 * After a graded answer React ignores input events, so this only paints the
 * field and its placeholder. The next question remounts the input anyway.
 */
export function showAnswerInput(value: string): void {
  const input = findAnswerInput();
  if (!input) {
    return;
  }
  input.placeholder = value;
  if (input.value !== value) {
    writeAnswerInput(input, value);
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

/**
 * Retracts the last graded answer. If Bunpro asks to confirm, accept that
 * prompt without ticking "don't show again", and hide the "answer undone"
 * toast that would otherwise follow.
 */
export function undoGradedAnswer(): void {
  const undo = findUndoButton();
  if (!undo) {
    return;
  }
  hideUndoFeedback();
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
  const observer = new MutationObserver(() => {
    const confirm = findUndoConfirmButton();
    if (!confirm) {
      return;
    }
    window.clearTimeout(timeout);
    observer.disconnect();
    confirm.click();
  });
  const timeout = window.setTimeout(() => {
    observer.disconnect();
  }, UNDO_PROMPT_WAIT_MS);
  observer.observe(document.body, { childList: true, subtree: true });
}

function showUndoFeedback(): void {
  restoreUndoFeedbackTimer = null;
  document.documentElement.classList.remove(SKIP_UNDO_MODAL_CLASS);
}

/** The row around the field, which Bunpro outlines in red for a wrong answer. */
export function findAnswerConsole(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.InputManual');
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
