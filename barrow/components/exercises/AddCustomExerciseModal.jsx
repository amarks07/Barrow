"use client";

import { useState } from "react";
import { CATEGORIES } from "../../lib/constants";

export function AddCustomExerciseModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="w-full p-5" style={{ background: "var(--bg)", borderTop: "1.5px solid var(--line)", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <h3 className="display text-[19px] mb-4" style={{ color: "var(--text)" }}>New exercise</h3>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise name" autoFocus
          className="w-full text-[16px] outline-none py-1.5 mb-4"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c} onClick={() => setCategory(c)}
              className="text-[13px]"
              style={{
                color: category === c ? "var(--text)" : "var(--text-dim)",
                fontWeight: category === c ? 600 : 400,
                textDecoration: category === c ? "underline" : "none",
                textUnderlineOffset: "3px",
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-[13px]" style={{ color: "var(--text-dim)" }}>Cancel</button>
          <button
            onClick={() => name.trim() && onSave(name.trim(), category)}
            className="text-[13px] font-semibold"
            style={{ color: "var(--text)" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
