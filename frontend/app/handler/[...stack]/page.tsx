import { HexclaveHandler } from "@hexclave/next";

import AuthCard from "@/components/visual/AuthCard";

/**
 * Ruta comodín que renderiza las páginas de autenticación de Hexclave
 * (`/handler/sign-in`, `/handler/sign-up`, `/handler/oauth-callback`, …).
 *
 * Envolvemos el handler con el branding de «Bento Neon» sin perder su funcionalidad.
 * El componente vive dentro de `HexclaveProvider` y `HexclaveTheme` del layout raíz.
 */
export default function AuthHandlerPage() {
  return (
    <main className="auth-shell">
      <div className="auth-panel">
        <header className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            ◆
          </span>
          <div className="auth-brand__text">
            <p className="eyebrow">Personal OS</p>
            <h1 className="auth-brand__title">Tu espacio personal</h1>
            <p className="auth-brand__lead">Proyectos, conocimiento e ideas en un solo lugar.</p>
          </div>
        </header>
        <AuthCard>
          <HexclaveHandler fullPage={false} />
        </AuthCard>
      </div>
    </main>
  );
}
