import type { StudyQuestion } from '../bunpro/api';
import {
  findClozeSentence,
  findNativeSentenceCard,
  findQuestionSection,
  findQuizArticle,
} from '../bunpro/quiz-dom';
import { element } from '../dom';
import { watchRemounts } from '../dom/remount';
import { buildSentenceCard, EXAMPLES_CARD, QUIZ_CARD } from './card';
import { buildClozeStandIns } from './cloze-question';
import { markAsOurs, paintStandIns, removeStandIns, type StandIn } from './stand-in';

/**
 * A review shows one example sentence, so everything that wants to choose it
 * goes through this one slot. Whoever calls `showSentence` last decides what is
 * displayed, and the slot keeps that choice painted over Bunpro's re-renders
 * until the review it belongs to is over.
 */
const SLOT_CLASS = 'bb-sentence-slot mx-auto w-fit animate-fade-in';

export interface ShownSentence {
  reviewKey: string;
  sentences: StudyQuestion[];
  index: number;
}

interface MountedSentence extends ShownSentence {
  standIns: StandIn[];
}

let mounted: MountedSentence | null = null;
let stopRepaintWatch: (() => void) | null = null;

export function shownSentence(): ShownSentence | null {
  return mounted;
}

export function showSentence(shown: ShownSentence): void {
  const sentence = shown.sentences[shown.index];
  if (!sentence) {
    return;
  }

  clearSentence();
  const standIns = buildStandIns(sentence);
  if (standIns.length === 0) {
    return;
  }

  mounted = { ...shown, standIns };
  paintStandIns(standIns);
  repaintWhenBunproRerenders();
}

export function clearSentence(): void {
  stopRepaintWatch?.();
  stopRepaintWatch = null;
  mounted = null;
  removeStandIns();
}

/** Called on every quiz state change, so a sentence never outlives its review. */
export function dropSentenceUnless(reviewKey: string | null): void {
  if (mounted && mounted.reviewKey !== reviewKey) {
    clearSentence();
  }
}

/**
 * Where a sentence goes depends on what the review already shows: Bunpro's own
 * sentence card is stood in for, a cloze question is redrawn around the new
 * sentence, and a review that shows nothing gets a card of ours.
 */
function buildStandIns(sentence: StudyQuestion): StandIn[] {
  if (findNativeSentenceCard()) {
    return [
      {
        ours: markAsOurs(buildSentenceCard(sentence, QUIZ_CARD)),
        hides: findNativeSentenceCard,
      },
    ];
  }

  if (findClozeSentence()) {
    return buildClozeStandIns(sentence);
  }

  const card = element('div', { class: SLOT_CLASS }, [buildSentenceCard(sentence, EXAMPLES_CARD)]);
  return [{ ours: markAsOurs(card), appendTo: findQuestionSection }];
}

/** Bunpro re-renders the question as it reveals, which drops or restores nodes under us. */
function repaintWhenBunproRerenders(): void {
  const article = findQuizArticle();
  if (!article) {
    return;
  }
  stopRepaintWatch?.();
  stopRepaintWatch = watchRemounts(article, () => {
    if (mounted) {
      paintStandIns(mounted.standIns);
    }
  });
}
