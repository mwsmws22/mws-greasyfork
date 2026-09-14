import { findQuizArticle, findQuizConsole, showAnswerInput, undoGradedAnswer } from '../../bunpro/quiz-dom';
import { readQuizState, watchQuizState, type QuizState } from '../../bunpro/quiz-state';
import { reviewKey } from '../../bunpro/review';
import { addUserSynonym } from '../../bunpro/synonyms';
import { element } from '../../dom';
import { injectStyles } from '../../styles';
import { buildActionButton } from '../../ui/action-button';
import { areKeystrokesClaimed, hasModifier } from '../../ui/keystrokes';
import { rememberAcceptedGuess } from '../keep-guessing/accepted-guess';
import { markGuessCorrect } from '../keep-guessing/feedback';
import { submitAcceptedStandIn } from '../keep-guessing/feature';
import type { Feature } from '../registry';
import { shouldOfferSynonym } from './offer';

const SLOT_ID = 'bb-add-synonym';
const SYNONYM_KEY = 's';
const PLUS_SHAPES =
  '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';

let stopWatchingQuiz: (() => void) | null = null;
let remountObserver: MutationObserver | null = null;
let addedFor: string | null = null;
let addedGuess: string | null = null;
let standInQueuedFor: string | null = null;

export const addSynonymFeature: Feature = {
  id: 'add-synonym',
  title: 'Add a wrong answer as a synonym',
  description:
    'After you miss a vocab translation, Bunpro hides "Your Synonyms" down in More Info. ' +
    'With this on, an Add as synonym button sits next to the wrong answer so you can accept ' +
    'what you typed without scrolling. Adding it saves the guess and immediately marks this ' +
    'review correct. Press S for the same action. The guess is saved through the same request ' +
    'Bunpro\'s own synonym field uses, and a guess it already accepts is not offered again.',
  enabledByDefault: true,

  start() {
    injectStyles();
    stopWatchingQuiz = watchQuizState(syncButton);
    remountObserver = new MutationObserver(() => syncButton(readQuizState()));
    remountObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('keydown', onKeyDown, true);
  },

  stop() {
    window.removeEventListener('keydown', onKeyDown, true);
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    remountObserver?.disconnect();
    remountObserver = null;
    removeButton();
    addedFor = null;
    addedGuess = null;
    standInQueuedFor = null;
  },
};

function syncButton(state: QuizState): void {
  const review = reviewKey(state);
  if (review !== null && addedFor === review) {
    followThroughAcceptedGuess(state, review);
  }
  if (!shouldOfferSynonym(state) || !findQuizArticle()) {
    removeButton();
    return;
  }
  if (document.getElementById(SLOT_ID)) {
    return;
  }
  const console = findQuizConsole();
  if (!console) {
    return;
  }
  console.before(buildSlot(state));
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
    startAs: review !== null && addedFor === review ? 'done' : 'idle',
    run: async () => {
      if (vocabId === undefined) {
        throw new Error('No vocab id on the current review');
      }
      const outcome = await addUserSynonym(vocabId, synonym);
      addedFor = review;
      addedGuess = synonym;
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
  showAddedGuess();
}

function queueStandIn(review: string): void {
  if (standInQueuedFor === review) {
    return;
  }
  standInQueuedFor = review;
  submitAcceptedStandIn(review);
}

function showAddedGuess(): void {
  if (addedGuess === null) {
    return;
  }
  showAnswerInput(addedGuess);
  markGuessCorrect();
}

function removeButton(): void {
  document.getElementById(SLOT_ID)?.remove();
}
