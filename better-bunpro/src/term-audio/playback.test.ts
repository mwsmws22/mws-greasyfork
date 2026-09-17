// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  abandonPlaybackCaptureForTests,
  startReplacingAudio,
  stopReplacingAudio,
} from './playback';
import { forgetAll, remember } from './store';

const TTS = 'https://cdn.example/%E8%97%AA-male.mp3';
const RECORDING = 'blob:https://bunpro.jp/recording';

afterEach(() => {
  stopReplacingAudio();
  forgetAll();
});

describe('startReplacingAudio', () => {
  it('rewrites a synthesised URL to the recording when one is filed', () => {
    remember([TTS], RECORDING, 'jpod101');
    startReplacingAudio();

    const audio = new Audio();
    audio.src = TTS;

    expect(audio.src).toBe(RECORDING);
  });

  it('does not nest wrappers when the module remounts over an already-patched prototype', () => {
    startReplacingAudio();
    // Vite HMR reloads this module: locals are fresh, HTMLMediaElement stays patched.
    abandonPlaybackCaptureForTests();
    startReplacingAudio();

    const audio = new Audio();
    expect(() => {
      audio.src = TTS;
    }).not.toThrow();
    expect(audio.src).toContain('cdn.example');
  });

  it('still applies replacements after that remount', () => {
    startReplacingAudio();
    abandonPlaybackCaptureForTests();
    startReplacingAudio();
    remember([TTS], RECORDING, 'jpod101');

    const audio = new Audio();
    audio.src = TTS;

    expect(audio.src).toBe(RECORDING);
  });
});
