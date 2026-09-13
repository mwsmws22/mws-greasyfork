import { describe, expect, it } from 'vitest';
import { textRunFromPieces, type TextPiece } from './text-run';

/** 食べる as Bunpro renders it: the 食 is annotated, べる is not. */
const TABERU: TextPiece[] = [
  { text: '食', role: 'written' },
  { text: 'た', role: 'reading' },
  { text: 'べる', role: 'written' },
];

describe('textRunFromPieces', () => {
  it('reads the written word from a click on the kanji, skipping the ruby reading', () => {
    expect(textRunFromPieces(TABERU, 0, 0)).toBe('食べる');
  });

  it('reads from the kana that was clicked, not from the start of the word', () => {
    expect(textRunFromPieces(TABERU, 2, 0)).toBe('べる');
    expect(textRunFromPieces(TABERU, 2, 1)).toBe('る');
  });

  it('looks the word up by reading when the click was on the furigana', () => {
    expect(textRunFromPieces(TABERU, 1, 0)).toBe('たべる');
  });

  it('stops once the Japanese run ends', () => {
    const pieces: TextPiece[] = [
      { text: '本', role: 'written' },
      { text: '。です', role: 'written' },
    ];

    expect(textRunFromPieces(pieces, 0, 0)).toBe('本');
  });
});
