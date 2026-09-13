import { describe, expect, it } from 'vitest';
import { lookupClickedTerm } from './lookup';
import type { BunproTerm } from './term-search';

function term(written: string, extras: Partial<BunproTerm> = {}): BunproTerm {
  return {
    id: written.length,
    type: 'vocab',
    furigana: written,
    written,
    reading: extras.reading ?? written,
    meaning: extras.meaning ?? written,
    slug: written,
    isInReviews: false,
    ...extras,
  };
}

describe('lookupClickedTerm', () => {
  it('picks the longest dictionary match, not a shorter prefix that also exists', async () => {
    const dictionary = new Map([
      ['食べました', []],
      ['食べる', [term('食べる', { meaning: 'to eat' })]],
      ['食', [term('食', { meaning: 'food' })]],
    ]);

    const found = await lookupClickedTerm('食べました', async (query) => dictionary.get(query) ?? []);

    expect(found?.term.written).toBe('食べる');
    expect(found?.surface).toBe('食べました');
  });

  it('matches a word by its reading when that is what was clicked', async () => {
    const taberu = term('食べる', { reading: 'たべる', meaning: 'to eat' });

    const found = await lookupClickedTerm('たべる', async (query) =>
      query === 'たべる' || query === '食べる' ? [taberu] : [],
    );

    expect(found?.term).toEqual(taberu);
  });

  it('asks the dictionary about the word as written before any deinflection', async () => {
    const queries: string[] = [];

    await lookupClickedTerm('本', async (query) => {
      queries.push(query);
      return query === '本' ? [term('本', { meaning: 'book' })] : [];
    });

    expect(queries[0]).toBe('本');
  });

  it('has nothing to offer on punctuation or empty text', async () => {
    const search = async (): Promise<BunproTerm[]> => {
      throw new Error('should not search');
    };

    expect(await lookupClickedTerm('', search)).toBeNull();
    expect(await lookupClickedTerm('。', search)).toBeNull();
    expect(await lookupClickedTerm('hello', search)).toBeNull();
  });

  it('gives up when nothing in the dictionary matches', async () => {
    expect(await lookupClickedTerm('食べました', async () => [])).toBeNull();
  });
});
