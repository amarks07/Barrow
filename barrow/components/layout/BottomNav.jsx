"use client";

// Bottom chrome for the three top-level tabs: the "Start a workout" pill
// (calendar tab only) and the tab bar itself. Hidden while drilled into a
// day's workout, an exercise's history, or a template's detail.
export function BottomNav({ visible, tabs, activeTab, onChangeTab, showStartWorkout, onStartWorkout }) {
  if (!visible) return null;

  return (
    <>
      {showStartWorkout && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "calc(56px + max(16px, env(safe-area-inset-bottom)))",
            width: "100%",
            maxWidth: 420,
            padding: "0 1.25rem",
            zIndex: 25,
          }}
        >
          <button
            onClick={onStartWorkout}
            className="w-full pill py-3 text-[14px] font-bold"
            style={{ background: "var(--accent)", color: "#121214" }}
          >
            Start a workout
          </button>
        </div>
      )}

      <div
        className="flex items-center justify-around"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 0,
          width: "100%",
          maxWidth: 420,
          background: "var(--bg)",
          borderTop: "1.5px solid var(--line)",
          paddingTop: "1rem",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          zIndex: 30,
        }}
      >
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChangeTab(t.id)}
              className="display text-[13px] uppercase px-2"
              style={{ height: 20, lineHeight: "20px", color: active ? "var(--text)" : "var(--text-dim)", fontWeight: active ? 600 : 400 }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
