import { describe, expect, it } from 'vitest';
import { furiganaToReading, furiganaToWritten } from './furigana';

/**
 * Both projections exist to compare a Bunpro term against a word read out of a
 * sentence, so they have to agree with `furiganaToRuby` about what is a reading:
 * anything it would not annotate has to survive untouched.
 */
describe('furiganaToWritten', () => {
  it('drops the readings and keeps the word as it is written', () => {
    expect(furiganaToWritten('食（た）べる')).toBe('食べる');
    expect(furiganaToWritten('運命（うんめい）に身（み）を委（ゆだ）ねる')).toBe('運命に身を委ねる');
  });

  it('leaves a word with no readings alone', () => {
    expect(furiganaToWritten('ひらがな')).toBe('ひらがな');
    expect(furiganaToWritten('')).toBe('');
  });

  it('leaves parentheses that are not a reading alone', () => {
    expect(furiganaToWritten('（１）')).toBe('（１）');
  });
});

describe('furiganaToReading', () => {
  it('replaces each annotated word with how it is read', () => {
    expect(furiganaToReading('食（た）べる')).toBe('たべる');
    expect(furiganaToReading('肝（きも）が据（す）わる')).toBe('きもがすわる');
  });

  it('leaves a kana-only word as its own reading', () => {
    expect(furiganaToReading('ひらがな')).toBe('ひらがな');
  });
});
