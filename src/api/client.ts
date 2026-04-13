/**
 * Base API client — always points to the Cloudflare Workers backend.
 * Set VITE_API_URL in .env for local dev, .env.production for deployment.
 */

const BASE_URL = import.meta.env.VITE_API_URL as string

if (!BASE_URL) {
  throw new Error('VITE_API_URL is not defined. Check your .env file.')
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
