import {
  findAnswerBarAudioControl,
  findDetailsPitchPlay,
  findExamplesListPlayControls,
  studyQuestionIdOfPlayControl,
} from '../bunpro/quiz-dom';
import type { AudioOrigin } from './origin';
import { isRealAudioOrigin, labelForOrigin } from './origin';

const PLAY_TITLE_BACKUP = 'bbAudioTitle';
const REAL_AUDIO_CLASS = 'bb-audio-real';
const TTS_AUDIO_CLASS = 'bb-audio-tts';
const DEFAULT_PLAY_TITLE = 'Open the audio player and play audio';
/** Leftover from the short-lived inline chip; strip it if HMR left one behind. */
const LEGACY_CHIP_ID = 'bb-audio-source';

export interface AudioSourceCue {
  /** Accent real recordings only after the answer is in (or always on Details pages). */
  afterSubmit: boolean;
  /** Quiz answer-bar play control. */
  answerOrigin?: AudioOrigin | null;
  /** Details pitch-accent play control — often a different origin when the example has audio. */
  detailsOrigin?: AudioOrigin | null;
  /**
   * Info Examples list speakers, keyed by study-question id.
   * Does not include the quiz on-screen sentence card.
   */
  exampleOrigins?: ReadonlyMap<number, AudioOrigin> | null;
}

/**
 * Play-button tooltips for the audio source. Answer bar and Details can disagree:
 * when the on-screen example already has a clip, the answer bar stays on Bunpro
 * TTS while Details still shows a real term recording.
 */
export function syncAudioSourceIndicator(cue: AudioSourceCue): void {
  removeLegacyChip();
  const answer = findAnswerBarAudioControl();
  if (answer && cue.answerOrigin) {
    paintControl(answer, cue.answerOrigin, cue.afterSubmit);
  }
  const details = findDetailsPitchPlay();
  if (details && cue.detailsOrigin) {
    paintControl(details, cue.detailsOrigin, cue.afterSubmit);
  }
  paintExampleControls(cue.exampleOrigins ?? null, cue.afterSubmit);
}

export function clearAudioSourceIndicator(): void {
  restorePlayTitles();
  clearAudioClasses();
  removeLegacyChip();
}

function paintExampleControls(
  origins: ReadonlyMap<number, AudioOrigin> | null,
  afterSubmit: boolean,
): void {
  if (!origins || origins.size === 0) {
    return;
  }
  for (const control of findExamplesListPlayControls()) {
    const id = studyQuestionIdOfPlayControl(control);
    if (id === null) {
      continue;
    }
    const origin = origins.get(id);
    if (origin) {
      paintControl(control, origin, afterSubmit);
    }
  }
}

function paintControl(control: HTMLElement, origin: AudioOrigin, afterSubmit: boolean): void {
  const label = labelForOrigin(origin);
  const emphasize = afterSubmit && isRealAudioOrigin(origin);
  const asTts = afterSubmit && !isRealAudioOrigin(origin);
  if (
    control.title === label &&
    control.classList.contains(REAL_AUDIO_CLASS) === emphasize &&
    control.classList.contains(TTS_AUDIO_CLASS) === asTts
  ) {
    return;
  }

  rememberPlayTitle(control);
  if (control.title !== label) {
    control.title = label;
  }
  control.classList.toggle(REAL_AUDIO_CLASS, emphasize);
  control.classList.toggle(TTS_AUDIO_CLASS, asTts);
}

function rememberPlayTitle(control: HTMLElement): void {
  if (control.dataset[PLAY_TITLE_BACKUP] === undefined) {
    control.dataset[PLAY_TITLE_BACKUP] = control.title || DEFAULT_PLAY_TITLE;
  }
}

function paintedControls(): HTMLElement[] {
  const controls = [findAnswerBarAudioControl(), findDetailsPitchPlay()].filter(
    (el): el is HTMLElement => el !== null,
  );
  controls.push(...findExamplesListPlayControls());
  return controls;
}

function restorePlayTitles(): void {
  for (const control of paintedControls()) {
    const original = control.dataset[PLAY_TITLE_BACKUP];
    if (original !== undefined) {
      control.title = original;
      delete control.dataset[PLAY_TITLE_BACKUP];
    }
  }
}

function clearAudioClasses(): void {
  for (const control of paintedControls()) {
    control.classList.remove(REAL_AUDIO_CLASS, TTS_AUDIO_CLASS);
  }
}

function removeLegacyChip(): void {
  document.getElementById(LEGACY_CHIP_ID)?.remove();
}
