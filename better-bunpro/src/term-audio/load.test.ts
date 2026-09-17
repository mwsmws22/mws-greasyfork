// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Reviewable, StudyQuestion } from '../bunpro/api';
import * as api from '../bunpro/api';

vi.mock('./replacements', () => ({
  findReplacement: vi.fn(),
}));

import { findReplacement } from './replacements';
import { loadTermAudio } from './load';

const TERM = { id: 1, type: 'vocab' as const };

const TTS_ITEM: Reviewable = {
  title: '元凶',
  kana: 'げんきょう',
  has_tts_audio: true,
  male_audio_url: 'https://cdn.example/元凶-male.mp3',
  female_audio_url: null,
};

const SENTENCE_WITH_AUDIO: StudyQuestion = {
  id: 10,
  content: 'それは元凶だ。',
  answer: null,
  kanji_answer: null,
  translation: null,
  word_prompt: null,
  tense: null,
  sentence_order: 1,
  male_audio_url: 'https://cdn.example/sentence-male.mp3',
  female_audio_url: null,
};

const SENTENCE_WITHOUT_AUDIO: StudyQuestion = {
  ...SENTENCE_WITH_AUDIO,
  id: 11,
  male_audio_url: null,
  female_audio_url: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadTermAudio', () => {
  it('skips dictionary lookup when an example sentence already has audio', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.spyOn(api, 'fetchStudyQuestions').mockResolvedValue([SENTENCE_WITH_AUDIO]);
    vi.mocked(findReplacement).mockClear();

    const origins: string[] = [];
    await loadTermAudio(TERM, (origin) => origins.push(origin));

    expect(origins).toEqual(['bunpro-tts']);
    expect(findReplacement).not.toHaveBeenCalled();
  });

  it('looks up a recording when no example sentence has audio', async () => {
    vi.spyOn(api, 'fetchReviewable').mockResolvedValue(TTS_ITEM);
    vi.spyOn(api, 'fetchStudyQuestions').mockResolvedValue([SENTENCE_WITHOUT_AUDIO]);
    vi.mocked(findReplacement).mockResolvedValue('jpod101');

    const origins: string[] = [];
    await loadTermAudio(TERM, (origin) => origins.push(origin));

    expect(origins).toEqual(['bunpro-tts', 'jpod101']);
  });
});
