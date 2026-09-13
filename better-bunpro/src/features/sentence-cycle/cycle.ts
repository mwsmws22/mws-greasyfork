/**
 * Cycling walks forward through every sentence an item has and wraps at the
 * end. It is deliberately not persisted: which sentence a review *starts* on is
 * the per-session rotation's decision, and pressing Tab must not disturb it.
 */
export function nextSentenceIndex(shownIndex: number, count: number): number {
  return count === 0 ? 0 : (shownIndex + 1) % count;
}
