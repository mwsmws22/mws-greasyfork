import { findNativeSentenceCard, findQuizArticle } from '../bunpro/quiz-dom';
import type { StudyQuestion } from '../bunpro/api';
import { shownSentence } from '../quiz-sentence/slot';

/** Bunpro and our injected cards both label the sentence speaker this way. */
const SENTENCE_PLAY = 'button[title="Play audio"]';

/**
 * True when the example currently on the quiz has a clip — the case where we
 * leave Bunpro alone and do not hunt for a dictionary recording of the term.
 * Other study questions in the API do not count; only what is on screen.
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
  return Boolean(article?.querySelector(`aside[data-bb-study-question] ${SENTENCE_PLAY}`));
}

function studyQuestionHasAudio(sentence: StudyQuestion): boolean {
  return sentence.male_audio_url !== null || sentence.female_audio_url !== null;
}
