import { describe, expect, it } from 'vitest';
import { matchingTerm, parseVocabSearch, type BunproTerm } from './term-search';
import type { JsonApiDocument } from './api-request';

const TABERU: BunproTerm = {
  id: 1,
  type: 'vocab',
  furigana: '食（た）べる',
  written: '食べる',
  reading: 'たべる',
  meaning: 'to eat',
  slug: 'taberu',
  isInReviews: false,
};

describe('matchingTerm', () => {
  it('accepts the word as it is written or as it is read, and nothing merely related', () => {
    expect(matchingTerm([TABERU], '食べる')).toEqual(TABERU);
    expect(matchingTerm([TABERU], 'たべる')).toEqual(TABERU);
    expect(matchingTerm([TABERU], '食べ')).toBeNull();
    expect(matchingTerm([TABERU], '食事')).toBeNull();
  });
});

describe('parseVocabSearch', () => {
  it('reads written form, reading, and whether the term is already in reviews', () => {
    const vocabs: JsonApiDocument = {
      data: [
        {
          id: '1',
          type: 'vocab',
          attributes: { furigana: '食（た）べる', meaning: 'to eat', slug: 'taberu' },
        },
      ],
      included: [{ id: '9', type: 'review', attributes: { reviewable_id: 1 } }],
    };

    expect(parseVocabSearch(vocabs)).toEqual([
      {
        id: 1,
        type: 'vocab',
        furigana: '食（た）べる',
        written: '食べる',
        reading: 'たべる',
        meaning: 'to eat',
        slug: 'taberu',
        isInReviews: true,
      },
    ]);
  });
});
