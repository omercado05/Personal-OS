import { HexclaveClientApp } from "@hexclave/next";

/**
 * Cliente de Hexclave.
 *
 * El SDK lee la configuración de las variables `NEXT_PUBLIC_HEXCLAVE_*`
 * (project ID, publishable client key y URL de la API), inyectadas en tiempo de
 * build (ver `frontend/Dockerfile` y `docker-compose.yml`).
 *
 * - `tokenStore: "nextjs-cookie"` guarda la sesión en cookies, de modo que el
 *   servidor de Next.js y el navegador comparten el mismo estado de sesión.
 * - `urls` usa el flujo `handler-component`: las páginas de autenticación
 *   (login/registro/verificación) se renderizan dentro de esta propia app en la
 *   ruta `/handler/[...stack]` (ver `app/handler/`), en lugar de depender de las
 *   páginas "hosted" de Hexclave (que apuntan al servicio en la nube).
 * - `analytics: { enabled: false }` desactiva la analítica y el *session replay*
 *   del SDK. Además de ser innecesarios (y poco deseables) en una app personal,
 *   su `SessionRecorder` llama a `crypto.randomUUID()` sin comprobar el contexto:
 *   esa API **solo existe en contextos seguros** (HTTPS o `localhost`) y, al
 *   acceder por HTTP a la IP de Tailscale, lanzaba un `TypeError` durante el
 *   arranque del provider que rompía la hidratación de la app.
 *
 * IMPORTANTE (URL de la API): el `HexclaveProvider` serializa la config **del
 * servidor** hacia el cliente (`toClientJson`/`fromClientJson`), por lo que la
 * URL de la API que usa el navegador se decide al renderizar en el servidor.
 * Por eso `createHexclaveClientApp` recibe el `host` de la petición y construye
 * la URL con ese mismo host (solo cambia el puerto): así el navegador habla con
 * Hexclave en *first-party* (`http://mi-host:8102`) en lugar de como recurso de
 * *terceros* (`http://otra-ip:8102`). Varios navegadores y extensiones
 * (p. ej. Zen/Firefox con protección anti-tracking, uBlock) bloquean las
 * peticiones cross-site y el SDK las reporta como `NetworkError`, dejando el
 * login atascado.
 */
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_HEXCLAVE_API_URL ?? "http://localhost:8102";

/**
 * Dada la cabecera `Host` de la petición (p. ej. `localhost:3000` o
 * `100.114.203.25:3000`), devuelve la URL base de Hexclave usando ese mismo
 * host y el puerto/protocolo configurados en `NEXT_PUBLIC_HEXCLAVE_API_URL`.
 */
export function resolveHexclaveBaseUrl(host?: string | null): string {
  const hostname = host?.split(":")[0]?.trim();
  if (!hostname) return DEFAULT_BASE_URL;
  try {
    const configured = new URL(DEFAULT_BASE_URL);
    return `${configured.protocol}//${hostname}:${configured.port}`;
  } catch {
    return DEFAULT_BASE_URL;
  }
}

/**
 * Crea el cliente de navegador de Hexclave para la petición actual.
 *
 * Se construye por petición (no como singleton de módulo) porque la URL de la
 * API depende del `host` con el que el usuario entra a la app.
 */
export function createHexclaveClientApp(host?: string | null) {
  return new HexclaveClientApp({
    baseUrl: resolveHexclaveBaseUrl(host),
    tokenStore: "nextjs-cookie",
    analytics: { enabled: false },
    urls: {
      default: { type: "handler-component" },
      home: "/",
      afterSignIn: "/",
      afterSignUp: "/",
      afterSignOut: "/",
    },
  });
}
