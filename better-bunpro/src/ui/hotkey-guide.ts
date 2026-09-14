/**
 * Bunpro's Hotkey Guide (`/`) is a modal with one section per quiz mode.
 * We append a matching Better Bunpro section listing keys this script owns.
 */
import { element, svgIcon } from '../dom';
import { TUNE_SHAPES } from './better-bunpro-icon';

export const HOTKEY_GUIDE_SECTION_ID = 'bb-hotkey-guide';

export interface HotkeyGuideRow {
  key: string;
  desc: string;
}

/** Same heading, list, and row classes Bunpro uses for Translate / Fill-in / Manual. */
export function buildBetterBunproGuideSection(rows: HotkeyGuideRow[]): HTMLElement {
  return element('section', { id: HOTKEY_GUIDE_SECTION_ID }, [
    element('h2', { class: 'mb-8 flex items-center gap-8 font-bold text-primary-fg' }, [
      svgIcon('ml-4 h-30 w-30 shrink-0', TUNE_SHAPES),
      element('span', {}, ['Better Bunpro']),
    ]),
    element(
      'ul',
      { class: 'grid h-fit w-full gap-8' },
      rows.map((row) => buildRow(row)),
    ),
  ]);
}

function buildRow(row: HotkeyGuideRow): HTMLElement {
  return element('li', { class: 'rounded-normal bg-primary-bg px-12 py-8 text-small sm:py-10' }, [
    element('div', { class: 'flex items-center justify-between' }, [
      element('div', { class: 'flex items-center justify-center gap-6' }, [
        element('p', {}, [row.desc]),
      ]),
      element('p', { class: 'text-right font-bold text-primary-fg' }, [row.key]),
    ]),
  ]);
}
