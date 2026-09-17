/**
 * Site chrome outside the quiz article — the global header's right-hand icon
 * row (notifications, search, help, …).
 */

/**
 * Every Search → Help icon list in the site header (desktop `gap-12` and the
 * nested mobile `gap-8` row).
 */
export function findSiteHeaderActionLists(): HTMLElement[] {
  const lists: HTMLElement[] = [];
  for (const help of document.querySelectorAll('svg[data-name="HELP_OUTLINE"]')) {
    const list = help.closest('ul');
    if (!(list instanceof HTMLElement)) {
      continue;
    }
    if (!list.querySelector('svg[data-name="SEARCH"]')) {
      continue;
    }
    if (!lists.includes(list)) {
      lists.push(list);
    }
  }
  return lists;
}

/** The Help item we insert Better Bunpro immediately before. */
export function findSiteHeaderHelpItem(list: HTMLElement): HTMLElement | null {
  const help = list.querySelector('svg[data-name="HELP_OUTLINE"]');
  return help?.closest('li') ?? null;
}
