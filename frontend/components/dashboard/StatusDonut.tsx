"use client";

import { useReducedMotion } from "motion/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { STATUS_COLORS, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "@/lib/chart-colors";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/constants";

import { useBandSeen } from "./StoryBands";

/** Distribución de proyectos por estado: donut con total al centro + leyenda. */
export default function StatusDonut({ data }: { data: { status: string; count: number }[] }) {
  const reduceMotion = useReducedMotion();
  // El gráfico se monta (y anima su dibujo) al verse su banda, no al llegar los datos.
  const drawn = useBandSeen() || !!reduceMotion;
  const rows = data.map((item) => {
    const status = item.status as ProjectStatus;
    return {
      name: PROJECT_STATUS_LABELS[status] ?? item.status,
      value: item.count,
      color: STATUS_COLORS[status] ?? "#64748b",
    };
  });
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="donut">
      <div className="chart chart--donut" aria-hidden="true">
        {drawn ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius="64%"
                outerRadius="90%"
                paddingAngle={3}
                stroke="none"
                isAnimationActive={!reduceMotion}
              >
                {rows.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
        <div className="chart__center" aria-hidden="true">
          <span className="chart__center-value">{total}</span>
          <span className="chart__center-label">proyectos</span>
        </div>
      </div>

      <ul className="legend">
        {rows.map((row) => (
          <li key={row.name}>
            <span className="legend__dot" style={{ background: row.color }} aria-hidden="true" />
            <span className="legend__name">{row.name}</span>
            <span className="legend__value">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
