// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearAnswerIfShowing,
  findDetailsPitchPlay,
  findExamplesListPlayControls,
  findHotkeyGuideArticle,
  findTermAudioControl,
  findTermAudioControls,
  findUndoConfirmButton,
  showAnswerInput,
  undoGradedAnswer,
} from './quiz-dom';

const HIDE_CLASS = 'bb-skipping-undo-modal';

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.className = '';
  document.body.innerHTML = '';
});

describe('findExamplesListPlayControls', () => {
  it('finds Info Examples speakers and ignores the quiz sentence card', () => {
    document.body.innerHTML = `
      <div id="js-quiz">
        <article>
          <section>
            <aside id="study-question-1">
              <button id="quiz-sentence" title="Play audio"></button>
            </aside>
          </section>
        </article>
        <article class="bp-reviewable-root">
          <li id="study-question-10">
            <button id="ex-a" title="Play audio"></button>
            <button id="ex-a-mobile" title="Play audio"></button>
          </li>
          <li id="study-question-11">
            <button id="ex-b" title="Play audio"></button>
          </li>
        </article>
      </div>
    `;

    expect(findExamplesListPlayControls().map((el) => el.id)).toEqual([
      'ex-a',
      'ex-a-mobile',
      'ex-b',
    ]);
  });
});

describe('findTermAudioControl', () => {
  it('prefers the answer-bar control, then the Details pitch-accent play', () => {
    document.body.innerHTML = `
      <div class="DetailsPitchAccent">
        <button id="details"><svg data-name="PLAY_CIRCLE_FILLED"></svg></button>
      </div>
    `;
    expect(findDetailsPitchPlay()?.id).toBe('details');
    expect(findTermAudioControl()?.id).toBe('details');

    document.body.innerHTML = `
      <div class="InputManual">
        <button id="answer"><svg data-name="PLAY_CIRCLE_FILLED"></svg></button>
      </div>
      <div class="DetailsPitchAccent">
        <button id="details"><svg data-name="PLAY_CIRCLE_FILLED"></svg></button>
      </div>
    `;
    expect(findTermAudioControl()?.id).toBe('answer');
  });

  it('lists answer-bar and Details together when both are present', () => {
    document.body.innerHTML = `
      <div class="InputManual">
        <button id="answer"><svg data-name="PLAY_CIRCLE_FILLED"></svg></button>
      </div>
      <div class="DetailsPitchAccent">
        <button id="details"><svg data-name="PLAY_CIRCLE_FILLED"></svg></button>
      </div>
    `;
    expect(findTermAudioControls().map((el) => el.id)).toEqual(['answer', 'details']);
  });
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

  it('leaves the undone toast visible when asked to, like Backspace', () => {
    const undone = mountBareUndo();

    undoGradedAnswer('visible');

    expect(undone()).toBe(true);
    expect(document.documentElement.classList.contains(HIDE_CLASS)).toBe(false);
  });
});

describe('showAnswerInput / clearAnswerIfShowing', () => {
  it('does not leave a painted synonym in the box once the next question is up', () => {
    mountAnswerInput({ value: 'to flicker', placeholder: 'Your answer' });
    showAnswerInput('test');

    expect(inputValue()).toBe('test');
    expect(inputPlaceholder()).toBe('test');

    clearAnswerIfShowing('test');

    expect(inputValue()).toBe('');
    expect(inputPlaceholder()).toBe('Your answer');
  });

  it('leaves the box alone if the next question already has different text', () => {
    mountAnswerInput({ value: 'test', placeholder: 'Your answer' });
    showAnswerInput('test');
    writeInputValue('flicker');

    clearAnswerIfShowing('test');

    expect(inputValue()).toBe('flicker');
  });
});

describe('findHotkeyGuideArticle', () => {
  it('finds Bunpro\'s Hotkey Guide article in the modal portal', () => {
    document.body.innerHTML = `
      <div id="modal-portal">
        <article class="grid gap-24 text-secondary-fg sm:grid-cols-2 sm:gap-x-12"></article>
      </div>
    `;

    expect(findHotkeyGuideArticle()).not.toBeNull();
  });

  it('ignores other modal articles', () => {
    document.body.innerHTML = `
      <div id="modal-portal">
        <article role="dialog" class="bp-modal-container"></article>
      </div>
    `;

    expect(findHotkeyGuideArticle()).toBeNull();
  });
});

function mountAnswerInput(opts: { value: string; placeholder: string }): void {
  document.body.innerHTML = `<input id="js-manual-input" type="text" placeholder="${opts.placeholder}" />`;
  const input = document.getElementById('js-manual-input');
  if (input instanceof HTMLInputElement) {
    input.value = opts.value;
  }
}

function writeInputValue(value: string): void {
  const input = document.getElementById('js-manual-input');
  if (input instanceof HTMLInputElement) {
    input.value = value;
  }
}

function inputValue(): string {
  const input = document.getElementById('js-manual-input');
  return input instanceof HTMLInputElement ? input.value : '';
}

function inputPlaceholder(): string {
  const input = document.getElementById('js-manual-input');
  return input instanceof HTMLInputElement ? input.placeholder : '';
}

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
