import { furiganaToRuby } from '../../bunpro/furigana';
import type { ClickedTerm } from '../../bunpro/lookup';
import { termPageUrl, termSearchUrl } from '../../bunpro/term-search';
import { addTermToReviews } from '../../bunpro/user-reviews';
import { element } from '../../dom';
import { buildActionButton } from '../../ui/action-button';

export function buildLookupPending(): HTMLElement {
  return element('p', { class: 'bb-popover-term text-small text-tertiary-fg' }, ['Looking up…']);
}

export function buildLookupCard(found: ClickedTerm | null, word: string): HTMLElement {
  return found ? buildFoundCard(found) : buildMissingCard(word);
}

function buildFoundCard(found: ClickedTerm): HTMLElement {
  const heading = element('p', { class: 'bb-popover-term text-large font-bold' });
  heading.innerHTML = furiganaToRuby(found.term.furigana);

  return element('div', { class: 'flex flex-col gap-8' }, [
    heading,
    element('p', { class: 'text-small text-secondary-fg' }, [found.term.meaning]),
    buildActionButton({
      labels: {
        idle: 'Add to reviews',
        working: 'Adding…',
        done: found.term.isInReviews ? 'Already in reviews' : 'Added to reviews',
        failed: 'Could not add to reviews',
      },
      startAs: found.term.isInReviews ? 'done' : 'idle',
      run: () => addTermToReviews(found.term),
    }),
    buildLink('More info', termPageUrl(found.term)),
  ]);
}

function buildMissingCard(word: string): HTMLElement {
  return element('div', { class: 'flex flex-col gap-8' }, [
    element('p', { class: 'bb-popover-term text-large font-bold' }, [word]),
    element('p', { class: 'text-small text-tertiary-fg' }, ['No matching Bunpro vocab.']),
    buildLink('Search Bunpro', termSearchUrl(word)),
  ]);
}

function buildLink(label: string, href: string): HTMLElement {
  return element(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noreferrer noopener',
      class: 'text-small text-primary-accent',
    },
    [label],
  );
}
