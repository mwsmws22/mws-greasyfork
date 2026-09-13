import { fetchStudyQuestions, type StudyQuestion } from '../bunpro/api';
import type { ReviewableRef } from '../bunpro/quiz-state';
import { warnOnce } from '../report';

/**
 * Results are cached per term by `fetchStudyQuestions`, so features can call
 * this as often as they like: to prefetch while the question is on screen, and
 * again when a sentence is actually needed.
 */
export async function loadSentences(term: ReviewableRef): Promise<StudyQuestion[]> {
  try {
    return await fetchStudyQuestions(term);
  } catch (error) {
    warnOnce('sentences', 'Could not load example sentences:', error);
    return [];
  }
}
