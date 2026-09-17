import { watchBodyRemounts } from '../dom/remount';

/**
 * Bunpro mirrors its entire quiz state onto a hidden element as `data-meta-*`
 * attributes, so we read the state rather than infer it from the rendered DOM.
 */
const METADATA_ID = 'quiz-metadata-element';

export type ReviewableType = 'vocab' | 'grammar_point';

export interface ReviewableRef {
  id: number;
  type: ReviewableType;
}

export interface QuizState {
  sessionId: string | null;
  reviewable: ReviewableRef | null;
  /** `translate`, `cloze`, `reading` or `listening`. */
  questionMode: string | null;
  /** `manual` when the answer is typed, `flashcard` when it is graded by button. */
  inputMode: string | null;
  /** Every answer Bunpro would accept for the question on screen. */
  answers: string[];
  /** The text just submitted; Bunpro keeps this on `data-meta-input`. */
  submittedAnswer: string | null;
  /** The question has been answered, whether or not the answer is on screen yet. */
  isPostAttempt: boolean;
  isRevealing: boolean;
  isCorrect: boolean;
  /** More Info is open; Bunpro uses Left/Right to switch its tabs. */
  isShowingInfo: boolean;
}

const NO_QUIZ: QuizState = {
  sessionId: null,
  reviewable: null,
  questionMode: null,
  inputMode: null,
  answers: [],
  submittedAnswer: null,
  isPostAttempt: false,
  isRevealing: false,
  isCorrect: false,
  isShowingInfo: false,
};

export function readQuizState(): QuizState {
  const element = document.getElementById(METADATA_ID);
  if (!element) {
    return NO_QUIZ;
  }
  return {
    sessionId: element.getAttribute('data-meta-session-id'),
    reviewable: parseReviewable(element.getAttribute('data-meta-info')),
    questionMode: element.getAttribute('data-meta-question-mode'),
    inputMode: element.getAttribute('data-meta-input-mode'),
    answers: parseAnswers(element.getAttribute('data-meta-answers-array')),
    submittedAnswer: parseSubmitted(element.getAttribute('data-meta-input')),
    isPostAttempt: element.getAttribute('data-meta-is-post-attempt') === 'true',
    isRevealing: element.getAttribute('data-meta-is-revealing') === 'true',
    isCorrect: element.getAttribute('data-meta-is-correct') === 'true',
    isShowingInfo: element.getAttribute('data-meta-is-showing-info') === 'true',
  };
}

export function watchQuizState(onChange: (state: QuizState) => void): () => void {
  let boundElement: Element | null = null;
  let attributeObserver: MutationObserver | null = null;
  let lastSignature = '';

  const emitIfChanged = () => {
    const state = readQuizState();
    const signature = JSON.stringify(state);
    if (signature === lastSignature) {
      return;
    }
    lastSignature = signature;
    onChange(state);
  };

  /** The metadata element is remounted whenever the quiz itself remounts. */
  const bindToMetadataElement = () => {
    const element = document.getElementById(METADATA_ID);
    if (element === boundElement) {
      return;
    }
    attributeObserver?.disconnect();
    boundElement = element;
    if (element) {
      attributeObserver = new MutationObserver(emitIfChanged);
      attributeObserver.observe(element, { attributes: true });
    }
    emitIfChanged();
  };

  const treeStop = watchBodyRemounts(bindToMetadataElement);
  bindToMetadataElement();

  return () => {
    treeStop();
    attributeObserver?.disconnect();
  };
}

function parseSubmitted(raw: string | null): string | null {
  if (!raw || raw === 'null') {
    return null;
  }
  return raw;
}

function parseAnswers(raw: string | null): string[] {
  if (!raw || raw === 'null') {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((answer): answer is string => typeof answer === 'string');
  } catch {
    return [];
  }
}

function parseReviewable(raw: string | null): ReviewableRef | null {
  if (!raw || raw === 'null') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { id?: unknown; type?: unknown };
    const { id, type } = parsed;
    if (typeof id !== 'number' || (type !== 'vocab' && type !== 'grammar_point')) {
      return null;
    }
    return { id, type };
  } catch {
    return null;
  }
}
