import { describe, expect, it } from 'vitest';
import {
  bunproClipOrigin,
  bunproOrigin,
  isRealAudioOrigin,
  labelForOrigin,
  originFromSourceName,
} from './origin';

describe('labelForOrigin', () => {
  it('names recordings explicitly on the play-button tooltip', () => {
    expect(labelForOrigin('jpod101')).toBe('JPod101 Recording');
    expect(labelForOrigin('jisho')).toBe('Jisho Recording');
    expect(labelForOrigin('bunpro-tts')).toBe('Bunpro TTS');
    expect(labelForOrigin('bunpro-rec')).toBe('Bunpro Recording');
  });
});

describe('isRealAudioOrigin', () => {
  it('treats dictionary and Bunpro recordings as real, not TTS', () => {
    expect(isRealAudioOrigin('jpod101')).toBe(true);
    expect(isRealAudioOrigin('jisho')).toBe(true);
    expect(isRealAudioOrigin('bunpro-rec')).toBe(true);
    expect(isRealAudioOrigin('bunpro-tts')).toBe(false);
  });
});

describe('originFromSourceName', () => {
  it('collapses both JapanesePod101 sources and recognises Jisho', () => {
    expect(originFromSourceName('JapanesePod101')).toBe('jpod101');
    expect(originFromSourceName('JapanesePod101 dictionary')).toBe('jpod101');
    expect(originFromSourceName('Jisho')).toBe('jisho');
  });
});

describe('bunproOrigin', () => {
  it('distinguishes synthesised clips from Bunpro\'s own recordings', () => {
    expect(bunproOrigin(true)).toBe('bunpro-tts');
    expect(bunproOrigin(false)).toBe('bunpro-rec');
  });
});

describe('bunproClipOrigin', () => {
  it('treats /audio/vocab/tts/ URLs as Bunpro TTS and other Bunpro clips as recordings', () => {
    expect(
      bunproClipOrigin(
        'https://cdn.example/audio/vocab/tts/この樽にはお酒が入っています。-male.mp3',
      ),
    ).toBe('bunpro-tts');
    expect(
      bunproClipOrigin('https://cdn.example/audio/vocab/pronunciation/樽-male.mp3'),
    ).toBe('bunpro-rec');
    expect(
      bunproClipOrigin(
        'https://cdn.example/audio/grammar/n1/子供ですら知っている.mp3',
      ),
    ).toBe('bunpro-rec');
    expect(bunproClipOrigin(null)).toBeNull();
  });
});
