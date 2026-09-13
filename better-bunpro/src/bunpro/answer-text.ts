/**
 * How Bunpro folds answer text before comparing it. Anything of ours that has
 * to decide whether two answers are "the same answer" folds them the same way,
 * so we never disagree with Bunpro about it.
 */
import { isJapanese } from '../japanese/characters';

const LIGATURES: Record<string, string> = { æ: 'ae', œ: 'oe', ß: 'ss' };

/** Bunpro lowercases, strips accents, then trims. */
export function normalize(text: string): string {
  return [...text.toLowerCase()].map(foldLetter).join('').trim();
}

/**
 * Japanese is left alone: decomposing it would split the dakuten off が and stop
 * it matching the が in an answer.
 */
function foldLetter(letter: string): string {
  if (isJapanese(letter)) {
    return letter;
  }
  return (LIGATURES[letter] ?? letter).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
