import { describe, expect, it } from 'vitest';
import { isSameWord } from './source';

describe('isSameWord', () => {
  it('keeps a result whose reading matches the word we asked for', () => {
    expect(isSameWord({ term: '取り計らう', reading: 'とりはからう' }, 'とりはからう')).toBe(true);
  });

  it('drops a homograph that is read differently', () => {
    expect(isSameWord({ term: '行く', reading: 'いく' }, 'ゆく')).toBe(false);
  });

  it('keeps any reading when the word is its own reading, since there is then nothing to tell homographs apart by', () => {
    expect(isSameWord({ term: 'たべる', reading: 'たべる' }, 'たべる')).toBe(true);
  });

  it('drops a row with no reading at all', () => {
    expect(isSameWord({ term: '食べる', reading: 'たべる' }, null)).toBe(false);
    expect(isSameWord({ term: '食べる', reading: 'たべる' }, '  ')).toBe(false);
  });
});
