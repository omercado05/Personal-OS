"use client";

import { motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTask, toggleTask, deleteTask } from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { format } from "date-fns";
import { Burst } from "@/components/visual/Burst";
import { Reveal } from "@/components/visual/Reveal";
import { useExitAnimation } from "@/components/visual/useExitAnimation";
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
  const [burst, setBurst] = useState(0);
  const exit = useExitAnimation();

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
      if (res.data.status === "COMPLETED") setBurst((n) => n + 1);
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
      await exit.play();
      await deleteTask(api, task.id);
      router.push("/tasks");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
      exit.reset();
      setShowDelete(false);
      setDeleting(false);
    }
  }

  return (
    <>
      <motion.div className="panel detail" {...exit.motionProps}>
        <header className="detail-head glass beam">
          <div className="detail-head__row">
            <div className="detail-head__title">
              <h1>{task ? task.title : "Tarea"}</h1>
              {task ? (
                <>
                  <span className="badge">{TASK_STATUS_LABELS[task.status]}</span>
                  <span className="badge">{TASK_PRIORITY_LABELS[task.priority]}</span>
                </>
              ) : null}
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
                <span className="burst-anchor">
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
                  <Burst trigger={burst} />
                </span>
              ) : null}
              <button
                type="button"
                className="ghost small danger"
                onClick={() => setShowDelete(true)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </header>
        {error ? (
          <div className="alert" role="alert">
            <span>{error}</span>
          </div>
        ) : null}
        {loading ? <p className="muted glass detail-note">Cargando...</p> : null}
        {task ? (
          <Reveal className="detail-body">
            <dl className="detail-grid glass">
              <div>
                <dt>Estado</dt>
                <dd>{TASK_STATUS_LABELS[task.status]}</dd>
              </div>
              <div>
                <dt>Prioridad</dt>
                <dd>{TASK_PRIORITY_LABELS[task.priority]}</dd>
              </div>
              {task.dueAt ? (
                <div>
                  <dt>Vence</dt>
                  <dd>{format(new Date(task.dueAt), "dd/MM/yyyy HH:mm")}</dd>
                </div>
              ) : null}
              {task.project ? (
                <div>
                  <dt>Proyecto</dt>
                  <dd>{task.project.name}</dd>
                </div>
              ) : null}
            </dl>
            {task.description ? (
              <>
                <h2 className="section-title">Descripción</h2>
                <div className="content-block">{task.description}</div>
              </>
            ) : null}
          </Reveal>
        ) : null}
      </motion.div>
      <ConfirmDialog
        open={showDelete}
        title="Eliminar tarea"
        message="¿Seguro que deseas eliminar esta tarea?"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}
