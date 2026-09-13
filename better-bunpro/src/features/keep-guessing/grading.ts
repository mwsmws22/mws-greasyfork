/**
 * A port of Bunpro's own answer check, so a wrong answer can be recognised
 * before Bunpro grades it and reveals the answer.
 *
 * `unknown` means we cannot judge the answer and Bunpro should. Erring towards
 * `unknown` is the only safe direction to be wrong in: the keystroke is then
 * handled exactly as it is without this feature, whereas a wrongly `rejected`
 * answer would leave a correct answer refusing to submit.
 */
import { normalize } from '../../bunpro/answer-text';

export type Grade = 'accepted' | 'rejected' | 'unknown';

/** Bunpro accepts a translation this close to one of its answers, typos included. */
const TRANSLATION_SIMILARITY = 0.8;

const LATIN_LETTER = /[a-z]/i;

export function gradeAnswer(
  questionMode: string | null,
  answers: readonly string[],
  typed: string,
): Grade {
  const guess = typed.trim();
  if (guess === '' || answers.length === 0) {
    return 'unknown';
  }
  if (questionMode === 'translate') {
    return gradedBySimilarity(answers, guess);
  }
  if (questionMode === 'reading') {
    return gradedExactly(answers, guess);
  }
  return 'unknown';
}

function gradedBySimilarity(answers: readonly string[], guess: string): Grade {
  const closest = Math.max(...answers.map((answer) => similarity(normalize(answer), normalize(guess))));
  return closest >= TRANSLATION_SIMILARITY ? 'accepted' : 'rejected';
}

/**
 * Readings have to match outright. Latin letters mean the field still holds
 * romaji that Bunpro has yet to convert, and comparing that to kana says nothing.
 */
function gradedExactly(answers: readonly string[], guess: string): Grade {
  if (LATIN_LETTER.test(guess)) {
    return 'unknown';
  }
  return answers.some((answer) => normalize(answer) === normalize(guess)) ? 'accepted' : 'rejected';
}

/** Levenshtein distance scaled by the longer of the two strings. */
export function similarity(left: string, right: string): number {
  if (left.length === 0) {
    return right.length === 0 ? 1 : 0;
  }
  if (right.length === 0) {
    return 0;
  }
  return 1 - distance(left, right) / Math.max(left.length, right.length);
}

/**
 * Levenshtein, keeping only the row of the matrix being filled: `above` is the
 * cell over the one being written, `diagonal` the one before that, and
 * `previous` the cell just written.
 */
function distance(left: string, right: string): number {
  const target = [...right];
  let row = target.map((_, column) => column + 1);

  [...left].forEach((source, sourceIndex) => {
    let diagonal = sourceIndex;
    let previous = sourceIndex + 1;
    row = row.map((above, column) => {
      const cell = Math.min(
        diagonal + (source === target[column] ? 0 : 1),
        above + 1,
        previous + 1,
      );
      diagonal = above;
      previous = cell;
      return cell;
    });
  });

  /** An empty target has no row to fill: every character of `left` is deleted. */
  return row[target.length - 1] ?? left.length;
}
