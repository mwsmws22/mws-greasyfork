import { watchQuizState, type QuizState } from '../../bunpro/quiz-state';
import { loadTermAudio } from '../../term-audio/load';
import { startReplacingAudio, stopReplacingAudio } from '../../term-audio/playback';
import { forgetReplacements } from '../../term-audio/replacements';
import type { Feature } from '../registry';

let stopWatchingQuiz: (() => void) | null = null;

export const humanTermAudioFeature: Feature = {
  id: 'human-term-audio',
  title: 'Play real speakers instead of TTS audio',
  description:
    'When Bunpro would play synthesised audio for a vocabulary term, play a recording of a ' +
    'person saying it instead, looked up the same way Yomitan does (JapanesePod101, then Jisho). ' +
    'Sentence audio is left alone, and a term Bunpro already recorded is left alone. If nobody ' +
    'has recorded the word, the synthesised clip still plays.',
  enabledByDefault: true,

  start() {
    startReplacingAudio();
    stopWatchingQuiz = watchQuizState(onQuizStateChange);
  },

  stop() {
    stopWatchingQuiz?.();
    stopWatchingQuiz = null;
    stopReplacingAudio();
    forgetReplacements();
  },
};

function onQuizStateChange(state: QuizState): void {
  if (state.reviewable?.type === 'vocab') {
    void loadTermAudio(state.reviewable);
  }
}
