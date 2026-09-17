import { clearAnswerIfShowing, findQuizArticle, findQuizConsole, showAnswerInput, undoGradedAnswer } from '../../bunpro/quiz-dom';
import { readQuizState, watchQuizState, type QuizState } from '../../bunpro/quiz-state';
import { reviewKey } from '../../bunpro/review';
import { addUserSynonym } from '../../bunpro/synonyms';
import { element } from '../../dom';
import { watchBodyRemounts } from '../../dom/remount';
import { injectStyles } from '../../styles';
import { buildActionButton } from '../../ui/action-button';
import { areKeystrokesClaimed, hasModifier } from '../../ui/keystrokes';
import { rememberAcceptedGuess } from '../keep-guessing/accepted-guess';
import { markGuessCorrect } from '../keep-guessing/feedback';
import { submitAcceptedStandIn } from '../keep-guessing/feature';
import type { Feature } from '../registry';
import { shouldOfferSynonym } from './offer';
import {
  forgetPaintedGuess,
  paintedGuessFor,
  rememberPaintedGuess,
  takeStalePaintedGuess,
} from './painted-guess';

const SLOT_ID = 'bb-add-synonym';
const SYNONYM_KEY = 's';
const PLUS_SHAPES =
  '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';

let stopWatchingQuiz: (() => void) | null = null;
let stopWatchingRemounts: (() => void) | null = null;
let standInQueuedFor: string | null = null;

export const addSynonymFeature: Feature = {
  id: 'add-synonym',
  title: 'Add a wrong answer as a synonym',
  description:
    'After a missed vocab translation, an Add as synonym button next to your guess (or press `S`) ' +
    'saves it and marks the review correct — no need to dig through More Info.',
  enabledByDefault: true,

  start() {
    injectStyles();
    stopWatchingQuiz = watchQuizState(syncButton);
    stopWatchingRemounts = watchBodyRemounts(() => syncButton(readQuizState()));
    window.addEventListener('keydown', onKeyDown, true);
  },

  stop() {
    window.removeEventListener('keydown', onKeyDown, true);
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    stopWatchingRemounts?.();
    stopWatchingRemounts = null;
    removeButton();
    forgetPaintedGuess();
    standInQueuedFor = null;
  },
};

function syncButton(state: QuizState): void {
  const review = reviewKey(state);
  const staleGuess = takeStalePaintedGuess(review);
  if (staleGuess !== null) {
    clearAnswerIfShowing(staleGuess);
    standInQueuedFor = null;
  }
  if (review !== null && paintedGuessFor(review) !== null) {
    followThroughAcceptedGuess(state, review);
  }
  if (!shouldOfferSynonym(state) || !findQuizArticle()) {
    removeButton();
    return;
  }
  if (document.getElementById(SLOT_ID)) {
    return;
  }
  const quizConsole = findQuizConsole();
  if (!quizConsole) {
    return;
  }
  quizConsole.before(buildSlot(state));
}

/**
 * Same capture-phase claim as Tab: S is only ours when the button is on screen,
 * so typing an s into a translation still belongs to the quiz.
 */
function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== SYNONYM_KEY || event.repeat || hasModifier(event) || areKeystrokesClaimed()) {
    return;
  }
  const button = document.querySelector<HTMLButtonElement>(`#${SLOT_ID} button`);
  if (!button) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (!button.disabled) {
    button.click();
  }
}

function buildSlot(state: QuizState): HTMLElement {
  const review = reviewKey(state);
  const vocabId = state.reviewable?.id;
  const synonym = state.submittedAnswer?.trim() ?? '';

  const button = buildActionButton({
    labels: {
      idle: 'Add as synonym',
      working: 'Adding…',
      done: 'Added as synonym',
      failed: 'Could not add synonym',
    },
    icon: PLUS_SHAPES,
    startAs: paintedGuessFor(review) !== null ? 'done' : 'idle',
    run: async () => {
      if (vocabId === undefined) {
        throw new Error('No vocab id on the current review');
      }
      const outcome = await addUserSynonym(vocabId, synonym);
      if (review !== null) {
        rememberPaintedGuess(review, synonym);
      }
      acceptAsCorrect(state, review, synonym);
      return outcome === 'already-there' ? 'Already a synonym' : undefined;
    },
  });

  return element('div', { id: SLOT_ID, class: 'bb-add-synonym' }, [button]);
}

function acceptAsCorrect(state: QuizState, review: string | null, synonym: string): void {
  markGuessCorrect();
  if (review !== null && synonym !== '') {
    const official = state.answers[0]?.trim() || synonym;
    rememberAcceptedGuess(review, synonym, official);
  }
  if (state.isPostAttempt && !state.isCorrect) {
    undoGradedAnswer();
    return;
  }
  if (review !== null) {
    queueStandIn(review);
  }
}

function followThroughAcceptedGuess(state: QuizState, review: string): void {
  if (!state.isPostAttempt && !state.isRevealing) {
    queueStandIn(review);
    return;
  }
  showAddedGuess(review);
}

function queueStandIn(review: string): void {
  if (standInQueuedFor === review) {
    return;
  }
  standInQueuedFor = review;
  submitAcceptedStandIn(review);
}

function showAddedGuess(review: string): void {
  const guess = paintedGuessFor(review);
  if (guess === null) {
    return;
  }
  showAnswerInput(guess);
  markGuessCorrect();
}

function removeButton(): void {
  document.getElementById(SLOT_ID)?.remove();
}
