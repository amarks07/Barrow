"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, GripVertical, X } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { ConfirmDeleteButton } from "../ui/ConfirmDeleteButton";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { EditableTitle } from "../ui/EditableTitle";
import { ExercisePicker } from "../exercises/ExercisePicker";
import { SetCounters } from "./SetCounters";
import { SaveAsTemplateModal } from "./SaveAsTemplateModal";
import { AngleToggle } from "./AngleToggle";
import { WorkoutTabs } from "./WorkoutTabs";
import { dayLabel } from "../../lib/date";
import { convertSpeed, convertWeight, fmtNum } from "../../lib/units";
import { getRecommendation, getRepRange } from "../../lib/analytics";
import { exerciseMeta } from "../../lib/exercise-meta";

const LONG_PRESS_MS = 350;
const MOVE_CANCEL_PX = 10;

export function DayView({
  dateKey, dayWorkouts, activeWorkoutId, exercises, templates, unit, workouts,
  onBack, onSelectWorkout, onCreateWorkout, onDeleteWorkout,
  onRename, onAddExercise, onRemoveExercise, onSwapExercise,
  onAddSet, onUpdateSet, onRemoveSet, onApplyTemplate, onOpenHistory, onSaveAsTemplate, onSetAngle,
  onAddCustomExercise, onReorderExercise,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [swapExId, setSwapExId] = useState(null);
  const [openExerciseId, setOpenExerciseId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const rowRefs = useRef({});
  const longPressTimer = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const didLongPress = useRef(false);
  const suppressClickRef = useRef(false);
  const workout = dayWorkouts.find((w) => w.id === activeWorkoutId) || dayWorkouts[0];
  const entries = workout ? workout.entries : [];
  const usedTemplate = (workout?.templateIds || []).length > 0;
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  const clearLongPressTimer = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const handleRowTouchStart = (e, exId) => {
    if (e.target.closest("button")) return;
    const t = e.touches[0];
    dragStartPos.current = { x: t.clientX, y: t.clientY };
    didLongPress.current = false;
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setDragId(exId);
      setDragOverId(exId);
      if (navigator.vibrate) navigator.vibrate(10);
    }, LONG_PRESS_MS);
  };

  const handleRowTouchMove = (e) => {
    const t = e.touches[0];
    if (!didLongPress.current) {
      const dx = t.clientX - dragStartPos.current.x;
      const dy = t.clientY - dragStartPos.current.y;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearLongPressTimer();
      return;
    }
    const y = t.clientY;
    let overId = null;
    for (const entry of entries) {
      const node = rowRefs.current[entry.exerciseId];
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        overId = entry.exerciseId;
        break;
      }
    }
    if (overId && overId !== dragOverId) setDragOverId(overId);
  };

  const handleRowTouchEnd = () => {
    clearLongPressTimer();
    if (didLongPress.current) {
      suppressClickRef.current = true;
      if (dragId && dragOverId && dragId !== dragOverId) {
        const targetIndex = entries.findIndex((e) => e.exerciseId === dragOverId);
        onReorderExercise(dragId, targetIndex);
      }
    }
    didLongPress.current = false;
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-3 px-5 pt-4 pb-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
        <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
        <div className="flex-1 min-w-0">
          <EditableTitle
            value={workout ? workout.name : "Workout"}
            onChange={onRename}
            className="text-[16px] font-semibold"
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
        {dayWorkouts.length > 1 && workout && (
          <ConfirmDeleteIconButton
            onConfirm={() => onDeleteWorkout(workout.id)}
            ariaLabel="Delete this workout"
            size={16}
            className="flex-shrink-0"
          />
        )}
      </div>

      <WorkoutTabs
        workouts={dayWorkouts}
        activeId={workout?.id}
        onSelect={onSelectWorkout}
        onCreate={onCreateWorkout}
      />

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
          const { repLow, repHigh } = getRepRange(entry.exerciseId, workouts, workout.id);
          const rec = !isCardio && entry.sets.length === 0 ? getRecommendation(entry.exerciseId, workouts, unit, workout.id, repLow, repHigh) : null;
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

          const isDragging = dragId === entry.exerciseId;
          const isDropTarget = dragId && dragOverId === entry.exerciseId && dragId !== entry.exerciseId;

          return (
            <div
              key={entry.exerciseId}
              ref={(node) => { rowRefs.current[entry.exerciseId] = node; }}
              className="py-4"
              style={{
                borderBottom: "1.5px solid var(--line)",
                borderTop: isDropTarget ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                opacity: isDragging ? 0.5 : 1,
                background: isDragging ? "var(--surface)" : "transparent",
              }}
            >
              <div
                onClick={() => {
                  if (suppressClickRef.current) { suppressClickRef.current = false; return; }
                  setOpenExerciseId((cur) => (cur === entry.exerciseId ? null : entry.exerciseId));
                }}
                onTouchStart={(e) => handleRowTouchStart(e, entry.exerciseId)}
                onTouchMove={handleRowTouchMove}
                onTouchEnd={handleRowTouchEnd}
                onTouchCancel={handleRowTouchEnd}
                className="flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <GripVertical size={14} color="var(--text-dim)" style={{ flexShrink: 0 }} />
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
          onAddCustom={onAddCustomExercise}
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
          onAddCustom={onAddCustomExercise}
        />
      )}

      {showSaveTemplate && (
        <SaveAsTemplateModal
          onClose={() => setShowSaveTemplate(false)}
          onSave={(name) => { onSaveAsTemplate(dateKey, workout.id, name); setShowSaveTemplate(false); }}
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
