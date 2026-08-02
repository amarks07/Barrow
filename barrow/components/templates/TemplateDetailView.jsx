"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { ExercisePicker } from "../exercises/ExercisePicker";
import { shortDayLabel } from "../../lib/date";
import { exerciseMeta } from "../../lib/exercise-meta";

export function TemplateDetailView({ template, exercises, workouts, onBack, onDelete, onSelectDate, onAddExercise, onRemoveExercise }) {
  const [showPicker, setShowPicker] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  const usedDates = useMemo(() => {
    return Object.entries(workouts)
      .filter(([, w]) => (w.templateIds || []).includes(template.id))
      .map(([dateKey]) => dateKey)
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 5);
  }, [workouts, template]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-3 px-5 pt-4 pb-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
        <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
        <h3 className="display text-[19px] flex-1" style={{ color: "var(--text)" }}>{template.name}</h3>
        <ConfirmDeleteIconButton onConfirm={() => onDelete(template.id)} ariaLabel="Delete template" size={16} />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="display text-[13px] uppercase" style={{ color: "var(--text-dim)" }}>Exercises</div>
          <button onClick={() => setShowPicker(true)} className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>
            + Add exercise
          </button>
        </div>
        {template.exerciseIds.length === 0 ? (
          <p className="text-[13px] mb-6" style={{ color: "var(--text-dim)" }}>No exercises yet — tap "Add exercise" above.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-6">
            {template.exerciseIds.map((id) => exMap[id]).filter(Boolean).map((ex) => (
              <div key={ex.id} className="card p-3 relative">
                <div className="text-[13px] font-medium leading-snug pr-4" style={{ color: "var(--text)" }}>{ex.name}</div>
                <div className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>{exerciseMeta(ex)}</div>
                <button
                  onClick={() => onRemoveExercise(template.id, ex.id)}
                  aria-label={`Remove ${ex.name} from template`}
                  className="absolute"
                  style={{ top: 8, right: 8 }}
                >
                  <X size={13} color="var(--text-dim)" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="display text-[13px] mb-2 uppercase" style={{ color: "var(--text-dim)" }}>Recent uses</div>
        {usedDates.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-dim)" }}>Not used yet — pull it into a workout day to get started.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {usedDates.map((dateKey) => (
              <button key={dateKey} onClick={() => onSelectDate(dateKey)} className="text-left card p-3">
                <span className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{shortDayLabel(dateKey)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <ExercisePicker
          title="Add to template"
          exercises={exercises}
          exerciseView="grouped"
          setExerciseView={() => {}}
          alreadyPicked={template.exerciseIds}
          onPick={(ex) => onAddExercise(template.id, ex.id)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
