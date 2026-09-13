import { describe, expect, it } from 'vitest';
import type { Reviewable } from '../bunpro/api';
import { synthesisedTermAudio } from './term';

const TTS = {
  title: '取り計らう',
  kana: 'とりはからう',
  has_tts_audio: true,
  male_audio_url: 'https://cdn.example/取り計らう-male.mp3',
  female_audio_url: 'https://cdn.example/%E5%8F%96%E3%82%8A%E8%A8%88%E3%82%89%E3%81%86-female.mp3',
} satisfies Reviewable;

describe('synthesisedTermAudio', () => {
  it('takes the word and both synthesised URLs from a TTS vocab item', () => {
    expect(synthesisedTermAudio(TTS)).toEqual({
      term: '取り計らう',
      reading: 'とりはからう',
      ttsUrls: [
        'https://cdn.example/取り計らう-male.mp3',
        'https://cdn.example/取り計らう-female.mp3',
      ],
    });
  });

  it('uses the spelling as the reading when Bunpro has no separate kana', () => {
    expect(synthesisedTermAudio({ ...TTS, kana: null })?.reading).toBe('取り計らう');
  });

  it('leaves an item Bunpro already recorded for a person', () => {
    expect(synthesisedTermAudio({ ...TTS, has_tts_audio: false })).toBeNull();
  });

  it('leaves an item with no clip to replace', () => {
    expect(
      synthesisedTermAudio({ ...TTS, male_audio_url: null, female_audio_url: null }),
    ).toBeNull();
  });
});
