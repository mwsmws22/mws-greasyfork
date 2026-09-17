import { findTermAudioControl } from '../bunpro/quiz-dom';
import type { AudioOrigin } from './origin';
import { isRealAudioOrigin, labelForOrigin } from './origin';

const PLAY_TITLE_BACKUP = 'bbAudioTitle';
const REAL_AUDIO_CLASS = 'bb-audio-real';
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
 */
export function syncAudioSourceIndicator(cue: AudioSourceCue): void {
  removeLegacyChip();
  const label = labelForOrigin(cue.origin);
  const control = findTermAudioControl();
  if (!control) {
    return;
  }

  const emphasize = cue.afterSubmit && isRealAudioOrigin(cue.origin);
  if (control.title === label && control.classList.contains(REAL_AUDIO_CLASS) === emphasize) {
    return;
  }

  rememberPlayTitle(control);
  if (control.title !== label) {
    control.title = label;
  }
  control.classList.toggle(REAL_AUDIO_CLASS, emphasize);
}

export function clearAudioSourceIndicator(): void {
  restorePlayTitle();
  clearRealAudioClass();
  removeLegacyChip();
}

function rememberPlayTitle(control: HTMLElement): void {
  if (control.dataset[PLAY_TITLE_BACKUP] === undefined) {
    control.dataset[PLAY_TITLE_BACKUP] = control.title || DEFAULT_PLAY_TITLE;
  }
}

function restorePlayTitle(): void {
  const control = findTermAudioControl();
  if (!control) {
    return;
  }
  const original = control.dataset[PLAY_TITLE_BACKUP];
  if (original !== undefined) {
    control.title = original;
    delete control.dataset[PLAY_TITLE_BACKUP];
  }
}

function clearRealAudioClass(): void {
  const control = findTermAudioControl();
  control?.classList.remove(REAL_AUDIO_CLASS);
}

function removeLegacyChip(): void {
  document.getElementById(LEGACY_CHIP_ID)?.remove();
}
