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
  const canSave = name.trim().length > 0 && picked.length > 0;

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-3 px-5 pt-4 pb-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
        <IconBtn label="Close" onClick={onClose}><X size={17} /></IconBtn>
        <h3 className="display text-[19px] flex-1" style={{ color: "var(--text)" }}>New template</h3>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name (e.g. Push Day)"
          className="w-full text-[16px] outline-none py-1.5 mb-6"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />

        <div className="display text-[13px] mb-2 uppercase" style={{ color: "var(--text-dim)" }}>Exercises</div>

        {picked.length === 0 ? (
          <p className="text-[13px] mb-4" style={{ color: "var(--text-dim)" }}>No exercises yet — tap below to add some.</p>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {picked.map((id) => (
              <div key={id} className="flex items-center justify-between card p-3">
                <span className="text-[14px]" style={{ color: "var(--text)" }}>{exMap[id]?.name}</span>
                <button onClick={() => setPicked(picked.filter((p) => p !== id))} aria-label="Remove from template" className="p-1.5 -m-1.5">
                  <X size={14} color="var(--text-dim)" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-center"
          style={{ color: "var(--accent)", border: "1.5px dashed var(--line-strong)" }}
        >
          + Add exercise
        </button>
      </div>

      <div
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
          zIndex: 31,
        }}
      >
        <button
          onClick={() => canSave && onSave(name.trim(), picked)}
          disabled={!canSave}
          className="w-full pill py-3 text-[14px] font-bold"
          style={{ background: canSave ? "var(--accent)" : "var(--surface)", color: canSave ? "#121214" : "var(--text-dim)" }}
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
          doneLabel="Done"
        />
      )}
    </div>
  );
}
