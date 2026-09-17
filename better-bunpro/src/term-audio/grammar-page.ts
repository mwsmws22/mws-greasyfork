import { attributesOf, bunproLocale, bunproRequest } from '../bunpro/api-request';
import type { ReviewableRef } from '../bunpro/quiz-state';

/** `/grammar_points/{slug}` — Bunpro's grammar detail page. */
export function grammarSlugFromPath(pathname = location.pathname): string | null {
  const match = pathname.match(/^\/grammar_points\/([^/]+)\/?$/);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Resolve the page slug to the reviewable Bunpro uses for study questions. */
export async function reviewableFromGrammarSlug(slug: string): Promise<ReviewableRef | null> {
  const path = `/reviewables/grammar_point/${encodeURIComponent(slug)}?locale=${bunproLocale()}`;
  const attributes = attributesOf(await bunproRequest(path));
  if (typeof attributes?.id !== 'number') {
    return null;
  }
  return { id: attributes.id, type: 'grammar_point' };
}
