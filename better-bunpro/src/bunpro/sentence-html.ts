import type { StudyQuestion } from './api';
import { furiganaToRuby } from './furigana';

/** Cloze sentences carry the reviewed term as a blank for the frontend to fill in. */
const BLANK = '____';

export function studyQuestionToHtml(sentence: StudyQuestion): string {
  return furiganaToRuby(withAnswerFilledIn(sentence));
}

/**
 * Matches Bunpro's own highlight: the filled-in answer is accented, while
 * sentences that instead mark the term inline are left exactly as authored.
 */
function withAnswerFilledIn(sentence: StudyQuestion): string {
  const answer = sentence.kanji_answer || sentence.answer;
  if (!answer || !sentence.content.includes(BLANK)) {
    return sentence.content;
  }
  return sentence.content.replaceAll(BLANK, `<span class="text-primary-accent">${answer}</span>`);
}
