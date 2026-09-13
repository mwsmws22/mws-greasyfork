/**
 * The places that hold recordings of Japanese words read aloud by people, and
 * how to ask each of them. Ported from Yomitan's audio downloader, which has
 * been finding these recordings for years:
 * https://github.com/yomidevs/yomitan/blob/master/ext/js/media/audio-downloader.js
 */

/** A word as a dictionary files it: how it is written, and how it is read. */
export interface Word {
  term: string;
  reading: string;
}

export interface AudioSource {
  /** Named in any warning about a failed lookup. */
  name: string;

  /** Recordings of the word, best first, or nothing when the source has none. */
  find(word: Word): Promise<string[]>;

  /**
   * SHA-256 of the stand-in clip a source hands back, with an ordinary 200, for
   * words it does not have. Only sources that answer that way declare one.
   */
  placeholderDigest?: string;
}

/** Parsed this way a page is inert: no script runs and nothing is fetched from it. */
export function parsePage(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

/**
 * An exact-match search still returns homographs, so a result only counts when
 * it is read the way we expect. A word that is its own reading matches anything,
 * since there is then nothing to tell its homographs apart by.
 */
export function isSameWord(
  { term, reading }: Word,
  entryReading: string | null | undefined,
): boolean {
  const kana = entryReading?.trim() ?? '';
  if (kana === '') {
    return false;
  }
  return reading === term || reading === kana;
}

/** Jisho labels every clip with the spelling and reading it belongs to. */
export function clipId({ term, reading }: Word): string {
  return `audio_${term}:${reading}`;
}
