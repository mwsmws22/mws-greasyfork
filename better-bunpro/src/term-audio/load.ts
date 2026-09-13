import { fetchReviewable } from '../bunpro/api';
import type { ReviewableRef } from '../bunpro/quiz-state';
import { warnOnce } from '../report';
import { findReplacement } from './replacements';
import { synthesisedTermAudio } from './term';

/**
 * The reviewable is cached with its sentences, so this can run as soon as a
 * vocab question appears and again when the answer is revealed.
 */
export async function loadTermAudio(term: ReviewableRef): Promise<void> {
  try {
    const item = await fetchReviewable(term);
    const audio = item ? synthesisedTermAudio(item) : null;
    if (audio) {
      await findReplacement(audio);
    }
  } catch (error) {
    warnOnce('term-audio', 'Could not replace synthesised term audio:', error);
  }
}
