"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import Field from "@/components/ui/Field";
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_CATEGORY_LABELS } from "@/lib/constants";
import { parseCommaList } from "@/lib/format";
import { createKnowledge, updateKnowledge } from "@/lib/knowledge";
import type { KnowledgeEntry } from "@/lib/types";
import { useApi } from "@/lib/use-api";

interface KnowledgeFormProps {
  mode: "create" | "edit";
  initial?: KnowledgeEntry;
}

/** Formulario para crear o editar una entrada de conocimiento. */
export default function KnowledgeForm({ mode, initial }: KnowledgeFormProps) {
  const api = useApi();
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState<KnowledgeEntry["category"]>(
    initial?.category ?? "Other",
  );
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setError("El título es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    const input = {
      title: trimmedTitle,
      content,
      category,
      tags: parseCommaList(tagsText),
    };

    try {
      const result =
        mode === "edit" && initial
          ? await updateKnowledge(api, initial.id, input)
          : await createKnowledge(api, input);
      router.push(`/knowledge/${result.data.id}`);
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

      <Field label="Título" htmlFor="title" required>
        <input
          id="title"
          className="input"
          type="text"
          value={title}
          maxLength={255}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Título de la entrada"
          autoFocus
        />
      </Field>

      <Field label="Categoría" htmlFor="category" required>
        <select
          id="category"
          className="select"
          value={category}
          onChange={(event) => setCategory(event.target.value as KnowledgeEntry["category"])}
        >
          {KNOWLEDGE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {KNOWLEDGE_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Tags" htmlFor="tags" hint="Separados por comas. Se normalizan a minúsculas.">
        <input
          id="tags"
          className="input"
          type="text"
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
          placeholder="docker, cli, linux"
        />
      </Field>

      <Field label="Contenido" htmlFor="content">
        <textarea
          id="content"
          className="textarea"
          rows={12}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escribe aquí el contenido…"
        />
      </Field>

      <div className="form__actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Crear entrada"}
        </button>
        <button type="button" className="ghost" onClick={() => router.back()} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
