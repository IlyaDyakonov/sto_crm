/**
 * HTTP-клиент к STO CRM API.
 * В dev: Vite proxy `/api` → http://localhost:8000 (см. vite.config.ts).
 * VITE_API_URL пустой = relative (proxy); иначе абсолютный URL (CORS на бэке).
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export function getApiBaseUrl(): string {
  return API_BASE
}

export class ApiError extends Error {
  readonly status: number
  readonly body: string

  constructor(status: number, body: string) {
    super(body || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function buildHeaders(userId: number, init?: HeadersInit): Headers {
  const headers = new Headers(init)
  headers.set('X-User-Id', String(userId))
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  return headers
}

export async function apiRequest(
  path: string,
  userId: number,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  return fetch(url, {
    ...options,
    headers: buildHeaders(userId, options.headers),
  })
}

export async function apiJson<T>(
  path: string,
  userId: number,
  options: RequestInit = {},
): Promise<T> {
  const res = await apiRequest(path, userId, options)
  const text = await res.text()
  if (!res.ok) {
    throw new ApiError(res.status, text)
  }
  if (!text) {
    return undefined as T
  }
  return JSON.parse(text) as T
}
