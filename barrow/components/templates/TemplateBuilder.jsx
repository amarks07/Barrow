"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { ExercisePicker } from "../exercises/ExercisePicker";

export function TemplateBuilder({ exercises, onClose, onSave }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [exerciseView, setExerciseView] = useState("grouped");
  const [showPicker, setShowPicker] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Close" onClick={onClose}><X size={17} /></IconBtn>
        <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>New template</h3>
      </div>
      <div className="px-5 pt-4">
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name (e.g. Push Day)"
          className="w-full text-[16px] outline-none py-1.5 mb-2"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-2 flex flex-col gap-2">
        {picked.map((id) => (
          <div key={id} className="flex items-center justify-between card p-3">
            <span className="text-[14px]" style={{ color: "var(--text)" }}>{exMap[id]?.name}</span>
            <button onClick={() => setPicked(picked.filter((p) => p !== id))} aria-label="Remove from template"><X size={14} color="var(--text-dim)" /></button>
          </div>
        ))}
        {picked.length === 0 && (
          <p className="text-[13px] text-center mt-4" style={{ color: "var(--text-dim)" }}>No exercises added yet.</p>
        )}
      </div>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: "1.5px solid var(--line)" }}>
        <button onClick={() => setShowPicker(true)} className="text-[13px] font-medium" style={{ color: "var(--text-dim)" }}>
          + Add exercise
        </button>
        <button
          onClick={() => name.trim() && picked.length > 0 && onSave(name.trim(), picked)}
          className="text-[13px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          Save template
        </button>
      </div>

      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          exerciseView={exerciseView}
          setExerciseView={setExerciseView}
          alreadyPicked={picked}
          onPick={(ex) => setPicked((p) => (p.includes(ex.id) ? p : [...p, ex.id]))}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
