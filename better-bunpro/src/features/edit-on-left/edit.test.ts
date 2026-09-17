// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { QuizState } from '../../bunpro/quiz-state';
import { caretIndexAfterLefts, pendingRestoreAction, restoreWrongAnswer, shouldEnterEditOnLeft } from './edit';

const wrongTyped: QuizState = {
  sessionId: '1',
  reviewable: { id: 1, type: 'grammar_point' },
  questionMode: 'cloze',
  inputMode: 'manual',
  answers: ['あつくてはならない'],
  submittedAnswer: 'あつくてはならない',
  isPostAttempt: true,
  isRevealing: true,
  isCorrect: false,
  isShowingInfo: false,
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('shouldEnterEditOnLeft', () => {
  it('is true after a wrong typed answer', () => {
    expect(shouldEnterEditOnLeft(wrongTyped)).toBe(true);
  });

  it('is false once the answer is already editable, or was correct', () => {
    expect(shouldEnterEditOnLeft({ ...wrongTyped, isPostAttempt: false })).toBe(false);
    expect(shouldEnterEditOnLeft({ ...wrongTyped, isCorrect: true })).toBe(false);
  });

  it('is false for flashcards and while More Info is using Left for tabs', () => {
    expect(shouldEnterEditOnLeft({ ...wrongTyped, inputMode: 'flashcard' })).toBe(false);
    expect(shouldEnterEditOnLeft({ ...wrongTyped, isShowingInfo: true })).toBe(false);
  });
});

describe('caretIndexAfterLefts', () => {
  it('walks left from the end without dropping characters', () => {
    expect(caretIndexAfterLefts('あつくてはならない', 1)).toBe(8);
    expect(caretIndexAfterLefts('あつくてはならない', 4)).toBe(5);
  });

  it('stops at the start of the string', () => {
    expect(caretIndexAfterLefts('はい', 10)).toBe(0);
    expect(caretIndexAfterLefts('', 1)).toBe(0);
  });
});

describe('pendingRestoreAction', () => {
  it('applies once the same review is editable again', () => {
    expect(pendingRestoreAction('vocab:1@s', 'vocab:1@s', false)).toBe('apply');
  });

  it('waits while still graded, or while the review id is unknown', () => {
    expect(pendingRestoreAction('vocab:1@s', 'vocab:1@s', true)).toBe('wait');
    expect(pendingRestoreAction('vocab:1@s', null, false)).toBe('wait');
  });

  it('gives up if the quiz has moved on to a different review', () => {
    expect(pendingRestoreAction('vocab:1@s', 'vocab:2@s', false)).toBe('forget');
  });
});

describe('restoreWrongAnswer', () => {
  it('puts the full guess back and parks the caret after the Lefts', () => {
    document.body.innerHTML = `<input id="js-manual-input" type="text" value="あつくてはならな" />`;

    restoreWrongAnswer('あつくてはならない', 4);

    const input = document.getElementById('js-manual-input');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('missing input');
    }
    expect(input.value).toBe('あつくてはならない');
    expect(input.selectionStart).toBe(5);
    expect(input.selectionEnd).toBe(5);
  });
});
