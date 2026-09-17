import { version } from '../../package.json' with { type: 'json' };
import { element, svgIcon } from '../dom';
import {
  isFeatureEnabled,
  listFeatures,
  setFeatureEnabled,
  type Feature,
  type FeatureCredit,
} from '../features/registry';
import { injectStyles } from '../styles';
import { claimKeystrokes } from '../ui/keystrokes';
import { descriptionNodes } from './description';

const PANEL_ID = 'bb-settings-panel';
const CARD_CLASS =
  'bb-panel-card relative z-1 flex flex-col overflow-hidden rounded-normal border ' +
  'border-rim bg-secondary-bg text-primary-fg shadow-normal';
const CLOSE_SHAPES =
  '<path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
const CARET_SHAPES =
  '<path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.59a1 1 0 0 0 0-1.41L10.7 6.7a1 1 0 0 0-1.41.01" fill="currentColor"/>';

let releaseKeystrokes: (() => void) | null = null;

export function toggleSettingsPanel(): void {
  if (document.getElementById(PANEL_ID)) {
    closePanel();
    return;
  }
  injectStyles();
  const panel = buildPanel();
  document.body.append(panel);
  releaseKeystrokes = claimKeystrokes(panel, closePanel);
  panel.querySelector<HTMLElement>('.bb-panel-card')?.focus();
}

function closePanel(): void {
  releaseKeystrokes?.();
  releaseKeystrokes = null;
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

  return panel;
}

function buildHeader(): HTMLElement {
  const close = element(
    'button',
    { class: 'text-primary-accent', title: 'Close', 'aria-label': 'Close' },
    [svgIcon('h-24 w-24', CLOSE_SHAPES)],
  );
  close.addEventListener('click', closePanel);

  const title = element('div', { class: 'flex items-baseline gap-8' }, [
    element('h2', { class: 'text-large font-bold' }, ['Better Bunpro']),
    element('span', { class: 'text-small text-tertiary-fg' }, [`v${scriptVersion()}`]),
  ]);

  return element(
    'header',
    { class: 'flex items-center justify-between gap-16 border-b border-rim p-16' },
    [title, close],
  );
}

function scriptVersion(): string {
  return version;
}

function buildFeatureList(): HTMLElement {
  return element('ul', { class: 'grid gap-16' }, listFeatures().map(buildFeatureRow));
}

function buildFeatureRow(feature: Feature): HTMLElement {
  const description = element(
    'p',
    { class: 'bb-feature-desc text-small text-tertiary-fg' },
    descriptionNodes(feature.description),
  );
  const caret = svgIcon('bb-feature-caret', CARET_SHAPES);
  const summary = element('summary', { class: 'bb-feature-about-summary font-bold' }, [
    element('span', {}, [feature.title]),
    caret,
  ]);
  const copy = feature.credit ? [description, buildCredit(feature.credit)] : [description];
  const about = element('details', { class: 'bb-feature-about grow' }, [summary, ...copy]);

  return element('li', { class: 'flex items-start justify-between gap-16' }, [
    about,
    buildSwitch(feature),
  ]);
}

function buildCredit(credit: FeatureCredit): HTMLElement {
  return element('p', { class: 'bb-feature-desc text-small text-tertiary-fg' }, [
    'Idea from ',
    buildLink(credit.author, credit.authorUrl),
    '\u2019s ',
    buildLink(credit.work, credit.workUrl),
    '.',
  ]);
}

function buildLink(text: string, href: string): HTMLElement {
  return element(
    'a',
    { href, target: '_blank', rel: 'noreferrer noopener', class: 'text-primary-accent' },
    [text],
  );
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
