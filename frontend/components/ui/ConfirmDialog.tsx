"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

import { useFocusTrap } from "@/lib/use-focus-trap";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación para acciones destructivas (borrado). Se cierra con
 * `Escape` o clic en el fondo; atrapa el foco mientras está abierto y lo
 * devuelve al elemento anterior al cerrarse.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useFocusTrap(open, modalRef, onCancel);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <motion.div
        ref={modalRef}
        className="modal"
        // Entrada con escala y fundido; sin animación si se reduce el movimiento.
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h2 id="confirm-title">{title}</h2>
        <div className="modal__body" id="confirm-message">
          {message}
        </div>
        <div className="modal__actions">
          <button type="button" className="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className="danger" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
