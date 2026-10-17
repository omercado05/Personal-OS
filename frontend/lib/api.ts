const CONFIGURED_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * URL base de la API del backend.
 *
 * En el navegador usamos el **mismo host** que sirve la página (solo cambia el
 * puerto, tomado de `NEXT_PUBLIC_API_URL`). Así las llamadas siempre son
 * *first-party* (`http://mi-host:4000`) en lugar de cruzadas a otra IP: algunos
 * navegadores/extensiones con protección anti-tracking (p. ej. Zen/uBlock)
 * bloquean las peticiones cross-site y las reportan como `NetworkError`.
 *
 * `apiFetch` solo se usa desde el navegador (hook `useApi`), así que `window`
 * siempre está disponible; el fallback cubre el render en servidor.
 */
function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") return CONFIGURED_API_URL;
  try {
    const configured = new URL(CONFIGURED_API_URL);
    return `${configured.protocol}//${window.location.hostname}:${configured.port}`;
  } catch {
    return CONFIGURED_API_URL;
  }
}

/**
 * Firma de la función que expone el hook `useApi`: llama a la API e inyecta el
 * access token de Hexclave. Devuelve el envelope completo (`{ data, meta? }`).
 */
export type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

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

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
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
