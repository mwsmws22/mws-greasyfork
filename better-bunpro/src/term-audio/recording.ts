import { warnOnce } from '../report';
import { requestBlob } from './cross-origin';
import type { AudioOrigin } from './origin';
import { originFromSourceName } from './origin';
import { AUDIO_SOURCES } from './sources';
import type { AudioSource, Word } from './sources/source';

export interface FoundRecording {
  url: string;
  origin: AudioOrigin;
}

/**
 * Asks each source in turn for the word and hands back the first real recording
 * as a blob URL, so the page itself never makes a request to a dictionary site.
 * Returns null when nobody has the word, which is the common case for the long
 * phrases Bunpro also teaches as vocabulary.
 */
export async function findRecording(word: Word): Promise<FoundRecording | null> {
  for (const source of AUDIO_SOURCES) {
    const recording = await recordingFrom(source, word);
    if (recording) {
      return recording;
    }
  }
  return null;
}

async function recordingFrom(
  source: AudioSource,
  word: Word,
): Promise<FoundRecording | null> {
  try {
    for (const url of await source.find(word)) {
      const clip = await requestBlob({ url });
      if (!(await isPlaceholder(clip, source))) {
        return {
          url: URL.createObjectURL(clip),
          origin: originFromSourceName(source.name),
        };
      }
    }
  } catch (error) {
    warnOnce(`audio-source:${source.name}`, `Could not reach ${source.name} for audio:`, error);
  }
  return null;
}

async function isPlaceholder(clip: Blob, source: AudioSource): Promise<boolean> {
  return source.placeholderDigest !== undefined && (await sha256(clip)) === source.placeholderDigest;
}

export async function sha256(clip: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await clip.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
