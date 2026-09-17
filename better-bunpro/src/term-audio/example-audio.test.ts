// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { showSentence, clearSentence } from '../quiz-sentence/slot';
import type { StudyQuestion } from '../bunpro/api';
import { exampleOnScreenHasAudio, exampleOriginsFromSentences } from './example-audio';

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

  it('is true when a visible sentence speaker is in the quiz footer', () => {
    document.body.innerHTML = `
      <div id="js-quiz">
        <article class="relative">
          <section></section>
          <footer>
            <div class="shrink-0">
              <button title="Play audio" style="width:24px;height:24px"></button>
            </div>
          </footer>
        </article>
      </div>
    `;
    // jsdom lays out with zero size unless we stub getBoundingClientRect.
    const play = document.querySelector('button[title="Play audio"]');
    play!.getBoundingClientRect = () =>
      ({ width: 24, height: 24, top: 0, left: 0, bottom: 24, right: 24, x: 0, y: 0, toJSON() {} }) as DOMRect;

    expect(exampleOnScreenHasAudio()).toBe(true);
  });

  it('ignores hidden footer Play audio leftovers on term-only reviews', () => {
    document.body.innerHTML = `
      <div id="js-quiz">
        <article class="relative">
          <section></section>
          <footer>
            <div class="hidden">
              <div class="shrink-0">
                <button title="Play audio"></button>
              </div>
            </div>
          </footer>
        </article>
      </div>
      <link rel="prefetch" as="audio" href="https://cdn.example/audio/vocab/pronunciation/糊-male.mp3" />
    `;
    expect(exampleOnScreenHasAudio()).toBe(false);
  });

  it('is true when Bunpro prefetches example-sentence TTS even if the play control is hidden', () => {
    document.body.innerHTML = `
      <div id="js-quiz">
        <article class="relative">
          <section><p>図工の先生：「糊がしっかり乾いてからでないと」</p></section>
          <footer>
            <div class="hidden">
              <button title="Play audio"></button>
            </div>
          </footer>
        </article>
      </div>
      <link id="prefetch-audio" rel="prefetch" as="audio"
        href="https://cdn.example/audio/vocab/tts/図工の先生：「糊がしっかり乾いてからでないと」-male.mp3" />
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

describe('exampleOriginsFromSentences', () => {
  it('maps each study question to Bunpro TTS or Bunpro Recording from its clip URL', () => {
    const origins = exampleOriginsFromSentences([
      {
        ...WITH_AUDIO,
        id: 10,
        male_audio_url: 'https://cdn.example/audio/vocab/tts/sentence-male.mp3',
      },
      {
        ...WITH_AUDIO,
        id: 11,
        male_audio_url: 'https://cdn.example/audio/vocab/human/sentence-male.mp3',
      },
      {
        ...WITH_AUDIO,
        id: 12,
        male_audio_url: null,
        female_audio_url: 'https://cdn.example/audio/grammar/n1/すら.mp3',
      },
      WITHOUT_AUDIO,
    ]);

    expect([...origins.entries()]).toEqual([
      [10, 'bunpro-tts'],
      [11, 'bunpro-rec'],
      [12, 'bunpro-rec'],
    ]);
  });
});
