"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Reveal } from "@/components/visual/Reveal";

/**
 * Banda del relato del dashboard: sección a todo el ancho con su `h2`, que se
 * revela al entrar en pantalla. El `id` lo usa `StoryProgress` para marcar la
 * banda visible.
 */
export function StoryBand({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const headingId = `${id}-titulo`;

  return (
    <section id={id} className="story-band" aria-labelledby={headingId}>
      <Reveal className="story-band__inner">
        <h2 id={headingId} className="story-band__title">
          {label}
        </h2>
        {children}
      </Reveal>
    </section>
  );
}

/**
 * Indicador de progreso del relato: un punto por banda a la derecha; se
 * ilumina el de la banda que ocupa el centro de la pantalla. Decorativo
 * (`aria-hidden`) y oculto por CSS por debajo de 1024 px.
 */
export function StoryProgress({ ids }: { ids: string[] }) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const idsKey = ids.join(",");

  useEffect(() => {
    const bands = idsKey
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((band): band is HTMLElement => band !== null);
    if (bands.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    // Franja horizontal en el centro del viewport: la banda que la cruza es la activa.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    bands.forEach((band) => observer.observe(band));
    return () => observer.disconnect();
  }, [idsKey]);

  return (
    <div className="story-progress" aria-hidden="true">
      {ids.map((id) => (
        <span
          key={id}
          className={`story-progress__dot${id === active ? " is-active" : ""}`}
          data-band={id}
        />
      ))}
    </div>
  );
}
