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
   * Treat the answer bar like Details — always use the term lookup result.
   * Vocabulary detail pages have no example-sentence clip to protect.
   */
  ignoreExampleAudio?: boolean;
}

/** Origins for the quiz answer-bar vs Details pitch-accent play controls. */
export interface TermAudioOrigins {
  answer: AudioOrigin;
  details: AudioOrigin;
}

/**
 * Loads term-audio origins for the quiz answer bar and Details pitch play.
 *
 * ## Policy (do not collapse these into one origin)
 *
 * 1. **Details** — always term audio. Always dictionary-lookup. Blue when real.
 * 2. **Answer bar** — if `exampleOnScreenHasAudio()` (sentence clip on this
 *    review), stay on Bunpro (white) even when JPod exists for the term.
 *    Otherwise the answer bar is term audio → same lookup as Details (blue when
 *    real).
 * 3. Detection rules live in `example-audio.ts` — hidden footer Play buttons are
 *    not examples; sentence TTS prefetch `/audio/vocab/tts/` is.
 */
export async function loadTermAudio(
  term: ReviewableRef,
  onOrigins: (origins: TermAudioOrigins) => void,
  options: LoadTermAudioOptions = {},
): Promise<void> {
  try {
    const item = await fetchReviewable(term);
    if (!item || !hasTermAudio(item)) {
      return;
    }

    const bunpro = bunproOrigin(item.has_tts_audio);
    onOrigins({ answer: bunpro, details: bunpro });

    const leaveAnswerOnBunpro =
      !options.ignoreExampleAudio && exampleOnScreenHasAudio();

    const audio = synthesisedTermAudio(item);
    if (!audio) {
      return;
    }

    const replacement = await findReplacement(audio);
    if (replacement === null) {
      return;
    }

    onOrigins({
      answer: leaveAnswerOnBunpro ? bunpro : replacement,
      details: replacement,
    });
  } catch (error) {
    warnOnce('term-audio', 'Could not replace synthesised term audio:', error);
  }
}

function hasTermAudio(item: Reviewable): boolean {
  return item.male_audio_url !== null || item.female_audio_url !== null;
}
