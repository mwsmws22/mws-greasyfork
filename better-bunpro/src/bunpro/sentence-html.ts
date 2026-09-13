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
  const answer = answerOf(sentence);
  if (!answer || !sentence.content.includes(BLANK)) {
    return sentence.content;
  }
  return sentence.content.replaceAll(BLANK, `<span class="text-primary-accent">${answer}</span>`);
}

/**
 * A port of Bunpro's `splitQuestionText`: a cloze question appends the word
 * prompt to the sentence, then renders the pieces either side of the blank
 * around the answer the reviewer typed.
 */
export function questionSentenceParts(sentence: StudyQuestion): string[] {
  const prompt = sentence.word_prompt ? `(${sentence.word_prompt})` : '';
  return `${sentence.content}${prompt}`.split(BLANK).map(furiganaToRuby);
}

export function sentenceAnswerHtml(sentence: StudyQuestion): string {
  return furiganaToRuby(answerOf(sentence) ?? '');
}

function answerOf(sentence: StudyQuestion): string | null {
  return sentence.kanji_answer || sentence.answer;
}
