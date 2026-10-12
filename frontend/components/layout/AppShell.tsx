"use client";

import { useHexclaveApp, useUser } from "@hexclave/next";
import type { ReactNode } from "react";

import GlobalSearch from "./GlobalSearch";
import Sidebar from "./Sidebar";

/**
 * Shell de la aplicación autenticada. Si no hay sesión, muestra una tarjeta
 * para iniciarla en lugar del contenido (protección de rutas en cliente).
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const app = useHexclaveApp();
  const user = useUser();

  if (!user) {
    return (
      <div className="page">
        <section className="card sign-in-card">
          <p className="eyebrow">Personal OS</p>
          <h1>Acceso restringido</h1>
          <p className="lead">Inicia sesión para entrar en tu espacio personal.</p>
          <button type="button" onClick={() => void app.redirectToSignIn()}>
            Iniciar sesión
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-body">
        <header className="topbar">
          <GlobalSearch />
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
