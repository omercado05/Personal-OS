"use client";

import { useHexclaveApp, useUser } from "@hexclave/next";
import { LogIn } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import GlobalSearch from "./GlobalSearch";
import MobileNav from "./MobileNav";
import PageTransition from "./PageTransition";
import Sidebar from "./Sidebar";

/**
 * Shell de la aplicación autenticada. Si no hay sesión, muestra una tarjeta
 * para iniciarla en lugar del contenido (protección de rutas en cliente).
 *
 * Responsive: barra lateral en escritorio (≥ 900px) y barra de navegación
 * inferior en móvil/tablet (ver `MobileNav`).
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
          <button type="button" className="primary" onClick={() => void app.redirectToSignIn()}>
            <LogIn size={16} aria-hidden="true" />
            Iniciar sesión
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <Sidebar />
      <div className="app-body">
        <header className="topbar">
          <Link href="/dashboard" className="topbar__brand">
            <span className="brand-mark" aria-hidden="true">
              ◆
            </span>
            Personal OS
          </Link>
          <GlobalSearch />
        </header>
        <main className="app-main" id="main" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
