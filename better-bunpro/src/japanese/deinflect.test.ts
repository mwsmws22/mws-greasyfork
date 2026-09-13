import { describe, expect, it } from 'vitest';
import { deinflect } from './deinflect';

describe('deinflect', () => {
  it('offers the word itself first, so an uninflected word is looked up as typed', () => {
    expect(deinflect('食べる')[0]).toBe('食べる');
    expect(deinflect('本')).toEqual(['本']);
  });

  it('reaches the dictionary form of an ichidan verb', () => {
    expect(deinflect('食べます')).toContain('食べる');
    expect(deinflect('食べました')).toContain('食べる');
    expect(deinflect('食べない')).toContain('食べる');
    expect(deinflect('食べた')).toContain('食べる');
    expect(deinflect('食べて')).toContain('食べる');
    expect(deinflect('食べられる')).toContain('食べる');
    expect(deinflect('食べたい')).toContain('食べる');
  });

  it('reaches the dictionary form of a godan verb across its rows', () => {
    expect(deinflect('飲みます')).toContain('飲む');
    expect(deinflect('飲まない')).toContain('飲む');
    expect(deinflect('飲んだ')).toContain('飲む');
    expect(deinflect('飲んで')).toContain('飲む');
    expect(deinflect('飲める')).toContain('飲む');
    expect(deinflect('飲めば')).toContain('飲む');
    expect(deinflect('飲もう')).toContain('飲む');
    expect(deinflect('書いた')).toContain('書く');
    expect(deinflect('話しました')).toContain('話す');
    expect(deinflect('買わない')).toContain('買う');
    expect(deinflect('待った')).toContain('待つ');
  });

  it('reaches the dictionary form through chained inflections', () => {
    expect(deinflect('食べられなかった')).toContain('食べる');
    expect(deinflect('飲まなくて')).toContain('飲む');
  });

  it('reaches the dictionary form of an i-adjective', () => {
    expect(deinflect('高くない')).toContain('高い');
    expect(deinflect('高かった')).toContain('高い');
    expect(deinflect('高くて')).toContain('高い');
    expect(deinflect('高く')).toContain('高い');
  });

  /**
   * A rule firing where it does not belong only costs a lookup the dictionary
   * rejects, but it must never eat the whole word: `する` has no stem left.
   */
  it('never proposes an empty word', () => {
    for (const word of ['する', 'た', 'ない', 'く', 'て']) {
      expect(deinflect(word).every((form) => form !== '')).toBe(true);
    }
  });

  it('proposes a bounded number of forms, since each one may cost a lookup', () => {
    expect(deinflect('食べられなかった').length).toBeLessThan(40);
  });
});
