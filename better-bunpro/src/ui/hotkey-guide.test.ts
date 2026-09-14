// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildBetterBunproGuideSection } from './hotkey-guide';

describe('buildBetterBunproGuideSection', () => {
  it('matches Bunpro\'s Hotkey Guide sections and lists Better Bunpro keys', () => {
    const section = buildBetterBunproGuideSection([
      { key: 'S', desc: 'Add as synonym' },
      { key: 'Tab', desc: 'Cycle example sentences' },
    ]);

    expect(section.tagName).toBe('SECTION');
    expect(section.querySelector('h2 span')?.textContent).toBe('Better Bunpro');
    expect(section.textContent).toContain('Add as synonym');
    expect(section.textContent).toContain('Cycle example sentences');
    expect(
      [...section.querySelectorAll('p.text-right')].map((node) => node.textContent),
    ).toEqual(['S', 'Tab']);
  });
});
