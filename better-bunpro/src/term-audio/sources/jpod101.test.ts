import { describe, expect, it } from 'vitest';
import { jpod101Url, kanjiWordMissingReading } from './jpod101';

const ENDPOINT = 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php';

describe('jpod101Url', () => {
  it('asks for a kanji word by spelling and reading, as Yomitan does', () => {
    expect(jpod101Url({ term: '食べる', reading: 'たべる' })).toBe(
      `${ENDPOINT}?kanji=${encodeURIComponent('食べる')}&kana=${encodeURIComponent('たべる')}`,
    );
  });

  it('asks for a kana-only word by reading alone, so the spelling does not hide it', () => {
    expect(jpod101Url({ term: 'たべる', reading: 'たべる' })).toBe(
      `${ENDPOINT}?kana=${encodeURIComponent('たべる')}`,
    );
  });

  it('files 委ねる under kanji+kana the same way Yomitan does', () => {
    expect(jpod101Url({ term: '委ねる', reading: 'ゆだねる' })).toBe(
      `${ENDPOINT}?kanji=${encodeURIComponent('委ねる')}&kana=${encodeURIComponent('ゆだねる')}`,
    );
  });
});

describe('kanjiWordMissingReading', () => {
  it('is true when a kanji spelling was used as its own reading', () => {
    expect(kanjiWordMissingReading({ term: '委ねる', reading: '委ねる' })).toBe(true);
    expect(kanjiWordMissingReading({ term: '委ねる', reading: 'ゆだねる' })).toBe(false);
    expect(kanjiWordMissingReading({ term: 'いじ', reading: 'いじ' })).toBe(false);
  });
});
