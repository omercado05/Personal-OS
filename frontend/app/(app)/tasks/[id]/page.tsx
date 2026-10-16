"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTask, toggleTask, deleteTask } from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { format } from "date-fns";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const api = useApi();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await getTask(api, params.id, controller.signal);
        if (active) setTask(res.data);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, params.id]);

  async function handleToggle() {
    if (!task) return;
    setToggling(true);
    try {
      const res = await toggleTask(api, task.id);
      setTask(res.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar estado.");
    } finally {
      setToggling(false);
    }
  }

  async function confirmDelete() {
    if (!task) return;
    setDeleting(true);
    try {
      await deleteTask(api, task.id);
      router.push("/tasks");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
      setShowDelete(false);
      setDeleting(false);
    }
  }

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Tareas</p>
          <h1>{task ? task.title : "Tarea"}</h1>
        </div>
        <div className="row-actions">
          <Link className="link-button ghost small" href="/tasks">
            Volver
          </Link>
          {task ? (
            <Link className="link-button ghost small" href={`/tasks/${task.id}/edit`}>
              Editar
            </Link>
          ) : null}
          {task ? (
            <button
              type="button"
              className="ghost small"
              onClick={handleToggle}
              disabled={toggling}
            >
              {toggling
                ? "..."
                : task.status === "PENDING"
                  ? "Marcar completada"
                  : "Marcar pendiente"}
            </button>
          ) : null}
          <button type="button" className="ghost small danger" onClick={() => setShowDelete(true)}>
            Eliminar
          </button>
        </div>
      </header>
      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      {loading ? <p className="muted">Cargando...</p> : null}
      {task ? (
        <div className="form">
          <div className="form__group">
            <span className="label">Estado</span>
            <p>{TASK_STATUS_LABELS[task.status]}</p>
          </div>
          <div className="form__group">
            <span className="label">Prioridad</span>
            <p>{TASK_PRIORITY_LABELS[task.priority]}</p>
          </div>
          {task.dueAt ? (
            <div className="form__group">
              <span className="label">Vence</span>
              <p>{format(new Date(task.dueAt), "dd/MM/yyyy HH:mm")}</p>
            </div>
          ) : null}
          {task.project ? (
            <div className="form__group">
              <span className="label">Proyecto</span>
              <p>{task.project.name}</p>
            </div>
          ) : null}
          {task.description ? (
            <div className="form__group">
              <span className="label">Descripción</span>
              <p style={{ whiteSpace: "pre-wrap" }}>{task.description}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      <ConfirmDialog
        open={showDelete}
        title="Eliminar tarea"
        message="¿Seguro que deseas eliminar esta tarea?"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
