import { readStored, writeStored } from '../../settings/store';

const ROTATION_KEY = 'exampleSentence.rotation';

interface Rotation {
  index: number;
  sessionId: string;
}

type RotationTable = Record<string, Rotation>;

/**
 * A term shows its first sentence the first time it is ever reviewed, then one
 * step further on each later session, wrapping around. Seeing the same term
 * twice within a session keeps the same sentence.
 */
export function pickSentenceIndex(termKey: string, sessionId: string, count: number): number {
  const table = readStored<RotationTable>(ROTATION_KEY, {});
  const previous = table[termKey];
  const index = nextIndex(previous, sessionId, count);

  if (previous?.index !== index || previous.sessionId !== sessionId) {
    table[termKey] = { index, sessionId };
    writeStored(ROTATION_KEY, table);
  }
  return index;
}

function nextIndex(previous: Rotation | undefined, sessionId: string, count: number): number {
  if (!previous) {
    return 0;
  }
  if (previous.sessionId === sessionId) {
    return previous.index % count;
  }
  return (previous.index + 1) % count;
}
