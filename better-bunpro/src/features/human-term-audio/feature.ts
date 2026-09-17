import { readQuizState, watchQuizState, type QuizState } from '../../bunpro/quiz-state';
import { reviewKey } from '../../bunpro/review';
import { watchBodyRemounts } from '../../dom/remount';
import { injectStyles } from '../../styles';
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
/** Details pages tint as soon as a real recording is ready — no answer step. */
let cueAfterReady = false;

export const humanTermAudioFeature: Feature = {
  id: 'human-term-audio',
  title: 'Play real speakers instead of TTS audio',
  description:
    'When Bunpro would play synthesised audio for a vocabulary term, play a recording of a ' +
    'person saying it instead (JapanesePod101, then Jisho). The Details pitch-accent control ' +
    'is always term audio and always looked up. The quiz answer-bar stays on Bunpro only when ' +
    'an on-screen example sentence already has its own clip; otherwise it follows the term ' +
    'recording too. After you answer (or always on a Details page), each play button is tinted ' +
    'when a real recording will play, and its tooltip names the source.',
  enabledByDefault: true,

  start() {
    injectStyles();
    startReplacingAudio();
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
    stopWatchingRemounts = watchBodyRemounts(() => {
      const state = readQuizState();
      if (state.reviewable?.type === 'vocab') {
        const review = reviewKey(state);
        if (review !== null) {
          // Sentence speaker often mounts after the first lookup — re-run so the
          // answer bar can stay on Bunpro when the example has audio.
          void refreshOrigin(state.reviewable, review);
          return;
        }
      }
      if (shownAnswerOrigin !== null || shownDetailsOrigin !== null) {
        paintCues();
      }
      if (state.reviewable?.type !== 'vocab') {
        void refreshVocabPage();
      }
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
    cueAfterReady = false;
  },
};

function onQuizStateChange(state: QuizState): void {
  const review = reviewKey(state);
  if (state.reviewable?.type === 'vocab' && review !== null) {
    void refreshOrigin(state.reviewable, review);
    return;
  }
  void refreshVocabPage();
}

async function refreshOrigin(
  term: NonNullable<QuizState['reviewable']>,
  review: string,
): Promise<void> {
  cueAfterReady = false;
  if (shownFor !== review) {
    shownFor = review;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    clearAudioSourceIndicator();
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
  if (shownFor === review && shownAnswerOrigin === null && shownDetailsOrigin === null) {
    clearShown();
  } else if (shownAnswerOrigin !== null || shownDetailsOrigin !== null) {
    paintCues();
  }
}

/** Vocabulary detail pages: always rewrite Details pitch-accent TTS. */
async function refreshVocabPage(): Promise<void> {
  const slug = vocabSlugFromPath();
  if (!slug) {
    clearShown();
    return;
  }

  const key = `page:${slug}`;
  cueAfterReady = true;
  if (shownFor === key && shownDetailsOrigin !== null) {
    paintCues();
    return;
  }
  if (shownFor !== key) {
    shownFor = key;
    shownAnswerOrigin = null;
    shownDetailsOrigin = null;
    clearAudioSourceIndicator();
  } else if (shownDetailsOrigin === null) {
    return;
  }

  const term = await reviewableFromVocabSlug(slug);
  if (!term || vocabSlugFromPath() !== slug) {
    return;
  }

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
  if (shownFor === key && shownDetailsOrigin === null) {
    clearShown();
  } else if (shownDetailsOrigin !== null) {
    paintCues();
  }
}

function paintCues(): void {
  syncAudioSourceIndicator({
    afterSubmit: cueAfterReady || readQuizState().isPostAttempt,
    answerOrigin: shownAnswerOrigin,
    detailsOrigin: shownDetailsOrigin,
  });
}

function clearShown(): void {
  shownFor = null;
  shownAnswerOrigin = null;
  shownDetailsOrigin = null;
  cueAfterReady = false;
  clearAudioSourceIndicator();
}
