import { readQuizState, watchQuizState, type QuizState } from '../../bunpro/quiz-state';
import { reviewKey } from '../../bunpro/review';
import { watchBodyRemounts } from '../../dom/remount';
import { injectStyles } from '../../styles';
import { clearAudioSourceIndicator, syncAudioSourceIndicator } from '../../term-audio/indicator';
import { loadTermAudio } from '../../term-audio/load';
import type { AudioOrigin } from '../../term-audio/origin';
import { startReplacingAudio, stopReplacingAudio } from '../../term-audio/playback';
import { forgetReplacements } from '../../term-audio/replacements';
import type { Feature } from '../registry';

let stopWatchingQuiz: (() => void) | null = null;
let stopWatchingRemounts: (() => void) | null = null;
let shownFor: string | null = null;
let shownOrigin: AudioOrigin | null = null;

export const humanTermAudioFeature: Feature = {
  id: 'human-term-audio',
  title: 'Play real speakers instead of TTS audio',
  description:
    'When Bunpro would play synthesised audio for a vocabulary term that has no example ' +
    'sentence audio, play a recording of a person saying it instead, looked up the same way ' +
    'Yomitan does (JapanesePod101, then Jisho). Example sentences that already have audio — ' +
    'even Bunpro TTS — are left alone, and a term Bunpro already recorded is left alone. If ' +
    'nobody has recorded the word, the synthesised clip still plays. After you answer, the ' +
    'play button is tinted when a real recording will play, and its tooltip names the source.',
  enabledByDefault: true,

  start() {
    injectStyles();
    startReplacingAudio();
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
    stopWatchingRemounts = watchBodyRemounts(() => {
      if (shownOrigin !== null) {
        paintCue(shownOrigin);
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
  },
};

function onQuizStateChange(state: QuizState): void {
  const review = reviewKey(state);
  if (state.reviewable?.type !== 'vocab' || review === null) {
    clearShown();
    return;
  }
  void refreshOrigin(state.reviewable, review);
}

async function refreshOrigin(
  term: NonNullable<QuizState['reviewable']>,
  review: string,
): Promise<void> {
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

function paintCue(origin: AudioOrigin): void {
  syncAudioSourceIndicator({
    origin,
    afterSubmit: readQuizState().isPostAttempt,
  });
}

function clearShown(): void {
  shownFor = null;
  shownOrigin = null;
  clearAudioSourceIndicator();
}
