// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Reviewable } from '../bunpro/api';
import * as api from '../bunpro/api';

vi.mock('./replacements', () => ({
  findReplacement: vi.fn(),
}));

vi.mock('./example-audio', () => ({
  exampleOnScreenHasAudio: vi.fn(() => false),
}));

import { exampleOnScreenHasAudio } from './example-audio';
import { findReplacement } from './replacements';
import { loadTermAudio } from './load';

const TERM = { id: 1, type: 'vocab' as const };

const TTS_ITEM: Reviewable = {
  title: '委ねる',
  kana: 'ゆだねる',
  has_tts_audio: true,
  male_audio_url: 'https://cdn.example/委ねる-male.mp3',
  female_audio_url: null,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(exampleOnScreenHasAudio).mockReturnValue(false);
});

describe('loadTermAudio', () => {
  it('skips dictionary lookup when the example on screen has audio', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(exampleOnScreenHasAudio).mockReturnValue(true);
    vi.mocked(findReplacement).mockClear();

    const origins: string[] = [];
    await loadTermAudio(TERM, (origin) => origins.push(origin));

    expect(origins).toEqual(['bunpro-tts']);
    expect(findReplacement).not.toHaveBeenCalled();
  });

  it('looks up a recording when the example on screen has no audio', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(findReplacement).mockResolvedValue('jpod101');

    const origins: string[] = [];
    await loadTermAudio(TERM, (origin) => origins.push(origin));

    expect(origins).toEqual(['bunpro-tts', 'jpod101']);
  });

  it('still looks up on a Details page even when an example has audio', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(exampleOnScreenHasAudio).mockReturnValue(true);
    vi.mocked(findReplacement).mockResolvedValue('jpod101');

    const origins: string[] = [];
    await loadTermAudio(TERM, (origin) => origins.push(origin), { ignoreExampleAudio: true });

    expect(origins).toEqual(['bunpro-tts', 'jpod101']);
    expect(findReplacement).toHaveBeenCalled();
  });
});
