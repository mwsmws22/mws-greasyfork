import type { ReviewableRef } from './quiz-state';

/**
 * Bunpro's own frontend authenticates against this host with a token it keeps
 * in a readable cookie, so we can reuse the signed-in session as-is.
 */
const API_BASE = 'https://api.bunpro.jp/api/frontend';
const TOKEN_COOKIE = 'frontend_api_token';
const LOCALE_COOKIE = 'locale';

export interface StudyQuestion {
  id: number;
  content: string;
  answer: string | null;
  kanji_answer: string | null;
  translation: string | null;
  /** Shown after the sentence as the dictionary form to conjugate, e.g. `(寝る)`. */
  word_prompt: string | null;
  /** Shown above the sentence in a cloze question, e.g. `Past`. */
  tense: string | null;
  sentence_order: number | null;
  male_audio_url: string | null;
  female_audio_url: string | null;
}

const inFlight = new Map<string, Promise<StudyQuestion[]>>();

export function fetchStudyQuestions(reviewable: ReviewableRef): Promise<StudyQuestion[]> {
  const key = `${reviewable.type}:${reviewable.id}`;
  let request = inFlight.get(key);
  if (!request) {
    request = requestStudyQuestions(reviewable);
    inFlight.set(key, request);
  }
  return request;
}

async function requestStudyQuestions(reviewable: ReviewableRef): Promise<StudyQuestion[]> {
  const token = readCookie(TOKEN_COOKIE);
  if (!token) {
    throw new Error(`No ${TOKEN_COOKIE} cookie found; are you signed in to Bunpro?`);
  }

  const locale = readCookie(LOCALE_COOKIE) ?? 'en';
  const url = `${API_BASE}/reviewables/${reviewable.type}/${reviewable.id}?locale=${locale}`;
  const response = await fetch(url, {
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      Authorization: `Token token=${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }

  return collectStudyQuestions((await response.json()) as JsonApiPayload);
}

interface JsonApiEntry {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
}

interface JsonApiPayload {
  included?: JsonApiEntry[];
}

function collectStudyQuestions(payload: JsonApiPayload): StudyQuestion[] {
  const sentences: StudyQuestion[] = [];
  for (const entry of payload.included ?? []) {
    if (entry.type !== 'study_question' || !entry.attributes) {
      continue;
    }
    const attributes = entry.attributes;
    if (typeof attributes.content !== 'string') {
      continue;
    }
    sentences.push({
      ...(attributes as unknown as StudyQuestion),
      id: typeof attributes.id === 'number' ? attributes.id : Number(entry.id),
    });
  }
  return sentences.sort(bySentenceOrder);
}

/** Matches the order Bunpro shows in its Examples list; entries without an order go last. */
function bySentenceOrder(left: StudyQuestion, right: StudyQuestion): number {
  const leftOrder = left.sentence_order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sentence_order ?? Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder;
}

function readCookie(name: string): string | null {
  for (const pair of document.cookie.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) {
      continue;
    }
    if (pair.slice(0, separator).trim() !== name) {
      continue;
    }
    const value = decodeURIComponent(pair.slice(separator + 1)).trim();
    return value === '' ? null : value;
  }
  return null;
}
