/** Tiny fetch helpers: timeout, abort forwarding and a small TTL cache for shared metadata. */

export interface FetchOptions {
  signal?: AbortSignal;
  timeout?: number;
}

export class HttpError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = options.timeout
    ? setTimeout(() => controller.abort(new Error('timeout')), options.timeout)
    : undefined;
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new HttpError(`${response.status} ${response.statusText}`, response.status);
    return await response.json() as T;
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

export async function fetchArrayBuffer(url: string, options: FetchOptions = {}): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = options.timeout
    ? setTimeout(() => controller.abort(new Error('timeout')), options.timeout)
    : undefined;
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new HttpError(`${response.status} ${response.statusText}`, response.status);
    return await response.arrayBuffer();
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

interface CacheEntry<T> { at: number; value: T }

/** Module-level TTL cache; failures are never cached. */
export function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const store = cache as Map<string, CacheEntry<unknown>>;
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const task = load().then((value) => {
    store.set(key, { at: Date.now(), value });
    inflight.delete(key);
    return value;
  }, (error: unknown) => {
    inflight.delete(key);
    throw error;
  });
  inflight.set(key, task);
  return task;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
