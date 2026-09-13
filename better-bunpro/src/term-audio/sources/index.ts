import { japanesePod101Dictionary } from './japanesepod101';
import { jisho } from './jisho';
import { jpod101 } from './jpod101';
import type { AudioSource } from './source';

/** Yomitan's order for Japanese: widest coverage first, and the first hit wins. */
export const AUDIO_SOURCES: readonly AudioSource[] = [jpod101, japanesePod101Dictionary, jisho];
