import { describe, expect, it } from 'vitest';
import type { QuizState } from '../../bunpro/quiz-state';
import { termToPrefetch, termToShow } from './timing';

const vocab: QuizState = {
  sessionId: '1',
  reviewable: { id: 12842, type: 'vocab' },
  questionMode: 'translate',
  inputMode: 'manual',
  answers: ['to have guts'],
  submittedAnswer: null,
  isPostAttempt: false,
  isRevealing: false,
  isCorrect: false,
  isShowingInfo: false,
};

describe('termToPrefetch', () => {
  it('starts fetching as soon as a vocab translate review is on screen', () => {
    expect(termToPrefetch(vocab)).toEqual({ id: 12842, type: 'vocab' });
  });

  it('does not prefetch grammar or cloze reviews', () => {
    expect(termToPrefetch({ ...vocab, reviewable: { id: 1, type: 'grammar_point' } })).toBeNull();
    expect(termToPrefetch({ ...vocab, questionMode: 'cloze' })).toBeNull();
  });
});

describe('termToShow', () => {
  it('waits until a correct reveal with no native sentence', () => {
    expect(termToShow(vocab, false)).toBeNull();
    expect(termToShow({ ...vocab, isRevealing: true, isCorrect: false }, false)).toBeNull();
    expect(termToShow({ ...vocab, isRevealing: true, isCorrect: true }, true)).toBeNull();
    expect(termToShow({ ...vocab, isRevealing: true, isCorrect: true }, false)).toEqual({
      id: 12842,
      type: 'vocab',
    });
  });
});
