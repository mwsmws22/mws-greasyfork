/**
 * Bunpro stores readings inline with full-width parentheses, e.g.
 * `運命（うんめい）に身（み）を委（ゆだ）ねる`. The pair pattern below is ported
 * from Bunpro's own renderer so we split the same way.
 *
 * The ranges are regex source fragments spelled as `\uXXXX` escapes: written
 * literally, the look-alike full-width symbols do not survive text
 * normalisation, which silently turns the pattern into an invalid range.
 */
import { HIRAGANA, JAPANESE, KANJI } from '../japanese/characters';

/** ヶ also takes a reading, though it is not itself a kanji. */
const ANNOTATABLE = `${KANJI}\\u30F6`;

const FULL_WIDTH_DIGITS = String.raw`\uFF10-\uFF19`;
const FULL_WIDTH_ALNUM = String.raw`\uFF21-\uFF3A\uFF41-\uFF5A${FULL_WIDTH_DIGITS}`;
const FULL_WIDTH_COMMA = String.raw`\uFF0C`;
const SYMBOLS = String.raw`\uFF0E\uFF1A\u30FC\u301C\uFF05\uFF06\uFF20\u21D2\u2103\uFF0B\u03B2`;

const OPEN_PAREN = String.raw`\uFF08`;
const CLOSE_PAREN = String.raw`\uFF09`;

const word = `[${FULL_WIDTH_ALNUM}]*[${ANNOTATABLE}]*[${HIRAGANA}]*`;
const digitGroups = `[${FULL_WIDTH_DIGITS}]+(?:${FULL_WIDTH_COMMA}[${FULL_WIDTH_DIGITS}]+)+`;
const annotated = `((?:${word}?)|(?:${digitGroups})|(?:[${SYMBOLS}]))`;

const FURIGANA_PAIR = new RegExp(
  `${annotated}${OPEN_PAREN}([${JAPANESE}]*)${CLOSE_PAREN}`,
  'g',
);
const NON_JAPANESE = new RegExp(`[^${JAPANESE}]`);
const STARTS_ANNOTATABLE = new RegExp(`^[${ANNOTATABLE}]`);
const ALL_FULL_WIDTH = new RegExp(`^[${FULL_WIDTH_ALNUM}${SYMBOLS}${FULL_WIDTH_COMMA}]+$`);

export function furiganaToRuby(text: string): string {
  return text.replace(FURIGANA_PAIR, (pair, base: string, reading: string) =>
    canAnnotate(base, reading) ? toRuby(base, reading) : pair,
  );
}

/** The word as it is written, with the readings dropped: `食（た）べる` -> `食べる`. */
export function furiganaToWritten(text: string): string {
  return dropAnnotations(text, (base) => base);
}

/** The word as it is read, with the kanji replaced: `食（た）べる` -> `たべる`. */
export function furiganaToReading(text: string): string {
  return dropAnnotations(text, (_base, reading) => reading);
}

function dropAnnotations(text: string, keep: (base: string, reading: string) => string): string {
  return text.replace(FURIGANA_PAIR, (pair, base: string, reading: string) =>
    canAnnotate(base, reading) ? keep(base, reading) : pair,
  );
}

function canAnnotate(base: string, reading: string): boolean {
  if (base === '' || reading === '' || NON_JAPANESE.test(reading)) {
    return false;
  }
  return STARTS_ANNOTATABLE.test(base) || ALL_FULL_WIDTH.test(base);
}

function toRuby(base: string, reading: string): string {
  return `<ruby>${base}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;
}
