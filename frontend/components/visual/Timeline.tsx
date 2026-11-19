"use client";

import { useId, type ReactNode } from "react";

import { Stagger, StaggerItem } from "@/components/visual/Reveal";
import type { TimelineGroup } from "@/lib/timeline";

type TimelineProps<K extends string, T> = {
  groups: TimelineGroup<K, T>[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  dimmed?: (item: T) => boolean;
};

/**
 * Lista agrupada por fecha: cada grupo tiene su `h2` en una píldora de cristal
 * y una lista que cuelga de una línea vertical luminosa (se dibuja al entrar).
 * Los ítems son tarjetas de cristal en cascada que encienden el haz de luz en
 * hover/foco. `dimmed` atenúa los ítems que lo cumplan (p. ej. completados).
 */
export function Timeline<K extends string, T>({
  groups,
  getKey,
  renderItem,
  dimmed,
}: TimelineProps<K, T>) {
  const baseId = useId();

  return (
    <div className="timeline">
      {groups.map((group) => {
        const headingId = `${baseId}-${group.key}`;
        return (
          <section key={group.key} className="timeline__group" aria-labelledby={headingId}>
            <h2 id={headingId} className="timeline__label glass">
              {group.label}
            </h2>
            <div className="timeline__track">
              <span className="timeline__rail" aria-hidden="true" />
              <Stagger as="ul" className="timeline__list">
                {group.items.map((item) => (
                  <StaggerItem
                    key={getKey(item)}
                    as="li"
                    className={`timeline__item glass beam-hover${dimmed?.(item) ? " is-dimmed" : ""}`}
                  >
                    {renderItem(item)}
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>
        );
      })}
    </div>
  );
}
