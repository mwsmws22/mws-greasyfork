import { matchingTerm, searchVocab } from '../bunpro/term-search';
import type { ReviewableRef } from '../bunpro/quiz-state';

/** `/vocabs/{slug}` — Bunpro's vocabulary detail page. */
export function vocabSlugFromPath(pathname = location.pathname): string | null {
  const match = pathname.match(/^\/vocabs\/([^/]+)\/?$/);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Resolve the page slug to the reviewable Bunpro uses for term audio. */
export async function reviewableFromVocabSlug(slug: string): Promise<ReviewableRef | null> {
  const terms = await searchVocab(slug);
  const bySlug = terms.find((term) => term.slug === slug);
  if (bySlug) {
    return { id: bySlug.id, type: 'vocab' };
  }
  const match = matchingTerm(terms, slug);
  return match ? { id: match.id, type: 'vocab' } : null;
}
