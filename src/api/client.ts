/**
 * Base API client — always points to the Cloudflare Workers backend.
 *
 * VITE_API_URL comes from .env for local dev. It is NOT available in CI:
 * .env.production is gitignored, and the Pages workflow runs `npm run build`
 * without env vars, so production builds resolve it to undefined. Throwing at
 * module load in that case takes the whole app down at import time — a failure
 * that only appears once something actually imports this module, and that CI
 * builds green. Fall back to the deployed host instead.
 *
 * Set VITE_API_URL in the Cloudflare Pages project settings to override.
 */

const DEFAULT_API_URL = 'https://api.peezydoesit.net'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || DEFAULT_API_URL

if (!import.meta.env.VITE_API_URL && import.meta.env.DEV) {
  console.warn(`[api] VITE_API_URL is not set — falling back to ${DEFAULT_API_URL}`)
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  const json = (await res.json()) as ApiResponse<T>

  if (!res.ok) {
    return { success: false, error: json.error ?? `HTTP ${res.status}` }
  }

  return json
}

export const api = {
  get<T>(path: string, options?: RequestInit) {
    return request<T>(path, { method: 'GET', ...options })
  },
  post<T>(path: string, body: unknown, options?: RequestInit) {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    })
  },
  put<T>(path: string, body: unknown, options?: RequestInit) {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    })
  },
  patch<T>(path: string, body: unknown, options?: RequestInit) {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    })
  },
  delete<T>(path: string, options?: RequestInit) {
    return request<T>(path, { method: 'DELETE', ...options })
  },
}
