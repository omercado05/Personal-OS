"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { listProjects } from "@/lib/projects";
import { localInputToIso } from "@/lib/tasks";
import { useApi } from "@/lib/use-api";

export interface TaskFormValues {
  title: string;
  description: string | null;
  status: "PENDING" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueAt: string | null;
  projectId: string | null;
}

interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>;
  onSubmit(values: TaskFormValues): void | Promise<void>;
  saving: boolean;
  mode?: "create" | "edit";
}

const DEFAULTS: TaskFormValues = {
  title: "",
  description: "",
  status: "PENDING",
  priority: "MEDIUM",
  dueAt: null,
  projectId: null,
};

export default function TaskForm({
  initialValues,
  onSubmit,
  saving,
  mode = "create",
}: TaskFormProps) {
  const api = useApi();
  const [values, setValues] = useState<TaskFormValues>({ ...DEFAULTS, ...initialValues });
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await listProjects(api, { pageSize: 100 }, controller.signal);
        if (active) setProjects(res.data);
      } catch {}
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api]);

  function handleChange<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setError(null);
    void onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description?.trim() || null,
      dueAt: localInputToIso(values.dueAt),
      projectId: values.projectId || null,
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      <div className="form__group">
        <label className="label" htmlFor="title">
          Título
        </label>
        <input
          className="input"
          id="title"
          value={values.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </div>
      <div className="form__group">
        <label className="label" htmlFor="description">
          Descripción
        </label>
        <textarea
          className="textarea"
          id="description"
          value={values.description ?? ""}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
        />
      </div>
      <div className="form__grid two">
        <div className="form__group">
          <label className="label" htmlFor="priority">
            Prioridad
          </label>
          <select
            className="select"
            id="priority"
            value={values.priority}
            onChange={(e) => handleChange("priority", e.target.value as "LOW" | "MEDIUM" | "HIGH")}
          >
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>
        <div className="form__group">
          <label className="label" htmlFor="status">
            Estado
          </label>
          <select
            className="select"
            id="status"
            value={values.status}
            onChange={(e) => handleChange("status", e.target.value as "PENDING" | "COMPLETED")}
          >
            <option value="PENDING">Pendiente</option>
            <option value="COMPLETED">Completada</option>
          </select>
        </div>
      </div>
      <div className="form__grid two">
        <div className="form__group">
          <label className="label" htmlFor="dueAt">
            Fecha y hora límite
          </label>
          <input
            className="input"
            id="dueAt"
            type="datetime-local"
            value={values.dueAt ?? ""}
            onChange={(e) => handleChange("dueAt", e.target.value)}
          />
        </div>
        <div className="form__group">
          <label className="label" htmlFor="projectId">
            Proyecto
          </label>
          <select
            className="select"
            id="projectId"
            value={values.projectId ?? ""}
            onChange={(e) => handleChange("projectId", e.target.value || null)}
          >
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form__actions">
        <Link className="link-button ghost" href="/tasks">
          Cancelar
        </Link>
        <button className="primary" type="submit" disabled={saving}>
          {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear tarea"}
        </button>
      </div>
    </form>
  );
}
