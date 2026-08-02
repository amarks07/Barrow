"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { buildMonthGrid, monthLabel, toKey } from "../../lib/date";

export function CalendarView({ monthCursor, setMonthCursor, workouts, onSelectDay }) {
  const cells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const todayKey = toKey(new Date());
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="px-5 pt-1 pb-6">
      <div className="flex items-center justify-between mb-5">
        <IconBtn label="Previous month" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>
          <ChevronLeft size={17} />
        </IconBtn>
        <h2 className="display text-[19px]" style={{ color: "var(--text)" }}>{monthLabel(monthCursor)}</h2>
        <IconBtn label="Next month" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>
          <ChevronRight size={17} />
        </IconBtn>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((w, i) => (
          <div key={i} className="text-center display text-[13px]" style={{ color: "var(--text-dim)" }}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = toKey(date);
          const dayWorkouts = workouts[key] || [];
          const setCount = dayWorkouts.reduce((sum, w) => sum + w.entries.reduce((s, e) => s + e.sets.length, 0), 0);
          const isToday = key === todayKey;
          const dotOpacity = setCount === 0 ? 0 : setCount <= 3 ? 0.7 : setCount <= 8 ? 0.85 : 1;
          return (
            <button key={i} onClick={() => onSelectDay(key)} className="aspect-square flex flex-col items-center justify-center gap-1 active:opacity-50">
              <span
                className="tabular flex items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  fontSize: 13,
                  color: isToday ? "var(--accent)" : dayWorkouts.length > 0 ? "var(--text)" : "var(--text-dim)",
                  fontWeight: isToday ? 700 : 400,
                  borderRadius: 6,
                  border: isToday ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                }}
              >
                {date.getDate()}
              </span>
              <span className="rounded-full" style={{ width: 4, height: 4, background: "var(--accent)", opacity: dotOpacity }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
