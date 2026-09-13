/**
 * Every feature degrades quietly when Bunpro or a third party does not answer,
 * but a failure nobody can see is a failure nobody can report, so the first one
 * of each kind reaches the console and the rest stay out of the way.
 */
const reported = new Set<string>();

export function warnOnce(topic: string, message: string, error: unknown): void {
  if (reported.has(topic)) {
    return;
  }
  reported.add(topic);
  console.warn(`[Better Bunpro] ${message}`, error);
}
