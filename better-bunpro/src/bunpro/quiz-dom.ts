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

/** Submits the answer, then becomes the button that moves on to the next question. */
export function findSubmitButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.InputManual__button');
}

/** The row around the field, which Bunpro outlines in red for a wrong answer. */
export function findAnswerConsole(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.InputManual');
}

/** The typed-answer console; the wrong guess sits in here after grading. */
export function findQuizConsole(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`${QUIZ_ARTICLE} .bp-quiz-console`);
}

/**
 * Japanese of a review sentence: Bunpro's card, one of ours, or the cloze
 * question. Clicks elsewhere — the English gloss, the audio, the quiz chrome —
 * are not a term lookup.
 */
const SENTENCE_JAPANESE = [
  `${QUIZ_ARTICLE} aside[id^="${NATIVE_CARD_ID_PREFIX}"] .bp-ddw`,
  `${QUIZ_ARTICLE} aside[data-bb-study-question] .bp-ddw`,
  `${QUIZ_ARTICLE} .bp-quiz-question > .text-center`,
].join(', ');

export function findSentenceJapanese(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(SENTENCE_JAPANESE)];
}

export function findLookupRoot(node: Node): HTMLElement | null {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest<HTMLElement>(SENTENCE_JAPANESE) ?? null;
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
