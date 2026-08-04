"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

const ICONS = { Flat: Minus, Incline: ArrowUpRight, Decline: ArrowDownRight };

// Compact icon-only bench angle switch — same active/inactive treatment as
// ColorSwitch, just narrower since three text labels ran wide.
export function AngleToggle({ value, options, onChange }) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-full" style={{ background: "var(--surface)", border: "1.5px solid var(--line-strong)" }}>
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = ICONS[opt.value] || Minus;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-label={opt.value}
            aria-pressed={active}
            className="flex items-center justify-center rounded-full transition"
            style={{
              width: 26,
              height: 26,
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#121214" : "var(--text-dim)",
            }}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}
