"use client";

import { CATEGORIES } from "../../lib/constants";

export function CategoryFilterChips({ value, onChange }) {
  const options = ["All", ...CATEGORIES];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3">
      {options.map((cat) => {
        const val = cat === "All" ? "all" : cat;
        const active = value === val;
        return (
          <button
            key={cat}
            onClick={() => onChange(val)}
            className="flex-shrink-0 display text-[14px] uppercase px-3 py-1.5 rounded-full"
            style={{
              background: active ? "var(--accent)" : "var(--surface)",
              color: active ? "#121214" : "var(--text-dim)",
              fontWeight: active ? 700 : 500,
              boxShadow: active ? "none" : "inset 1px 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
