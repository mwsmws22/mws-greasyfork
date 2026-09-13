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
  questionMode: string | null;
  isRevealing: boolean;
  isCorrect: boolean;
}

const NO_QUIZ: QuizState = {
  sessionId: null,
  reviewable: null,
  questionMode: null,
  isRevealing: false,
  isCorrect: false,
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
    isRevealing: element.getAttribute('data-meta-is-revealing') === 'true',
    isCorrect: element.getAttribute('data-meta-is-correct') === 'true',
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

  const treeObserver = new MutationObserver(bindToMetadataElement);
  treeObserver.observe(document.body, { childList: true, subtree: true });
  bindToMetadataElement();

  return () => {
    treeObserver.disconnect();
    attributeObserver?.disconnect();
  };
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
