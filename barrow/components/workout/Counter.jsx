"use client";

// Big reps/weight steppers, plus above, minus below.
export function Counter({ label, value, onInc, onDec, onChange, plusButtons }) {
  return (
    <div className="flex items-center gap-3 card" style={{ height: 64, paddingLeft: 8, paddingRight: 8, paddingTop: 0, paddingBottom: 0 }}>
      <button
        onClick={onDec}
        aria-label={`Decrease ${label}`}
        className="flex-shrink-0 flex items-center justify-center text-[24px] leading-none active:opacity-60"
        style={{ width: 44, height: 64, color: "var(--text-dim)" }}
      >
        −
      </button>
      <div className="flex-1 flex flex-col items-center justify-center min-w-0">
        <input
          type="number"
          step="0.5"
          min="0"
          value={value}
          onChange={onChange}
          onFocus={(e) => e.target.select()}
          className="w-full text-center text-[34px] font-bold tabular outline-none bg-transparent"
          style={{ color: "var(--text)", lineHeight: 1 }}
        />
        <div className="display text-[13px]" style={{ color: "var(--text-dim)", lineHeight: 1 }}>{label}</div>
      </div>
      {plusButtons ? (
        <div className="flex-shrink-0" style={{ width: 44, height: 64, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <button
            onClick={plusButtons[0].onClick}
            aria-label={`Increase ${label} by ${plusButtons[0].label}`}
            className="active:opacity-60"
            style={{
              width: 22, height: 31, padding: 0, margin: 0, border: "none", background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, lineHeight: 1, color: "var(--accent)", boxSizing: "border-box",
            }}
          >
            {plusButtons[0].label}
          </button>
          <div style={{ width: 22, height: 1, background: "var(--line-strong)" }} />
          <button
            onClick={plusButtons[1].onClick}
            aria-label={`Increase ${label} by ${plusButtons[1].label}`}
            className="active:opacity-60"
            style={{
              width: 22, height: 32, padding: 0, margin: 0, border: "none", background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, lineHeight: 1, color: "var(--accent)", boxSizing: "border-box",
            }}
          >
            {plusButtons[1].label}
          </button>
        </div>
      ) : (
        <button
          onClick={onInc}
          aria-label={`Increase ${label}`}
          className="flex-shrink-0 flex items-center justify-center text-[24px] leading-none active:opacity-60"
          style={{ width: 44, height: 64, color: "var(--accent)" }}
        >
          +
        </button>
      )}
    </div>
  );
}
