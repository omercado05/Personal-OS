"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TaskForm, { type TaskFormValues } from "@/components/tasks/TaskForm";
import { createTask, type TaskInput } from "@/lib/tasks";
import { useApi } from "@/lib/use-api";

export default function NewTaskPage() {
  const api = useApi();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(values: TaskFormValues) {
    setSaving(true);
    setError(null);
    try {
      await createTask(api, values as TaskInput);
      router.push("/tasks");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la tarea.");
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <header className="panel__header detail-head glass">
        <div>
          <p className="eyebrow">Tareas</p>
          <h1>Nueva tarea</h1>
        </div>
      </header>
      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      <TaskForm onSubmit={handleSubmit} saving={saving} />
    </div>
  );
}
