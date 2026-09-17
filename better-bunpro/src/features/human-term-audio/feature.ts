import { fetchStudyQuestions } from '../../bunpro/api';
import { readQuizState, watchQuizState, type QuizState } from '../../bunpro/quiz-state';
import { reviewKey } from '../../bunpro/review';
import { watchBodyRemounts } from '../../dom/remount';
import { injectStyles } from '../../styles';
import { exampleOriginsFromSentences } from '../../term-audio/example-audio';
import { grammarSlugFromPath, reviewableFromGrammarSlug } from '../../term-audio/grammar-page';
import { clearAudioSourceIndicator, syncAudioSourceIndicator } from '../../term-audio/indicator';
import { loadTermAudio } from '../../term-audio/load';
import type { AudioOrigin } from '../../term-audio/origin';
import { startReplacingAudio, stopReplacingAudio } from '../../term-audio/playback';
import { forgetReplacements } from '../../term-audio/replacements';
import { reviewableFromVocabSlug, vocabSlugFromPath } from '../../term-audio/vocab-page';
import type { Feature } from '../registry';

let stopWatchingQuiz: (() => void) | null = null;
let stopWatchingRemounts: (() => void) | null = null;
let shownFor: string | null = null;
let shownAnswerOrigin: AudioOrigin | null = null;
let shownDetailsOrigin: AudioOrigin | null = null;
let shownExampleOrigins: Map<number, AudioOrigin> | null = null;
/** Details / grammar pages tint as soon as origins are ready — no answer step. */
let cueAfterReady = false;

export const humanTermAudioFeature: Feature = {
  id: 'human-term-audio',
  title: 'Play real speakers instead of TTS audio',
  description:
    'When Bunpro would play synthesised term audio (TTS / text-to-speech), prefer a real ' +
    'recording instead — looked up like Yomitan (JapanesePod101, then Jisho). Play buttons ' +
    'are white for TTS and blue for real audio; the tooltip names the source.',
  enabledByDefault: true,

  start() {
    injectStyles();
    startReplacingAudio();
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
    stopWatchingRemounts = watchBodyRemounts(() => {
      const state = readQuizState();
      if (state.reviewable && reviewKey(state) !== null) {
        void refreshReview(state);
        return;
      }
      if (
        shownAnswerOrigin !== null ||
        shownDetailsOrigin !== null ||
        shownExampleOrigins !== null
      ) {
        paintCues();
      }
      void refreshItemPage();
    });
  },

  stop() {
    stopWatchingRemounts?.();
    stopWatchingRemounts = null;
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    stopReplacingAudio();
    forgetReplacements();
    clearAudioSourceIndicator();
    shownFor = null;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleOrigins = null;
    cueAfterReady = false;
  },
};

function onQuizStateChange(state: QuizState): void {
  if (state.reviewable && reviewKey(state) !== null) {
    void refreshReview(state);
    return;
  }
  void refreshItemPage();
}

async function refreshReview(state: QuizState): Promise<void> {
  const term = state.reviewable;
  const review = reviewKey(state);
  if (!term || review === null) {
    return;
  }

  cueAfterReady = false;
  if (shownFor !== review) {
    shownFor = review;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleOrigins = null;
    clearAudioSourceIndicator();
  }

  void loadExampleOrigins(term, () => reviewKey(readQuizState()) === review);

  if (term.type !== 'vocab') {
    if (shownExampleOrigins !== null) {
      paintCues();
    }
    return;
  }

  await loadTermAudio(term, (origins) => {
    if (reviewKey(readQuizState()) !== review) {
      return;
    }
    shownFor = review;
    shownAnswerOrigin = origins.answer;
    shownDetailsOrigin = origins.details;
    paintCues();
  });

  if (reviewKey(readQuizState()) !== review) {
    return;
  }
  if (
    shownFor === review &&
    shownAnswerOrigin === null &&
    shownDetailsOrigin === null &&
    shownExampleOrigins === null
  ) {
    clearShown();
  } else if (
    shownAnswerOrigin !== null ||
    shownDetailsOrigin !== null ||
    shownExampleOrigins !== null
  ) {
    paintCues();
  }
}

/** Vocabulary / grammar detail pages: cue Examples (and vocab Details pitch) immediately. */
async function refreshItemPage(): Promise<void> {
  const vocabSlug = vocabSlugFromPath();
  if (vocabSlug) {
    await refreshVocabPage(vocabSlug);
    return;
  }
  const grammarSlug = grammarSlugFromPath();
  if (grammarSlug) {
    await refreshGrammarPage(grammarSlug);
    return;
  }
  clearShown();
}

async function refreshVocabPage(slug: string): Promise<void> {
  const key = `page:vocab:${slug}`;
  cueAfterReady = true;
  if (shownFor === key && shownDetailsOrigin !== null) {
    paintCues();
    return;
  }
  if (shownFor !== key) {
    shownFor = key;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleOrigins = null;
    clearAudioSourceIndicator();
  } else if (shownDetailsOrigin === null) {
    return;
  }

  const term = await reviewableFromVocabSlug(slug);
  if (!term || vocabSlugFromPath() !== slug) {
    return;
  }

  void loadExampleOrigins(term, () => vocabSlugFromPath() === slug);

  await loadTermAudio(
    term,
    (origins) => {
      if (vocabSlugFromPath() !== slug) {
        return;
      }
      shownFor = key;
      shownAnswerOrigin = origins.answer;
      shownDetailsOrigin = origins.details;
      paintCues();
    },
    { ignoreExampleAudio: true },
  );

  if (vocabSlugFromPath() !== slug) {
    return;
  }
  if (shownFor === key && shownDetailsOrigin === null && shownExampleOrigins === null) {
    clearShown();
  } else if (shownDetailsOrigin !== null || shownExampleOrigins !== null) {
    paintCues();
  }
}

async function refreshGrammarPage(slug: string): Promise<void> {
  const key = `page:grammar:${slug}`;
  cueAfterReady = true;
  if (shownFor === key && shownExampleOrigins !== null) {
    paintCues();
    return;
  }
  if (shownFor !== key) {
    shownFor = key;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    shownExampleOrigins = null;
    clearAudioSourceIndicator();
  } else if (shownExampleOrigins === null) {
    return;
  }

  const term = await reviewableFromGrammarSlug(slug);
  if (!term || grammarSlugFromPath() !== slug) {
    return;
  }

  await loadExampleOrigins(term, () => grammarSlugFromPath() === slug);

  if (grammarSlugFromPath() !== slug) {
    return;
  }
  if (shownFor === key && shownExampleOrigins === null) {
    clearShown();
  }
}

async function loadExampleOrigins(
  term: NonNullable<QuizState['reviewable']>,
  stillCurrent: () => boolean,
): Promise<void> {
  try {
    const sentences = await fetchStudyQuestions(term);
    if (!stillCurrent()) {
      return;
    }
    shownExampleOrigins = exampleOriginsFromSentences(sentences);
    paintCues();
  } catch {
    // Term-audio lookup already warns; Examples cues are best-effort.
  }
}

function paintCues(): void {
  syncAudioSourceIndicator({
    afterSubmit: cueAfterReady || readQuizState().isPostAttempt,
    answerOrigin: shownAnswerOrigin,
    detailsOrigin: shownDetailsOrigin,
    exampleOrigins: shownExampleOrigins,
  });
}

function clearShown(): void {
  shownFor = null;
  shownAnswerOrigin = null;
  shownDetailsOrigin = null;
  shownExampleOrigins = null;
  cueAfterReady = false;
  clearAudioSourceIndicator();
}
