"use client";

import { ConfirmDeleteButton } from "../ui/ConfirmDeleteButton";
import { exerciseMeta } from "../../lib/exercise-meta";

export function ExerciseListRow({ ex, onOpen, onDelete }) {
  return (
    <div className="card p-3 flex items-center justify-between gap-3">
      <button onClick={() => onOpen(ex.id)} className="text-left flex-1 min-w-0">
        <div className="text-[13px] font-medium leading-snug" style={{ color: "var(--text)" }}>{ex.name}</div>
        <div className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>{exerciseMeta(ex)}</div>
      </button>
      {ex.custom && (
        <ConfirmDeleteButton
          onConfirm={() => onDelete(ex.id)}
          stopPropagation
          className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full text-center"
        />
      )}
    </div>
  );
}
