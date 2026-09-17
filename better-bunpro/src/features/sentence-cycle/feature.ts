import { findClozeSentence, findNativeSentenceCard } from '../../bunpro/quiz-dom';
import {
  readQuizState,
  watchQuizState,
  type QuizState,
  type ReviewableRef,
} from '../../bunpro/quiz-state';
import { loadSentences } from '../../quiz-sentence/load';
import { solvedReviewKey } from '../../quiz-sentence/review';
import { bunproSentenceIndex } from '../../quiz-sentence/shown';
import {
  clearSentence,
  dropSentenceUnless,
  showSentence,
  shownSentence,
} from '../../quiz-sentence/slot';
import { injectStyles } from '../../styles';
import { areKeystrokesClaimed, hasModifier } from '../../ui/keystrokes';
import type { Feature } from '../registry';
import { nextSentenceIndex } from './cycle';

const CYCLE_KEY = 'Tab';

let stopWatchingQuiz: (() => void) | null = null;

export const sentenceCycleFeature: Feature = {
  id: 'sentence-cycle',
  title: 'Cycle example sentences with Tab',
  description:
    'After a correct answer, press `Tab` to cycle through other example sentences for the same ' +
    'item. Your grade and the sentence your next review starts on stay unchanged.',
  credit: {
    author: 'Joseph G',
    authorUrl: 'https://greasyfork.org/en/users/1613422-joseph-g',
    work: 'Bunpro Sentence Cycle',
    workUrl: 'https://greasyfork.org/en/scripts/584571-bunpro-sentence-cycle',
  },
  enabledByDefault: true,

  start() {
    injectStyles();
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
    window.addEventListener('keydown', onKeyDown, true);
  },

  stop() {
    window.removeEventListener('keydown', onKeyDown, true);
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    clearSentence();
  },
};

/**
 * Any review may be cycled, so every item's sentences are fetched while its
 * question is on screen. Tab then swaps sentences without waiting on the network.
 */
function onQuizStateChange(state: QuizState): void {
  dropSentenceUnless(solvedReviewKey(state));
  if (state.reviewable && state.sessionId) {
    void loadSentences(state.reviewable);
  }
}

/**
 * Read in the capture phase so Bunpro never sees the keystroke, and claim it
 * only when there is actually a sentence to cycle: Tab keeps moving focus
 * everywhere else, including in our own settings panel.
 */
function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== CYCLE_KEY || hasModifier(event) || areKeystrokesClaimed()) {
    return;
  }
  const state = readQuizState();
  const reviewKey = solvedReviewKey(state);
  if (!reviewKey || !state.reviewable || !hasSentenceToCycle(reviewKey)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  void cycleSentence(reviewKey, state.reviewable);
}

/** A sentence of ours, one of Bunpro's, or the cloze question that is a sentence itself. */
function hasSentenceToCycle(reviewKey: string): boolean {
  return (
    shownSentence()?.reviewKey === reviewKey ||
    findNativeSentenceCard() !== null ||
    findClozeSentence() !== null
  );
}

async function cycleSentence(reviewKey: string, term: ReviewableRef): Promise<void> {
  const sentences = await loadSentences(term);
  if (sentences.length < 2 || solvedReviewKey(readQuizState()) !== reviewKey) {
    return;
  }

  const shown = shownSentence();
  const shownIndex =
    shown?.reviewKey === reviewKey ? shown.index : bunproSentenceIndex(sentences);

  showSentence({ reviewKey, sentences, index: nextSentenceIndex(shownIndex, sentences.length) });
}
