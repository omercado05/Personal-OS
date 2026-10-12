"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Control de paginación simple (anterior/siguiente). No se muestra si hay 1 página. */
export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Paginación">
      <button
        type="button"
        className="ghost small"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        ← Anterior
      </button>
      <span className="muted small">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        className="ghost small"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Siguiente →
      </button>
    </nav>
  );
}
