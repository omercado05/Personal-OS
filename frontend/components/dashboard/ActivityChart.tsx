"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AXIS_COLOR, GRID_COLOR, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "@/lib/chart-colors";

const MONTH_LABELS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** «2026-10» → «oct». */
function shortMonth(month: string): string {
  const index = Number(month.split("-")[1]) - 1;
  return MONTH_LABELS[index] ?? month;
}

/** Actividad de los últimos meses: nuevas entradas y proyectos creados. */
export default function ActivityChart({
  data,
}: {
  data: { month: string; knowledge: number; projects: number }[];
}) {
  const rows = data.map((row) => ({ ...row, label: shortMonth(row.month) }));

  return (
    <div className="chart chart--activity">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="fillKnowledge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillProjects" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            width={28}
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            cursor={{ stroke: GRID_COLOR }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: AXIS_COLOR, paddingTop: 8 }}
          />
          <Area
            type="monotone"
            dataKey="knowledge"
            name="Conocimiento"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#fillKnowledge)"
          />
          <Area
            type="monotone"
            dataKey="projects"
            name="Proyectos"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#fillProjects)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
