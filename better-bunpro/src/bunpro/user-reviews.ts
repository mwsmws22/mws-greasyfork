/**
 * The user's own review of a term: whether it is in their reviews at all, the
 * synonyms they have added to it, and the call that puts a new term into their
 * study queue. Bunpro addresses reviews by a `[PascalType, id]` pair rather than
 * by the snake-cased type its other endpoints use.
 */
import { bunproRequest, dataOfType, jsonBody, type JsonApiDocument } from './api-request';
import type { ReviewableRef, ReviewableType } from './quiz-state';

export interface UserReview {
  id: number;
  /** Comma-separated; `synonyms.ts` owns reading it. */
  user_synonyms: string | null;
  /** Set once the term has been studied, so Bunpro treats it as in the queue. */
  complete: boolean | null;
  reviewable_id: number;
  reviewable_type: string;
}

const PASCAL_TYPE: Record<ReviewableType, string> = {
  vocab: 'Vocab',
  grammar_point: 'GrammarPoint',
};

export async function reviewOf(term: ReviewableRef): Promise<UserReview | null> {
  const payload = await bunproRequest<JsonApiDocument>(
    '/reviews/hydrate_reviewables',
    jsonBody('POST', { reviewables: [reviewableTuple(term)] }),
  );
  const reviews = dataOfType(payload, 'review') as unknown as UserReview[];
  return reviews.find((review) => review.reviewable_id === term.id) ?? reviews[0] ?? null;
}

export async function addTermToReviews(term: ReviewableRef): Promise<void> {
  await bunproRequest<JsonApiDocument>(
    '/reviews/update_via_action_type',
    jsonBody('PATCH', {
      action_type: 'add',
      deck_id: null,
      reviewables: [reviewableTuple(term)],
    }),
  );
}

function reviewableTuple(term: ReviewableRef): [string, number] {
  return [PASCAL_TYPE[term.type], term.id];
}
