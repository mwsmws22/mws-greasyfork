import { requestText } from '../cross-origin';
import { isSameWord, parsePage, type AudioSource, type Word } from './source';

const ENDPOINT = 'https://www.japanesepod101.com/learningcenter/reference/dictionary_post';

/**
 * JapanesePod101's dictionary search, which reaches recordings the audio
 * endpoint alone does not, and shows the reading of every entry it returns.
 */
export const japanesePod101Dictionary: AudioSource = {
  name: 'JapanesePod101 dictionary',

  async find(word) {
    const page = parsePage(await requestText(searchFor(word)));
    return recordingsIn(page, word);
  },
};

function searchFor({ term }: Word) {
  return {
    url: ENDPOINT,
    method: 'POST' as const,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      post: 'dictionary_reference',
      match_type: 'exact',
      search_query: term,
      vulgar: 'true',
    }).toString(),
  };
}

/** Each result carries its own player; the first one in a row plays at normal speed. */
function recordingsIn(page: Document, word: Word): string[] {
  const urls = new Set<string>();
  for (const row of page.querySelectorAll('.dc-result-row')) {
    const url = row.querySelector('audio source')?.getAttribute('src');
    if (url && isSameWord(word, row.querySelector('.dc-vocab_kana')?.textContent)) {
      urls.add(new URL(url, ENDPOINT).href);
    }
  }
  return [...urls];
}

