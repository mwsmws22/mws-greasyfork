import { hasNativeSentenceCard } from '../../bunpro/quiz-dom';
import {
  readQuizState,
  watchQuizState,
  type QuizState,
  type ReviewableRef,
} from '../../bunpro/quiz-state';
import { termKey } from '../../bunpro/review';
import { loadSentences } from '../../quiz-sentence/load';
import { solvedReviewKey } from '../../quiz-sentence/review';
import {
  clearSentence,
  dropSentenceUnless,
  showSentence,
  shownSentence,
} from '../../quiz-sentence/slot';
import { injectStyles } from '../../styles';
import type { Feature } from '../registry';
import { pickSentenceIndex } from './rotation';
import { termToPrefetch, termToShow } from './timing';

let stopWatchingQuiz: (() => void) | null = null;

export const exampleSentenceFeature: Feature = {
  id: 'example-sentence',
  title: 'Show unverified example sentences for A1+ vocab',
  description:
    'After a correct answer, show example sentences for A1+ vocab that Bunpro\'s website hides ' +
    '(the mobile app already shows them). A different sentence rotates each review session.',
  enabledByDefault: true,

  start() {
    injectStyles();
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
  },

  stop() {
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    clearSentence();
  },
};

function onQuizStateChange(state: QuizState): void {
  dropSentenceUnless(solvedReviewKey(state));

  const upcoming = termToPrefetch(state);
  if (upcoming) {
    void loadSentences(upcoming);
  }

  const term = termToShow(state, hasNativeSentenceCard());
  const reviewKey = solvedReviewKey(state);
  if (!term || !reviewKey || !state.sessionId || shownSentence()?.reviewKey === reviewKey) {
    return;
  }
  void showRotatedSentence(term, reviewKey, state.sessionId);
}

async function showRotatedSentence(
  term: ReviewableRef,
  reviewKey: string,
  sessionId: string,
): Promise<void> {
  const sentences = await loadSentences(term);
  if (sentences.length === 0) {
    return;
  }

  /** The question may have moved on, or Tab may have chosen a sentence, while we fetched. */
  if (solvedReviewKey(readQuizState()) !== reviewKey || shownSentence()?.reviewKey === reviewKey) {
    return;
  }

  const index = pickSentenceIndex(termKey(term), sessionId, sentences.length);
  showSentence({ reviewKey, sentences, index });
}
