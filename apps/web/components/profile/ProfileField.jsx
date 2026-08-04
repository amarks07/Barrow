"use client";

export function ProfileField({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] mb-1" style={{ color: "var(--text-dim)" }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[16px] outline-none py-1.5"
        style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
      />
    </div>
  );
}
