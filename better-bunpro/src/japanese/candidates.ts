/**
 * What could the word starting at the character you clicked be?
 *
 * Yomitan answers that by taking every prefix of the text from the click,
 * longest first, deinflecting each one, and letting the dictionary say which
 * exist. We do the same, except the dictionary is a network call, so the two
 * halves are kept apart: `termSurfaces` and `lookupForms` say what *could* be a
 * word, and `lookupQueries` narrows that to the handful worth asking about.
 */
import { isJapanese } from './characters';
import { deinflect } from './deinflect';

/**
 * Bunpro's longest vocab entries are around four characters, and an inflected
 * form adds a few more; past that a prefix is a phrase rather than a word.
 */
export const MAX_TERM_LENGTH = 6;

/** How many deinflections of one surface form are worth spending a lookup on. */
const QUERIES_PER_SURFACE = 2;

/** Every prefix of the Japanese text at the click, longest first. */
export function termSurfaces(textFromClick: string): string[] {
  const run = leadingJapanese(textFromClick);
  const surfaces: string[] = [];
  for (let length = run.length; length > 0; length -= 1) {
    surfaces.push(run.slice(0, length));
  }
  return surfaces;
}

/** The surface form itself, then the dictionary forms it could be an inflection of. */
export function lookupForms(surface: string): string[] {
  return deinflect(surface);
}

/**
 * The dictionary lookups to actually make. Every surface form gets asked about
 * as it stands, so a short noun is never crowded out by a long phrase, and the
 * remaining budget goes on deinflections of the longest surfaces first.
 */
export function lookupQueries(surfaces: readonly string[], budget: number): string[] {
  const queries = new Set<string>();

  for (const surface of surfaces) {
    queries.add(surface);
  }
  for (const surface of surfaces) {
    for (const form of lookupForms(surface).slice(1, QUERIES_PER_SURFACE + 1)) {
      queries.add(form);
    }
  }

  return [...queries].slice(0, budget);
}

function leadingJapanese(text: string): string {
  const characters = [...text];
  let length = 0;
  while (length < characters.length && length < MAX_TERM_LENGTH) {
    if (!isJapanese(characters[length] ?? '')) {
      break;
    }
    length += 1;
  }
  return characters.slice(0, length).join('');
}
