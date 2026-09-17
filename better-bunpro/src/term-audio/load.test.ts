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
import { loadTermAudio, type TermAudioOrigins } from './load';

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

function collectOrigins(
  run: (onOrigins: (origins: TermAudioOrigins) => void) => Promise<void>,
): Promise<TermAudioOrigins[]> {
  const origins: TermAudioOrigins[] = [];
  return run((o) => origins.push(o)).then(() => origins);
}

describe('loadTermAudio', () => {
  it('keeps the answer bar on Bunpro when the example has audio, but still looks up for Details', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(exampleOnScreenHasAudio).mockReturnValue(true);
    vi.mocked(findReplacement).mockResolvedValue('jpod101');

    const origins = await collectOrigins((onOrigins) => loadTermAudio(TERM, onOrigins));

    expect(findReplacement).toHaveBeenCalled();
    expect(origins).toEqual([
      { answer: 'bunpro-tts', details: 'bunpro-tts' },
      { answer: 'bunpro-tts', details: 'jpod101' },
    ]);
  });

  it('uses the recording for both controls when the example on screen has no audio', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(findReplacement).mockResolvedValue('jpod101');

    const origins = await collectOrigins((onOrigins) => loadTermAudio(TERM, onOrigins));

    expect(origins).toEqual([
      { answer: 'bunpro-tts', details: 'bunpro-tts' },
      { answer: 'jpod101', details: 'jpod101' },
    ]);
  });

  it('uses the recording for both when ignoreExampleAudio is set', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.mocked(exampleOnScreenHasAudio).mockReturnValue(true);
    vi.mocked(findReplacement).mockResolvedValue('jpod101');

    const origins = await collectOrigins((onOrigins) =>
      loadTermAudio(TERM, onOrigins, { ignoreExampleAudio: true }),
    );

    expect(origins).toEqual([
      { answer: 'bunpro-tts', details: 'bunpro-tts' },
      { answer: 'jpod101', details: 'jpod101' },
    ]);
  });
});
