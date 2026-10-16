"use client";

import { useEffect, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listTaskDays } from "@/lib/tasks";
import { useApi } from "@/lib/use-api";

interface DashboardCalendarProps {
  onDaySelect?: (date: Date) => void;
}

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default function DashboardCalendar({ onDaySelect }: DashboardCalendarProps) {
  const api = useApi();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [daysWithCounts, setDaysWithCounts] = useState<Array<{ date: string; count: number }>>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const from = startOfMonth(currentMonth);
        const to = endOfMonth(currentMonth);
        const res = await listTaskDays(
          api,
          { from: from.toISOString(), to: to.toISOString() },
          controller.signal,
        );
        if (active) setDaysWithCounts(res.data);
      } catch {
        // El calendario es un resumen: si falla, se muestra sin marcas.
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, currentMonth]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  function pendingCount(d: Date): number {
    const key = format(d, "yyyy-MM-dd");
    return daysWithCounts.find((x) => x.date === key)?.count ?? 0;
  }

  function handleDayClick(d: Date) {
    setSelectedDate(d);
    onDaySelect?.(d);
  }

  return (
    <div className="calendar">
      <div className="calendar__header">
        <button
          type="button"
          className="ghost small"
          aria-label="Mes anterior"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <h2 className="calendar__title">{format(currentMonth, "MMMM yyyy")}</h2>
        <button
          type="button"
          className="ghost small"
          aria-label="Mes siguiente"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="calendar__weekdays" aria-hidden="true">
        {WEEK_DAYS.map((w) => (
          <div key={w} className="calendar__weekday">
            <span>{w}</span>
          </div>
        ))}
      </div>
      <div className="calendar__grid">
        {days.map((d) => {
          const count = pendingCount(d);
          const selected = selectedDate !== null && isSameDay(selectedDate, d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              className={`calendar__cell ${isToday(d) ? "is-today" : ""} ${selected ? "is-selected" : ""}`}
              onClick={() => handleDayClick(d)}
              aria-label={
                count > 0
                  ? `${format(d, "d 'de' MMMM 'de' yyyy")}, ${count} pendiente(s)`
                  : format(d, "d 'de' MMMM 'de' yyyy")
              }
            >
              <span className="calendar__daynum">{format(d, "d")}</span>
              {count > 0 ? <span className="calendar__dot" aria-hidden="true"></span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
