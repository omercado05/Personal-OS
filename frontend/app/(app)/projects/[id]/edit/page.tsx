"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ProjectForm from "@/components/projects/ProjectForm";
import { getProject } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function EditProjectPage() {
  const api = useApi();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await getProject(api, id, controller.signal);
        if (active) {
          setProject(response.data);
          setError(null);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el proyecto.");
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
  }, [api, id]);

  return (
    <div className="panel">
      <header className="panel__header detail-head glass">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>Editar proyecto</h1>
        </div>
        <Link className="link-button ghost" href="/projects">
          ← Volver
        </Link>
      </header>

      {loading ? (
        <p className="muted" role="status">
          Cargando…
        </p>
      ) : null}
      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      {project ? <ProjectForm mode="edit" initial={project} /> : null}
    </div>
  );
}
