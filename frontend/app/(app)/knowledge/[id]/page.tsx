"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/dashboard/Skeleton";
import { Reveal } from "@/components/visual/Reveal";
import { useExitAnimation } from "@/components/visual/useExitAnimation";
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
  const exit = useExitAnimation();

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
      await exit.play();
      await deleteKnowledge(api, entry.id);
      router.push("/knowledge");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
      exit.reset();
      setConfirming(false);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="panel" aria-busy="true">
        <p className="visually-hidden" role="status">
          Cargando entrada…
        </p>
        <Skeleton className="skeleton--line sm" />
        <Skeleton className="skeleton--line" />
        <Skeleton className="skeleton--chart" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="panel">
        <div className="alert" role="alert">
          <span>{error ?? "Entrada no encontrada."}</span>
          <Link className="link-button ghost small" href="/knowledge">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div className="panel detail" {...exit.motionProps}>
        <header className="detail-head glass beam">
          <Link className="breadcrumb" href="/knowledge">
            <ArrowLeft size={14} aria-hidden="true" />
            Knowledge
          </Link>
          <div className="detail-head__row">
            <div className="detail-head__title">
              <h1>{entry.title}</h1>
              <span className="badge">{KNOWLEDGE_CATEGORY_LABELS[entry.category]}</span>
            </div>
            <div className="row-actions">
              <Link className="link-button small" href={`/knowledge/${entry.id}/edit`}>
                <Pencil size={16} aria-hidden="true" />
                Editar
              </Link>
              <button
                type="button"
                className="ghost small danger"
                onClick={() => setConfirming(true)}
              >
                <Trash2 size={16} aria-hidden="true" />
                Eliminar
              </button>
            </div>
          </div>
          {entry.tags.length > 0 ? (
            <div className="data-list__meta">
              {entry.tags.map((item) => (
                <span key={item} className="tag">
                  #{item}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <Reveal className="detail-body">
          <article className="content-block glass">
            {entry.content || <span className="muted">Sin contenido.</span>}
          </article>

          <dl className="meta-list glass">
            <div>
              <dt>Creada</dt>
              <dd>{formatDateTime(entry.createdAt)}</dd>
            </div>
            <div>
              <dt>Actualizada</dt>
              <dd>{formatDateTime(entry.updatedAt)}</dd>
            </div>
          </dl>
        </Reveal>
      </motion.div>

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
    </>
  );
}
