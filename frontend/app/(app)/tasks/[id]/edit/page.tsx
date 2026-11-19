"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TaskForm, { type TaskFormValues } from "@/components/tasks/TaskForm";
import { getTask, isoToLocalInput, updateTask, type TaskInput } from "@/lib/tasks";
import { useApi } from "@/lib/use-api";

export default function EditTaskPage() {
  const params = useParams<{ id: string }>();
  const api = useApi();
  const router = useRouter();
  const [initial, setInitial] = useState<Partial<TaskFormValues> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await getTask(api, params.id, controller.signal);
        if (active) {
          const t = res.data;
          setInitial({
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            dueAt: isoToLocalInput(t.dueAt),
            projectId: t.project?.id ?? null,
          });
        }
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

  async function handleSubmit(values: TaskFormValues) {
    setSaving(true);
    setError(null);
    try {
      await updateTask(api, params.id, values as TaskInput);
      router.push("/tasks");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <header className="panel__header detail-head glass">
        <div>
          <p className="eyebrow">Tareas</p>
          <h1>Editar tarea</h1>
        </div>
      </header>
      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      {loading && !initial ? <p className="muted">Cargando...</p> : null}
      {initial ? (
        <TaskForm initialValues={initial} onSubmit={handleSubmit} saving={saving} mode="edit" />
      ) : null}
    </div>
  );
}
