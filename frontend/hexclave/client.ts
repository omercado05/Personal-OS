import { HexclaveClientApp } from "@hexclave/next";

/**
 * Cliente de Hexclave para el navegador.
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
 */
export const hexclaveClientApp = new HexclaveClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    default: { type: "handler-component" },
    home: "/",
    afterSignIn: "/",
    afterSignUp: "/",
    afterSignOut: "/",
  },
});
