"use client";

import { useEffect, useState } from "react";

// Two-step delete: first tap arms it (red, "Delete?"), second tap actually
// deletes. Auto-disarms after a few seconds if you don't confirm.
export function ConfirmDeleteButton({ onConfirm, label = "Delete", confirmLabel = "Delete?", stopPropagation, className }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return undefined;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <button
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        if (confirming) {
          setConfirming(false);
          onConfirm();
        } else {
          setConfirming(true);
        }
      }}
      className={className}
      style={{
        background: confirming ? "var(--danger)" : "var(--surface)",
        color: confirming ? "#FFFFFF" : "var(--text-dim)",
        border: confirming ? "1.5px solid var(--danger)" : "1.5px solid var(--line-strong)",
      }}
    >
      {confirming ? confirmLabel : label}
    </button>
  );
}
