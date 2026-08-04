"use client";

import { useMemo } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { WorkoutTabs } from "./WorkoutTabs";
import { dayLabel } from "../../lib/date";
import { convertSpeed, convertWeight, fmtNum } from "../../lib/units";
import { exerciseMeta } from "../../lib/exercise-meta";
import { runInfo } from "../../lib/supersets";

// Read-only recap of a past day's workout(s) — editing a workout you already
// finished is rare, so this avoids surfacing all the day-of logging controls
// by default. Tapping "Edit" drops into the normal DayView for full control.
export function WorkoutSummaryView({
  dateKey, dayWorkouts, activeWorkoutId, exercises, unit,
  onBack, onSelectWorkout, onEdit,
}) {
  const workout = dayWorkouts.find((w) => w.id === activeWorkoutId) || dayWorkouts[0];
  const entries = workout ? workout.entries : [];
  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const speedLabel = unit === "kg" ? "km/h" : "mph";
  const rowRuns = useMemo(() => runInfo(entries, (e) => e.supersetId ?? null), [entries]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-3 px-5 pt-4 pb-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
        <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold truncate" style={{ color: "var(--text)" }}>
            {workout ? workout.name : "Workout"}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>{dayLabel(dateKey)}</div>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0"
          style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
        >
          <Pencil size={12} />
          Edit
        </button>
      </div>

      {dayWorkouts.length > 1 && (
        <WorkoutTabs workouts={dayWorkouts} activeId={workout?.id} onSelect={onSelectWorkout} />
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
        {entries.length === 0 && (
          <p className="text-[12px] py-3" style={{ color: "var(--text-dim)" }}>No exercises logged for this workout.</p>
        )}
        {entries.map((entry, entryIndex) => {
          const ex = exMap[entry.exerciseId];
          if (!ex) return null;
          const isCardio = ex.category === "Cardio";
          const run = rowRuns[entryIndex];

          return (
            <div
              key={entry.exerciseId}
              className="py-4"
              style={{
                position: "relative",
                paddingRight: run.isGrouped ? 12 : 0,
                borderBottom: "1.5px solid var(--line)",
              }}
            >
              {run.isGrouped && (
                <>
                  {!run.isFirst && (
                    <div style={{ position: "absolute", zIndex: 1, right: 3.25, top: -2, height: 13, width: 1.5, background: "var(--accent)" }} />
                  )}
                  {!run.isLast && (
                    <div style={{ position: "absolute", zIndex: 1, right: 3.25, top: 11, bottom: -2, width: 1.5, background: "var(--accent)" }} />
                  )}
                  <div style={{ position: "absolute", zIndex: 1, right: 1, top: 8, width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                </>
              )}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[14px] font-medium truncate" style={{ color: "var(--text)" }}>{ex.name}</span>
                {ex.angles && (
                  <span className="text-[11px] flex-shrink-0" style={{ color: "var(--accent)" }}>
                    · {entry.angle || ex.angles[0]}
                  </span>
                )}
              </div>
              <div className="text-[10px] mb-2" style={{ color: "var(--text-dim)" }}>{exerciseMeta(ex)}</div>

              {entry.sets.length === 0 ? (
                <div className="text-[12px]" style={{ color: "var(--text-dim)" }}>No sets logged</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {entry.sets.map((set, i) => (
                    <div key={set.id} className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--text)" }}>
                      <span>
                        {isCardio
                          ? `Set ${i + 1} · ${fmtNum(set.time)} min @ ${fmtNum(convertSpeed(set.speed, set.unit, unit))} ${speedLabel}`
                          : `Set ${i + 1} · ${fmtNum(convertWeight(set.weight, set.unit, unit))} ${unit} × ${fmtNum(set.reps)} reps`}
                      </span>
                      {set.warmup && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
                        >
                          Warmup
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
