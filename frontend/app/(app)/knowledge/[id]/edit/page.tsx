"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import KnowledgeForm from "@/components/knowledge/KnowledgeForm";
import { getKnowledge } from "@/lib/knowledge";
import type { KnowledgeEntry } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function EditKnowledgePage() {
  const api = useApi();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [entry, setEntry] = useState<KnowledgeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await getKnowledge(api, id, controller.signal);
        if (active) {
          setEntry(response.data);
          setError(null);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar la entrada.");
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
  }, [api, id]);

  return (
    <div className="panel">
      <header className="panel__header detail-head glass">
        <div>
          <p className="eyebrow">Knowledge</p>
          <h1>Editar entrada</h1>
        </div>
        <Link className="link-button ghost" href="/knowledge">
          ← Volver
        </Link>
      </header>

      {loading ? (
        <p className="muted" role="status">
          Cargando…
        </p>
      ) : null}
      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      {entry ? <KnowledgeForm mode="edit" initial={entry} /> : null}
    </div>
  );
}
