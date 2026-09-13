import type { StudyQuestion } from '../../bunpro/api';
import { studyQuestionToHtml } from '../../bunpro/sentence-html';
import { element, svgIcon } from '../../dom';

/**
 * Class strings are lifted from Bunpro's own sentence card at its `small` size
 * preset, so an injected card is indistinguishable from one they shipped.
 */
const SLOT_CLASS = 'brt-sentence-slot mx-auto mt-8 w-fit sm:mt-0 animate-fade-in';
const CARD_CLASS =
  'not-prose relative my-0 block overflow-hidden rounded-normal border align-top ' +
  'sm:flex sm:items-center sm:justify-between gap-8 px-12 py-8 sm:p-16 sm:gap-12 sm:pt-12 ' +
  'bg-tertiary-bg/50 border-rim';
const TEXT_COLUMN_CLASS =
  'relative z-1 flex grow flex-col items-center justify-center gap-4 text-center';
const JAPANESE_CLASS = 'bp-ddw text-body sm:text-large prose w-full';
const ENGLISH_CLASS = 'bp-sdw text-extra-small sm:text-body prose w-full';

const PLAY_CIRCLE_PATH =
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 13.5v-7a.5.5 0 0 1 ' +
  '.8-.4l4.67 3.5c.27.2.27.6 0 .8l-4.67 3.5a.5.5 0 0 1-.8-.4';

export const CARD_MARKER = 'data-brt-sentence-card';

export function buildSentenceCard(sentence: StudyQuestion): HTMLElement {
  const japanese = element('p', {
    class: JAPANESE_CLASS,
    'data-force-furigana': 'default',
  });
  japanese.innerHTML = studyQuestionToHtml(sentence);

  const english = element('p', { class: ENGLISH_CLASS }, [sentence.translation ?? '']);
  const textColumn = element('div', { class: TEXT_COLUMN_CLASS }, [japanese, english]);

  const audioUrl = sentence.female_audio_url ?? sentence.male_audio_url;
  const card = element(
    'aside',
    { class: CARD_CLASS, 'data-brt-study-question': String(sentence.id) },
    audioUrl ? [buildAudioButton(audioUrl), textColumn] : [textColumn],
  );

  return element('div', { class: SLOT_CLASS, [CARD_MARKER]: '' }, [card]);
}

function buildAudioButton(audioUrl: string): HTMLElement {
  const icon = svgIcon('h-24 w-24', `<path d="${PLAY_CIRCLE_PATH}" fill="currentColor"/>`);
  const sizing = element(
    'div',
    { class: 'bp-hover-bg__child rounded-normal', style: 'font-size: 1.625rem;' },
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
