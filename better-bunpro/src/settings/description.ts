import { element } from '../dom';

/**
 * Settings copy marks hotkeys with backticks (`Tab`, `S`). Those become a
 * styled `<kbd>`; everything else stays plain text.
 */
export function descriptionNodes(text: string): (string | HTMLElement)[] {
  const nodes: (string | HTMLElement)[] = [];
  const pattern = /`([^`]+)`/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) {
      nodes.push(text.slice(last, start));
    }
    nodes.push(element('kbd', { class: 'bb-kbd' }, [match[1]]));
    last = start + match[0].length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes.length > 0 ? nodes : [text];
}
