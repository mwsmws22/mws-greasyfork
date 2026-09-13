import { describe, expect, it } from 'vitest';
import { indexOfRenderedSentence } from './shown';

/**
 * Parts are what a cloze question renders either side of its blank. The text in
 * the blank is whatever the reviewer typed, so matching must not depend on it.
 */
const candidates = [
  ['ケーキを', 'ました。'],
  ['ご飯(ごはん)を', 'ました。'],
  ['まだ何も', 'ていません。'],
];

describe('indexOfRenderedSentence', () => {
  it('identifies the sentence a cloze question is showing', () => {
    expect(indexOfRenderedSentence('ご飯(ごはん)を食べました。', candidates)).toBe(1);
  });

  it('ignores whatever was typed into the blank', () => {
    expect(indexOfRenderedSentence('ケーキを たべ ました。', candidates)).toBe(0);
  });

  it('reports no match rather than guessing', () => {
    expect(indexOfRenderedSentence('全然違う文です。', candidates)).toBe(-1);
  });

  it('never matches a sentence that is only a blank', () => {
    expect(indexOfRenderedSentence('食べました。', [['', '']])).toBe(-1);
  });
});
