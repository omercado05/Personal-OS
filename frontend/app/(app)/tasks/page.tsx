"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import { deleteTask, listTasks } from "@/lib/tasks";
import type { ListMeta, Task } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import Skeleton from "@/components/dashboard/Skeleton";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";
import { format } from "date-fns";
import { groupTasksByDue } from "@/lib/timeline";
import { PageHero } from "@/components/visual/PageHero";
import { Timeline } from "@/components/visual/Timeline";

const PAGE_SIZE = 10;

export default function TasksPage() {
  const api = useApi();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await listTasks(
          api,
          { q: q || undefined, page, pageSize: PAGE_SIZE },
          controller.signal,
        );
        if (active) {
          setTasks(response.data);
          setMeta(response.meta);
          setError(null);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, q, page, reloadKey]);

  function refresh() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }
  function applyFilters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
    refresh();
  }
  function clearFilters() {
    setQInput("");
    setQ("");
    setPage(1);
    refresh();
  }
  function goToPage(next: number) {
    setPage(next);
    refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTask(api, deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Boolean(q);
  const total = meta?.total ?? 0;

  return (
    <div className="panel">
      <PageHero eyebrow="Tareas" count={total} noun={total === 1 ? "tarea" : "tareas"}>
        <div className="row-actions">
          <Link className="link-button small" href="/tasks/new">
            <Plus size={16} aria-hidden="true" />
            Nueva tarea
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
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar por título..."
              aria-label="Buscar tareas"
            />
          </div>
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

      {loading && !tasks ? (
        <>
          <p className="visually-hidden" role="status">
            Cargando tareas...
          </p>
          <ul className="data-list" aria-hidden="true">
            {[0, 1, 2].map((k) => (
              <li key={k} className="data-list__item">
                <div className="data-list__main" style={{ flex: 1 }}>
                  <Skeleton className="skeleton--line" />
                  <Skeleton className="skeleton--line sm" />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {!loading && !error && tasks && tasks.length === 0 ? (
        <div className="empty">
          <div className="empty__icon" aria-hidden="true">
            <Plus size={18} />
          </div>
          <div className="empty__body">
            <p className="empty__title">{hasFilters ? "No hay resultados" : "No hay tareas"}</p>
            <p className="muted">
              {hasFilters
                ? "No hay tareas que coincidan con los filtros."
                : "Crea tu primera tarea."}
            </p>
          </div>
          {hasFilters ? (
            <button type="button" className="ghost" onClick={clearFilters}>
              Limpiar filtros
            </button>
          ) : (
            <Link className="link-button" href="/tasks/new">
              <Plus size={16} aria-hidden="true" />
              Crear la primera
            </Link>
          )}
        </div>
      ) : null}

      {tasks && tasks.length > 0 ? (
        <Timeline
          groups={groupTasksByDue(tasks)}
          getKey={(t) => String(t.id)}
          dimmed={(t) => t.status === "COMPLETED"}
          renderItem={(t) => (
            <>
              <div className="data-list__main">
                <div className="data-list__title">
                  <Link href={`/tasks/${t.id}`}>{t.title}</Link>
                </div>
                <div className="data-list__meta">
                  <span className="badge">{TASK_STATUS_LABELS[t.status]}</span>
                  <span className="badge">Prioridad: {TASK_PRIORITY_LABELS[t.priority]}</span>
                  {t.dueAt ? (
                    <span className="badge">
                      Vence: {format(new Date(t.dueAt), "dd/MM/yyyy HH:mm")}
                    </span>
                  ) : null}
                  {t.project ? <span className="badge">Proyecto: {t.project.name}</span> : null}
                </div>
              </div>
              <div className="data-list__actions">
                <Link className="link-button ghost small" href={`/tasks/${t.id}/edit`}>
                  Editar
                </Link>
                <button
                  type="button"
                  className="ghost small danger"
                  onClick={() => setDeleteTarget(t)}
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
        title="Eliminar tarea"
        message={
          deleteTarget ? (
            <>
              ¿Eliminar <strong>{deleteTarget.title}</strong>?
            </>
          ) : (
            ""
          )
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
