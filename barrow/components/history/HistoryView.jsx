"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { VolumeChart } from "./VolumeChart";
import { shortDayLabel } from "../../lib/date";
import { convertSpeed, convertWeight, fmtNum } from "../../lib/units";
import { getCardioDistanceSeries, getVolumeSeries } from "../../lib/analytics";

export function HistoryView({ exercise, workouts, unit, onBack }) {
  const isCardio = exercise.category === "Cardio";
  const speedLabel = unit === "kg" ? "km/h" : "mph";
  const distanceLabel = unit === "kg" ? "km" : "mi";

  const records = useMemo(() => {
    const out = [];
    Object.entries(workouts).forEach(([dateKey, w]) => {
      const entry = w.entries.find((e) => e.exerciseId === exercise.id);
      if (entry && entry.sets.length) out.push({ dateKey, sets: entry.sets });
    });
    return out.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  }, [workouts, exercise]);

  const volumeSeries = useMemo(
    () => (isCardio ? getCardioDistanceSeries(exercise.id, workouts, unit) : getVolumeSeries(exercise.id, workouts, unit)),
    [workouts, exercise, unit, isCardio]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 pt-4 pb-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
        <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
        <div>
          <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>{exercise.name}</h3>
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>{exercise.category}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3">
        {volumeSeries.length > 0 && (
          <div className="mb-5">
            <div className="display text-[13px] mb-1 uppercase" style={{ color: "var(--text-dim)" }}>
              {isCardio ? `Distance (${distanceLabel})` : "Volume"} · last {volumeSeries.length} session{volumeSeries.length > 1 ? "s" : ""}
            </div>
            <VolumeChart data={volumeSeries} />
          </div>
        )}
        {records.length === 0 && (
          <p className="text-[13px] text-center mt-10" style={{ color: "var(--text-dim)" }}>
            No sets logged for this exercise yet.
          </p>
        )}
        {records.map(({ dateKey, sets }) => (
          <div key={dateKey} className="py-3" style={{ borderBottom: "1.5px solid var(--line)" }}>
            <div className="text-[11px] font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>{shortDayLabel(dateKey)}</div>
            <div>
              {sets.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between text-[13px] tabular py-0.5" style={{ color: "var(--text)" }}>
                  <span className="display text-[14px] uppercase" style={{ color: "var(--text-dim)" }}>Set {i + 1}</span>
                  {isCardio ? (
                    <span>{fmtNum(parseFloat(s.time) || 0)} min @ {fmtNum(convertSpeed(s.speed, s.unit, unit))} {speedLabel}</span>
                  ) : (
                    <span>{fmtNum(parseFloat(s.reps) || 0)} reps × {fmtNum(convertWeight(s.weight, s.unit, unit))} {unit}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
