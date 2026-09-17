import { isEntirelyKana } from '../../japanese/characters';
import type { AudioSource, Word } from './source';

const ENDPOINT = 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php';

/**
 * JapanesePod101 answers every lookup with a 200 and an mp3. When it has no
 * recording the mp3 is a voice saying so, always byte for byte the same one, so
 * Yomitan recognises it by hash and so do we.
 */
const PLACEHOLDER_DIGEST = 'ae6398b5a27bc8c0a771df6c907ade794be15518174773c58c7c7ddd17098906';

export const jpod101: AudioSource = {
  name: 'JapanesePod101',
  placeholderDigest: PLACEHOLDER_DIGEST,

  async find(word) {
    // kanji=委ねる&kana=委ねる is always the placeholder. Skip so the dictionary
    // source can resolve the real reading (e.g. when Bunpro omits kana).
    if (kanjiWordMissingReading(word)) {
      return [];
    }
    return [jpod101Url(word)];
  },
};

/**
 * A word written in kana alone is filed under its reading, and asking for it as
 * a spelling finds nothing, so in that case only the reading is sent.
 */
export function jpod101Url({ term, reading }: Word): string {
  const query = new URLSearchParams();
  if (term !== '' && !(term === reading && isEntirelyKana(term))) {
    query.set('kanji', term);
  }
  if (reading !== '') {
    query.set('kana', reading);
  }
  return `${ENDPOINT}?${query}`;
}

/** Bunpro sometimes leaves kana null; we then fall back to the spelling as reading. */
export function kanjiWordMissingReading({ term, reading }: Word): boolean {
  return term !== '' && reading === term && !isEntirelyKana(term);
}
