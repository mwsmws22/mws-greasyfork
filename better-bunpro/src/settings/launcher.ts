import { GM_registerMenuCommand } from '$';
import { findQuizToolbar } from '../bunpro/quiz-dom';
import { element, svgIcon } from '../dom';
import { watchBodyRemounts } from '../dom/remount';
import { TUNE_SHAPES } from '../ui/better-bunpro-icon';
import { toggleSettingsPanel } from './panel';

const LAUNCHER_MARKER = 'data-bb-launcher';

export function mountSettingsLaunchers(): void {
  GM_registerMenuCommand('Settings', toggleSettingsPanel);
  keepToolbarButtonMounted();
}

/** The quiz toolbar is remounted as Bunpro navigates, so re-add ourselves each time. */
function keepToolbarButtonMounted(): void {
  const mount = () => {
    const toolbar = findQuizToolbar();
    if (!toolbar || toolbar.querySelector(`[${LAUNCHER_MARKER}]`)) {
      return;
    }
    toolbar.append(buildToolbarButton());
  };

  watchBodyRemounts(mount);
  mount();
}

function buildToolbarButton(): HTMLElement {
  const icon = svgIcon('h-24 w-24', TUNE_SHAPES);
  icon.setAttribute('style', 'width: 0.666667em; height: 0.666667em;');

  const button = element(
    'button',
    { class: 'block', title: 'Better Bunpro settings', 'aria-haspopup': 'dialog' },
    [
      element('div', { class: 'bp-hover-bg__child rounded-normal', style: 'font-size: 2.25rem;' }, [
        element(
          'div',
          {
            class: 'relative flex items-center justify-center',
            style: 'width: 1em; height: 1em;',
          },
          [icon],
        ),
      ]),
    ],
  );
  button.addEventListener('click', toggleSettingsPanel);

  return element('li', { [LAUNCHER_MARKER]: '' }, [button]);
}
