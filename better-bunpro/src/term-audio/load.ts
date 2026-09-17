import type { Reviewable, StudyQuestion } from '../bunpro/api';
import { fetchReviewable, fetchStudyQuestions } from '../bunpro/api';
import type { ReviewableRef } from '../bunpro/quiz-state';
import { warnOnce } from '../report';
import type { AudioOrigin } from './origin';
import { bunproOrigin } from './origin';
import { findReplacement } from './replacements';
import { synthesisedTermAudio } from './term';

/**
 * The reviewable is cached with its sentences, so this can run as soon as a
 * vocab question appears and again when the answer is revealed.
 *
 * `onOrigin` is called once with Bunpro's own label, then again if a dictionary
 * recording replaces TTS. Dictionary lookup is skipped when any example
 * sentence already has audio — even Bunpro TTS — so this only hunts for clips
 * on vocab whose examples have none.
 */
export async function loadTermAudio(
  term: ReviewableRef,
  onOrigin: (origin: AudioOrigin) => void,
): Promise<void> {
  try {
    const item = await fetchReviewable(term);
    if (!item || !hasTermAudio(item)) {
      return;
    }

    const origin = bunproOrigin(item.has_tts_audio);
    onOrigin(origin);

    if (await examplesHaveAudio(term)) {
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

async function examplesHaveAudio(term: ReviewableRef): Promise<boolean> {
  const sentences = await fetchStudyQuestions(term);
  return sentences.some(studyQuestionHasAudio);
}

function studyQuestionHasAudio(sentence: StudyQuestion): boolean {
  return sentence.male_audio_url !== null || sentence.female_audio_url !== null;
}
