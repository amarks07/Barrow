"use client";

import { Plus } from "lucide-react";

// A day can have more than one workout — this switches between them and
// adds another. Deleting the active one is up in the header, next to
// "Save as template".
export function WorkoutTabs({ workouts, activeId, onSelect, onCreate }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-5 pt-3 pb-3">
      {workouts.map((w) => {
        const active = w.id === activeId;
        return (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className="flex-shrink-0 display text-[13px] px-3 py-1.5 rounded-full"
            style={{
              background: active ? "var(--accent)" : "var(--surface)",
              color: active ? "#121214" : "var(--text-dim)",
              fontWeight: active ? 700 : 500,
            }}
          >
            {w.name || "Workout"}
          </button>
        );
      })}
      {onCreate && (
        <button
          onClick={onCreate}
          aria-label="Add another workout"
          className="flex-shrink-0 flex items-center justify-center rounded-full active:opacity-60"
          style={{ width: 28, height: 28, background: "var(--surface)", border: "1.5px solid var(--line-strong)", color: "var(--text-dim)" }}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}
