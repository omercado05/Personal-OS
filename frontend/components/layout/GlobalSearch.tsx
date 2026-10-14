"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useApi } from "@/lib/use-api";

interface SearchItem {
  kind: "knowledge" | "project";
  id: string;
  title: string;
  snippet: string;
  category?: string;
  status?: string;
}

interface SearchResponse {
  data: SearchItem[];
}

const DEBOUNCE_MS = 250;
const MIN_TERM_LENGTH = 2;

/** Búsqueda global sobre conocimiento y proyectos (con debounce). */
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

  return (
    <div className="search" ref={containerRef}>
      <div className="search__field">
        <Search className="search__icon" size={16} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          className="search__input"
          aria-label="Buscar"
          placeholder="Buscar en notas y proyectos…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => setOpen(true)}
        />
      </div>

      {showResults ? (
        <div className="search__results">
          {loading ? <p className="muted small">Buscando…</p> : null}
          {error ? <p className="error small">{error}</p> : null}
          {!loading && !error && items.length === 0 ? (
            <p className="muted small">Sin resultados.</p>
          ) : null}
          {items.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.kind === "knowledge" ? `/knowledge/${item.id}` : `/projects/${item.id}`}
              onClick={() => setOpen(false)}
            >
              <span className="search__kind">
                {item.kind === "knowledge" ? "Nota" : "Proyecto"}
              </span>
              <span className="search__title">{item.title}</span>
              {item.snippet ? <span className="muted small">{item.snippet}</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
