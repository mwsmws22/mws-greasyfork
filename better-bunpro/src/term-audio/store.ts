import type { Word } from './sources/source';

/**
 * Bunpro asks for audio by URL, so a recording is filed under the synthesised
 * URLs it stands in for. A word's male and female URL both lead to the same
 * recording: a real speaker has whatever voice they have.
 */

export interface SynthesisedAudio extends Word {
  ttsUrls: readonly string[];
}

/** Synthesised URL (decoded) to the recording that stands in for it. */
const recordings = new Map<string, string>();

export function remember(ttsUrls: readonly string[], recording: string): void {
  for (const url of ttsUrls) {
    recordings.set(canonicalAudioUrl(url), recording);
  }
}

export function replacementFor(ttsUrl: string): string | null {
  return recordings.get(canonicalAudioUrl(ttsUrl)) ?? null;
}

/** What the Audio element should actually load when Bunpro points it at `requested`. */
export function urlToPlay(requested: string): string {
  return replacementFor(requested) ?? requested;
}

export function forget(ttsUrls: readonly string[]): void {
  for (const url of ttsUrls) {
    recordings.delete(canonicalAudioUrl(url));
  }
}

export function forgetAll(): void {
  recordings.clear();
}

/**
 * Bunpro stores some clips percent-encoded and some not, and the Audio element
 * may rewrite the href, so every lookup goes through the same decoded key.
 */
export function canonicalAudioUrl(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}
