import { fetchStudyQuestions, type StudyQuestion } from '../../bunpro/api';
import { findQuestionSection, hasNativeSentenceCard } from '../../bunpro/quiz-dom';
import {
  readQuizState,
  watchQuizState,
  type QuizState,
  type ReviewableRef,
} from '../../bunpro/quiz-state';
import { injectStyles } from '../../styles';
import type { Feature } from '../registry';
import { buildSentenceCard, CARD_MARKER } from './card';
import { pickSentenceIndex } from './rotation';

let stopWatchingQuiz: (() => void) | null = null;
let sectionObserver: MutationObserver | null = null;
/** Which term and session the mounted card belongs to, so we neither duplicate nor stale it. */
let mountedFor: string | null = null;
let hasWarned = false;

export const exampleSentenceFeature: Feature = {
  id: 'example-sentence',
  title: 'Show unverified example sentences for A1+ vocab',
  description:
    'On the web, Bunpro does not show unverified example sentences for A1+ vocab, ' +
    'even if you enable "Display Sentence alongside Translation Questions" in review ' +
    'settings. That is despite such a feature being present in the mobile app. If ' +
    'enabled, this feature will show these unverified sentences after submitting a ' +
    'correct answer, and it will cycle through which sentence is displayed for each ' +
    'review session.',
  enabledByDefault: true,

  start() {
    injectStyles();
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
  },

  stop() {
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    unmountCard();
  },
};

function onQuizStateChange(state: QuizState): void {
  const term = termNeedingSentence(state);
  if (!term || !state.sessionId) {
    unmountCard();
    return;
  }

  const mountKey = mountKeyFor(term, state.sessionId);
  if (mountedFor === mountKey) {
    return;
  }
  unmountCard();
  void mountSentenceFor(term, state.sessionId);
}

/** Only correctly answered, revealed vocab that Bunpro itself left without a sentence. */
function termNeedingSentence(state: QuizState): ReviewableRef | null {
  if (state.reviewable?.type !== 'vocab' || state.questionMode !== 'translate') {
    return null;
  }
  if (!state.isRevealing || !state.isCorrect || hasNativeSentenceCard()) {
    return null;
  }
  return state.reviewable;
}

async function mountSentenceFor(term: ReviewableRef, sessionId: string): Promise<void> {
  const mountKey = mountKeyFor(term, sessionId);
  const sentences = await loadSentences(term);
  if (sentences.length === 0 || currentMountKey() !== mountKey) {
    return;
  }

  const index = pickSentenceIndex(termKey(term), sessionId, sentences.length);
  const sentence = sentences[index];
  if (sentence) {
    mountCard(mountKey, sentence);
  }
}

async function loadSentences(term: ReviewableRef): Promise<StudyQuestion[]> {
  try {
    return await fetchStudyQuestions(term);
  } catch (error) {
    if (!hasWarned) {
      hasWarned = true;
      console.warn('[Better Bunpro] Could not load example sentences:', error);
    }
    return [];
  }
}

function mountCard(mountKey: string, sentence: StudyQuestion): void {
  const section = findQuestionSection();
  if (!section) {
    return;
  }
  section.append(buildSentenceCard(sentence));
  mountedFor = mountKey;
  remountIfReactReplacesSection(section, mountKey, sentence);
}

/** Bunpro re-renders the question section as it reveals, which can drop our card. */
function remountIfReactReplacesSection(
  section: HTMLElement,
  mountKey: string,
  sentence: StudyQuestion,
): void {
  sectionObserver?.disconnect();
  sectionObserver = new MutationObserver(() => {
    if (mountedFor !== mountKey || section.querySelector(`[${CARD_MARKER}]`)) {
      return;
    }
    section.append(buildSentenceCard(sentence));
  });
  sectionObserver.observe(section, { childList: true });
}

function unmountCard(): void {
  sectionObserver?.disconnect();
  sectionObserver = null;
  mountedFor = null;
  for (const card of document.querySelectorAll(`[${CARD_MARKER}]`)) {
    card.remove();
  }
}

function currentMountKey(): string | null {
  const state = readQuizState();
  const term = termNeedingSentence(state);
  return term && state.sessionId ? mountKeyFor(term, state.sessionId) : null;
}

function mountKeyFor(term: ReviewableRef, sessionId: string): string {
  return `${termKey(term)}@${sessionId}`;
}

function termKey(term: ReviewableRef): string {
  return `${term.type}:${term.id}`;
}
