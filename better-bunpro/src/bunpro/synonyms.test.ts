import { describe, expect, it } from 'vitest';
import {
  includesSynonym,
  parseSynonyms,
  serializeSynonyms,
  synonymWorthAdding,
  SYNONYM_MAX_LENGTH,
} from './synonyms';

describe('parseSynonyms', () => {
  it('splits Bunpro\'s comma-separated string and drops empties', () => {
    expect(parseSynonyms('to have guts, to be plucky')).toEqual(['to have guts', 'to be plucky']);
    expect(parseSynonyms('  one, , two  ')).toEqual(['one', 'two']);
    expect(parseSynonyms(null)).toEqual([]);
    expect(parseSynonyms(undefined)).toEqual([]);
  });
});

describe('serializeSynonyms', () => {
  it('trims, deduplicates, and joins the way Bunpro\'s own save does', () => {
    expect(serializeSynonyms([' to have guts ', 'to have guts', 'to be plucky'])).toBe(
      'to have guts,to be plucky',
    );
  });

  it('drops a synonym Bunpro\'s field would reject as too long', () => {
    const tooLong = 'x'.repeat(SYNONYM_MAX_LENGTH + 1);
    expect(serializeSynonyms([tooLong, 'ok'])).toBe('ok');
  });
});

describe('includesSynonym', () => {
  it('treats two answers as the same once Bunpro has folded them', () => {
    expect(includesSynonym(['to have guts'], 'To Have Guts')).toBe(true);
    expect(includesSynonym(['Café'], 'cafe')).toBe(true);
    expect(includesSynonym(['to have guts'], 'to be brave')).toBe(false);
  });
});

describe('synonymWorthAdding', () => {
  it('is worth adding when the guess is new, non-empty, and within the limit', () => {
    expect(synonymWorthAdding('to be brave', ['to have guts'])).toBe(true);
  });

  it('is not worth adding when Bunpro already accepts that answer', () => {
    expect(synonymWorthAdding('to have guts', ['to have guts', 'to be plucky'])).toBe(false);
    expect(synonymWorthAdding('To Have Guts', ['to have guts'])).toBe(false);
  });

  it('is not worth adding when there is no real guess to store', () => {
    expect(synonymWorthAdding('', ['to have guts'])).toBe(false);
    expect(synonymWorthAdding('   ', ['to have guts'])).toBe(false);
    expect(synonymWorthAdding('x'.repeat(SYNONYM_MAX_LENGTH + 1), [])).toBe(false);
  });
});
