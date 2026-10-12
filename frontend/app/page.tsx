"use client";

import { useHexclaveApp, useUser } from "@hexclave/next";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Me {
  id: string;
  email: string | null;
  displayName: string | null;
}

export default function HomePage() {
  const app = useHexclaveApp();
  const user = useUser();
  const userId = user?.id ?? null;

  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const controller = new AbortController();

    void (async () => {
      try {
        // JWT de acceso, listo para enviar como cabecera `Authorization`.
        // (No usamos `getAuthorizationHeader()`: devuelve el formato legacy
        // `Bearer stackauth_<base64>`, que nuestro backend no verifica.)
        const accessToken = await app.getAccessToken();
        const response = await fetch(`${API_URL}/api/v1/me`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`la API respondió ${response.status}`);
        }
        const body = (await response.json()) as { data: Me };
        if (active) {
          setMe(body.data);
          setError(null);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setMe(null);
          setError(cause instanceof Error ? cause.message : "error desconocido");
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, app, reloadKey]);

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Fase 3 · Autenticación</p>
        <h1>Personal OS</h1>

        {user ? (
          <>
            <p className="lead">
              Sesión iniciada como <strong>{user.displayName ?? user.primaryEmail}</strong>.
            </p>
            <div className="actions">
              <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
                Actualizar desde /api/v1/me
              </button>
              <button type="button" className="ghost" onClick={() => void app.redirectToSignOut()}>
                Cerrar sesión
              </button>
            </div>

            {error ? <p className="error">Error: {error}</p> : null}

            {me ? (
              <dl className="result">
                <div>
                  <dt>id</dt>
                  <dd>{me.id}</dd>
                </div>
                <div>
                  <dt>email</dt>
                  <dd>{me.email ?? "—"}</dd>
                </div>
                <div>
                  <dt>displayName</dt>
                  <dd>{me.displayName ?? "—"}</dd>
                </div>
              </dl>
            ) : null}
          </>
        ) : (
          <>
            <p className="lead">
              Centro privado para proyectos, conocimiento e ideas. Inicia sesión para acceder.
            </p>
            <div className="actions">
              <button type="button" onClick={() => void app.redirectToSignIn()}>
                Iniciar sesión
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
