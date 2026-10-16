"use client";

import type { LucideIcon } from "lucide-react";

import AnimatedNumber from "./AnimatedNumber";

/** Tarjeta de una métrica del panel: icono, valor animado y etiqueta. */
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "accent",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "accent" | "accent-2" | "danger";
}) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className="stat-card__value">
        <AnimatedNumber value={value} />
      </span>
      <span className="stat-card__label">{label}</span>
    </article>
  );
}
