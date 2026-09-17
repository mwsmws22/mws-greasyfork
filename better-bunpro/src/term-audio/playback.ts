import { replacementFor, urlToPlay } from './store';

/**
 * True browser natives, kept on globalThis so a Vite HMR remount of this module
 * does not re-read our own wrappers off the prototype and nest them. Nesting
 * makes every `audio.src = …` recurse until nothing plays — TTS or recording.
 */
const NATIVES_KEY = Symbol.for('better-bunpro.mediaNatives');

interface MediaNatives {
  src: {
    get: (this: HTMLMediaElement) => string;
    set: (this: HTMLMediaElement, url: string) => void;
  };
  play: typeof HTMLMediaElement.prototype.play;
}

let installed = false;

/**
 * Bunpro plays term audio on a detached `Audio` element, so there is nothing in
 * the page to rewrite. We stand in front of `src` and `play` instead: when
 * Bunpro points that element at a synthesised clip, it loads the recording.
 */
export function startReplacingAudio(): void {
  const natives = mediaNatives();
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    configurable: true,
    enumerable: true,
    get() {
      return natives.src.get.call(this);
    },
    set(url: string) {
      natives.src.set.call(this, urlToPlay(url));
    },
  });

  HTMLMediaElement.prototype.play = function playReplaced(this: HTMLMediaElement) {
    const replacement = replacementFor(this.src);
    if (replacement !== null && this.src !== replacement) {
      this.src = replacement;
    }
    return natives.play.call(this);
  };

  installed = true;
}

export function stopReplacingAudio(): void {
  if (!installed) {
    return;
  }
  const natives = mediaNatives();
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    configurable: true,
    enumerable: true,
    get: natives.src.get,
    set: natives.src.set,
  });
  HTMLMediaElement.prototype.play = natives.play;
  installed = false;
}

/** Simulates a hot-reload: module locals are gone, the patched prototype remains. */
export function abandonPlaybackCaptureForTests(): void {
  installed = false;
}

function mediaNatives(): MediaNatives {
  const globalStore = globalThis as typeof globalThis & { [NATIVES_KEY]?: MediaNatives };
  const saved = globalStore[NATIVES_KEY];
  if (saved) {
    return saved;
  }

  const src = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  if (!src?.get || !src.set) {
    throw new Error('HTMLMediaElement.src is not configurable; term audio cannot be replaced');
  }

  const natives: MediaNatives = {
    src: { get: src.get, set: src.set },
    play: HTMLMediaElement.prototype.play,
  };
  Object.defineProperty(globalStore, NATIVES_KEY, {
    configurable: true,
    value: natives,
  });
  return natives;
}
