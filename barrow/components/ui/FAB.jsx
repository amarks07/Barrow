"use client";

export function FAB({ onClick, label }) {
  // Nav height is deterministic: 1rem top padding + 20px content row +
  // max(1rem, safe-area) bottom padding. FAB sits exactly 1.25rem above
  // that — the same distance it sits from the side of the screen.
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center active:scale-95 transition"
      style={{
        position: "fixed",
        right: "max(1.25rem, calc(50vw - 210px + 1.25rem))",
        bottom: "calc(56px + max(16px, env(safe-area-inset-bottom)))",
        width: 48,
        height: 48,
        borderRadius: 999,
        border: "2px solid rgba(0,0,0,0.3)",
        background: "var(--accent)",
        color: "#121214",
        boxShadow: "3px 3px 0 rgba(0,0,0,0.35)",
        zIndex: 25,
      }}
    >
      <span style={{ fontSize: 24, lineHeight: 1, fontWeight: 500 }}>+</span>
    </button>
  );
}
