import { findNativeSentenceCard, findQuizArticle } from '../bunpro/quiz-dom';
import type { StudyQuestion } from '../bunpro/api';
import { shownSentence } from '../quiz-sentence/slot';
import { bunproClipOrigin, type AudioOrigin } from './origin';

/**
 * Sentence-example speakers use this title. Term controls do not:
 * answer-bar play uses Bunpro's default title; Details pitch play has none.
 */
const SENTENCE_PLAY = 'button[title="Play audio"]';

/**
 * Whether the on-screen *example sentence* has its own clip.
 *
 * ## Audio cue / rewrite policy (READ BEFORE CHANGING)
 *
 * Two different play controls, two jobs:
 *
 * 1. **Answer bar** (green InputManual) — follows whatever Bunpro plays there.
 *    - Example sentence on screen **has its own audio** (often Bunpro TTS of the
 *      sentence) → leave that alone → cue **white / Bunpro TTS** even if JPod
 *      exists for the vocab term.
 *    - No example clip (term-only review) → answer bar is term audio → look up
 *      JPod/Jisho → cue **blue** when a recording exists.
 *
 * 2. **Details pitch play** — always term-only → always look up → blue when real.
 *
 * ## How we detect “example has audio” (easy to get wrong)
 *
 * - Do **not** treat every `button[title="Play audio"]` in the quiz as an
 *   example. Bunpro leaves **hidden** footer speakers on term-only cards; that
 *   false positive forced white Bunpro TTS when the answer bar should be JPod.
 * - Do **not** require the speaker to be visible either. After submit, the
 *   sentence can be on screen with Bunpro’s play control still `display`/size
 *   hidden, while `#prefetch-audio` already points at the sentence TTS file.
 * - Reliable signals: our injected `shownSentence` audio URLs, a real
 *   `study-question-*` / `data-bb-study-question` card with a play button, a
 *   **visible** sentence play button, or prefetch under `/audio/vocab/tts/`
 *   (sentence) vs `/audio/vocab/pronunciation/` (term).
 */
export function exampleOnScreenHasAudio(): boolean {
  const shown = shownSentence();
  if (shown) {
    const sentence = shown.sentences[shown.index];
    if (sentence && studyQuestionHasAudio(sentence)) {
      return true;
    }
  }

  if (findNativeSentenceCard()?.querySelector(SENTENCE_PLAY)) {
    return true;
  }

  const article = findQuizArticle();
  if (!article) {
    return prefetchIsExampleSentenceAudio();
  }
  if (article.querySelector(`aside[data-bb-study-question] ${SENTENCE_PLAY}`)) {
    return true;
  }
  if (quizHasVisibleSentencePlay(article)) {
    return true;
  }
  return prefetchIsExampleSentenceAudio();
}

function studyQuestionHasAudio(sentence: StudyQuestion): boolean {
  return sentence.male_audio_url !== null || sentence.female_audio_url !== null;
}

/** Visible speakers only — ignores Bunpro’s hidden footer leftovers. */
function quizHasVisibleSentencePlay(article: HTMLElement): boolean {
  for (const node of article.querySelectorAll(SENTENCE_PLAY)) {
    if (node instanceof HTMLElement && isVisiblyDisplayed(node)) {
      return true;
    }
  }
  return false;
}

/**
 * Bunpro prefetches the clip the current UI will play. Example/sentence TTS
 * uses `/audio/vocab/tts/…`; term pronunciation uses `/audio/vocab/pronunciation/…`.
 */
function prefetchIsExampleSentenceAudio(): boolean {
  const href =
    document.querySelector<HTMLLinkElement>('link#prefetch-audio')?.href ??
    document.querySelector<HTMLLinkElement>('link[rel="prefetch"][as="audio"]')?.href ??
    null;
  if (!href) {
    return false;
  }
  return href.includes('/audio/vocab/tts/');
}

function isVisiblyDisplayed(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/** Origins for Info Examples list play buttons, keyed by study-question id. */
export function exampleOriginsFromSentences(
  sentences: readonly StudyQuestion[],
): Map<number, AudioOrigin> {
  const origins = new Map<number, AudioOrigin>();
  for (const sentence of sentences) {
    const origin = bunproClipOrigin(sentence.female_audio_url ?? sentence.male_audio_url);
    if (origin) {
      origins.set(sentence.id, origin);
    }
  }
  return origins;
}
