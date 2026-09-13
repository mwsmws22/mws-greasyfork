import { describe, expect, it } from 'vitest';
import { clipId } from './source';

describe('clipId', () => {
  it('matches the id Jisho puts on a clip', () => {
    expect(clipId({ term: '食べる', reading: 'たべる' })).toBe('audio_食べる:たべる');
  });
});
