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

    syncAudioSourceIndicator({ origin: 'jpod101', afterSubmit: true });

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

    syncAudioSourceIndicator({ origin: 'bunpro-tts', afterSubmit: true });
    expect(document.querySelector('.InputManual button')?.classList.contains('bb-audio-real')).toBe(
      false,
    );
    expect(document.querySelector('.InputManual button')?.classList.contains('bb-audio-tts')).toBe(
      true,
    );

    syncAudioSourceIndicator({ origin: 'jisho', afterSubmit: false });
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
    syncAudioSourceIndicator({ origin: 'bunpro-rec', afterSubmit: true });
    clearAudioSourceIndicator();

    const play = document.querySelector('.InputManual button');
    expect(play?.getAttribute('title')).toBe('Open the audio player and play audio');
    expect(play?.classList.contains('bb-audio-real')).toBe(false);
  });

  it('accents both the answer-bar and Details play buttons when both are on screen', () => {
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

    syncAudioSourceIndicator({ origin: 'jpod101', afterSubmit: true });

    const answer = document.querySelector('.InputManual button');
    const details = document.querySelector('.DetailsPitchAccent button');
    expect(answer?.getAttribute('title')).toBe('JPod101 Recording');
    expect(details?.getAttribute('title')).toBe('JPod101 Recording');
    expect(answer?.classList.contains('bb-audio-real')).toBe(true);
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

    syncAudioSourceIndicator({ origin: 'jpod101', afterSubmit: true });

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

    syncAudioSourceIndicator({ origin: 'bunpro-tts', afterSubmit: true });

    const play = document.querySelector('.DetailsPitchAccent button');
    expect(play?.getAttribute('title')).toBe('Bunpro TTS');
    expect(play?.classList.contains('bb-audio-tts')).toBe(true);
    expect(play?.classList.contains('bb-audio-real')).toBe(false);
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
      syncAudioSourceIndicator({ origin: 'jpod101', afterSubmit: true });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    syncAudioSourceIndicator({ origin: 'jpod101', afterSubmit: true });
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }
    observer.disconnect();

    expect(deliveries).toBeLessThan(5);
  });
});
