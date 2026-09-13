import { replacementFor, urlToPlay } from './store';

let nativeSrc: {
  get: (this: HTMLMediaElement) => string;
  set: (this: HTMLMediaElement, url: string) => void;
} | null = null;
let nativePlay: typeof HTMLMediaElement.prototype.play | null = null;

/**
 * Bunpro plays term audio on a detached `Audio` element, so there is nothing in
 * the page to rewrite. We stand in front of `src` and `play` instead: when
 * Bunpro points that element at a synthesised clip, it loads the recording.
 */
export function startReplacingAudio(): void {
  if (nativeSrc) {
    return;
  }

  const src = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  if (!src?.get || !src.set) {
    throw new Error('HTMLMediaElement.src is not configurable; term audio cannot be replaced');
  }
  nativeSrc = { get: src.get, set: src.set };
  nativePlay = HTMLMediaElement.prototype.play;

  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    configurable: true,
    enumerable: true,
    get() {
      return nativeSrc?.get.call(this) ?? '';
    },
    set(url: string) {
      nativeSrc?.set.call(this, urlToPlay(url));
    },
  });

  HTMLMediaElement.prototype.play = function playReplaced(this: HTMLMediaElement) {
    const replacement = replacementFor(this.src);
    if (replacement !== null && this.src !== replacement) {
      this.src = replacement;
    }
    return nativePlay?.call(this) ?? Promise.resolve();
  };
}

export function stopReplacingAudio(): void {
  if (!nativeSrc || !nativePlay) {
    return;
  }
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    configurable: true,
    enumerable: true,
    get: nativeSrc.get,
    set: nativeSrc.set,
  });
  HTMLMediaElement.prototype.play = nativePlay;
  nativeSrc = null;
  nativePlay = null;
}
