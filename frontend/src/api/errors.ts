import { ApiError } from './client'

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = parseDetail(err.body)
    return detail ? `${err.status}: ${detail}` : `${err.status}: ${err.message}`
  }
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}

function parseDetail(body: string): string | null {
  if (!body) return null
  try {
    const json = JSON.parse(body) as { detail?: unknown }
    if (typeof json.detail === 'string') return json.detail
    if (Array.isArray(json.detail)) {
      return json.detail
        .map((d) => (typeof d === 'object' && d && 'msg' in d ? String(d.msg) : String(d)))
        .join('; ')
    }
  } catch {
    /* plain text */
  }
  return body
}
