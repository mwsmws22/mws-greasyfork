/**
 * Japanese character classes, ported from Bunpro's own renderer.
 *
 * These are regex source fragments rather than plain strings, and the ranges are
 * spelled as `\uXXXX` escapes: written literally, CJK compatibility ideographs
 * and the look-alike full-width symbols do not survive text normalisation, which
 * silently turns the pattern into an invalid range.
 */
const KANJI_RADICALS = String.raw`\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5`;
const KANJI_MARKS = String.raw`\u3005\u3007\u3021-\u3029\u3038-\u303B`;
const KANJI_UNIFIED = String.raw`\u3400-\u4DBF\u4E00-\u9FFF`;
const KANJI_COMPATIBILITY = String.raw`\uF900-\uFA6D\uFA70-\uFAD9`;

export const KANJI = `${KANJI_RADICALS}${KANJI_MARKS}${KANJI_UNIFIED}${KANJI_COMPATIBILITY}`;
export const HIRAGANA = String.raw`\u3041-\u3096\u309D-\u309F`;
export const KATAKANA = String.raw`\u30A0-\u30FF\u30FC`;
export const JAPANESE = `${KANJI}${HIRAGANA}${KATAKANA}`;

const JAPANESE_CHARACTER = new RegExp(`^[${JAPANESE}]$`);
const KANA_THROUGHOUT = new RegExp(`^[${HIRAGANA}${KATAKANA}]+$`);

export function isJapanese(character: string): boolean {
  return JAPANESE_CHARACTER.test(character);
}

/** A word written without kanji, which dictionaries file under its spelling alone. */
export function isEntirelyKana(text: string): boolean {
  return KANA_THROUGHOUT.test(text);
}
