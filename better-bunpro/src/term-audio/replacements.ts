import type { AudioOrigin } from './origin';
import { findRecording } from './recording';
import { forget, forgetAll, remember, type SynthesisedAudio } from './store';

interface Lookup {
  ttsUrls: readonly string[];
  recording: Promise<string | null>;
  origin: Promise<AudioOrigin | null>;
}

/** Word to the lookup made for it, oldest first. */
const lookups = new Map<string, Lookup>();

/** How many words a session keeps recordings for. Older ones are let go of. */
const REMEMBERED = 50;

/**
 * Resolves once we know whether this word has a recording; one lookup per word.
 * Returns the dictionary origin when a recording was filed, otherwise null.
 */
export async function findReplacement(audio: SynthesisedAudio): Promise<AudioOrigin | null> {
  const word = `${audio.term}|${audio.reading}`;
  let lookup = lookups.get(word);
  if (!lookup) {
    const found = findRecording(audio);
    lookup = {
      ttsUrls: audio.ttsUrls,
      recording: found.then((hit) => hit?.url ?? null),
      origin: found.then((hit) => hit?.origin ?? null),
    };
    lookups.set(word, lookup);
    forgetOldest();
  }

  const [recording, origin] = await Promise.all([lookup.recording, lookup.origin]);
  if (recording !== null && origin !== null && lookups.get(word) === lookup) {
    remember(lookup.ttsUrls, recording, origin);
    return origin;
  }
  return null;
}

export function forgetReplacements(): void {
  for (const lookup of lookups.values()) {
    void lookup.recording.then(revoke);
  }
  lookups.clear();
  forgetAll();
}

/** The browser holds on to a blob URL until it is revoked, so old ones are. */
function forgetOldest(): void {
  for (const [word, lookup] of lookups) {
    if (lookups.size <= REMEMBERED) {
      return;
    }
    lookups.delete(word);
    forget(lookup.ttsUrls);
    void lookup.recording.then(revoke);
  }
}

function revoke(recording: string | null): void {
  if (recording !== null) {
    URL.revokeObjectURL(recording);
  }
}
