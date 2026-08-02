"use client";

import { Check } from "lucide-react";

export function ExerciseRows({ items, onPick, alreadyPicked }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((ex) => {
        const picked = alreadyPicked.includes(ex.id);
        return (
          <button
            key={ex.id}
            onClick={() => onPick(ex)}
            className="relative text-left p-3"
            style={{
              background: "var(--surface)",
              borderRadius: 10,
              boxShadow: picked
                ? "inset 2px 2px 5px rgba(0,0,0,0.55), inset -1px -1px 2px rgba(255,255,255,0.04), inset 0 0 0 2px var(--accent)"
                : "inset 2px 2px 5px rgba(0,0,0,0.55), inset -1px -1px 2px rgba(255,255,255,0.04)",
              opacity: picked ? 0.7 : 1,
            }}
          >
            <div className="text-[13px] font-medium leading-snug pr-4" style={{ color: "var(--text)" }}>{ex.name}</div>
            <div className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>{ex.category}{ex.custom ? " · custom" : ""}</div>
            {picked && <Check size={13} color="var(--accent)" style={{ position: "absolute", top: 10, right: 10 }} />}
          </button>
        );
      })}
    </div>
  );
}
