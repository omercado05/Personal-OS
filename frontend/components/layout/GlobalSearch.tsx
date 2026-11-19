"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formatDateTime } from "@/lib/format";
import { useApi } from "@/lib/use-api";

interface SearchItem {
  kind: "knowledge" | "project" | "task";
  id: string;
  title: string;
  snippet: string;
  category?: string;
  status?: string;
  dueAt?: string;
}

interface SearchResponse {
  data: SearchItem[];
}

/** Etiqueta y ruta de detalle por tipo de resultado. */
const KIND_META: Record<string, { label: string; href: string }> = {
  knowledge: { label: "Nota", href: "/knowledge/" },
  project: { label: "Proyecto", href: "/projects/" },
  task: { label: "Tarea", href: "/tasks/" },
};

const DEBOUNCE_MS = 250;
const MIN_TERM_LENGTH = 2;

/** Búsqueda global sobre conocimiento, proyectos y tareas (con debounce). */
export default function GlobalSearch() {
  const api = useApi();
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = term.trim();
  const isActive = query.length >= MIN_TERM_LENGTH;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const body = await api<SearchResponse>(
            `/api/v1/search?q=${encodeURIComponent(query)}&pageSize=8`,
          );
          if (active) {
            setItems(body.data);
            setOpen(true);
          }
        } catch (cause) {
          if (active) {
            setError(cause instanceof Error ? cause.message : "Error desconocido");
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, isActive, api]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const showResults = open && isActive;

  const status = !showResults
    ? ""
    : loading
      ? "Buscando…"
      : error
        ? `Error: ${error}`
        : items.length === 0
          ? "Sin resultados."
          : `${items.length} resultados.`;

  return (
    <div className="search" ref={containerRef}>
      <div className="search__field">
        <Search className="search__icon" size={16} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          className="search__input"
          aria-label="Buscar"
          placeholder="Buscar en notas, proyectos y tareas…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      <p className="visually-hidden" role="status">
        {status}
      </p>

      {showResults ? (
        <div className="search__results">
          {loading ? <p className="muted small">Buscando…</p> : null}
          {error ? <p className="error small">{error}</p> : null}
          {!loading && !error && items.length === 0 ? (
            <p className="muted small">Sin resultados.</p>
          ) : null}
          {items.map((item) => {
            const meta = KIND_META[item.kind];
            if (!meta) {
              return null;
            }
            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={`${meta.href}${item.id}`}
                onClick={() => setOpen(false)}
              >
                <span className="search__kind">{meta.label}</span>
                <span className="search__title">{item.title}</span>
                {item.kind === "task" ? (
                  <span className="muted small">
                    {item.status === "COMPLETED" ? "Hecha" : "Pendiente"}
                    {item.dueAt ? ` · vence ${formatDateTime(item.dueAt)}` : ""}
                  </span>
                ) : null}
                {item.snippet ? <span className="muted small">{item.snippet}</span> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
