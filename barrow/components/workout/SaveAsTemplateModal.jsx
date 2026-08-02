"use client";

import { useState } from "react";

export function SaveAsTemplateModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="w-full p-5" style={{ background: "var(--bg)", borderTop: "1.5px solid var(--line)", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <h3 className="display text-[19px] mb-1" style={{ color: "var(--text)" }}>Save as template</h3>
        <p className="text-[12px] mb-4" style={{ color: "var(--text-dim)" }}>Saves today's exercise list so you can pull it into any workout later.</p>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name (e.g. Push Day)" autoFocus
          className="w-full text-[16px] outline-none py-1.5 mb-4"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-[13px]" style={{ color: "var(--text-dim)" }}>Cancel</button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
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
