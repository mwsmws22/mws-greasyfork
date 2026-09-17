/** Where the clip that will play for this term came from. */
export type AudioOrigin = 'jpod101' | 'jisho' | 'bunpro-tts' | 'bunpro-rec';

export function labelForOrigin(origin: AudioOrigin): string {
  switch (origin) {
    case 'jpod101':
      return 'JPod101 Recording';
    case 'jisho':
      return 'Jisho Recording';
    case 'bunpro-tts':
      return 'Bunpro TTS';
    case 'bunpro-rec':
      return 'Bunpro Recording';
  }
}

/** A human recording — dictionary or Bunpro's own — not synthesised TTS. */
export function isRealAudioOrigin(origin: AudioOrigin): boolean {
  return origin === 'jpod101' || origin === 'jisho' || origin === 'bunpro-rec';
}

export function originFromSourceName(name: string): AudioOrigin {
  if (name === 'Jisho') {
    return 'jisho';
  }
  if (name.startsWith('JapanesePod101')) {
    return 'jpod101';
  }
  throw new Error(`Unknown audio source: ${name}`);
}

export function bunproOrigin(hasTtsAudio: boolean): AudioOrigin {
  return hasTtsAudio ? 'bunpro-tts' : 'bunpro-rec';
}

/**
 * Bunpro sentence clips: synthesised under `/audio/vocab/tts/`, otherwise a
 * human recording (vocab pronunciation, grammar `/audio/grammar/…`, etc.).
 */
export function bunproClipOrigin(url: string | null | undefined): AudioOrigin | null {
  if (!url) {
    return null;
  }
  return url.includes('/audio/vocab/tts/') ? 'bunpro-tts' : 'bunpro-rec';
}
