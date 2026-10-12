"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { deleteProject, getProject } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function ProjectDetailPage() {
  const api = useApi();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function confirmDelete() {
    if (!project) {
      return;
    }
    setDeleting(true);
    try {
      await deleteProject(api, project.id);
      router.push("/projects");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
      setConfirming(false);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="panel">
        <div className="alert">
          <span>{error ?? "Proyecto no encontrado."}</span>
          <Link className="link-button ghost small" href="/projects">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Proyecto</p>
          <h1>{project.name}</h1>
        </div>
        <div className="row-actions">
          <Link className="link-button" href={`/projects/${project.id}/edit`}>
            Editar
          </Link>
          <button type="button" className="ghost danger" onClick={() => setConfirming(true)}>
            Eliminar
          </button>
        </div>
      </header>

      <div className="data-list__meta">
        <span className={`badge badge--${project.status}`}>
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
        {project.technologies.map((item) => (
          <span key={item} className="tag">
            #{item}
          </span>
        ))}
      </div>

      <dl className="detail-grid">
        <div>
          <dt>URL</dt>
          <dd>
            {project.url ? (
              <a href={project.url} target="_blank" rel="noreferrer noopener">
                {project.url}
              </a>
            ) : (
              <span className="muted">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Repositorio</dt>
          <dd>
            {project.repositoryUrl ? (
              <a href={project.repositoryUrl} target="_blank" rel="noreferrer noopener">
                {project.repositoryUrl}
              </a>
            ) : (
              <span className="muted">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Creado</dt>
          <dd>{formatDateTime(project.createdAt)}</dd>
        </div>
        <div>
          <dt>Actualizado</dt>
          <dd>{formatDateTime(project.updatedAt)}</dd>
        </div>
      </dl>

      {project.description ? (
        <>
          <h2 className="section-title">Descripción</h2>
          <div className="content-block">{project.description}</div>
        </>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title="Eliminar proyecto"
        message={
          <>
            ¿Seguro que quieres eliminar <strong>{project.name}</strong>? Esta acción no se puede
            deshacer.
          </>
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
