import { element, svgIcon } from '../dom';
import { isFeatureEnabled, listFeatures, setFeatureEnabled, type Feature } from '../features/registry';
import { injectStyles } from '../styles';

const PANEL_ID = 'brt-settings-panel';
const CARD_CLASS =
  'brt-panel-card relative z-1 flex flex-col overflow-hidden rounded-normal border ' +
  'border-rim bg-secondary-bg text-primary-fg shadow-normal';
const CLOSE_SHAPES =
  '<path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';

export function toggleSettingsPanel(): void {
  const open = document.getElementById(PANEL_ID);
  if (open) {
    open.remove();
    return;
  }
  injectStyles();
  const panel = buildPanel();
  document.body.append(panel);
  panel.querySelector<HTMLElement>('.brt-panel-card')?.focus();
}

function closePanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}

function buildPanel(): HTMLElement {
  const backdrop = element('button', {
    class: 'brt-backdrop absolute inset-0',
    'aria-label': 'Close settings',
  });
  backdrop.addEventListener('click', closePanel);

  const card = element('div', { class: CARD_CLASS, tabindex: '-1' }, [
    buildHeader(),
    element('div', { class: 'grow overflow-y-auto p-16' }, [buildFeatureList()]),
  ]);

  const panel = element(
    'div',
    {
      id: PANEL_ID,
      class: 'fixed inset-0 z-modal flex items-center justify-center p-16',
      role: 'dialog',
      'aria-modal': 'true',
    },
    [backdrop, card],
  );

  /** Keep our keystrokes away from Bunpro's quiz hotkeys and answer input. */
  panel.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      closePanel();
    }
  });

  return panel;
}

function buildHeader(): HTMLElement {
  const close = element(
    'button',
    { class: 'text-primary-accent', title: 'Close', 'aria-label': 'Close' },
    [svgIcon('h-24 w-24', CLOSE_SHAPES)],
  );
  close.addEventListener('click', closePanel);

  return element(
    'header',
    { class: 'flex items-center justify-between gap-16 border-b border-rim p-16' },
    [element('h2', { class: 'text-large font-bold' }, ['Bunpro Review Tweaks']), close],
  );
}

function buildFeatureList(): HTMLElement {
  return element('ul', { class: 'grid gap-16' }, listFeatures().map(buildFeatureRow));
}

function buildFeatureRow(feature: Feature): HTMLElement {
  const label = element('div', { class: 'grid gap-2' }, [
    element('p', { class: 'font-bold' }, [feature.title]),
    element('p', { class: 'text-small text-tertiary-fg' }, [feature.description]),
  ]);
  return element('li', { class: 'flex items-start justify-between gap-16' }, [
    label,
    buildSwitch(feature),
  ]);
}

function buildSwitch(feature: Feature): HTMLElement {
  const button = element('button', { role: 'switch', 'aria-label': feature.title });

  const paint = () => {
    const enabled = isFeatureEnabled(feature);
    button.setAttribute('aria-checked', String(enabled));
    button.className = `brt-switch ${enabled ? 'bg-primary-accent' : 'bg-tertiary-bg'}`;
  };

  button.addEventListener('click', () => {
    setFeatureEnabled(feature, !isFeatureEnabled(feature));
    paint();
  });
  paint();

  return button;
}
