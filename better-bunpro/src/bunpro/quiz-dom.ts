/**
 * The quiz and the (optional) item-detail panel are both `<article>` elements
 * inside `#js-quiz`, so every selector here excludes the detail panel.
 */
const QUIZ_ARTICLE = '#js-quiz article:not(.bp-reviewable-root)';

export function findQuestionSection(): HTMLElement | null {
  return document.querySelector(`${QUIZ_ARTICLE} > section`);
}

export function hasNativeSentenceCard(): boolean {
  return document.querySelector(`${QUIZ_ARTICLE} > section aside[id^="study-question-"]`) !== null;
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
