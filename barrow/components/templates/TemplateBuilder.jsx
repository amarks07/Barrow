"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ExercisePicker } from "../exercises/ExercisePicker";

// Bottom-sheet popup, same shape as AddCustomExerciseModal — a dark backdrop
// with a panel sliding up from the bottom, rather than a full-screen page.
export function TemplateBuilder({ exercises, onClose, onSave }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [exerciseView, setExerciseView] = useState("grouped");
  const [showPicker, setShowPicker] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  const canSave = name.trim().length > 0 && picked.length > 0;

  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div
        className="w-full p-5 flex flex-col"
        style={{
          background: "var(--bg)",
          borderTop: "1.5px solid var(--line)",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
          maxHeight: "80vh",
        }}
      >
        <h3 className="display text-[19px] mb-4" style={{ color: "var(--text)" }}>New template</h3>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name (e.g. Push Day)"
          autoFocus
          className="w-full text-[16px] outline-none py-1.5 mb-4"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />

        <div className="flex-1 overflow-y-auto no-scrollbar mb-4">
          {picked.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text-dim)" }}>No exercises yet — tap "+ Add exercise" below.</p>
          ) : (
            <div className="flex flex-col gap-2">
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
        </div>

        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-center mb-6"
          style={{ color: "var(--accent)", border: "1.5px dashed var(--line-strong)" }}
        >
          + Add exercise
        </button>

        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-[13px]" style={{ color: "var(--text-dim)" }}>Cancel</button>
          <button
            onClick={() => canSave && onSave(name.trim(), picked)}
            disabled={!canSave}
            className="text-[13px] font-semibold"
            style={{ color: canSave ? "var(--text)" : "var(--text-dim)" }}
          >
            Save
          </button>
        </div>
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
