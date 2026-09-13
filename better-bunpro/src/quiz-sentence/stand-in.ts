/**
 * We never rewrite Bunpro's own nodes: React owns them and would patch a
 * mangled tree. Instead each of our nodes stands in for one of theirs, which we
 * hide and hand straight back the moment we let go.
 */
const OURS = 'data-bb-ours';
const HIDDEN_BY_US = 'data-bb-hidden';

export interface StandIn {
  ours: HTMLElement;
  /** Bunpro's node ours is displayed instead of, re-resolved on every repaint. */
  hides?: () => HTMLElement | null;
  /** Where ours belongs when it stands in for nothing. */
  appendTo?: () => HTMLElement | null;
}

export function markAsOurs(node: HTMLElement): HTMLElement {
  node.setAttribute(OURS, '');
  return node;
}

/** Idempotent, so it can be re-run every time Bunpro re-renders the quiz. */
export function paintStandIns(standIns: readonly StandIn[]): void {
  for (const standIn of standIns) {
    const original = standIn.hides?.() ?? null;
    if (original) {
      hide(original);
    }
    if (standIn.ours.isConnected) {
      continue;
    }
    if (original) {
      original.after(standIn.ours);
    } else {
      standIn.appendTo?.()?.append(standIn.ours);
    }
  }
}

export function removeStandIns(): void {
  for (const ours of document.querySelectorAll(`[${OURS}]`)) {
    ours.remove();
  }
  for (const hidden of document.querySelectorAll<HTMLElement>(`[${HIDDEN_BY_US}]`)) {
    hidden.style.removeProperty('display');
    hidden.removeAttribute(HIDDEN_BY_US);
  }
}

/** Bunpro's nodes carry display utility classes, so only an inline style is specific enough. */
function hide(node: HTMLElement): void {
  if (node.style.display !== 'none') {
    node.style.display = 'none';
    node.setAttribute(HIDDEN_BY_US, '');
  }
}
