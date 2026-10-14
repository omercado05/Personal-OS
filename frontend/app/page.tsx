"use client";

import { useHexclaveApp, useUser } from "@hexclave/next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogIn } from "lucide-react";

export default function HomePage() {
  const app = useHexclaveApp();
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

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
        <div className="auth-card">
          {user ? (
            <p className="auth-note muted">Sesión iniciada. Redirigiendo al dashboard…</p>
          ) : (
            <div className="auth-actions">
              <button type="button" className="primary" onClick={() => void app.redirectToSignIn()}>
                <LogIn size={16} aria-hidden="true" />
                Iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
