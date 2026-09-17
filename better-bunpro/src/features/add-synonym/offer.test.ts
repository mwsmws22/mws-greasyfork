import { describe, expect, it } from 'vitest';
import type { QuizState } from '../../bunpro/quiz-state';
import { shouldOfferSynonym } from './offer';

const wrongVocab: QuizState = {
  sessionId: '1',
  reviewable: { id: 23386, type: 'vocab' },
  questionMode: 'translate',
  inputMode: 'manual',
  answers: ['to have guts'],
  submittedAnswer: 'to be brave',
  isPostAttempt: true,
  isRevealing: true,
  isCorrect: false,
  isShowingInfo: false,
};

describe('shouldOfferSynonym', () => {
  it('offers the button after a wrong typed vocab translation', () => {
    expect(shouldOfferSynonym(wrongVocab)).toBe(true);
  });

  it('does not offer it on a correct answer, a grammar point, or a cloze', () => {
    expect(shouldOfferSynonym({ ...wrongVocab, isCorrect: true })).toBe(false);
    expect(shouldOfferSynonym({ ...wrongVocab, reviewable: { id: 1, type: 'grammar_point' } })).toBe(
      false,
    );
    expect(shouldOfferSynonym({ ...wrongVocab, questionMode: 'cloze' })).toBe(false);
  });

  it('does not offer it before the answer has been graded, or with nothing to add', () => {
    expect(shouldOfferSynonym({ ...wrongVocab, isPostAttempt: false })).toBe(false);
    expect(shouldOfferSynonym({ ...wrongVocab, submittedAnswer: '' })).toBe(false);
    expect(shouldOfferSynonym({ ...wrongVocab, submittedAnswer: 'to have guts' })).toBe(false);
  });
});
