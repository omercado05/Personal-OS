"use client";

import { useHexclaveApp, useUser } from "@hexclave/next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    <main className="page">
      <section className="card">
        <p className="eyebrow">Personal OS</p>
        <h1>Personal OS</h1>
        <p className="lead">Un espacio privado para tus proyectos, conocimiento e ideas.</p>

        {user ? (
          <p className="muted">Sesión iniciada. Redirigiendo al dashboard…</p>
        ) : (
          <div className="actions">
            <button type="button" onClick={() => void app.redirectToSignIn()}>
              Iniciar sesión
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
