import type { StudyQuestion } from '../bunpro/api';
import { studyQuestionToHtml } from '../bunpro/sentence-html';
import { element, svgIcon } from '../dom';

/**
 * Class strings are lifted from Bunpro's own sentence cards so an injected card
 * matches them. `EXAMPLES_CARD` is the `medium` preset their Examples list uses;
 * `QUIZ_CARD` is the smaller one the quiz renders, and is what a card standing
 * in for Bunpro's own has to look like.
 */
export interface CardPreset {
  cardClass: string;
  japaneseClass: string;
  englishClass: string;
  audioFontSize: string;
}

const SHARED_CARD_CLASS =
  'not-prose relative my-0 block overflow-hidden rounded-normal border align-top ' +
  'sm:flex sm:items-center sm:justify-between bg-tertiary-bg/50 border-rim';

export const EXAMPLES_CARD: CardPreset = {
  cardClass: `${SHARED_CARD_CLASS} sm:gap-4 px-16 pt-12 pb-16 sm:px-24 sm:pt-16 sm:pb-24`,
  japaneseClass: 'bp-ddw text-large md:text-subtitle prose w-full',
  englishClass: 'bp-sdw text-body prose w-full',
  audioFontSize: '2.25rem',
};

export const QUIZ_CARD: CardPreset = {
  cardClass: `${SHARED_CARD_CLASS} gap-8 px-12 py-8 sm:p-16 sm:gap-12 sm:pt-12`,
  japaneseClass: 'bp-ddw text-body sm:text-large prose w-full',
  englishClass: 'bp-sdw text-extra-small sm:text-body prose w-full',
  audioFontSize: '1.625rem',
};

const TEXT_COLUMN_CLASS =
  'relative z-1 flex grow flex-col items-center justify-center gap-4 text-center';

const PLAY_CIRCLE_PATH =
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 13.5v-7a.5.5 0 0 1 ' +
  '.8-.4l4.67 3.5c.27.2.27.6 0 .8l-4.67 3.5a.5.5 0 0 1-.8-.4';

export function buildSentenceCard(sentence: StudyQuestion, preset: CardPreset): HTMLElement {
  const japanese = element('p', {
    class: preset.japaneseClass,
    'data-force-furigana': 'default',
  });
  japanese.innerHTML = studyQuestionToHtml(sentence);

  /** Bunpro translations include markup such as <strong>; render as HTML. */
  const english = element('p', { class: preset.englishClass });
  english.innerHTML = sentence.translation ?? '';

  const textColumn = element('div', { class: TEXT_COLUMN_CLASS }, [japanese, english]);

  const audioUrl = sentence.female_audio_url ?? sentence.male_audio_url;
  const children = audioUrl
    ? [buildAudioButton(audioUrl, preset.audioFontSize), textColumn]
    : [textColumn];

  return element(
    'aside',
    { class: preset.cardClass, 'data-bb-study-question': String(sentence.id) },
    children,
  );
}

function buildAudioButton(audioUrl: string, fontSize: string): HTMLElement {
  const icon = svgIcon('h-24 w-24', `<path d="${PLAY_CIRCLE_PATH}" fill="currentColor"/>`);
  const sizing = element(
    'div',
    { class: 'bp-hover-bg__child rounded-normal', style: `font-size: ${fontSize};` },
    [
      element(
        'div',
        {
          class: 'relative flex items-center justify-center',
          style: 'width: 1em; height: 1em;',
        },
        [icon],
      ),
    ],
  );

  const button = element(
    'button',
    { class: 'block transition-opacity text-primary-accent', title: 'Play audio' },
    [sizing],
  );
  button.addEventListener('click', () => void new Audio(audioUrl).play().catch(() => undefined));

  return element('ul', { class: 'relative z-1 hidden sm:flex sm:items-center sm:gap-4' }, [
    element('li', {}, [button]),
  ]);
}
