"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { deleteKnowledge, getKnowledge } from "@/lib/knowledge";
import type { KnowledgeEntry } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function KnowledgeDetailPage() {
  const api = useApi();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [entry, setEntry] = useState<KnowledgeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function confirmDelete() {
    if (!entry) {
      return;
    }
    setDeleting(true);
    try {
      await deleteKnowledge(api, entry.id);
      router.push("/knowledge");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
      setConfirming(false);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="panel">
        <div className="alert">
          <span>{error ?? "Entrada no encontrada."}</span>
          <Link className="link-button ghost small" href="/knowledge">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">{KNOWLEDGE_CATEGORY_LABELS[entry.category]}</p>
          <h1>{entry.title}</h1>
        </div>
        <div className="row-actions">
          <Link className="link-button" href={`/knowledge/${entry.id}/edit`}>
            Editar
          </Link>
          <button type="button" className="ghost danger" onClick={() => setConfirming(true)}>
            Eliminar
          </button>
        </div>
      </header>

      {entry.tags.length > 0 ? (
        <div className="data-list__meta">
          {entry.tags.map((item) => (
            <span key={item} className="tag">
              #{item}
            </span>
          ))}
        </div>
      ) : null}

      <article className="content-block">
        {entry.content || <span className="muted">Sin contenido.</span>}
      </article>

      <dl className="meta-list">
        <div>
          <dt>Creada</dt>
          <dd>{formatDateTime(entry.createdAt)}</dd>
        </div>
        <div>
          <dt>Actualizada</dt>
          <dd>{formatDateTime(entry.updatedAt)}</dd>
        </div>
      </dl>

      <ConfirmDialog
        open={confirming}
        title="Eliminar entrada"
        message={
          <>
            ¿Seguro que quieres eliminar <strong>{entry.title}</strong>? Esta acción no se puede
            deshacer.
          </>
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
