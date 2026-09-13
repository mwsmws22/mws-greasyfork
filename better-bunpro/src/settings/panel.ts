import { element, svgIcon } from '../dom';
import { isFeatureEnabled, listFeatures, setFeatureEnabled, type Feature } from '../features/registry';
import { injectStyles } from '../styles';

const PANEL_ID = 'bb-settings-panel';
const CARD_CLASS =
  'bb-panel-card relative z-1 flex flex-col overflow-hidden rounded-normal border ' +
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
  panel.querySelector<HTMLElement>('.bb-panel-card')?.focus();
}

function closePanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}

function buildPanel(): HTMLElement {
  const backdrop = element('button', {
    class: 'bb-backdrop absolute inset-0',
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
    [element('h2', { class: 'text-large font-bold' }, ['Better Bunpro']), close],
  );
}

function buildFeatureList(): HTMLElement {
  return element('ul', { class: 'grid gap-16' }, listFeatures().map(buildFeatureRow));
}

function buildFeatureRow(feature: Feature): HTMLElement {
  const description = element('p', { class: 'bb-feature-desc text-small text-tertiary-fg' }, [
    feature.description,
  ]);
  const about = element('details', { class: 'bb-feature-about grow' }, [
    element('summary', { class: 'bb-feature-about-summary font-bold' }, [feature.title]),
    description,
  ]);

  return element('li', { class: 'flex items-start justify-between gap-16' }, [
    about,
    buildSwitch(feature),
  ]);
}

function buildSwitch(feature: Feature): HTMLElement {
  const button = element('button', { role: 'switch', 'aria-label': feature.title });

  const paint = () => {
    const enabled = isFeatureEnabled(feature);
    button.setAttribute('aria-checked', String(enabled));
    button.className = `bb-switch ${enabled ? 'bg-primary-accent' : 'bg-tertiary-bg'}`;
  };

  button.addEventListener('click', () => {
    setFeatureEnabled(feature, !isFeatureEnabled(feature));
    paint();
  });
  paint();

  return button;
}
