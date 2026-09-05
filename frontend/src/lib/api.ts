const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api/backend';

export const TOKEN_KEY = 'eduhub_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, headers } = options;

  const h: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (body instanceof FormData) {
    // let the browser set the multipart boundary
  } else if (body !== undefined) {
    h['Content-Type'] = 'application/json';
  }

  const authToken = token !== undefined ? token : getToken();
  if (authToken) {
    h['Authorization'] = `Bearer ${authToken}`;
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers: h,
    body:
      body && !(body instanceof FormData)
        ? JSON.stringify(body)
        : body instanceof FormData
        ? body
        : undefined,
  });

  if (resp.status === 204) {
    return undefined as T;
  }

  const contentType = resp.headers.get('content-type') || '';
  let data: unknown = null;
  if (contentType.includes('application/json')) {
    data = await resp.json();
  } else {
    data = await resp.text();
  }

  if (!resp.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${resp.status})`;
    throw new ApiError(message, resp.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { token }),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body, token }),
  put: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'PUT', body, token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'PATCH', body, token }),
  del: <T>(path: string, token?: string | null) => request<T>(path, { method: 'DELETE', token }),

  // Multipart upload with explicit token (admin)
  upload: <T>(path: string, formData: FormData, token: string) =>
    request<T>(path, { method: 'POST', body: formData, token }),
};
