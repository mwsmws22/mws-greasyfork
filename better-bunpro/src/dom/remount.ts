/**
 * Watch a DOM subtree for remounts.
 *
 * Callers must keep callbacks idempotent (no writes when already correct) so
 * multiple observers do not fight each other. This helper stops a single
 * observer from storming on its own writes by disconnecting for the duration
 * of the callback — MutationObserver queues are discarded on disconnect.
 */
export function watchRemounts(root: Node, onRemount: () => void): () => void {
  let watching = false;

  const observer = new MutationObserver(() => {
    if (!watching) {
      return;
    }
    observer.disconnect();
    try {
      onRemount();
    } finally {
      if (watching) {
        observer.observe(root, { childList: true, subtree: true });
      }
    }
  });

  watching = true;
  observer.observe(root, { childList: true, subtree: true });

  return () => {
    watching = false;
    observer.disconnect();
  };
}

export function watchBodyRemounts(onRemount: () => void): () => void {
  return watchRemounts(document.body, onRemount);
}
