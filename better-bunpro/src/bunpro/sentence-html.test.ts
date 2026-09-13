import { describe, expect, it } from 'vitest';
import type { StudyQuestion } from './api';
import { studyQuestionToHtml } from './sentence-html';
import renderedSentences from './__fixtures__/bunpro-rendered-sentences.json';

/**
 * Fixtures are real sentences captured from Bunpro's own pages: `content` and
 * `answer` as their API returns them, `expected` as Bunpro rendered them. Our
 * port has to agree exactly, or injected cards will not look native.
 */
describe('studyQuestionToHtml', () => {
  for (const sentence of renderedSentences) {
    const style = sentence.answer === null ? 'inline highlight' : 'cloze blank';

    it(`matches Bunpro for sentence ${sentence.id} (${style})`, () => {
      const studyQuestion = {
        id: sentence.id,
        content: sentence.content,
        answer: sentence.answer,
        kanji_answer: null,
      } as StudyQuestion;

      expect(studyQuestionToHtml(studyQuestion)).toBe(sentence.expected);
    });
  }

  it('prefers the kanji answer when one is present', () => {
    const studyQuestion = {
      content: '____を食（た）べる',
      answer: 'りんご',
      kanji_answer: '林檎（りんご）',
    } as StudyQuestion;

    expect(studyQuestionToHtml(studyQuestion)).toContain(
      '<ruby>林檎<rp>(</rp><rt>りんご</rt><rp>)</rp></ruby>',
    );
  });

  it('leaves text alone when there is nothing to annotate', () => {
    const studyQuestion = { content: 'ひらがなだけ。', answer: null } as StudyQuestion;

    expect(studyQuestionToHtml(studyQuestion)).toBe('ひらがなだけ。');
  });
});
