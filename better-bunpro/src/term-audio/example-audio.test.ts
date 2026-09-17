// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { showSentence, clearSentence } from '../quiz-sentence/slot';
import type { StudyQuestion } from '../bunpro/api';
import { exampleOnScreenHasAudio } from './example-audio';

const WITH_AUDIO: StudyQuestion = {
  id: 1,
  content: '意地を見せる。',
  answer: null,
  kanji_answer: null,
  translation: 'show pride',
  word_prompt: null,
  tense: null,
  sentence_order: 1,
  male_audio_url: 'https://cdn.example/sentence.mp3',
  female_audio_url: null,
};

const WITHOUT_AUDIO: StudyQuestion = {
  ...WITH_AUDIO,
  id: 2,
  male_audio_url: null,
  female_audio_url: null,
};

afterEach(() => {
  clearSentence();
  document.body.innerHTML = '';
});

describe('exampleOnScreenHasAudio', () => {
  it('is true when the mounted example has a clip', () => {
    document.body.innerHTML = '<div id="js-quiz"><article></article></div>';
    showSentence({ reviewKey: 'vocab:1', sentences: [WITH_AUDIO], index: 0 });
    expect(exampleOnScreenHasAudio()).toBe(true);
  });

  it('is false when the mounted example has no clip', () => {
    document.body.innerHTML = '<div id="js-quiz"><article></article></div>';
    showSentence({ reviewKey: 'vocab:1', sentences: [WITHOUT_AUDIO], index: 0 });
    expect(exampleOnScreenHasAudio()).toBe(false);
  });

  it('is true when Bunpro\'s own sentence card shows a play button', () => {
    document.body.innerHTML = `
      <div id="js-quiz">
        <article>
          <section>
            <aside id="study-question-99">
              <button title="Play audio"></button>
            </aside>
          </section>
        </article>
      </div>
    `;
    expect(exampleOnScreenHasAudio()).toBe(true);
  });

  it('is false when the example on screen has no speaker', () => {
    document.body.innerHTML = `
      <div id="js-quiz">
        <article>
          <section>
            <aside id="study-question-99">
              <p>意地を見せる。</p>
            </aside>
          </section>
        </article>
      </div>
    `;
    expect(exampleOnScreenHasAudio()).toBe(false);
  });
});
