import { HexclaveHandler } from "@hexclave/next";

/**
 * Ruta comodín que renderiza las páginas de autenticación de Hexclave
 * (`/handler/sign-in`, `/handler/sign-up`, `/handler/oauth-callback`, …).
 *
 * El componente vive dentro del `HexclaveProvider` del layout raíz, por lo que
 * reutiliza la misma instancia de `hexclaveClientApp` configurada en
 * `hexclave/client.ts`.
 */
export default function AuthHandlerPage() {
  return <HexclaveHandler fullPage />;
}
