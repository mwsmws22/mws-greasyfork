/**
 * One term for a click: the longest surface that Bunpro actually has, after
 * Yomitan-style deinflection. `candidates` only says what *could* be a word;
 * this is the half that asks the dictionary and picks.
 */
import { lookupForms, termSurfaces } from '../japanese/candidates';
import { matchingTerm, searchVocab, type BunproTerm } from './term-search';

/** Each query is a network call, so a click must not fan out unbounded. */
const QUERY_BUDGET = 8;

export interface ClickedTerm {
  /** The span of the sentence that matched, as it was written or read. */
  surface: string;
  term: BunproTerm;
}

export async function lookupClickedTerm(
  textFromClick: string,
  search: (query: string) => Promise<BunproTerm[]> = searchVocab,
): Promise<ClickedTerm | null> {
  const surfaces = termSurfaces(textFromClick);
  let remaining = QUERY_BUDGET;

  for (const surface of surfaces) {
    for (const form of lookupForms(surface)) {
      if (remaining <= 0) {
        return null;
      }
      remaining -= 1;
      const match = matchingTerm(await search(form), form);
      if (match) {
        return { surface, term: match };
      }
    }
  }

  return null;
}