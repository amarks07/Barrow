"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

// Compact icon-only variant of ConfirmDeleteButton, for tight spots (like
// the exercise grid tile) where a text label wouldn't fit at rest. Once
// armed it swaps the icon for a small "Delete?" label — the same icon just
// recolored didn't read as "tap again to confirm."
export function ConfirmDeleteIconButton({ onConfirm, size = 12, className = "", style, ariaLabel }) {
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
      className={`flex items-center justify-center whitespace-nowrap ${className}`}
      style={{
        ...style,
        ...(confirming
          ? {
              padding: "3px 8px",
              borderRadius: 999,
              background: "var(--danger)",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 700,
            }
          : {}),
      }}
    >
      {confirming ? "Delete?" : <Trash2 size={size} color="var(--text-dim)" />}
    </button>
  );
}
