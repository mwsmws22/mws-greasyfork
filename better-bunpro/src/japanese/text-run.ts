/**
 * A click in a ruby-annotated sentence is a position in two parallel strings:
 * the word as written (kanji, readings skipped) and the word as read (the
 * furigana plus the kana that follow). Which one we hand to the dictionary
 * depends on whether the click landed on a kanji or on its reading.
 */
import { isJapanese } from './characters';

export interface TextPiece {
  text: string;
  role: 'written' | 'reading';
}

export function textRunFromPieces(
  pieces: readonly TextPiece[],
  startPiece: number,
  startOffset: number,
): string {
  const start = pieces[startPiece];
  if (!start) {
    return '';
  }

  const collected: string[] = [start.text.slice(startOffset)];
  for (const piece of pieces.slice(startPiece + 1)) {
    if (start.role === 'written' && piece.role === 'reading') {
      continue;
    }
    collected.push(piece.text);
  }
  return leadingJapanese(collected.join(''));
}

/**
 * The text a dictionary should see for a caret inside `root`. Readings (`rt`)
 * are skipped unless the caret is in one; then the lookup is by reading.
 */
export function textRunFromCaret(root: Node, caret: Node, offset: number): string {
  const textNode = isText(caret) ? caret : firstText(caret.childNodes[offset] ?? caret);
  if (!textNode) {
    return '';
  }
  const pieces = piecesOf(root);
  const start = indexOfCaret(pieces, textNode, isText(caret) ? offset : 0);
  if (!start) {
    return leadingJapanese(textOf(textNode).slice(isText(caret) ? offset : 0));
  }
  return textRunFromPieces(
    pieces.map((piece) => piece.piece),
    start.index,
    start.offset,
  );
}

function firstText(node: Node): Text | null {
  if (isText(node)) {
    return node;
  }
  for (const child of node.childNodes) {
    const found = firstText(child);
    if (found) {
      return found;
    }
  }
  return null;
}

interface LocatedPiece {
  piece: TextPiece;
  node: Node;
}

function piecesOf(root: Node): LocatedPiece[] {
  const pieces: LocatedPiece[] = [];
  walk(root, (node) => {
    if (!isText(node) || textOf(node) === '') {
      return;
    }
    const role = roleOf(node);
    if (role === 'skip') {
      return;
    }
    pieces.push({ piece: { text: textOf(node), role }, node });
  });
  return pieces;
}

function indexOfCaret(
  pieces: readonly LocatedPiece[],
  caret: Node,
  offset: number,
): { index: number; offset: number } | null {
  const index = pieces.findIndex((piece) => piece.node === caret);
  if (index === -1) {
    return null;
  }
  return { index, offset };
}

function roleOf(node: Node): TextPiece['role'] | 'skip' {
  if (closestTag(node, 'RP')) {
    return 'skip';
  }
  if (closestTag(node, 'RT')) {
    return 'reading';
  }
  return 'written';
}

function closestTag(node: Node, tag: string): boolean {
  let current: Node | null = node;
  while (current) {
    if (isElement(current) && current.tagName === tag) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  for (const child of node.childNodes) {
    walk(child, visit);
  }
}

function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function textOf(node: Node): string {
  return node.nodeType === Node.TEXT_NODE ? (node.textContent ?? '') : '';
}

function leadingJapanese(text: string): string {
  const characters = [...text];
  let length = 0;
  while (length < characters.length && isJapanese(characters[length] ?? '')) {
    length += 1;
  }
  return characters.slice(0, length).join('');
}