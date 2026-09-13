import {
  attributesOf,
  bunproLocale,
  bunproRequest,
  includedOfType,
  type JsonApiDocument,
} from './api-request';
import type { ReviewableRef } from './quiz-state';

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

/** The reviewed item itself: the vocab word or grammar point the quiz is about. */
export interface Reviewable {
  title: string | null;
  /** How the title is read, for an item written with kanji. */
  kana: string | null;
  /** Bunpro synthesised this item's audio rather than recording a speaker. */
  has_tts_audio: boolean;
  male_audio_url: string | null;
  female_audio_url: string | null;
}

const inFlight = new Map<string, Promise<JsonApiDocument>>();

/**
 * One request per item answers everything we ask about it, so the readers below
 * are free to be called as often as a feature likes.
 */
function fetchItem(reviewable: ReviewableRef): Promise<JsonApiDocument> {
  const key = `${reviewable.type}:${reviewable.id}`;
  let request = inFlight.get(key);
  if (!request) {
    request = requestItem(reviewable);
    inFlight.set(key, request);
  }
  return request;
}

export async function fetchStudyQuestions(reviewable: ReviewableRef): Promise<StudyQuestion[]> {
  return collectStudyQuestions(await fetchItem(reviewable));
}

export async function fetchReviewable(reviewable: ReviewableRef): Promise<Reviewable | null> {
  const attributes = attributesOf(await fetchItem(reviewable));
  return attributes ? (attributes as unknown as Reviewable) : null;
}

async function requestItem(reviewable: ReviewableRef): Promise<JsonApiDocument> {
  const path = `/reviewables/${reviewable.type}/${reviewable.id}?locale=${bunproLocale()}`;
  return bunproRequest<JsonApiDocument>(path);
}

function collectStudyQuestions(payload: JsonApiDocument | null): StudyQuestion[] {
  const sentences: StudyQuestion[] = [];
  for (const attributes of includedOfType(payload, 'study_question')) {
    if (typeof attributes.content !== 'string') {
      continue;
    }
    sentences.push(attributes as unknown as StudyQuestion);
  }
  return sentences.sort(bySentenceOrder);
}

/** Matches the order Bunpro shows in its Examples list; entries without an order go last. */
function bySentenceOrder(left: StudyQuestion, right: StudyQuestion): number {
  const leftOrder = left.sentence_order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sentence_order ?? Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder;
}
