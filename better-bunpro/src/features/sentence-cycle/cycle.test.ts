import { describe, expect, it } from 'vitest';
import { nextSentenceIndex } from './cycle';

describe('nextSentenceIndex', () => {
  it('steps forward and wraps back to the first sentence', () => {
    expect(nextSentenceIndex(0, 3)).toBe(1);
    expect(nextSentenceIndex(2, 3)).toBe(0);
  });

  it('stays put when there is nothing to cycle', () => {
    expect(nextSentenceIndex(0, 1)).toBe(0);
    expect(nextSentenceIndex(0, 0)).toBe(0);
  });
});
