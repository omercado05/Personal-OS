"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AXIS_COLOR, CHART_PALETTE, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "@/lib/chart-colors";
import { KNOWLEDGE_CATEGORY_LABELS, type KnowledgeCategory } from "@/lib/constants";

/** Entradas de conocimiento por categoría (barras horizontales). */
export default function CategoryBars({ data }: { data: { category: string; count: number }[] }) {
  const rows = data.map((item) => ({
    label: KNOWLEDGE_CATEGORY_LABELS[item.category as KnowledgeCategory] ?? item.category,
    count: item.count,
  }));

  return (
    <div className="chart chart--bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          barCategoryGap={6}
        >
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={104}
            tick={{ fill: AXIS_COLOR, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
          />
          <Bar dataKey="count" name="Entradas" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {rows.map((row, index) => (
              <Cell key={row.label} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              style={{ fill: AXIS_COLOR, fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
