"use client";

import { useUser } from "@hexclave/next";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  FolderKanban,
  Layers,
  Plus,
  RefreshCw,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import ActivityChart from "@/components/dashboard/ActivityChart";
import CategoryBars from "@/components/dashboard/CategoryBars";
import Skeleton from "@/components/dashboard/Skeleton";
import StatCard from "@/components/dashboard/StatCard";
import StatusDonut from "@/components/dashboard/StatusDonut";
import DashboardCalendar from "@/components/tasks/DashboardCalendar";
import DayTasksCard from "@/components/tasks/DayTasksCard";
import { KNOWLEDGE_CATEGORY_LABELS, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { clientTimeZone } from "@/lib/format";
import type { DashboardMetrics } from "@/lib/types";
import { useApi } from "@/lib/use-api";

interface DashboardData {
  recentKnowledge: Array<{
    id: string;
    title: string;
    category: string;
    tags: string[];
    updatedAt: string;
  }>;
  recentProjects: Array<{
    id: string;
    name: string;
    status: string;
    technologies: string[];
    updatedAt: string;
  }>;
}

function greetingName(displayName?: string | null, email?: string | null): string {
  const name = (displayName ?? "").trim();
  if (name) {
    return name.split(/\s+/)[0] ?? name;
  }
  const local = (email ?? "").split("@")[0]?.trim();
  return local && local.length > 0 ? local : "de nuevo";
}

export default function DashboardPage() {
  const user = useUser();
  const userId = user?.id ?? null;
  const api = useApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    void (async () => {
      try {
        const timeZone = clientTimeZone();
        const metricsUrl = timeZone
          ? `/api/v1/dashboard/metrics?tz=${encodeURIComponent(timeZone)}`
          : "/api/v1/dashboard/metrics";
        const [dashboard, dashboardMetrics] = await Promise.all([
          api<{ data: DashboardData }>("/api/v1/dashboard", { signal: controller.signal }),
          api<{ data: DashboardMetrics }>(metricsUrl, {
            signal: controller.signal,
          }),
        ]);
        if (active) {
          setData(dashboard.data);
          setMetrics(dashboardMetrics.data);
          setError(null);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Error desconocido");
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
  }, [userId, api, reloadKey]);

  function reload() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  if (!user) {
    return (
      <div className="panel">
        <h1>Dashboard</h1>
        <p className="muted">Inicia sesión para ver tu panel.</p>
      </div>
    );
  }

  const showSkeleton = loading && !metrics;

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Resumen</p>
          <h1>Hola, {greetingName(user.displayName, user.primaryEmail)}</h1>
        </div>
        <div className="row-actions">
          <Link className="link-button small" href="/knowledge/new">
            <Plus size={16} aria-hidden="true" />
            Entrada
          </Link>
          <Link className="link-button small" href="/projects/new">
            <Plus size={16} aria-hidden="true" />
            Proyecto
          </Link>
          <button type="button" className="ghost small" onClick={reload} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" />
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" className="ghost small" onClick={reload}>
            Reintentar
          </button>
        </div>
      ) : null}

      {showSkeleton ? (
        <>
          <div className="stat-grid">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <Skeleton key={key} className="skeleton--stat" />
            ))}
          </div>
          <div className="charts-grid">
            <div className="chart-card chart-card--wide">
              <Skeleton className="skeleton--chart" />
            </div>
            <div className="chart-card">
              <Skeleton className="skeleton--chart" />
            </div>
            <div className="chart-card">
              <Skeleton className="skeleton--chart" />
            </div>
          </div>
        </>
      ) : null}

      {metrics ? (
        <>
          <div className="stat-grid">
            <StatCard
              label="Entradas"
              value={metrics.totals.knowledge}
              icon={BookOpen}
              tone="accent"
            />
            <StatCard
              label="Proyectos"
              value={metrics.totals.projects}
              icon={FolderKanban}
              tone="accent-2"
            />
            <StatCard label="Tags" value={metrics.totals.tags} icon={Tags} tone="accent" />
            <StatCard
              label="Categorías"
              value={metrics.totals.categories}
              icon={Layers}
              tone="accent-2"
            />
            <StatCard
              label="Vencidas"
              value={metrics.tasksOverdue}
              icon={AlertTriangle}
              tone="danger"
            />
            <StatCard
              label="Pendientes para hoy"
              value={metrics.tasksDueToday}
              icon={CalendarClock}
              tone="accent"
            />
          </div>

          <div className="charts-grid">
            <section className="chart-card chart-card--wide">
              <div className="chart-card__head">
                <h2>Actividad</h2>
                <span className="muted small">Últimos 6 meses</span>
              </div>
              <ActivityChart data={metrics.activity} />
            </section>

            <section className="chart-card">
              <div className="chart-card__head">
                <h2>Proyectos por estado</h2>
              </div>
              {metrics.projectsByStatus.length === 0 ? (
                <p className="muted">Todavía no hay proyectos.</p>
              ) : (
                <StatusDonut data={metrics.projectsByStatus} />
              )}
            </section>

            <section className="chart-card">
              <div className="chart-card__head">
                <h2>Conocimiento por categoría</h2>
              </div>
              {metrics.knowledgeByCategory.length === 0 ? (
                <p className="muted">Todavía no hay entradas.</p>
              ) : (
                <CategoryBars data={metrics.knowledgeByCategory} />
              )}
            </section>
          </div>
        </>
      ) : null}

      {data ? (
        <div className="grid two">
          <section className="card-min">
            <div className="card-min__head">
              <h2>Conocimiento reciente</h2>
              <Link href="/knowledge">Ver todo</Link>
            </div>
            {data.recentKnowledge.length === 0 ? (
              <p className="muted">Todavía no hay entradas.</p>
            ) : (
              <ul className="list">
                {data.recentKnowledge.map((entry) => (
                  <li key={entry.id}>
                    <Link href={`/knowledge/${entry.id}`}>{entry.title}</Link>
                    <span className="pill">
                      {KNOWLEDGE_CATEGORY_LABELS[
                        entry.category as keyof typeof KNOWLEDGE_CATEGORY_LABELS
                      ] ?? entry.category}
                    </span>
                    {entry.tags.length > 0 ? (
                      <span className="muted"> {entry.tags.join(", ")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-min">
            <div className="card-min__head">
              <h2>Proyectos recientes</h2>
              <Link href="/projects">Ver todo</Link>
            </div>
            {data.recentProjects.length === 0 ? (
              <p className="muted">Todavía no hay proyectos.</p>
            ) : (
              <ul className="list">
                {data.recentProjects.map((project) => (
                  <li key={project.id}>
                    <Link href={`/projects/${project.id}`}>{project.name}</Link>
                    <span className="pill">
                      {PROJECT_STATUS_LABELS[
                        project.status as keyof typeof PROJECT_STATUS_LABELS
                      ] ?? project.status}
                    </span>
                    {project.technologies.length > 0 ? (
                      <span className="muted"> {project.technologies.join(", ")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      <section className="dashboard__calendar" aria-label="Calendario de tareas">
        <div className="calendar-grid">
          <DashboardCalendar onDaySelect={setSelectedDay} />
          <DayTasksCard date={selectedDay} />
        </div>
      </section>
    </div>
  );
}
