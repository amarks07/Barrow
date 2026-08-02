"use client";

import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";

export function ExerciseTile({ ex, onOpen, onDelete }) {
  return (
    <div className="relative card p-3">
      <button onClick={() => onOpen(ex.id)} className="text-left w-full">
        <div className="text-[13px] font-medium leading-snug pr-4" style={{ color: "var(--text)" }}>{ex.name}</div>
        <div className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>{ex.category}{ex.custom ? " · custom" : ""}</div>
      </button>
      {ex.custom && (
        <ConfirmDeleteIconButton
          onConfirm={() => onDelete(ex.id)}
          ariaLabel="Delete custom exercise"
          className="absolute"
          style={{ top: 8, right: 8 }}
        />
      )}
    </div>
  );
}
