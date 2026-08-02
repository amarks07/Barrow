"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

// Compact icon-only variant of ConfirmDeleteButton, for tight spots (like
// the exercise grid tile) where a text label wouldn't fit.
export function ConfirmDeleteIconButton({ onConfirm, size = 12, className, style, ariaLabel }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return undefined;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation?.();
        if (confirming) {
          setConfirming(false);
          onConfirm();
        } else {
          setConfirming(true);
        }
      }}
      aria-label={confirming ? "Confirm delete" : ariaLabel}
      className={className}
      style={style}
    >
      <Trash2 size={size} color={confirming ? "var(--danger)" : "var(--text-dim)"} />
    </button>
  );
}
