"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

// A title that reads as plain text until tapped, then becomes an editable
// input — an always-on borderless <input> (the workout/template name
// fields) didn't visually read as editable at all.
export function EditableTitle({ value, onChange, placeholder = "", className = "", style }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
        placeholder={placeholder}
        autoFocus
        className={`w-full bg-transparent outline-none ${className}`}
        style={style}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      aria-label="Edit name"
      className={`w-full flex items-center gap-1.5 min-w-0 text-left ${className}`}
      style={style}
    >
      <span className="truncate">{value || placeholder}</span>
      <Pencil size={12} color="var(--text-dim)" style={{ flexShrink: 0 }} />
    </button>
  );
}
