/**
 * After a synonym is added, the next Enter should submit as a pass. This
 * session's answer list will not include the new synonym, so we hand back an
 * official answer Bunpro already accepts and submit that instead.
 */
let accepted: { reviewKey: string; guess: string; official: string } | null = null;

export function rememberAcceptedGuess(reviewKey: string, guess: string, official: string): void {
  accepted = { reviewKey, guess, official };
}

export function takeAcceptedOfficial(reviewKey: string, guess: string): string | null {
  if (accepted === null || accepted.reviewKey !== reviewKey || !isRememberedGuess(accepted.guess, guess)) {
    return null;
  }
  return takeOfficial();
}

export function takeAcceptedOfficialForReview(reviewKey: string): string | null {
  if (accepted === null || accepted.reviewKey !== reviewKey) {
    return null;
  }
  return takeOfficial();
}

function takeOfficial(): string {
  const official = accepted?.official ?? '';
  accepted = null;
  return official;
}

/**
 * Bunpro's post-attempt undo is a soft backspace: it puts the typed answer back
 * with the last character missing. That leftover still counts as the same guess.
 */
function isRememberedGuess(original: string, guess: string): boolean {
  return guess === original || guess === original.slice(0, -1);
}
