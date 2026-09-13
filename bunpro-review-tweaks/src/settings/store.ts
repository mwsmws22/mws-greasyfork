import { GM_getValue, GM_setValue } from '$';

/**
 * Every persisted value goes through here so that swapping the userscript GM
 * storage for `chrome.storage` is a one-file change.
 */

type Listener = (key: string) => void;

const listeners = new Set<Listener>();

export function readStored<T>(key: string, fallback: T): T {
  const stored = GM_getValue<T | undefined>(key, undefined);
  return stored === undefined ? fallback : stored;
}

export function writeStored<T>(key: string, value: T): void {
  GM_setValue(key, value);
  for (const listener of listeners) {
    listener(key);
  }
}

export function onStoredChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
