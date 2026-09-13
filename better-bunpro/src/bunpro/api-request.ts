/**
 * Bunpro's own frontend authenticates against this host with a token it keeps
 * in a readable cookie, so we can reuse the signed-in session as-is. Every call
 * we make to Bunpro goes through here, including the ones that change the
 * user's data, so there is one place that knows how to reach Bunpro at all.
 */
const API_BASE = 'https://api.bunpro.jp/api/frontend';
const TOKEN_COOKIE = 'frontend_api_token';
const LOCALE_COOKIE = 'locale';

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

export async function bunproRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readCookie(TOKEN_COOKIE);
  if (!token) {
    throw new Error(`No ${TOKEN_COOKIE} cookie found; are you signed in to Bunpro?`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      Authorization: `Token token=${token}`,
      ...init.headers,
    },
  });

  const payload = isJson(response) ? ((await response.json()) as unknown) : null;
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}: ${describeErrors(payload, response)}`);
  }
  return payload as T;
}

/** Mirrors the request bodies Bunpro's own frontend sends. */
export function jsonBody(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return { method, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export function bunproLocale(): string {
  return readCookie(LOCALE_COOKIE) ?? 'en';
}

/**
 * Bunpro serialises everything as JSON:API, and its own client throws away all
 * of a record but the attributes, so these hand back attributes too.
 */
export interface JsonApiRecord {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
}

export interface JsonApiDocument {
  data?: JsonApiRecord | JsonApiRecord[] | null;
  included?: JsonApiRecord[];
}

export function attributesOf(document: JsonApiDocument | null): Record<string, unknown> | null {
  const record = Array.isArray(document?.data) ? document.data[0] : document?.data;
  return record?.attributes ? withRecordId(record) : null;
}

export function includedOfType(
  document: JsonApiDocument | null,
  type: string,
): Record<string, unknown>[] {
  return recordsOfType(document?.included, type);
}

export function dataOfType(
  document: JsonApiDocument | null,
  type: string,
): Record<string, unknown>[] {
  const data = document?.data;
  return recordsOfType(Array.isArray(data) ? data : data ? [data] : [], type);
}

function recordsOfType(
  records: JsonApiRecord[] | undefined,
  type: string,
): Record<string, unknown>[] {
  const matching: Record<string, unknown>[] = [];
  for (const record of records ?? []) {
    if (record.type === type && record.attributes) {
      matching.push(withRecordId(record));
    }
  }
  return matching;
}

/** Most of Bunpro's attributes repeat the record's own id, but not all of them do. */
function withRecordId(record: JsonApiRecord): Record<string, unknown> {
  const attributes = record.attributes ?? {};
  if (typeof attributes.id === 'number') {
    return attributes;
  }
  return { ...attributes, id: Number(record.id) };
}

/** Bunpro reports failures as `{ errors: [{ code, detail }] }`. */
function describeErrors(payload: unknown, response: Response): string {
  const errors = (payload as { errors?: { code?: string; detail?: string }[] } | null)?.errors;
  const described = (errors ?? [])
    .map((error) => error.detail ?? error.code ?? '')
    .filter((text) => text !== '')
    .join(', ');
  return described === '' ? response.statusText : described;
}

function isJson(response: Response): boolean {
  return response.headers.get('Content-Type')?.includes('application/json') === true;
}

function readCookie(name: string): string | null {
  for (const pair of document.cookie.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) {
      continue;
    }
    if (pair.slice(0, separator).trim() !== name) {
      continue;
    }
    const value = decodeURIComponent(pair.slice(separator + 1)).trim();
    return value === '' ? null : value;
  }
  return null;
}
