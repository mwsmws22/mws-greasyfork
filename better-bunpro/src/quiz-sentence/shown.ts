import type { StudyQuestion } from '../bunpro/api';
import { findClozeSentence, nativeSentenceId } from '../bunpro/quiz-dom';
import { questionSentenceParts } from '../bunpro/sentence-html';

/**
 * Cycling has to know where it is starting from. A sentence card names the
 * study question it shows, but a cloze question does not, so that one is
 * identified by the text on screen.
 */
export function bunproSentenceIndex(sentences: readonly StudyQuestion[]): number {
  const shownId = nativeSentenceId();
  if (shownId !== null) {
    const found = sentences.findIndex((sentence) => sentence.id === shownId);
    if (found !== -1) {
      return found;
    }
  }

  const rendered = findClozeSentence()?.textContent;
  if (rendered) {
    const found = indexOfRenderedSentence(rendered, sentences.map(partsTextOf));
    if (found !== -1) {
      return found;
    }
  }

  return 0;
}

/**
 * The blank is skipped rather than matched: the reviewer may have typed any of
 * the accepted alternatives into it, so only the text around it is reliable.
 */
export function indexOfRenderedSentence(rendered: string, candidates: readonly string[][]): number {
  const shown = withoutSpaces(rendered);
  return candidates.findIndex((parts) => {
    const pieces = parts.map(withoutSpaces).filter((piece) => piece !== '');
    return pieces.length > 0 && appearInOrder(shown, pieces);
  });
}

function appearInOrder(shown: string, pieces: readonly string[]): boolean {
  let searchFrom = 0;
  for (const piece of pieces) {
    const at = shown.indexOf(piece, searchFrom);
    if (at === -1) {
      return false;
    }
    searchFrom = at + piece.length;
  }
  return true;
}

function withoutSpaces(text: string): string {
  return text.replace(/\s+/g, '');
}

/** Furigana is rendered as ruby by both Bunpro and us, so the text agrees. */
function partsTextOf(sentence: StudyQuestion): string[] {
  const holder = document.createElement('div');
  return questionSentenceParts(sentence).map((part) => {
    holder.innerHTML = part;
    return holder.textContent ?? '';
  });
}
