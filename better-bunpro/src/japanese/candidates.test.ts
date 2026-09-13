import { describe, expect, it } from 'vitest';
import { lookupForms, lookupQueries, MAX_TERM_LENGTH, termSurfaces } from './candidates';

describe('termSurfaces', () => {
  it('offers every prefix of the clicked text, longest first', () => {
    expect(termSurfaces('食べる')).toEqual(['食べる', '食べ', '食']);
  });

  it('stops at the end of the Japanese run, so punctuation is never part of a word', () => {
    expect(termSurfaces('本。です')).toEqual(['本']);
    expect(termSurfaces('本 です')).toEqual(['本']);
    expect(termSurfaces('本cat')).toEqual(['本']);
  });

  it('gives up on a phrase, rather than treating a whole sentence as one word', () => {
    expect(termSurfaces('据わることにしました')[0]?.length).toBe(MAX_TERM_LENGTH);
  });

  it('has nothing to offer where there is no Japanese', () => {
    expect(termSurfaces('')).toEqual([]);
    expect(termSurfaces('hello')).toEqual([]);
  });
});

describe('lookupForms', () => {
  it('keeps the surface form first and adds the dictionary forms behind it', () => {
    const forms = lookupForms('食べました');

    expect(forms[0]).toBe('食べました');
    expect(forms).toContain('食べる');
  });
});

describe('lookupQueries', () => {
  const surfaces = termSurfaces('食べました');

  it('asks about every surface form, so a one-character word is never crowded out', () => {
    expect(lookupQueries(surfaces, 20)).toEqual(expect.arrayContaining(surfaces));
  });

  it('spends what is left on dictionary forms of the longest surfaces', () => {
    expect(lookupQueries(surfaces, 20)).toContain('食べる');
  });

  it('never exceeds the budget, because every query is a network call', () => {
    expect(lookupQueries(surfaces, 3)).toHaveLength(3);
    expect(lookupQueries(surfaces, 0)).toEqual([]);
  });

  it('asks nothing twice', () => {
    const queries = lookupQueries(termSurfaces('食べる'), 20);

    expect(new Set(queries).size).toBe(queries.length);
  });
});
