import { afterEach, describe, expect, it } from 'vitest';
import {
  forgetPaintedGuess,
  paintedGuessFor,
  rememberPaintedGuess,
  takeStalePaintedGuess,
} from './painted-guess';

afterEach(() => {
  forgetPaintedGuess();
});

describe('painted synonym guess', () => {
  it('hands the guess back for the review it was painted on', () => {
    rememberPaintedGuess('vocab:1@s', 'test');

    expect(paintedGuessFor('vocab:1@s')).toBe('test');
    expect(paintedGuessFor('vocab:2@s')).toBeNull();
  });

  it('gives up the guess once the quiz has moved to a different review', () => {
    rememberPaintedGuess('vocab:1@s', 'test');

    expect(takeStalePaintedGuess('vocab:2@s')).toBe('test');
    expect(paintedGuessFor('vocab:1@s')).toBeNull();
    expect(takeStalePaintedGuess('vocab:2@s')).toBeNull();
  });

  it('keeps the guess while the current review is unknown or still the same', () => {
    rememberPaintedGuess('vocab:1@s', 'test');

    expect(takeStalePaintedGuess(null)).toBeNull();
    expect(takeStalePaintedGuess('vocab:1@s')).toBeNull();
    expect(paintedGuessFor('vocab:1@s')).toBe('test');
  });

  it('forgets the guess outright', () => {
    rememberPaintedGuess('vocab:1@s', 'test');
    forgetPaintedGuess();

    expect(paintedGuessFor('vocab:1@s')).toBeNull();
    expect(takeStalePaintedGuess('vocab:2@s')).toBeNull();
  });
});
