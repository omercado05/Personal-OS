"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import Field from "@/components/ui/Field";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { parseCommaList } from "@/lib/format";
import { createProject, updateProject } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { useApi } from "@/lib/use-api";

interface ProjectFormProps {
  mode: "create" | "edit";
  initial?: Project;
}

/** Formulario para crear o editar un proyecto. */
export default function ProjectForm({ mode, initial }: ProjectFormProps) {
  const api = useApi();
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<Project["status"]>(initial?.status ?? "idea");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [repositoryUrl, setRepositoryUrl] = useState(initial?.repositoryUrl ?? "");
  const [techText, setTechText] = useState((initial?.technologies ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError("El nombre es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    const input = {
      name: trimmedName,
      description: description.trim() === "" ? null : description,
      status,
      url: url.trim() === "" ? null : url.trim(),
      repositoryUrl: repositoryUrl.trim() === "" ? null : repositoryUrl.trim(),
      technologies: parseCommaList(techText),
    };

    try {
      const result =
        mode === "edit" && initial
          ? await updateProject(api, initial.id, input)
          : await createProject(api, input);
      router.push(`/projects/${result.data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
        </div>
      ) : null}

      <Field label="Nombre" htmlFor="name" required>
        <input
          id="name"
          className="input"
          type="text"
          value={name}
          maxLength={255}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre del proyecto"
          autoFocus
        />
      </Field>

      <Field label="Estado" htmlFor="status" required>
        <select
          id="status"
          className="select"
          value={status}
          onChange={(event) => setStatus(event.target.value as Project["status"])}
        >
          {PROJECT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PROJECT_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Tecnologías"
        htmlFor="technologies"
        hint="Separadas por comas. Se normalizan a minúsculas."
      >
        <input
          id="technologies"
          className="input"
          type="text"
          value={techText}
          onChange={(event) => setTechText(event.target.value)}
          placeholder="next.js, fastify, mysql"
        />
      </Field>

      <Field label="URL" htmlFor="url" hint="Opcional. Debe ser una URL válida (http/https).">
        <input
          id="url"
          className="input"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
        />
      </Field>

      <Field
        label="Repositorio"
        htmlFor="repositoryUrl"
        hint="Opcional. Debe ser una URL válida (http/https)."
      >
        <input
          id="repositoryUrl"
          className="input"
          type="url"
          value={repositoryUrl}
          onChange={(event) => setRepositoryUrl(event.target.value)}
          placeholder="https://github.com/…"
        />
      </Field>

      <Field label="Descripción" htmlFor="description">
        <textarea
          id="description"
          className="textarea"
          rows={8}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Descripción del proyecto…"
        />
      </Field>

      <div className="form__actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Crear proyecto"}
        </button>
        <button type="button" className="ghost" onClick={() => router.back()} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
