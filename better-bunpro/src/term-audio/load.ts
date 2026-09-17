import type { Reviewable } from '../bunpro/api';
import { fetchReviewable } from '../bunpro/api';
import type { ReviewableRef } from '../bunpro/quiz-state';
import { warnOnce } from '../report';
import { exampleOnScreenHasAudio } from './example-audio';
import type { AudioOrigin } from './origin';
import { bunproOrigin } from './origin';
import { findReplacement } from './replacements';
import { synthesisedTermAudio } from './term';

export interface LoadTermAudioOptions {
  /**
   * Always hunt for a dictionary recording of the term — used on vocabulary
   * Details pages, where the pitch-accent control is term audio even if an
   * example sentence elsewhere on the page has a clip.
   */
  ignoreExampleAudio?: boolean;
}

/**
 * The reviewable is cached with its sentences, so this can run as soon as a
 * vocab question appears and again when the answer is revealed.
 *
 * `onOrigin` is called once with Bunpro's own label, then again if a dictionary
 * recording replaces TTS. When the example on screen already has audio, we
 * leave Bunpro alone and do not look up a term recording — unless
 * `ignoreExampleAudio` is set.
 */
export async function loadTermAudio(
  term: ReviewableRef,
  onOrigin: (origin: AudioOrigin) => void,
  options: LoadTermAudioOptions = {},
): Promise<void> {
  try {
    const item = await fetchReviewable(term);
    if (!item || !hasTermAudio(item)) {
      return;
    }

    const origin = bunproOrigin(item.has_tts_audio);
    onOrigin(origin);

    if (!options.ignoreExampleAudio && exampleOnScreenHasAudio()) {
      return;
    }

    const audio = synthesisedTermAudio(item);
    if (!audio) {
      return;
    }

    const replacement = await findReplacement(audio);
    if (replacement !== null) {
      onOrigin(replacement);
    }
  } catch (error) {
    warnOnce('term-audio', 'Could not replace synthesised term audio:', error);
  }
}

function hasTermAudio(item: Reviewable): boolean {
  return item.male_audio_url !== null || item.female_audio_url !== null;
}
