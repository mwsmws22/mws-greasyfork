import { findTermAudioControls } from '../bunpro/quiz-dom';
import type { AudioOrigin } from './origin';
import { isRealAudioOrigin, labelForOrigin } from './origin';

const PLAY_TITLE_BACKUP = 'bbAudioTitle';
const REAL_AUDIO_CLASS = 'bb-audio-real';
const TTS_AUDIO_CLASS = 'bb-audio-tts';
const DEFAULT_PLAY_TITLE = 'Open the audio player and play audio';
/** Leftover from the short-lived inline chip; strip it if HMR left one behind. */
const LEGACY_CHIP_ID = 'bb-audio-source';

export interface AudioSourceCue {
  origin: AudioOrigin;
  /** Accent the play control only after the answer is in — same moment Bunpro reveals. */
  afterSubmit: boolean;
}

/**
 * Play-button tooltip for the audio source. When the clip is a real recording
 * and the answer is already in, tint the control with Bunpro's primary accent.
 * When only TTS will play, force primary fg so Details (accent by default) reads
 * as untinted.
 *
 * Paints every on-screen term control — answer bar and Details pitch play —
 * so a review page with both does not leave Details unlabeled.
 */
export function syncAudioSourceIndicator(cue: AudioSourceCue): void {
  removeLegacyChip();
  const label = labelForOrigin(cue.origin);
  const controls = findTermAudioControls();
  if (controls.length === 0) {
    return;
  }

  const emphasize = cue.afterSubmit && isRealAudioOrigin(cue.origin);
  const asTts = cue.afterSubmit && !isRealAudioOrigin(cue.origin);

  for (const control of controls) {
    if (
      control.title === label &&
      control.classList.contains(REAL_AUDIO_CLASS) === emphasize &&
      control.classList.contains(TTS_AUDIO_CLASS) === asTts
    ) {
      continue;
    }

    rememberPlayTitle(control);
    if (control.title !== label) {
      control.title = label;
    }
    control.classList.toggle(REAL_AUDIO_CLASS, emphasize);
    control.classList.toggle(TTS_AUDIO_CLASS, asTts);
  }
}

export function clearAudioSourceIndicator(): void {
  restorePlayTitles();
  clearAudioClasses();
  removeLegacyChip();
}

function rememberPlayTitle(control: HTMLElement): void {
  if (control.dataset[PLAY_TITLE_BACKUP] === undefined) {
    control.dataset[PLAY_TITLE_BACKUP] = control.title || DEFAULT_PLAY_TITLE;
  }
}

function restorePlayTitles(): void {
  for (const control of findTermAudioControls()) {
    const original = control.dataset[PLAY_TITLE_BACKUP];
    if (original !== undefined) {
      control.title = original;
      delete control.dataset[PLAY_TITLE_BACKUP];
    }
  }
}

function clearAudioClasses(): void {
  for (const control of findTermAudioControls()) {
    control.classList.remove(REAL_AUDIO_CLASS, TTS_AUDIO_CLASS);
  }
}

function removeLegacyChip(): void {
  document.getElementById(LEGACY_CHIP_ID)?.remove();
}
