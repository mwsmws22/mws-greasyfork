// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as apiRequest from '../bunpro/api-request';
import {
  grammarSlugFromPath,
  reviewableFromGrammarSlug,
} from './grammar-page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('grammarSlugFromPath', () => {
  it('reads the decoded slug from a grammar point URL', () => {
    expect(grammarSlugFromPath('/grammar_points/%E3%81%99%E3%82%89')).toBe('すら');
    expect(grammarSlugFromPath('/grammar_points/suru')).toBe('suru');
    expect(grammarSlugFromPath('/reviews')).toBeNull();
    expect(grammarSlugFromPath('/grammar_points/すら/edit')).toBeNull();
  });
});

describe('reviewableFromGrammarSlug', () => {
  it('resolves the grammar point id from Bunpro\'s reviewable endpoint', async () => {
    vi.spyOn(apiRequest, 'bunproRequest').mockResolvedValue({
      data: {
        id: '787',
        type: 'grammar_point',
        attributes: { id: 787, slug: 'すら' },
      },
    });

    await expect(reviewableFromGrammarSlug('すら')).resolves.toEqual({
      id: 787,
      type: 'grammar_point',
    });
    expect(apiRequest.bunproRequest).toHaveBeenCalledWith(
      '/reviewables/grammar_point/%E3%81%99%E3%82%89?locale=en',
    );
  });
});
