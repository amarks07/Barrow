"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { ConfirmDeleteButton } from "../ui/ConfirmDeleteButton";
import { ColorSwitch } from "../ui/ColorSwitch";
import { ExercisePicker } from "../exercises/ExercisePicker";
import { SetCounters } from "./SetCounters";
import { SaveAsTemplateModal } from "./SaveAsTemplateModal";
import { dayLabel } from "../../lib/date";
import { convertSpeed, convertWeight, fmtNum } from "../../lib/units";
import { getRecommendation, getRepRange } from "../../lib/analytics";
import { exerciseMeta } from "../../lib/exercise-meta";

export function DayView({
  dateKey, workout, exercises, templates, unit, workouts,
  onBack, onRename, onAddExercise, onRemoveExercise, onSwapExercise,
  onAddSet, onUpdateSet, onRemoveSet, onApplyTemplate, onOpenHistory, onSaveAsTemplate, onSetAngle,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [swapExId, setSwapExId] = useState(null);
  const [openExerciseId, setOpenExerciseId] = useState(null);
  const entries = workout ? workout.entries : [];
  const usedTemplate = (workout?.templateIds || []).length > 0;
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-3 px-5 pt-4 pb-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
        <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
        <div className="flex-1">
          <input
            value={workout ? workout.name : "Workout"}
            onChange={(e) => onRename(e.target.value)}
            className="bg-transparent outline-none text-[16px] font-semibold w-full"
            style={{ color: "var(--text)" }}
          />
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>{dayLabel(dateKey)}</div>
        </div>
        {entries.length > 0 && !usedTemplate && (
          <button
            onClick={() => setShowSaveTemplate(true)}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0"
            style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
          >
            Save as template
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3" style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
        {entries.length === 0 && (
          <p className="text-[12px] py-3" style={{ color: "var(--text-dim)" }}>
            Tap "+ Add exercise" below, or "Load template" to get started.
          </p>
        )}
        {entries.map((entry) => {
          const ex = exMap[entry.exerciseId];
          if (!ex) return null;
          const isCardio = ex.category === "Cardio";
          const isOpen = openExerciseId === entry.exerciseId;
          const lastSet = entry.sets[entry.sets.length - 1];
          const { repLow, repHigh } = getRepRange(entry.exerciseId, workouts, dateKey);
          const rec = !isCardio && entry.sets.length === 0 ? getRecommendation(entry.exerciseId, workouts, unit, dateKey, repLow, repHigh) : null;
          const speedLabel = unit === "kg" ? "km/h" : "mph";
          // Tapping "Add set" always does the sensible thing: repeat your last
          // set's numbers if you've already logged one today, otherwise start
          // from the suggested weight/reps if we have history (strength only),
          // otherwise blank.
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
            <div key={entry.exerciseId} className="py-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
              <div
                onClick={() => setOpenExerciseId((cur) => (cur === entry.exerciseId ? null : entry.exerciseId))}
                className="flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <ChevronRight
                    size={15}
                    color="var(--text-dim)"
                    style={{ flexShrink: 0, transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[14px] font-medium truncate" style={{ color: "var(--text)" }}>{ex.name}</span>
                      {ex.angles && (
                        <span className="text-[11px] flex-shrink-0" style={{ color: "var(--accent)" }}>
                          · {entry.angle || ex.angles[0]}
                        </span>
                      )}
                      {!isOpen && entry.sets.length > 0 && (
                        <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-dim)" }}>
                          · {entry.sets.length} set{entry.sets.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: "var(--text-dim)" }}>{exerciseMeta(ex)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenHistory(entry.exerciseId); }}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-center"
                    style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
                  >
                    History
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSwapExId(entry.exerciseId); }}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-center"
                    style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
                  >
                    Swap
                  </button>
                  <ConfirmDeleteButton
                    onConfirm={() => onRemoveExercise(entry.exerciseId)}
                    stopPropagation
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-center"
                  />
                </div>
              </div>

              {isOpen && (
                <div className="mt-3">
                  {ex.angles && (
                    <div className="mb-3">
                      <ColorSwitch
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
              )}
            </div>
          );
        })}

        <button
          onClick={() => setShowPicker(true)}
          className="w-full mt-2 py-2.5 rounded-lg text-[13px] font-semibold text-center"
          style={{ color: "var(--accent)", border: "1.5px dashed var(--line-strong)" }}
        >
          + Add exercise
        </button>
      </div>

      <button
        onClick={() => setShowTemplates(true)}
        className="pill px-4 py-3 text-[13px] font-bold"
        style={{
          position: "fixed",
          right: "max(1.25rem, calc(50vw - 210px + 1.25rem))",
          bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          background: "var(--accent)",
          color: "#121214",
          zIndex: 25,
        }}
      >
        Load template
      </button>

      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          exerciseView="grouped"
          setExerciseView={() => {}}
          alreadyPicked={entries.map((e) => e.exerciseId)}
          onPick={(ex) => { onAddExercise(ex.id); setOpenExerciseId(ex.id); }}
          onClose={() => setShowPicker(false)}
          doneLabel="Add"
        />
      )}

      {swapExId && (
        <ExercisePicker
          title="Swap exercise"
          exercises={exercises}
          exerciseView="grouped"
          setExerciseView={() => {}}
          alreadyPicked={entries.map((e) => e.exerciseId).filter((id) => id !== swapExId)}
          onPick={(ex) => { onSwapExercise(swapExId, ex.id); setSwapExId(null); }}
          onClose={() => setSwapExId(null)}
        />
      )}

      {showSaveTemplate && (
        <SaveAsTemplateModal
          onClose={() => setShowSaveTemplate(false)}
          onSave={(name) => { onSaveAsTemplate(dateKey, name); setShowSaveTemplate(false); }}
        />
      )}

      {showTemplates && (
        <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--bg)" }}>
          <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
            <IconBtn label="Close" onClick={() => setShowTemplates(false)}><X size={17} /></IconBtn>
            <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>Pull in a template</h3>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 flex flex-col gap-2">
            {templates.length === 0 && (
              <p className="text-[13px]" style={{ color: "var(--text-dim)" }}>
                No templates yet — close this and add exercises directly, or build a template from the Templates tab.
              </p>
            )}
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => { onApplyTemplate(t.id); setShowTemplates(false); }}
                className="w-full text-left card p-4"
              >
                <div className="text-[14px] font-medium" style={{ color: "var(--text)" }}>{t.name}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-dim)" }}>{t.exerciseIds.length} exercises</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
