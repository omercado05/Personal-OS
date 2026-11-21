import type { ReactNode } from "react";

import AnimatedNumber from "@/components/dashboard/AnimatedNumber";

type PageHeroProps = {
  eyebrow: string;
  count: number;
  noun: string;
  /** Mientras no hay datos se muestra un marcador en lugar de «0 …». */
  loading?: boolean;
  children?: ReactNode;
};

/**
 * Cabecera «relato» de un listado, sobre cristal: rótulo, título con la cifra
 * total en degradado y el sustantivo («128 notas»), y debajo `children`
 * (acciones, búsqueda y filtros).
 */
export function PageHero({ eyebrow, count, noun, loading = false, children }: PageHeroProps) {
  return (
    <header className="page-hero glass">
      <div className="page-hero__head">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-hero__title" aria-busy={loading || undefined}>
          {loading ? (
            <>
              <span className="skeleton page-hero__count-skeleton" aria-hidden="true" />
              <span className="visually-hidden">Cargando…</span>
            </>
          ) : (
            <>
              <span className="page-hero__count">
                <AnimatedNumber value={count} />
              </span>{" "}
              {noun}
            </>
          )}
        </h1>
      </div>
      {children}
    </header>
  );
}
