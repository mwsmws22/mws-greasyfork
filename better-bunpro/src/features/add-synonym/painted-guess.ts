/**
 * After a synonym is added we paint that guess into the answer field so it
 * still looks like what you typed. The field is shared with the next question,
 * so this is forgotten as soon as the quiz moves on.
 */
let painted: { reviewKey: string; guess: string } | null = null;

export function rememberPaintedGuess(reviewKey: string, guess: string): void {
  painted = { reviewKey, guess };
}

export function paintedGuessFor(reviewKey: string | null): string | null {
  if (painted === null || reviewKey === null || painted.reviewKey !== reviewKey) {
    return null;
  }
  return painted.guess;
}

/**
 * Once the quiz is on a different review, the painted synonym is leftover.
 * Returns it so the field can be cleared, then forgets it.
 */
export function takeStalePaintedGuess(reviewKey: string | null): string | null {
  if (painted === null || reviewKey === null || painted.reviewKey === reviewKey) {
    return null;
  }
  const guess = painted.guess;
  painted = null;
  return guess;
}

export function forgetPaintedGuess(): void {
  painted = null;
}
