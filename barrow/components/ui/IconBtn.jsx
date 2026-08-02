"use client";

export function IconBtn({ onClick, children, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 flex items-center justify-center active:opacity-40 transition -ml-1"
      style={{ color: "var(--text)" }}
    >
      {children}
    </button>
  );
}
