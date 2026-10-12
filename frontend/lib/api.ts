const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Error con el código y el status devueltos por la API. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

/**
 * Llama a la API enviando el access token de Hexclave como `Bearer`.
 *
 * - Espera el envelope `{ data, meta? }` y devuelve el cuerpo completo.
 * - Convierte respuestas de error al formato `ApiError`.
 * - Para `204 No Content` devuelve `null`.
 */
export async function apiFetch<T>(
  token: string | null,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 204) {
    return null as T;
  }

  const body = (await response.json().catch(() => null)) as (ApiErrorBody & T) | null;

  if (!response.ok) {
    const code = body?.error?.code ?? "HTTP_ERROR";
    const message = body?.error?.message ?? `La API respondió ${response.status}`;
    throw new ApiError(response.status, code, message);
  }

  return body as T;
}
