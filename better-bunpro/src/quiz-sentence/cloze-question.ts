import type { StudyQuestion } from '../bunpro/api';
import { findClozeSentence, findClozeTense, findQuestionTranslation } from '../bunpro/quiz-dom';
import { questionSentenceParts, sentenceAnswerHtml } from '../bunpro/sentence-html';
import { element } from '../dom';
import { markAsOurs, type StandIn } from './stand-in';

/**
 * Swapping the sentence of a cloze question means redrawing the question
 * itself. Every node is cloned from the one it replaces, so the swapped
 * sentence keeps the styling the current quiz state asks for — the answer
 * coloured as correct, the translation revealed or hinted — without us
 * having to know any of those rules.
 */
export function buildClozeStandIns(sentence: StudyQuestion): StandIn[] {
  const originalSentence = findClozeSentence();
  if (!originalSentence) {
    return [];
  }

  const standIns: StandIn[] = [
    { ours: markAsOurs(buildSentence(originalSentence, sentence)), hides: findClozeSentence },
  ];

  /** Bunpro only renders these when the reviewed sentence has them, so we follow suit. */
  const originalTense = findClozeTense();
  if (originalTense) {
    standIns.push({
      ours: markAsOurs(refilled(originalTense, sentence.tense ?? '')),
      hides: findClozeTense,
    });
  }

  const originalTranslation = findQuestionTranslation();
  if (originalTranslation) {
    standIns.push({
      ours: markAsOurs(refilled(originalTranslation, sentence.translation ?? '')),
      hides: findQuestionTranslation,
    });
  }

  return standIns;
}

function buildSentence(original: HTMLElement, sentence: StudyQuestion): HTMLElement {
  const line = shallowClone(original);
  const parts = questionSentenceParts(sentence);

  parts.forEach((part, index) => {
    line.append(refilled(partTemplate(original), part));
    if (index < parts.length - 1) {
      line.append(buildBlank(original, sentence));
    }
  });

  return line;
}

/**
 * Bunpro's blank is a button that returns focus to the input. Ours only has to
 * look like it, and a span cannot take focus or submit anything by accident.
 */
function buildBlank(original: HTMLElement, sentence: StudyQuestion): HTMLElement {
  const answer = sentenceAnswerHtml(sentence);
  const template = original.querySelector<HTMLElement>(':scope > button');
  if (!template) {
    return refilled(partTemplate(original), answer);
  }

  const blank = element('span', { class: template.className });
  const inner = template.querySelector<HTMLElement>('span');
  if (inner) {
    blank.append(refilled(inner, answer));
  } else {
    blank.innerHTML = answer;
  }
  return blank;
}

/** The furigana-aware wrapper Bunpro puts each piece of the sentence in. */
function partTemplate(original: HTMLElement): HTMLElement {
  return (
    original.querySelector<HTMLElement>(':scope > span') ??
    element('span', { class: 'bp-ddw wrap-anywhere', 'data-force-furigana': 'default' })
  );
}

function refilled(template: HTMLElement, html: string): HTMLElement {
  const clone = shallowClone(template);
  clone.innerHTML = html;
  return clone;
}

function shallowClone(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(false) as HTMLElement;
  clone.style.removeProperty('display');
  return clone;
}
