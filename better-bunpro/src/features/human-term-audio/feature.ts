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
let shownOrigin: AudioOrigin | null = null;
/** Details pages tint as soon as a real recording is ready — no answer step. */
let cueAfterReady = false;

export const humanTermAudioFeature: Feature = {
  id: 'human-term-audio',
  title: 'Play real speakers instead of TTS audio',
  description:
    'When Bunpro would play synthesised audio for a vocabulary term, play a recording of a ' +
    'person saying it instead, looked up the same way Yomitan does (JapanesePod101, then Jisho). ' +
    'If the example on screen already has audio — even Bunpro TTS — that clip is left alone and ' +
    'no dictionary lookup runs. On a vocabulary Details page the pitch-accent control is always ' +
    'rewritten. A term Bunpro already recorded is left alone. If nobody has recorded the word, ' +
    'the synthesised clip still plays. After you answer (or always on a Details page), the play ' +
    'button is tinted when a real recording will play, and its tooltip names the source.',
  enabledByDefault: true,

  start() {
    injectStyles();
    startReplacingAudio();
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
    stopWatchingRemounts = watchBodyRemounts(() => {
      if (shownOrigin !== null) {
        paintCue(shownOrigin);
      }
      const state = readQuizState();
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
    shownOrigin = null;
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
    shownOrigin = null;
    clearAudioSourceIndicator();
  }

  await loadTermAudio(term, (origin) => {
    if (reviewKey(readQuizState()) !== review) {
      return;
    }
    shownFor = review;
    shownOrigin = origin;
    paintCue(origin);
  });

  if (reviewKey(readQuizState()) !== review) {
    return;
  }
  if (shownFor === review && shownOrigin === null) {
    clearShown();
  } else if (shownOrigin !== null) {
    // Answer may have landed while the lookup was in flight — refresh accent.
    paintCue(shownOrigin);
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
  if (shownFor === key && shownOrigin !== null) {
    paintCue(shownOrigin);
    return;
  }
  if (shownFor !== key) {
    shownFor = key;
    shownOrigin = null;
    clearAudioSourceIndicator();
  } else if (shownOrigin === null) {
    // Lookup already in flight for this page.
    return;
  }

  const term = await reviewableFromVocabSlug(slug);
  if (!term || vocabSlugFromPath() !== slug) {
    return;
  }

  await loadTermAudio(
    term,
    (origin) => {
      if (vocabSlugFromPath() !== slug) {
        return;
      }
      shownFor = key;
      shownOrigin = origin;
      paintCue(origin);
    },
    { ignoreExampleAudio: true },
  );

  if (vocabSlugFromPath() !== slug) {
    return;
  }
  if (shownFor === key && shownOrigin === null) {
    clearShown();
  } else if (shownOrigin !== null) {
    paintCue(shownOrigin);
  }
}

function paintCue(origin: AudioOrigin): void {
  syncAudioSourceIndicator({
    origin,
    afterSubmit: cueAfterReady || readQuizState().isPostAttempt,
  });
}

function clearShown(): void {
  shownFor = null;
  shownOrigin = null;
  cueAfterReady = false;
  clearAudioSourceIndicator();
}
