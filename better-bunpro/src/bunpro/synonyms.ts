/**
 * A vocab item's "Your Synonyms" are the extra answers Bunpro will accept for
 * it. Bunpro stores them as one comma-separated string and its endpoint replaces
 * the whole list, so adding one means reading the list first and sending it back
 * with the new entry on the end.
 */
import { normalize } from './answer-text';
import { bunproRequest, jsonBody, type JsonApiDocument } from './api-request';
import { reviewOf } from './user-reviews';

/** The limit Bunpro's own synonym field enforces. */
export const SYNONYM_MAX_LENGTH = 38;

export type SynonymOutcome = 'added' | 'already-there';

export async function addUserSynonym(vocabId: number, synonym: string): Promise<SynonymOutcome> {
  const existing = parseSynonyms((await reviewOf({ id: vocabId, type: 'vocab' }))?.user_synonyms);
  if (includesSynonym(existing, synonym)) {
    return 'already-there';
  }

  await saveUserSynonyms(vocabId, [...existing, synonym.trim()]);
  return 'added';
}

async function saveUserSynonyms(vocabId: number, synonyms: string[]): Promise<void> {
  await bunproRequest<JsonApiDocument>(
    `/reviews/vocab/${vocabId}/manage_user_synonyms`,
    jsonBody('POST', { user_synonyms: serializeSynonyms(synonyms) }),
  );
}

export function parseSynonyms(stored: unknown): string[] {
  if (typeof stored !== 'string') {
    return [];
  }
  return stored
    .split(',')
    .map((synonym) => synonym.trim())
    .filter((synonym) => synonym !== '');
}

/** Matches Bunpro's own save: deduplicated, trimmed, and within the length limit. */
export function serializeSynonyms(synonyms: readonly string[]): string {
  const kept = new Set<string>();
  for (const synonym of synonyms) {
    const trimmed = synonym.trim();
    if (trimmed !== '' && trimmed.length <= SYNONYM_MAX_LENGTH) {
      kept.add(trimmed);
    }
  }
  return [...kept].join(',');
}

export function includesSynonym(synonyms: readonly string[], candidate: string): boolean {
  const wanted = normalize(candidate);
  return synonyms.some((synonym) => normalize(synonym) === wanted);
}

/** A guess that is empty, already accepted, or too long is not a synonym to add. */
export function synonymWorthAdding(submitted: string, accepted: readonly string[]): boolean {
  const trimmed = submitted.trim();
  if (trimmed === '' || trimmed.length > SYNONYM_MAX_LENGTH) {
    return false;
  }
  return !includesSynonym(accepted, trimmed);
}
