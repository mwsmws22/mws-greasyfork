/**
 * Bunpro listens for its quiz hotkeys on `document`, and our own features listen
 * in the capture phase on `window`, so a keystroke meant for a panel or popup of
 * ours has to be claimed ahead of both or it is acted on twice.
 *
 * Whatever of ours is on screen claims the keyboard for as long as it is open;
 * features that read keys ask `areKeystrokesClaimed` and stay out of the way.
 */
const claims: { node: HTMLElement; onEscape: () => void }[] = [];

export function claimKeystrokes(node: HTMLElement, onEscape: () => void): () => void {
  const claim = { node, onEscape };
  claims.push(claim);
  if (claims.length === 1) {
    window.addEventListener('keydown', onKeyDown, true);
  }

  return () => {
    const index = claims.indexOf(claim);
    if (index !== -1) {
      claims.splice(index, 1);
    }
    if (claims.length === 0) {
      window.removeEventListener('keydown', onKeyDown, true);
    }
  };
}

export function areKeystrokesClaimed(): boolean {
  return claims.length > 0;
}

/** Quiz hotkeys ignore chords so Ctrl/Alt/Meta/Shift stay with the browser or Bunpro. */
export function hasModifier(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

/**
 * Escape closes the newest thing we have open, wherever focus is. Every other
 * key is only ours when it was aimed at our own UI: typing anywhere else still
 * belongs to the quiz.
 */
function onKeyDown(event: KeyboardEvent): void {
  const newest = claims[claims.length - 1];
  if (!newest) {
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    newest.onEscape();
    return;
  }

  const target = event.target;
  if (target instanceof Node && claims.some((claim) => claim.node.contains(target))) {
    event.stopPropagation();
  }
}
