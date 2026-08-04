"use client";

export function ColorSwitch({ value, options, onChange }) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-full" style={{ background: "var(--surface)", border: "1.5px solid var(--line-strong)" }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className="display text-[14px] uppercase px-3 py-1 rounded-full transition"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#121214" : "var(--text-dim)",
              fontWeight: active ? 700 : 500,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
