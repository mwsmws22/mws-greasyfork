// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as termSearch from '../bunpro/term-search';
import { reviewableFromVocabSlug, vocabSlugFromPath } from './vocab-page';

describe('vocabSlugFromPath', () => {
  it('reads the decoded slug from a vocab detail URL', () => {
    expect(vocabSlugFromPath('/vocabs/%E5%A7%94%E3%81%AD%E3%82%8B')).toBe('委ねる');
    expect(vocabSlugFromPath('/vocabs/iji')).toBe('iji');
    expect(vocabSlugFromPath('/reviews')).toBeNull();
    expect(vocabSlugFromPath('/vocabs/iji/edit')).toBeNull();
  });
});

describe('reviewableFromVocabSlug', () => {
  it('prefers an exact slug match from Bunpro search', async () => {
    vi.spyOn(termSearch, 'searchVocab').mockResolvedValue([
      {
        id: 42,
        type: 'vocab',
        furigana: '委ねる',
        written: '委ねる',
        reading: 'ゆだねる',
        meaning: 'to entrust',
        slug: '委ねる',
        isInReviews: true,
      },
    ]);

    await expect(reviewableFromVocabSlug('委ねる')).resolves.toEqual({ id: 42, type: 'vocab' });
  });
});
