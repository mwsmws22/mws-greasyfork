import type { Reviewable } from '../bunpro/api';
import { canonicalAudioUrl, type SynthesisedAudio } from './store';

/**
 * Only a synthesised vocab clip is ours to replace. A recording Bunpro already
 * made, or an item with no clip at all, is left alone.
 */
export function synthesisedTermAudio(item: Reviewable): SynthesisedAudio | null {
  if (!item.has_tts_audio || !item.title) {
    return null;
  }

  const ttsUrls = [item.male_audio_url, item.female_audio_url].filter(
    (url): url is string => url !== null && url !== '',
  );
  if (ttsUrls.length === 0) {
    return null;
  }

  return {
    term: item.title,
    reading: item.kana || item.title,
    ttsUrls: ttsUrls.map(canonicalAudioUrl),
  };
}
