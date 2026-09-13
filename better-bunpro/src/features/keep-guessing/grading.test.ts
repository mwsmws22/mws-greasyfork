import { describe, expect, it } from 'vitest';
import { normalize } from '../../bunpro/answer-text';
import { gradeAnswer, similarity } from './grading';

/** The answers Bunpro offered for 度胸がある, taken from a real review. */
const TRANSLATIONS = ['to have guts', 'to be plucky', 'to have nerves of steel'];

describe('gradeAnswer on a translation', () => {
  it('accepts an answer, including one Bunpro would forgive as a typo', () => {
    expect(gradeAnswer('translate', TRANSLATIONS, 'to be plucky')).toBe('accepted');
    expect(gradeAnswer('translate', TRANSLATIONS, 'to be plucy')).toBe('accepted');
    expect(gradeAnswer('translate', TRANSLATIONS, 'TO BE PLUCKY ')).toBe('accepted');
  });

  it('rejects an answer that is merely in the same area', () => {
    expect(gradeAnswer('translate', TRANSLATIONS, 'wrong')).toBe('rejected');
    expect(gradeAnswer('translate', TRANSLATIONS, 'to be brave')).toBe('rejected');
  });
});

describe('gradeAnswer on a reading', () => {
  it('accepts only the reading itself, since Bunpro matches readings outright', () => {
    expect(gradeAnswer('reading', ['どきょう'], 'どきょう')).toBe('accepted');
    expect(gradeAnswer('reading', ['どきょう'], 'どきよう')).toBe('rejected');
  });

  it('leaves romaji to Bunpro, which converts it to kana in the field', () => {
    expect(gradeAnswer('reading', ['どきょう'], 'doky')).toBe('unknown');
  });
});

describe('gradeAnswer where we have no business judging', () => {
  it('leaves an empty answer alone, because that is how you give up', () => {
    expect(gradeAnswer('translate', TRANSLATIONS, '')).toBe('unknown');
    expect(gradeAnswer('translate', TRANSLATIONS, '   ')).toBe('unknown');
  });

  it('leaves cloze and listening questions to Bunpro', () => {
    expect(gradeAnswer('cloze', ['食べた'], '食べる')).toBe('unknown');
    expect(gradeAnswer('listening', TRANSLATIONS, 'wrong')).toBe('unknown');
  });

  it('cannot judge a question whose answers it never saw', () => {
    expect(gradeAnswer('translate', [], 'to have guts')).toBe('unknown');
  });
});

describe('similarity', () => {
  it('scales the edit distance by the longer string, as Bunpro does', () => {
    expect(similarity('guts', 'guts')).toBe(1);
    expect(similarity('guts', 'guns')).toBe(0.75);
    expect(similarity('guts', '')).toBe(0);
    expect(similarity('', '')).toBe(1);
  });
});

describe('normalize', () => {
  it('folds case and accents the way Bunpro does', () => {
    expect(normalize('  Café ')).toBe('cafe');
    expect(normalize('Straße')).toBe('strasse');
  });

  it('keeps Japanese intact so a dakuten is not split off its kana', () => {
    expect(normalize('がっこう')).toBe('がっこう');
    expect(normalize('がっこう').length).toBe(4);
  });
});
