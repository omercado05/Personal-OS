"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_CATEGORY_LABELS } from "@/lib/constants";
import { deleteKnowledge, listKnowledge, listTags } from "@/lib/knowledge";
import type { KnowledgeEntry, ListMeta, Tag } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const PAGE_SIZE = 10;

export default function KnowledgePage() {
  const api = useApi();

  const [entries, setEntries] = useState<KnowledgeEntry[] | null>(null);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<KnowledgeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await listKnowledge(
          api,
          {
            q: q || undefined,
            category: category ? (category as KnowledgeEntry["category"]) : undefined,
            tag: tag || undefined,
            page,
            pageSize: PAGE_SIZE,
          },
          controller.signal,
        );
        if (active) {
          setEntries(response.data);
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
  }, [api, q, category, tag, page, reloadKey]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await listTags(api, controller.signal);
        if (active) {
          setTags(response.data);
        }
      } catch {
        // El filtro por tag es opcional; si falla, queda vacío.
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api]);

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
    setCategory("");
    setTag("");
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
      await deleteKnowledge(api, deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Boolean(q || category || tag);

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Módulo</p>
          <h1>Knowledge</h1>
        </div>
        <Link className="link-button" href="/knowledge/new">
          + Nueva entrada
        </Link>
      </header>

      <form className="toolbar" onSubmit={applyFilters}>
        <input
          className="input"
          type="search"
          value={qInput}
          onChange={(event) => setQInput(event.target.value)}
          placeholder="Buscar por título o contenido…"
          aria-label="Buscar entradas"
        />
        <select
          className="select"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
            refresh();
          }}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {KNOWLEDGE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {KNOWLEDGE_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={tag}
          onChange={(event) => {
            setTag(event.target.value);
            setPage(1);
            refresh();
          }}
          aria-label="Filtrar por tag"
        >
          <option value="">Todos los tags</option>
          {tags.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
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

      {error ? (
        <div className="alert">
          <span>{error}</span>
          <button type="button" className="ghost small" onClick={refresh}>
            Reintentar
          </button>
        </div>
      ) : null}

      {loading && !entries ? <p className="muted">Cargando…</p> : null}

      {!loading && !error && entries && entries.length === 0 ? (
        <div className="empty">
          <p className="muted">
            {hasFilters
              ? "No hay entradas que coincidan con los filtros."
              : "Todavía no hay entradas de conocimiento."}
          </p>
          {hasFilters ? (
            <button type="button" className="ghost" onClick={clearFilters}>
              Limpiar filtros
            </button>
          ) : (
            <Link className="link-button" href="/knowledge/new">
              Crear la primera
            </Link>
          )}
        </div>
      ) : null}

      {entries && entries.length > 0 ? (
        <ul className="data-list">
          {entries.map((entry) => (
            <li key={entry.id} className="data-list__item">
              <div className="data-list__main">
                <div className="data-list__title">
                  <Link href={`/knowledge/${entry.id}`}>{entry.title}</Link>
                </div>
                <div className="data-list__meta">
                  <span className="badge">{KNOWLEDGE_CATEGORY_LABELS[entry.category]}</span>
                  {entry.tags.map((item) => (
                    <span key={item} className="tag">
                      #{item}
                    </span>
                  ))}
                </div>
                {entry.content ? <p className="data-list__snippet muted">{entry.content}</p> : null}
              </div>
              <div className="data-list__actions">
                <Link className="link-button ghost small" href={`/knowledge/${entry.id}/edit`}>
                  Editar
                </Link>
                <button
                  type="button"
                  className="ghost small danger"
                  onClick={() => setDeleteTarget(entry)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {meta ? (
        <Pagination page={meta.page} totalPages={meta.totalPages} onChange={goToPage} />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar entrada"
        message={
          <>
            ¿Seguro que quieres eliminar <strong>{deleteTarget?.title}</strong>? Esta acción no se
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
