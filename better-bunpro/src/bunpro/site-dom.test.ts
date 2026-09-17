// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { findSiteHeaderActionLists, findSiteHeaderHelpItem } from './site-dom';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('findSiteHeaderActionLists', () => {
  it('finds the desktop gap-12 Search → Help row', () => {
    document.body.innerHTML = `
      <ul class="flex items-center gap-12">
        <li><button title="Notifications"><svg data-name="NOTIFICATION"></svg></button></li>
        <li><a title="Complete Vocab and Grammar dictionary"><svg data-name="SEARCH"></svg></a></li>
        <li><a title="Support & FAQ" href="/support"><svg data-name="HELP_OUTLINE"></svg></a></li>
      </ul>
    `;

    const lists = findSiteHeaderActionLists();
    expect(lists).toHaveLength(1);
    expect(findSiteHeaderHelpItem(lists[0])?.querySelector('a')?.getAttribute('href')).toBe(
      '/support',
    );
  });

  it('finds the nested mobile gap-8 row too', () => {
    document.body.innerHTML = `
      <ul class="flex items-center gap-8">
        <li><a title="Complete Vocab and Grammar dictionary"><svg data-name="SEARCH"></svg></a></li>
        <li><a title="Support & FAQ"><svg data-name="HELP_OUTLINE"></svg></a></li>
      </ul>
      <ul class="flex items-center gap-8">
        <li><a title="Learn">Learn</a></li>
      </ul>
    `;

    expect(findSiteHeaderActionLists()).toHaveLength(1);
  });
});
