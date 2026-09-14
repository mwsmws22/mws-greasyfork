import { describe, expect, it } from 'vitest';
import { rememberAcceptedGuess, takeAcceptedOfficial, takeAcceptedOfficialForReview } from './accepted-guess';

describe('accepted guess after adding a synonym', () => {
  it('hands back the official answer once, then forgets it', () => {
    rememberAcceptedGuess('vocab:1@s', 'gunun', 'to have guts');

    expect(takeAcceptedOfficial('vocab:1@s', 'gunun')).toBe('to have guts');
    expect(takeAcceptedOfficial('vocab:1@s', 'gunun')).toBeNull();
  });

  it('does not hand back an official answer for a different review or guess', () => {
    rememberAcceptedGuess('vocab:1@s', 'gunun', 'to have guts');

    expect(takeAcceptedOfficial('vocab:2@s', 'gunun')).toBeNull();
    expect(takeAcceptedOfficial('vocab:1@s', 'other')).toBeNull();
    expect(takeAcceptedOfficial('vocab:1@s', 'gunun')).toBe('to have guts');
  });

  it('still recognises the guess after Bunpro undo strips the last character', () => {
    rememberAcceptedGuess('vocab:1@s', 'gunun', 'to have guts');

    expect(takeAcceptedOfficial('vocab:1@s', 'gunu')).toBe('to have guts');
  });

  it('hands back the official answer for a review without checking the field', () => {
    rememberAcceptedGuess('vocab:1@s', 'gunun', 'to have guts');

    expect(takeAcceptedOfficialForReview('vocab:1@s')).toBe('to have guts');
    expect(takeAcceptedOfficialForReview('vocab:1@s')).toBeNull();
  });
});
