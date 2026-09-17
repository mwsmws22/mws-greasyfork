// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { descriptionNodes } from './description';

describe('descriptionNodes', () => {
  it('wraps backtick hotkeys in kbd elements and keeps surrounding text', () => {
    const nodes = descriptionNodes(
      'Press `Tab` to cycle, or `S` to save. Plain text stays plain.',
    );

    expect(nodes).toHaveLength(5);
    expect(nodes[0]).toBe('Press ');
    expect(nodes[1]).toBeInstanceOf(HTMLElement);
    expect((nodes[1] as HTMLElement).tagName).toBe('KBD');
    expect((nodes[1] as HTMLElement).className).toBe('bb-kbd');
    expect((nodes[1] as HTMLElement).textContent).toBe('Tab');
    expect(nodes[2]).toBe(' to cycle, or ');
    expect((nodes[3] as HTMLElement).textContent).toBe('S');
    expect(nodes[4]).toBe(' to save. Plain text stays plain.');
  });

  it('returns the whole string when there are no hotkeys', () => {
    expect(descriptionNodes('No shortcuts here.')).toEqual(['No shortcuts here.']);
  });
});
