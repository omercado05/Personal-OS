"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/dashboard/Skeleton";
import { PageHero } from "@/components/visual/PageHero";
import { Timeline } from "@/components/visual/Timeline";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { deleteProject, listProjects } from "@/lib/projects";
import { groupByRecency } from "@/lib/timeline";
import type { ListMeta, Project } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const PAGE_SIZE = 10;

export default function ProjectsPage() {
  const api = useApi();

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await listProjects(
          api,
          {
            q: q || undefined,
            status: status ? (status as Project["status"]) : undefined,
            page,
            pageSize: PAGE_SIZE,
          },
          controller.signal,
        );
        if (active) {
          setProjects(response.data);
          setMeta(response.meta);
          setError(null);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar.");
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
  }, [api, q, status, page, reloadKey]);

  function refresh() {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
    refresh();
  }

  function clearFilters() {
    setQInput("");
    setQ("");
    setStatus("");
    setPage(1);
    refresh();
  }

  function goToPage(nextPage: number) {
    setPage(nextPage);
    refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await deleteProject(api, deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Boolean(q || status);
  const total = meta?.total ?? 0;

  return (
    <div className="panel">
      <PageHero eyebrow="Proyectos" count={total} noun={total === 1 ? "proyecto" : "proyectos"}>
        <div className="row-actions">
          <Link className="link-button small" href="/projects/new">
            <Plus size={16} aria-hidden="true" />
            Nuevo proyecto
          </Link>
        </div>

        <form className="toolbar" onSubmit={applyFilters}>
          <div className="input-group">
            <span className="input-group__icon" aria-hidden="true">
              <Search size={16} />
            </span>
            <input
              className="input"
              type="search"
              value={qInput}
              onChange={(event) => setQInput(event.target.value)}
              placeholder="Buscar por nombre o descripción…"
              aria-label="Buscar proyectos"
            />
          </div>
          <select
            className="select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
              refresh();
            }}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {PROJECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PROJECT_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          <button type="submit" className="primary">
            Filtrar
          </button>
          {hasFilters ? (
            <button type="button" className="ghost" onClick={clearFilters}>
              Limpiar
            </button>
          ) : null}
        </form>
      </PageHero>

      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" className="ghost small" onClick={refresh}>
            Reintentar
          </button>
        </div>
      ) : null}

      {loading && !projects ? (
        <>
          <p className="visually-hidden" role="status">
            Cargando proyectos…
          </p>
          <ul className="data-list" aria-hidden="true">
            {[0, 1, 2].map((key) => (
              <li key={key} className="data-list__item">
                <div className="data-list__main" style={{ flex: 1 }}>
                  <Skeleton className="skeleton--line" />
                  <Skeleton className="skeleton--line sm" />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {!loading && !error && projects && projects.length === 0 ? (
        <div className="empty">
          <div className="empty__icon" aria-hidden="true">
            <Plus size={18} />
          </div>
          <div className="empty__body">
            <p className="empty__title">
              {hasFilters ? "No hay resultados" : "Todavía no hay proyectos"}
            </p>
            <p className="muted">
              {hasFilters
                ? "No hay proyectos que coincidan con los filtros aplicados."
                : "Crea el primer proyecto para dar seguimiento a una idea."}
            </p>
          </div>
          {hasFilters ? (
            <button type="button" className="ghost" onClick={clearFilters}>
              Limpiar filtros
            </button>
          ) : (
            <Link className="link-button" href="/projects/new">
              <Plus size={16} aria-hidden="true" />
              Crear el primero
            </Link>
          )}
        </div>
      ) : null}

      {projects && projects.length > 0 ? (
        <Timeline
          groups={groupByRecency(projects, (project) => project.updatedAt)}
          getKey={(project) => String(project.id)}
          renderItem={(project) => (
            <>
              <div className="data-list__main">
                <div className="data-list__title">
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                </div>
                <div className="data-list__meta">
                  <span className={`badge badge--${project.status}`}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                  {project.technologies.map((tech) => (
                    <span key={tech} className="tag">
                      {tech}
                    </span>
                  ))}
                </div>
                {project.description ? (
                  <p className="data-list__snippet muted">{project.description}</p>
                ) : null}
              </div>
              <div className="data-list__actions">
                <Link className="link-button ghost small" href={`/projects/${project.id}/edit`}>
                  Editar
                </Link>
                <button
                  type="button"
                  className="ghost small danger"
                  onClick={() => setDeleteTarget(project)}
                >
                  Eliminar
                </button>
              </div>
            </>
          )}
        />
      ) : null}

      {meta ? (
        <Pagination page={meta.page} totalPages={meta.totalPages} onChange={goToPage} />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar proyecto"
        message={
          <>
            ¿Seguro que quieres eliminar <strong>{deleteTarget?.name}</strong>? Esta acción no se
            puede deshacer.
          </>
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
