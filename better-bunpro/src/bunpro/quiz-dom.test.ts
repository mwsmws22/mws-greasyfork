// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findUndoConfirmButton, undoGradedAnswer } from './quiz-dom';

const HIDE_CLASS = 'bb-skipping-undo-modal';

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.className = '';
  document.body.innerHTML = '';
});

describe('findUndoConfirmButton', () => {
  it('picks the confirm action on Bunpro\'s undo warning, not cancel or don\'t-show-again', () => {
    document.body.innerHTML = undoWarningHtml();

    expect(findUndoConfirmButton()?.id).toBe('confirm');
  });

  it('ignores other dialogs', () => {
    document.body.innerHTML = `
      <article role="dialog">
        <button class="w-full" id="other">Close</button>
      </article>
    `;

    expect(findUndoConfirmButton()).toBeNull();
  });
});

describe('undoGradedAnswer', () => {
  it('confirms the warning if Bunpro opens it after undo', async () => {
    const { confirmed, dontShowAgain } = mountUndoThatOpensWarning();

    undoGradedAnswer();
    await waitUntil(() => confirmed());

    expect(dontShowAgain()).toBe(false);
    expect(document.documentElement.classList.contains(HIDE_CLASS)).toBe(true);
  });

  it('keeps undo feedback hidden until Bunpro would have closed the toast', async () => {
    vi.useFakeTimers();
    mountBareUndo();

    undoGradedAnswer();

    expect(document.documentElement.classList.contains(HIDE_CLASS)).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(document.documentElement.classList.contains(HIDE_CLASS)).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(document.documentElement.classList.contains(HIDE_CLASS)).toBe(false);
  });

  it('still undoes when the warning never appears', () => {
    const undone = mountBareUndo();

    undoGradedAnswer();

    expect(undone()).toBe(true);
  });
});

function undoWarningHtml(): string {
  return `
    <div class="Modal">
      <article role="dialog" class="bp-modal-container">
        <button class="w-full" id="cancel">Cancel</button>
        <button class="w-full" id="confirm">Confirm</button>
        <input id="quiz-undo" type="checkbox" />
      </article>
    </div>
  `;
}

function mountUndoThatOpensWarning(): { confirmed: () => boolean; dontShowAgain: () => boolean } {
  document.body.innerHTML = `<button type="button" id="undo"><svg data-name="UNDO"></svg></button>`;
  let confirmed = false;
  let dontShowAgain = false;
  document.getElementById('undo')?.addEventListener('click', () => {
    queueMicrotask(() => {
      document.body.insertAdjacentHTML('beforeend', undoWarningHtml());
      document.getElementById('confirm')?.addEventListener('click', () => {
        confirmed = true;
      });
      document.getElementById('quiz-undo')?.addEventListener('click', () => {
        dontShowAgain = true;
      });
    });
  });
  return {
    confirmed: () => confirmed,
    dontShowAgain: () => dontShowAgain,
  };
}

async function waitUntil(ready: () => boolean): Promise<void> {
  const started = Date.now();
  while (!ready()) {
    if (Date.now() - started > 1000) {
      throw new Error('timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function mountBareUndo(): () => boolean {
  document.body.innerHTML = `<button type="button" id="undo"><svg data-name="UNDO"></svg></button>`;
  let undone = false;
  document.getElementById('undo')?.addEventListener('click', () => {
    undone = true;
  });
  return () => undone;
}
