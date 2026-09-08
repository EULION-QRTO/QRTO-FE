// HTTP 코어. 손님앱은 인증 토큰이 없다(QR/픽업 토큰으로 식별).
// 응답 envelope { success, data, error } 를 벗겨 data 만 반환하고, 실패 시 ApiError throw.
import { API_BASE_URL } from './config'
import type { ApiEnvelope } from './dto'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  timeout?: number
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path, API_BASE_URL)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const { query, body, timeout = 15000 } = opts
  const headers: Record<string, string> = {}
  let payload: BodyInit | undefined
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const controller = new AbortController()
  let timedOut = false
  const timer = timeout > 0 ? setTimeout(() => { timedOut = true; controller.abort() }, timeout) : null

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: payload, signal: controller.signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError' && timedOut) {
      throw new ApiError('TIMEOUT', '서버 응답이 없습니다. 잠시 후 다시 시도해 주세요.', 0)
    }
    throw new ApiError('NETWORK', '서버에 연결할 수 없습니다.', 0)
  } finally {
    if (timer) clearTimeout(timer)
  }

  const text = await res.text()
  let json: ApiEnvelope<T> | T | null = null
  if (text) {
    try { json = JSON.parse(text) as ApiEnvelope<T> | T } catch { json = null }
  }

  if (!res.ok) {
    const env = json as ApiEnvelope<T> | null
    throw new ApiError(env?.error?.code ?? String(res.status), env?.error?.message ?? res.statusText, res.status)
  }

  if (json && typeof json === 'object' && 'success' in json) {
    const env = json as ApiEnvelope<T>
    if (env.success === false) {
      throw new ApiError(env.error?.code ?? 'UNKNOWN', env.error?.message ?? '요청 실패', res.status)
    }
    return env.data as T
  }
  return json as T
}

export const http = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, opts?: RequestOptions) => request<T>('POST', path, opts),
  patch: <T>(path: string, opts?: RequestOptions) => request<T>('PATCH', path, opts),
}
