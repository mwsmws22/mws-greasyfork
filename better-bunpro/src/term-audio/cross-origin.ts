import { GM_xmlhttpRequest } from '$';

/**
 * The only place the script talks to a host other than Bunpro. Every call goes
 * out anonymously, so if you happen to have an account on a dictionary site,
 * looking a word up here is not done as you.
 */

export interface CrossOriginRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

/** Long enough for a slow dictionary, short enough that the next source still gets a turn. */
const TIMEOUT_MS = 8000;

export function requestText(request: CrossOriginRequest): Promise<string> {
  return send(request, 'text');
}

export function requestBlob(request: CrossOriginRequest): Promise<Blob> {
  return send(request, 'blob');
}

function send(request: CrossOriginRequest, responseType: 'text'): Promise<string>;
function send(request: CrossOriginRequest, responseType: 'blob'): Promise<Blob>;
function send(
  { url, method = 'GET', headers, body }: CrossOriginRequest,
  responseType: 'text' | 'blob',
): Promise<string | Blob> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest<'text' | 'blob'>({
      url,
      method,
      headers,
      data: body,
      responseType,
      anonymous: true,
      timeout: TIMEOUT_MS,
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          reject(new Error(`${url} responded ${response.status}`));
          return;
        }
        resolve(response.response);
      },
      onerror: () => reject(new Error(`${url} could not be reached`)),
      ontimeout: () => reject(new Error(`${url} took longer than ${TIMEOUT_MS}ms`)),
    });
  });
}
