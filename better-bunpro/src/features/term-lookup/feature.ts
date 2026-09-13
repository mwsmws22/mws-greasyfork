import { findLookupRoot, findSentenceJapanese } from '../../bunpro/quiz-dom';
import { lookupClickedTerm } from '../../bunpro/lookup';
import { textRunFromCaret } from '../../japanese/text-run';
import { injectStyles } from '../../styles';
import { closePopover, openPopover, replacePopoverContent } from '../../ui/popover';
import type { Feature } from '../registry';
import { buildLookupCard, buildLookupPending } from './card';

const LOOKUP_CLASS = 'bb-lookup-target';

let remountObserver: MutationObserver | null = null;
let lookupGeneration = 0;

export const termLookupFeature: Feature = {
  id: 'term-lookup',
  title: 'Look up words in example sentences',
  description:
    'Click a Japanese word in an example sentence, a cloze question, or an unverified ' +
    'sentence to look it up on Bunpro. The popup shows the reading and meaning when Bunpro ' +
    'has them, a button to add the term to your reviews, and a link to its page. Words are ' +
    'recognised the same way Yomitan is: the longest match from the click, deinflected, ' +
    'against Bunpro\'s own vocab search.',
  enabledByDefault: true,

  start() {
    injectStyles();
    markLookupTargets();
    remountObserver = new MutationObserver(markLookupTargets);
    remountObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('click', onClick, true);
  },

  stop() {
    lookupGeneration += 1;
    window.removeEventListener('click', onClick, true);
    remountObserver?.disconnect();
    remountObserver = null;
    closePopover();
    for (const node of document.querySelectorAll(`.${LOOKUP_CLASS}`)) {
      node.classList.remove(LOOKUP_CLASS);
    }
  },
};

function markLookupTargets(): void {
  for (const node of findSentenceJapanese()) {
    node.classList.add(LOOKUP_CLASS);
  }
}

function onClick(event: MouseEvent): void {
  if (event.button !== 0 || hasSelection()) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  const clicked = target instanceof Element ? target : target.parentElement;
  if (clicked?.closest('button, a')) {
    return;
  }
  const root = findLookupRoot(target);
  const caret = caretFromClick(event);
  if (!root || !caret || !root.contains(caret.node)) {
    return;
  }

  const word = textRunFromCaret(root, caret.node, caret.offset);
  if (word === '') {
    return;
  }

  event.stopPropagation();
  lookupGeneration += 1;
  const generation = lookupGeneration;
  const anchor = rectOf(root, caret);
  openPopover(anchor, buildLookupPending());
  void fillPopover(word, generation);
}

async function fillPopover(word: string, generation: number): Promise<void> {
  const found = await lookupClickedTerm(word);
  if (generation !== lookupGeneration) {
    return;
  }
  replacePopoverContent(buildLookupCard(found, found?.surface ?? word));
}

function hasSelection(): boolean {
  return (window.getSelection()?.toString() ?? '') !== '';
}

function caretFromClick(event: MouseEvent): { node: Node; offset: number } | null {
  const caret = document.caretPositionFromPoint?.(event.clientX, event.clientY);
  if (caret) {
    return { node: caret.offsetNode, offset: caret.offset };
  }
  const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

function rectOf(root: HTMLElement, caret: { node: Node; offset: number }): () => DOMRect | null {
  const range = document.createRange();
  try {
    range.setStart(caret.node, caret.offset);
    const end =
      caret.node.nodeType === Node.TEXT_NODE
        ? Math.min(caret.offset + 1, caret.node.textContent?.length ?? caret.offset)
        : caret.offset;
    range.setEnd(caret.node, end);
  } catch {
    return () => (root.isConnected ? root.getBoundingClientRect() : null);
  }

  return () => {
    if (!root.isConnected) {
      return null;
    }
    const rect = range.getBoundingClientRect();
    if (rect.x === 0 && rect.y === 0 && rect.width === 0 && rect.height === 0) {
      return root.getBoundingClientRect();
    }
    return rect.width === 0 ? new DOMRect(rect.x, rect.y, 1, Math.max(rect.height, 1)) : rect;
  };
}
