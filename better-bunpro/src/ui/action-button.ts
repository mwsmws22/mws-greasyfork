/**
 * The one button in this script that changes something on Bunpro. Everything a
 * caller could get wrong about that — submitting twice, leaving the user staring
 * at a button that may or may not have worked — is decided here instead.
 *
 * Styling is Bunpro's own utility classes, minus the hashed CSS-module names
 * from their button component, which change with every deploy.
 */
import { element, svgIcon } from '../dom';

export interface ActionLabels {
  idle: string;
  working: string;
  done: string;
  failed: string;
}

export interface ActionButtonOptions {
  labels: ActionLabels;
  /** SVG shapes for the leading icon, as `svgIcon` takes them. */
  icon?: string;
  /** A button remounted after a successful add starts already done. */
  startAs?: 'idle' | 'done';
  /** Resolve with a message to show in place of `labels.done`. */
  run: () => Promise<string | void>;
}

type ActionState = 'idle' | 'working' | 'done' | 'failed';

const BASE_CLASS =
  'flex w-full items-center justify-center gap-4 rounded-normal border px-12 py-6 ' +
  'text-extra-small md:text-body font-normal transition-colors';

const STATE_CLASS: Record<ActionState, string> = {
  idle: 'border-rim bg-secondary-bg text-primary-fg',
  working: 'border-rim bg-secondary-bg text-tertiary-fg',
  done: 'border-rim bg-secondary-bg text-correct',
  failed: 'border-rim bg-secondary-bg text-error',
};

export function buildActionButton(options: ActionButtonOptions): HTMLElement {
  const label = element('span', { class: 'text-left' });
  const children = options.icon
    ? [svgIcon('h-24 w-24 shrink-0', options.icon), label]
    : [label];
  const button = element('button', { type: 'button' }, children);

  let state: ActionState = options.startAs === 'done' ? 'done' : 'idle';
  let message: string | null = null;

  const paint = () => {
    button.className = `${BASE_CLASS} ${STATE_CLASS[state]}`;
    label.textContent = message ?? options.labels[state];
    /** Done is final: there is nothing left to submit, and retrying would duplicate it. */
    button.disabled = state === 'working' || state === 'done';
  };

  button.addEventListener('click', () => {
    if (state === 'working' || state === 'done') {
      return;
    }
    state = 'working';
    message = null;
    paint();

    options.run().then(
      (outcome) => {
        state = 'done';
        message = typeof outcome === 'string' ? outcome : null;
        paint();
      },
      (error: unknown) => {
        console.warn('[Better Bunpro]', options.labels.failed, error);
        state = 'failed';
        message = null;
        paint();
      },
    );
  });

  paint();
  return button;
}
