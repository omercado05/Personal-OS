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
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import ActivityChart from "@/components/dashboard/ActivityChart";
import AnimatedNumber from "@/components/dashboard/AnimatedNumber";
import CategoryBars from "@/components/dashboard/CategoryBars";
import Skeleton from "@/components/dashboard/Skeleton";
import StatCard from "@/components/dashboard/StatCard";
import StatusDonut from "@/components/dashboard/StatusDonut";
import { StoryBand, StoryProgress } from "@/components/dashboard/StoryBands";
import DashboardCalendar from "@/components/tasks/DashboardCalendar";
import DayTasksCard from "@/components/tasks/DayTasksCard";
import { Reveal, Stagger, StaggerItem } from "@/components/visual/Reveal";
import { KNOWLEDGE_CATEGORY_LABELS, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { clientTimeZone } from "@/lib/format";
import { listTasks } from "@/lib/tasks";
import type { DashboardMetrics, Task } from "@/lib/types";
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

/** Bandas del relato, en orden (ids que sigue `StoryProgress`). */
const BAND_IDS = ["apertura", "hoy", "cifras", "actividad", "distribucion", "reciente"];

/** La fecha depende de la zona del navegador: solo se pinta en el cliente. */
const subscribeNever = () => () => {};
function formatToday(): string {
  const text = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  const [todayTasks, setTodayTasks] = useState<Task[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const today = useSyncExternalStore(subscribeNever, formatToday, () => null);

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
        const [dashboard, dashboardMetrics, dueToday] = await Promise.all([
          api<{ data: DashboardData }>("/api/v1/dashboard", { signal: controller.signal }),
          api<{ data: DashboardMetrics }>(metricsUrl, {
            signal: controller.signal,
          }),
          // Mismo criterio que `tasksDueToday`: pendientes que vencen hoy (zona del navegador).
          listTasks(api, { status: "PENDING", dueToday: true, pageSize: 50 }, controller.signal),
        ]);
        if (active) {
          setData(dashboard.data);
          setMetrics(dashboardMetrics.data);
          setTodayTasks(dueToday.data);
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
  const dueToday = metrics?.tasksDueToday ?? 0;

  return (
    <div className="story">
      <StoryProgress ids={BAND_IDS} />

      <section id="apertura" className="story-band" aria-labelledby="dashboard-titulo">
        <Reveal className="story-opening glass beam">
          {today ? <p className="eyebrow">{today}</p> : null}
          <h1 id="dashboard-titulo">Hola, {greetingName(user.displayName, user.primaryEmail)}</h1>
          {metrics ? (
            <>
              <p className="story-hero">
                <span className="story-hero__number">
                  <AnimatedNumber value={dueToday} />
                </span>
                <span className="story-hero__text">
                  {dueToday === 1 ? "tarea para hoy" : "tareas para hoy"}
                </span>
              </p>
              <p className="story-opening__sub muted">{metrics.tasksOverdue} vencidas</p>
            </>
          ) : showSkeleton ? (
            <Skeleton className="skeleton--hero" />
          ) : null}
          <div className="row-actions">
            <Link className="link-button small" href="/knowledge/new">
              <Plus size={16} aria-hidden="true" />
              Entrada
            </Link>
            <Link className="link-button small" href="/projects/new">
              <Plus size={16} aria-hidden="true" />
              Proyecto
            </Link>
            <Link className="link-button small" href="/tasks/new">
              <Plus size={16} aria-hidden="true" />
              Tarea
            </Link>
            <button type="button" className="ghost small" onClick={reload} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" />
              {loading ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
        </Reveal>
      </section>

      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" className="ghost small" onClick={reload}>
            Reintentar
          </button>
        </div>
      ) : null}

      <StoryBand id="hoy" label="Hoy">
        {todayTasks ? (
          <TodayTimeline tasks={todayTasks} />
        ) : showSkeleton ? (
          <Skeleton className="skeleton--line" />
        ) : null}
        <div className="calendar-grid">
          <DashboardCalendar onDaySelect={setSelectedDay} />
          <DayTasksCard date={selectedDay} />
        </div>
      </StoryBand>

      <StoryBand id="cifras" label="Tus cifras">
        {metrics ? (
          <Stagger className="stat-grid">
            <StaggerItem>
              <StatCard
                label="Entradas"
                value={metrics.totals.knowledge}
                icon={BookOpen}
                tone="accent"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Proyectos"
                value={metrics.totals.projects}
                icon={FolderKanban}
                tone="accent-2"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard label="Tags" value={metrics.totals.tags} icon={Tags} tone="accent" />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Categorías"
                value={metrics.totals.categories}
                icon={Layers}
                tone="accent-2"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Vencidas"
                value={metrics.tasksOverdue}
                icon={AlertTriangle}
                tone="danger"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Pendientes para hoy"
                value={metrics.tasksDueToday}
                icon={CalendarClock}
                tone="accent"
              />
            </StaggerItem>
          </Stagger>
        ) : showSkeleton ? (
          <div className="stat-grid">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <Skeleton key={key} className="skeleton--stat" />
            ))}
          </div>
        ) : null}
      </StoryBand>

      <StoryBand id="actividad" label="Actividad">
        <div className="chart-card glass">
          <p className="muted small">Últimos 6 meses</p>
          {metrics ? (
            <ActivityChart data={metrics.activity} />
          ) : showSkeleton ? (
            <Skeleton className="skeleton--chart" />
          ) : null}
        </div>
      </StoryBand>

      <StoryBand id="distribucion" label="Proyectos y conocimiento">
        <div className="charts-grid">
          <div className="chart-card glass">
            <div className="chart-card__head">
              <h3>Proyectos por estado</h3>
            </div>
            {metrics ? (
              metrics.projectsByStatus.length === 0 ? (
                <p className="muted">Todavía no hay proyectos.</p>
              ) : (
                <StatusDonut data={metrics.projectsByStatus} />
              )
            ) : showSkeleton ? (
              <Skeleton className="skeleton--chart" />
            ) : null}
          </div>
          <div className="chart-card glass">
            <div className="chart-card__head">
              <h3>Conocimiento por categoría</h3>
            </div>
            {metrics ? (
              metrics.knowledgeByCategory.length === 0 ? (
                <p className="muted">Todavía no hay entradas.</p>
              ) : (
                <CategoryBars data={metrics.knowledgeByCategory} />
              )
            ) : showSkeleton ? (
              <Skeleton className="skeleton--chart" />
            ) : null}
          </div>
        </div>
      </StoryBand>

      <StoryBand id="reciente" label="Reciente">
        {data ? (
          <div className="grid two">
            <div className="card-min glass">
              <div className="card-min__head">
                <h3>Conocimiento reciente</h3>
                <Link href="/knowledge">Ver todo</Link>
              </div>
              {data.recentKnowledge.length === 0 ? (
                <p className="muted">Todavía no hay entradas.</p>
              ) : (
                <Stagger as="ul" className="list">
                  {data.recentKnowledge.map((entry) => (
                    <StaggerItem as="li" key={entry.id}>
                      <Link href={`/knowledge/${entry.id}`}>{entry.title}</Link>
                      <span className="pill">
                        {KNOWLEDGE_CATEGORY_LABELS[
                          entry.category as keyof typeof KNOWLEDGE_CATEGORY_LABELS
                        ] ?? entry.category}
                      </span>
                      {entry.tags.length > 0 ? (
                        <span className="muted"> {entry.tags.join(", ")}</span>
                      ) : null}
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>

            <div className="card-min glass">
              <div className="card-min__head">
                <h3>Proyectos recientes</h3>
                <Link href="/projects">Ver todo</Link>
              </div>
              {data.recentProjects.length === 0 ? (
                <p className="muted">Todavía no hay proyectos.</p>
              ) : (
                <Stagger as="ul" className="list">
                  {data.recentProjects.map((project) => (
                    <StaggerItem as="li" key={project.id}>
                      <Link href={`/projects/${project.id}`}>{project.name}</Link>
                      <span className="pill">
                        {PROJECT_STATUS_LABELS[
                          project.status as keyof typeof PROJECT_STATUS_LABELS
                        ] ?? project.status}
                      </span>
                      {project.technologies.length > 0 ? (
                        <span className="muted"> {project.technologies.join(", ")}</span>
                      ) : null}
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>
          </div>
        ) : showSkeleton ? (
          <div className="grid two">
            <Skeleton className="skeleton--chart" />
            <Skeleton className="skeleton--chart" />
          </div>
        ) : null}
      </StoryBand>
    </div>
  );
}

/** Línea de tiempo horizontal de las tareas pendientes de hoy (hora + título). */
function TodayTimeline({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="muted">Nada pendiente para hoy</p>;
  }

  return (
    <Stagger as="ol" className="today-line" step={0.08}>
      {tasks.map((task) => (
        <StaggerItem as="li" key={task.id} className="today-line__item">
          <time className="today-line__time" dateTime={task.dueAt ?? undefined}>
            {task.dueAt ? format(new Date(task.dueAt), "HH:mm") : "—"}
          </time>
          <Link className="today-line__title" href={`/tasks/${task.id}`}>
            {task.title}
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
