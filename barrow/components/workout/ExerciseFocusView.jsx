"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { SetCounters } from "./SetCounters";
import { AngleToggle } from "./AngleToggle";
import { TabPager } from "../layout/TabPager";
import { convertSpeed, convertWeight, fmtNum } from "../../lib/units";
import { getRecommendation, getRepRange } from "../../lib/analytics";

// Groups a workout's entries into "steps" for the focus view — a superset's
// entries (already stored contiguously) collapse into one step so they show
// together on a single screen, exactly as the flat list groups them visually.
// When groupSupersets is false (per the "Separate" preference), every entry
// gets its own step instead, superset or not.
function buildSteps(entries, groupSupersets) {
  if (!groupSupersets) return entries.map((e) => [e]);
  const steps = [];
  let i = 0;
  while (i < entries.length) {
    const supersetId = entries[i].supersetId;
    if (supersetId) {
      const group = [];
      while (i < entries.length && entries[i].supersetId === supersetId) {
        group.push(entries[i]);
        i++;
      }
      steps.push(group);
    } else {
      steps.push([entries[i]]);
      i++;
    }
  }
  return steps;
}

function ExercisePanel({ entry, ex, unit, workouts, workoutId, onSetAngle, onAddSet, onUpdateSet, onRemoveSet, showName }) {
  const isCardio = ex.category === "Cardio";
  const lastSet = entry.sets[entry.sets.length - 1];
  const { repLow, repHigh } = getRepRange(entry.exerciseId, workouts, workoutId);
  const rec = !isCardio && entry.sets.length === 0 ? getRecommendation(entry.exerciseId, workouts, unit, workoutId, repLow, repHigh) : null;
  const speedLabel = unit === "kg" ? "km/h" : "mph";
  const prefill = isCardio
    ? lastSet
      ? { time: lastSet.time, speed: convertSpeed(lastSet.speed, lastSet.unit, unit) }
      : null
    : lastSet
    ? { reps: lastSet.reps, weight: convertWeight(lastSet.weight, lastSet.unit, unit) }
    : rec
    ? { reps: rec.recReps, weight: rec.recWeight }
    : null;

  return (
    <div className="py-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
      {showName && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[15px] font-semibold truncate" style={{ color: "var(--text)" }}>{ex.name}</span>
          {ex.angles && (
            <span className="text-[11px] flex-shrink-0" style={{ color: "var(--accent)" }}>
              · {entry.angle || ex.angles[0]}
            </span>
          )}
        </div>
      )}

      {ex.angles && (
        <div className="mb-3 flex justify-end">
          <AngleToggle
            value={entry.angle || ex.angles[0]}
            onChange={(angle) => onSetAngle(entry.exerciseId, angle)}
            options={ex.angles.map((a) => ({ value: a, label: a }))}
          />
        </div>
      )}

      {entry.sets.length === 0 && rec && (
        <div className="text-[11px] mb-3" style={{ color: "var(--text-dim)" }}>
          Last: {fmtNum(rec.lastWeight)} {unit} × {fmtNum(rec.lastReps)} · {rec.note}
        </div>
      )}

      {entry.sets.map((set, i) => (
        <SetCounters
          key={set.id}
          index={i}
          set={set}
          unit={unit}
          isCardio={isCardio}
          onUpdate={(field, value) => onUpdateSet(entry.exerciseId, set.id, field, value)}
          onRemove={() => onRemoveSet(entry.exerciseId, set.id)}
        />
      ))}

      <button
        onClick={() => onAddSet(entry.exerciseId, prefill || undefined)}
        className="w-full mt-2 py-2.5 rounded-full text-[13px] font-semibold text-center"
        style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
      >
        {entry.sets.length === 0 && prefill
          ? isCardio
            ? `+ Add set · ${fmtNum(prefill.time)} min @ ${fmtNum(prefill.speed)} ${speedLabel}`
            : `+ Add set · ${fmtNum(prefill.reps)} × ${fmtNum(prefill.weight)} ${unit}`
          : "+ Add set"}
      </button>
    </div>
  );
}

export function ExerciseFocusView({
  dayWorkouts, activeWorkoutId, initialExerciseId, exercises, unit, workouts,
  onBack, onSetAngle, onAddSet, onUpdateSet, onRemoveSet,
  groupSupersets = true,
}) {
  const workout = dayWorkouts.find((w) => w.id === activeWorkoutId) || dayWorkouts[0];
  const entries = workout ? workout.entries : [];
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  const steps = useMemo(() => buildSteps(entries, groupSupersets), [entries, groupSupersets]);

  const initialIndex = Math.max(0, steps.findIndex((step) => step.some((e) => e.exerciseId === initialExerciseId)));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const clampedIndex = Math.min(activeIndex, Math.max(0, steps.length - 1));
  const activeStep = steps[clampedIndex];

  if (!workout || steps.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 pt-4 pb-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
          <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
          <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>Workout</h3>
        </div>
        <p className="text-[13px] text-center mt-10" style={{ color: "var(--text-dim)" }}>No exercises left in this workout.</p>
      </div>
    );
  }

  const tabs = steps.map((_, i) => ({ id: String(i) }));
  const title = activeStep.map((e) => exMap[e.exerciseId]?.name).filter(Boolean).join(" + ");

  return (
    <div className="flex flex-col h-full relative no-select">
      <div className="flex items-center gap-3 px-5 pt-4 pb-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
        <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold truncate" style={{ color: "var(--text)" }}>{title || "Exercise"}</div>
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {clampedIndex + 1} of {steps.length}{activeStep.length > 1 ? " · Superset" : ""}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TabPager tabs={tabs} activeTab={String(clampedIndex)} onChangeTab={(id) => setActiveIndex(Number(id))}>
          {steps.map((step, stepIndex) => (
            <div key={stepIndex} className="h-full overflow-y-auto no-scrollbar px-5 py-3" style={{ paddingBottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}>
              {step.map((entry) => {
                const ex = exMap[entry.exerciseId];
                if (!ex) return null;
                return (
                  <ExercisePanel
                    key={entry.exerciseId}
                    entry={entry}
                    ex={ex}
                    unit={unit}
                    workouts={workouts}
                    workoutId={workout.id}
                    onSetAngle={onSetAngle}
                    onAddSet={onAddSet}
                    onUpdateSet={onUpdateSet}
                    onRemoveSet={onRemoveSet}
                    showName={step.length > 1}
                  />
                );
              })}
            </div>
          ))}
        </TabPager>
      </div>

      <div
        className="flex items-center justify-between px-5"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 0,
          width: "100%",
          maxWidth: 420,
          padding: "1rem 1.25rem",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          background: "var(--bg)",
          borderTop: "1.5px solid var(--line)",
        }}
      >
        <button
          onClick={() => setActiveIndex(Math.max(0, clampedIndex - 1))}
          disabled={clampedIndex === 0}
          className="flex items-center gap-1 pill px-4 py-2.5 text-[13px] font-bold"
          style={{
            background: clampedIndex === 0 ? "var(--surface)" : "var(--accent)",
            color: clampedIndex === 0 ? "var(--text-dim)" : "#121214",
          }}
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <button
          onClick={() => setActiveIndex(Math.min(steps.length - 1, clampedIndex + 1))}
          disabled={clampedIndex === steps.length - 1}
          className="flex items-center gap-1 pill px-4 py-2.5 text-[13px] font-bold"
          style={{
            background: clampedIndex === steps.length - 1 ? "var(--surface)" : "var(--accent)",
            color: clampedIndex === steps.length - 1 ? "var(--text-dim)" : "#121214",
          }}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
