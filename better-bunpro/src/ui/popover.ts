/**
 * One floating card, anchored to something on the page. Only one is ever open,
 * so whoever opens a popover replaces whatever was open before, and nothing has
 * to remember to close anybody else's.
 *
 * Positioning is `fixed`, because the anchor is measured in viewport coordinates
 * and the quiz scrolls underneath.
 */
import { element } from '../dom';
import { injectStyles } from '../styles';
import { claimKeystrokes } from './keystrokes';

const POPOVER_ID = 'bb-popover';
const CARD_CLASS =
  'bb-popover fixed z-modal flex flex-col gap-8 rounded-normal border border-rim ' +
  'bg-secondary-bg p-12 text-primary-fg shadow-normal animate-fade-in';

/** Kept clear of the viewport edges, and of the word itself. */
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

interface OpenPopover {
  card: HTMLElement;
  anchor: () => DOMRect | null;
  release: () => void;
}

let open: OpenPopover | null = null;

export function isPopoverOpen(): boolean {
  return open !== null;
}

/**
 * `anchor` is re-read whenever the popover may have moved, so a card stays with
 * its word as the page reflows. Returning null means the word is gone, and so is
 * the popover.
 */
export function openPopover(anchor: () => DOMRect | null, content: HTMLElement): void {
  closePopover();
  injectStyles();

  const card = element('div', { id: POPOVER_ID, class: CARD_CLASS, role: 'dialog' }, [content]);
  document.body.append(card);

  open = { card, anchor, release: claimKeystrokes(card, closePopover) };
  positionPopover();

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('scroll', positionPopover, true);
  window.addEventListener('resize', positionPopover);
}

export function closePopover(): void {
  if (!open) {
    return;
  }
  open.release();
  open.card.remove();
  open = null;

  window.removeEventListener('pointerdown', onPointerDown, true);
  window.removeEventListener('scroll', positionPopover, true);
  window.removeEventListener('resize', positionPopover);
}

/** Replaces the contents of the open popover, for a card that was still loading. */
export function replacePopoverContent(content: HTMLElement): void {
  if (!open) {
    return;
  }
  open.card.replaceChildren(content);
  positionPopover();
}

function onPointerDown(event: PointerEvent): void {
  const target = event.target;
  if (!open || (target instanceof Node && open.card.contains(target))) {
    return;
  }
  closePopover();
}

/** Below the word by preference, above it when the card would not fit below. */
function positionPopover(): void {
  if (!open) {
    return;
  }
  const anchor = open.anchor();
  if (!anchor) {
    closePopover();
    return;
  }

  const card = open.card.getBoundingClientRect();
  const spaceBelow = window.innerHeight - anchor.bottom - ANCHOR_GAP - VIEWPORT_MARGIN;
  const fitsBelow = card.height <= spaceBelow;
  const top = fitsBelow
    ? anchor.bottom + ANCHOR_GAP
    : Math.max(VIEWPORT_MARGIN, anchor.top - ANCHOR_GAP - card.height);

  const left = clamp(
    anchor.left + anchor.width / 2 - card.width / 2,
    VIEWPORT_MARGIN,
    window.innerWidth - card.width - VIEWPORT_MARGIN,
  );

  open.card.style.top = `${Math.round(top)}px`;
  open.card.style.left = `${Math.round(Math.max(VIEWPORT_MARGIN, left))}px`;
}

function clamp(value: number, lowest: number, highest: number): number {
  return Math.min(Math.max(value, lowest), highest);
}
