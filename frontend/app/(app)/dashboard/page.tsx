"use client";

import { useUser } from "@hexclave/next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useApi } from "@/lib/use-api";

interface DashboardData {
  recentKnowledge: Array<{
    id: string;
    title: string;
    category: string;
    tags: string[];
    updatedAt: string;
  }>;
  recentProjects: Array<{
    id: string;
    name: string;
    status: string;
    technologies: string[];
    updatedAt: string;
  }>;
}

export default function DashboardPage() {
  const user = useUser();
  const userId = user?.id ?? null;
  const api = useApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    void (async () => {
      try {
        const body = await api<{ data: DashboardData }>("/api/v1/dashboard", {
          signal: controller.signal,
        });
        if (active) {
          setData(body.data);
          setError(null);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Error desconocido");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, api, reloadKey]);

  function reload() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  if (!user) {
    return (
      <div className="panel">
        <h1>Dashboard</h1>
        <p className="muted">Inicia sesión para ver tu panel.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Resumen</p>
          <h1>Dashboard</h1>
        </div>
        <div className="row-actions">
          <Link className="link-button small" href="/knowledge/new">
            + Entrada
          </Link>
          <Link className="link-button small" href="/projects/new">
            + Proyecto
          </Link>
          <button type="button" className="ghost" onClick={reload} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="alert">
          <span>{error}</span>
          <button type="button" className="ghost small" onClick={reload}>
            Reintentar
          </button>
        </div>
      ) : null}

      {loading && !data ? <p className="muted">Cargando…</p> : null}

      {data ? (
        <div className="grid two">
          <section className="card-min">
            <div className="card-min__head">
              <h2>Conocimiento reciente</h2>
              <Link href="/knowledge">Ver todo</Link>
            </div>
            {data.recentKnowledge.length === 0 ? (
              <p className="muted">Todavía no hay entradas.</p>
            ) : (
              <ul className="list">
                {data.recentKnowledge.map((entry) => (
                  <li key={entry.id}>
                    <Link href={`/knowledge/${entry.id}`}>{entry.title}</Link>
                    <span className="pill">{entry.category}</span>
                    {entry.tags.length > 0 ? (
                      <span className="muted"> {entry.tags.join(", ")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-min">
            <div className="card-min__head">
              <h2>Proyectos recientes</h2>
              <Link href="/projects">Ver todo</Link>
            </div>
            {data.recentProjects.length === 0 ? (
              <p className="muted">Todavía no hay proyectos.</p>
            ) : (
              <ul className="list">
                {data.recentProjects.map((project) => (
                  <li key={project.id}>
                    <Link href={`/projects/${project.id}`}>{project.name}</Link>
                    <span className="pill">{project.status}</span>
                    {project.technologies.length > 0 ? (
                      <span className="muted"> {project.technologies.join(", ")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
