"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, isBefore } from "date-fns";
import { listTasks, toggleTask, deleteTask } from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TASK_PRIORITY_COLOR, TASK_OVERDUE_COLOR, TASK_COMPLETED_COLOR } from "@/lib/constants";

interface DayTasksCardProps {
  date: Date | null;
}

export default function DayTasksCard({ date }: DayTasksCardProps) {
  const api = useApi();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!date) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const from = new Date(date);
        from.setHours(0, 0, 0, 0);
        const to = new Date(date);
        to.setHours(23, 59, 59, 999);
        const res = await listTasks(
          api,
          { from: from.toISOString(), to: to.toISOString() },
          controller.signal,
        );
        if (active) setTasks(res.data);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, date]);

  const visibleTasks = date ? tasks : [];

  async function handleToggle(id: string) {
    try {
      const res = await toggleTask(api, id);
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleting(true);
    try {
      await deleteTask(api, targetId);
      setTasks((prev) => prev.filter((t) => t.id !== targetId));
      setDeleteTarget(null);
      if (expandedId === targetId) setExpandedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!date) {
    return (
      <div className="daytasks">
        <div className="daytasks__header">
          <h3>Tareas del día</h3>
        </div>
        <p className="muted">Selecciona un día para ver las tareas de ese día.</p>
      </div>
    );
  }

  const now = new Date();
  return (
    <div className="daytasks">
      <div className="daytasks__header">
        <h3>Tareas — {format(date, "dd MMM yyyy")}</h3>
      </div>
      {loading ? <p className="muted">Cargando...</p> : null}
      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      {!loading && visibleTasks.length === 0 ? (
        <p className="muted">No hay tareas para este día.</p>
      ) : null}
      <ul className="daytasks__list">
        {visibleTasks.map((t) => {
          const isOverdue =
            t.status === "PENDING" && t.dueAt !== null && isBefore(new Date(t.dueAt), now);
          const color =
            t.status === "COMPLETED"
              ? TASK_COMPLETED_COLOR
              : isOverdue
                ? TASK_OVERDUE_COLOR
                : TASK_PRIORITY_COLOR[t.priority];
          const expanded = expandedId === t.id;
          return (
            <li key={t.id} className="daytasks__item" style={{ borderLeft: `3px solid ${color}` }}>
              <button
                type="button"
                className="daytasks__row"
                aria-expanded={expanded}
                onClick={() => setExpandedId(expanded ? null : t.id)}
              >
                <span className={t.status === "COMPLETED" ? "completed" : ""}>{t.title}</span>
                <span className="muted small">
                  {t.dueAt ? format(new Date(t.dueAt), "HH:mm") : ""}
                </span>
              </button>
              {expanded ? (
                <div className="daytasks__detail">
                  {t.description ? (
                    <p style={{ whiteSpace: "pre-wrap" }}>{t.description}</p>
                  ) : (
                    <p className="muted">Sin descripción</p>
                  )}
                  <div className="daytasks__meta">
                    <span>Prioridad: {t.priority}</span>
                    <span>Estado: {t.status}</span>
                    {t.dueAt ? (
                      <span>Vence: {format(new Date(t.dueAt), "dd/MM/yyyy HH:mm")}</span>
                    ) : null}
                    {t.project ? <span>Proyecto: {t.project.name}</span> : null}
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => handleToggle(t.id)}
                    >
                      {t.status === "PENDING" ? "Marcar completada" : "Marcar pendiente"}
                    </button>
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
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
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
