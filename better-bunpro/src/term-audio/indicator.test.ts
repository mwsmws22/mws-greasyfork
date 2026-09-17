// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { clearAudioSourceIndicator, syncAudioSourceIndicator } from './indicator';

afterEach(() => {
  clearAudioSourceIndicator();
  document.body.innerHTML = '';
});

describe('syncAudioSourceIndicator', () => {
  it('sets the play-button tooltip and does not insert an inline chip', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
        <form></form>
      </div>
    `;

    syncAudioSourceIndicator({ answerOrigin: 'jpod101', afterSubmit: true });

    const play = document.querySelector('.InputManual button');
    expect(document.getElementById('bb-audio-source')).toBeNull();
    expect(play?.getAttribute('title')).toBe('JPod101 Recording');
    expect(play?.classList.contains('bb-audio-real')).toBe(true);
  });

  it('does not accent the play button for Bunpro TTS or before submit', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;

    syncAudioSourceIndicator({ answerOrigin: 'bunpro-tts', afterSubmit: true });
    expect(document.querySelector('.InputManual button')?.classList.contains('bb-audio-real')).toBe(
      false,
    );
    expect(document.querySelector('.InputManual button')?.classList.contains('bb-audio-tts')).toBe(
      true,
    );

    syncAudioSourceIndicator({ answerOrigin: 'jisho', afterSubmit: false });
    expect(document.querySelector('.InputManual button')?.classList.contains('bb-audio-real')).toBe(
      false,
    );
  });

  it('restores the play title when cleared', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;
    syncAudioSourceIndicator({ answerOrigin: 'bunpro-rec', afterSubmit: true });
    clearAudioSourceIndicator();

    const play = document.querySelector('.InputManual button');
    expect(play?.getAttribute('title')).toBe('Open the audio player and play audio');
    expect(play?.classList.contains('bb-audio-real')).toBe(false);
  });

  it('can show Bunpro TTS on the answer bar and a real recording on Details', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
      <div class="DetailsPitchAccent">
        <button class="text-primary-accent">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;

    syncAudioSourceIndicator({
      afterSubmit: true,
      answerOrigin: 'bunpro-tts',
      detailsOrigin: 'jpod101',
    });

    const answer = document.querySelector('.InputManual button');
    const details = document.querySelector('.DetailsPitchAccent button');
    expect(answer?.getAttribute('title')).toBe('Bunpro TTS');
    expect(answer?.classList.contains('bb-audio-tts')).toBe(true);
    expect(answer?.classList.contains('bb-audio-real')).toBe(false);
    expect(details?.getAttribute('title')).toBe('JPod101 Recording');
    expect(details?.classList.contains('bb-audio-real')).toBe(true);
  });

  it('accents the Details pitch-accent play button on a vocabulary page', () => {
    document.body.innerHTML = `
      <div class="DetailsPitchAccent">
        <button class="text-primary-accent">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;

    syncAudioSourceIndicator({ detailsOrigin: 'jpod101', afterSubmit: true });

    const play = document.querySelector('.DetailsPitchAccent button');
    expect(play?.getAttribute('title')).toBe('JPod101 Recording');
    expect(play?.classList.contains('bb-audio-real')).toBe(true);
    expect(play?.classList.contains('bb-audio-tts')).toBe(false);
  });

  it('forces the Details play button off Bunpro accent when only TTS will play', () => {
    document.body.innerHTML = `
      <div class="DetailsPitchAccent">
        <button class="text-primary-accent">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
      </div>
    `;

    syncAudioSourceIndicator({ detailsOrigin: 'bunpro-tts', afterSubmit: true });

    const play = document.querySelector('.DetailsPitchAccent button');
    expect(play?.getAttribute('title')).toBe('Bunpro TTS');
    expect(play?.classList.contains('bb-audio-tts')).toBe(true);
    expect(play?.classList.contains('bb-audio-real')).toBe(false);
  });

  it('tints Info Examples speakers from each study-question origin', () => {
    document.body.innerHTML = `
      <article class="bp-reviewable-root">
        <li id="study-question-10">
          <button id="tts" class="text-primary-accent" title="Play audio"></button>
        </li>
        <li id="study-question-11">
          <button id="rec" class="text-primary-accent" title="Play audio"></button>
        </li>
      </article>
    `;

    syncAudioSourceIndicator({
      afterSubmit: true,
      exampleOrigins: new Map([
        [10, 'bunpro-tts'],
        [11, 'bunpro-rec'],
      ]),
    });

    const tts = document.getElementById('tts');
    const rec = document.getElementById('rec');
    expect(tts?.getAttribute('title')).toBe('Bunpro TTS');
    expect(tts?.classList.contains('bb-audio-tts')).toBe(true);
    expect(tts?.classList.contains('bb-audio-real')).toBe(false);
    expect(rec?.getAttribute('title')).toBe('Bunpro Recording');
    expect(rec?.classList.contains('bb-audio-real')).toBe(true);
    expect(rec?.classList.contains('bb-audio-tts')).toBe(false);
  });

  it('does not keep mutating when a body observer re-syncs after its own write', async () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button title="Open the audio player and play audio">
          <svg data-name="PLAY_CIRCLE_FILLED"></svg>
        </button>
        <form></form>
      </div>
    `;

    let deliveries = 0;
    const observer = new MutationObserver(() => {
      deliveries += 1;
      if (deliveries > 40) {
        observer.disconnect();
        return;
      }
      syncAudioSourceIndicator({ answerOrigin: 'jpod101', afterSubmit: true });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    syncAudioSourceIndicator({ answerOrigin: 'jpod101', afterSubmit: true });
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }
    observer.disconnect();

    expect(deliveries).toBeLessThan(5);
  });
});
