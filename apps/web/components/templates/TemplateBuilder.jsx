"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { ExercisePicker } from "../exercises/ExercisePicker";
import { groupContiguous, groupIndexOf, pruneGroups, runInfo } from "../../lib/supersets";

// Bottom-sheet popup, same shape as AddCustomExerciseModal — a dark backdrop
// with a panel sliding up from the bottom, rather than a full-screen page.
export function TemplateBuilder({ exercises, onClose, onSave, onAddCustomExercise }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [supersets, setSupersets] = useState([]);
  const [supersetMode, setSupersetMode] = useState(false);
  const [supersetSelection, setSupersetSelection] = useState([]);
  const [exerciseView, setExerciseView] = useState("grouped");
  const [showPicker, setShowPicker] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  const canSave = name.trim().length > 0 && picked.length > 0;
  const rowRuns = useMemo(() => {
    const groupKey = (id) => {
      const gi = groupIndexOf(supersets, id);
      return gi === -1 ? null : gi;
    };
    return runInfo(picked, groupKey);
  }, [picked, supersets]);

  const removePicked = (id) => {
    const next = picked.filter((p) => p !== id);
    setPicked(next);
    setSupersets((prev) => pruneGroups(prev, next));
  };

  const cancelSuperset = () => {
    setSupersetMode(false);
    setSupersetSelection([]);
  };

  const saveSuperset = () => {
    if (supersetSelection.length >= 2) {
      setPicked((prev) => groupContiguous(prev, supersetSelection, (id) => id));
      setSupersets((prev) => [...prev, supersetSelection]);
    }
    setSupersetMode(false);
    setSupersetSelection([]);
  };

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

        {picked.length >= 2 && (
          <div className="flex items-center justify-end gap-2 mb-2">
            {supersetMode ? (
              <>
                <span className="text-[11px] flex-1" style={{ color: "var(--text-dim)" }}>
                  {supersetSelection.length < 2 ? "Select 2+ exercises to group" : `${supersetSelection.length} selected`}
                </span>
                <button
                  onClick={cancelSuperset}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0"
                  style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveSuperset}
                  disabled={supersetSelection.length < 2}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: supersetSelection.length < 2 ? "var(--surface)" : "var(--accent)",
                    color: supersetSelection.length < 2 ? "var(--text-dim)" : "#121214",
                    border: "1.5px solid var(--line-strong)",
                  }}
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setSupersetMode(true)}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0"
                style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
              >
                Create superset
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar mb-4">
          {picked.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text-dim)" }}>No exercises yet — tap "+ Add exercise" below.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {picked.map((id, i) => {
                const run = rowRuns[i];
                const isSelected = supersetSelection.includes(id);
                return (
                  <div key={id} className="flex">
                    <div
                      onClick={() => {
                        if (!supersetMode) return;
                        setSupersetSelection((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
                      }}
                      className="flex items-center justify-between card p-3 flex-1 min-w-0"
                      style={{ cursor: supersetMode ? "pointer" : "default" }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {supersetMode && (
                          <span
                            className="flex items-center justify-center flex-shrink-0 rounded-full"
                            style={{
                              width: 18,
                              height: 18,
                              background: isSelected ? "var(--accent)" : "transparent",
                              border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--line-strong)"}`,
                            }}
                          >
                            {isSelected && <Check size={12} color="#121214" />}
                          </span>
                        )}
                        <span className="text-[14px] truncate" style={{ color: "var(--text)" }}>{exMap[id]?.name}</span>
                      </div>
                      {!supersetMode && (
                        <button onClick={() => removePicked(id)} aria-label="Remove from template" className="p-1.5 -m-1.5">
                          <X size={14} color="var(--text-dim)" />
                        </button>
                      )}
                    </div>
                    {run.isGrouped && (
                      <div style={{ position: "relative", width: 12, flexShrink: 0 }}>
                        {!run.isFirst && (
                          <div style={{ position: "absolute", right: 3.25, top: -4, bottom: "50%", width: 1.5, background: "var(--accent)" }} />
                        )}
                        {!run.isLast && (
                          <div style={{ position: "absolute", right: 3.25, top: "50%", bottom: -4, width: 1.5, background: "var(--accent)" }} />
                        )}
                        <div style={{ position: "absolute", right: 1, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                      </div>
                    )}
                  </div>
                );
              })}
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
            onClick={() => canSave && onSave(name.trim(), picked, supersets)}
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
          onUnpick={(ex) => removePicked(ex.id)}
          onClose={() => setShowPicker(false)}
          onAddCustom={onAddCustomExercise}
          doneLabel="Done"
        />
      )}
    </div>
  );
}
