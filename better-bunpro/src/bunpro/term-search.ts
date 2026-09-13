/**
 * Bunpro's own search, used as the dictionary a clicked word is looked up in.
 * Bunpro searches fuzzily, so a result only counts as the word that was clicked
 * when it is written or read exactly as that word.
 */
import {
  bunproRequest,
  dataOfType,
  includedOfType,
  jsonBody,
  type JsonApiDocument,
} from './api-request';
import { furiganaToReading, furiganaToWritten } from './furigana';
import type { ReviewableRef } from './quiz-state';
import type { UserReview } from './user-reviews';

export interface BunproTerm extends ReviewableRef {
  /** Bunpro's inline-reading form, e.g. `食（た）べる`. */
  furigana: string;
  written: string;
  reading: string;
  meaning: string;
  /** Bunpro's own page for the term is addressed by slug, not by id. */
  slug: string;
  isInReviews: boolean;
}

/** Bunpro answers with one JSON:API document per reviewable kind searched. */
interface SearchPayload {
  vocabs?: JsonApiDocument | null;
}

const cache = new Map<string, Promise<BunproTerm[]>>();

export function searchVocab(query: string): Promise<BunproTerm[]> {
  let request = cache.get(query);
  if (!request) {
    request = requestVocabSearch(query);
    cache.set(query, request);
  }
  return request;
}

async function requestVocabSearch(query: string): Promise<BunproTerm[]> {
  const payload = await bunproRequest<SearchPayload>(
    '/search/reviewables_v1_1',
    jsonBody('POST', {
      query,
      options: {
        include_reviews: true,
        include_bookmarks: false,
        include_notes: false,
        only_bookmarks: false,
      },
      is_searching_grammar: false,
      is_searching_vocab: true,
    }),
  );
  return parseVocabSearch(payload?.vocabs ?? null);
}

export function parseVocabSearch(vocabs: JsonApiDocument | null): BunproTerm[] {
  const reviews = includedOfType(vocabs, 'review') as unknown as UserReview[];

  return dataOfType(vocabs, 'vocab').map((attributes) => {
    const furigana = asText(attributes.furigana);
    return {
      id: Number(attributes.id),
      type: 'vocab' as const,
      furigana,
      written: furiganaToWritten(furigana),
      reading: furiganaToReading(furigana),
      meaning: asText(attributes.meaning),
      slug: asText(attributes.slug),
      isInReviews: reviews.some((review) => review.reviewable_id === Number(attributes.id)),
    };
  });
}

/** The word that was clicked, not merely something Bunpro thinks is related to it. */
export function matchingTerm(terms: readonly BunproTerm[], word: string): BunproTerm | null {
  return terms.find((term) => term.written === word || term.reading === word) ?? null;
}

export function termPageUrl(term: BunproTerm): string {
  return `https://bunpro.jp/vocabs/${term.slug}`;
}

export function termSearchUrl(word: string): string {
  return `https://bunpro.jp/search?query=${encodeURIComponent(word)}`;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
