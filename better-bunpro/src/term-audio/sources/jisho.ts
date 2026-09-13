import { requestText } from '../cross-origin';
import { clipId, parsePage, type AudioSource, type Word } from './source';

const SEARCH = 'https://jisho.org/search/';

/**
 * Jisho labels every clip on a results page with the exact spelling and reading
 * it belongs to, so the right one can be picked out without reading the page.
 */
export const jisho: AudioSource = {
  name: 'Jisho',

  async find(word) {
    const page = parsePage(await requestText({ url: SEARCH + encodeURIComponent(word.term) }));
    return recordingsIn(page, word);
  },
};

function recordingsIn(page: Document, word: Word): string[] {
  const url = page.getElementById(clipId(word))?.querySelector('source')?.getAttribute('src');
  return url ? [new URL(url, SEARCH).href] : [];
}
