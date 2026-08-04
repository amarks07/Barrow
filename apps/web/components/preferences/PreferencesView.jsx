"use client";

import { ArrowLeft, Check } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { ColorSwitch } from "../ui/ColorSwitch";

const WORKOUT_VIEW_OPTIONS = [
  {
    value: "classic",
    label: "Classic",
    description: "Tap an exercise to expand it in place and log sets right there in the list.",
  },
  {
    value: "focus",
    label: "Focus",
    description: "Tap an exercise to open it full-screen. Swipe or use the arrows to move through the workout one exercise (or superset) at a time.",
  },
];

export function PreferencesView({
  unit, onUnitChange, theme, onThemeChange,
  workoutView, onWorkoutViewChange,
  focusSupersetGrouping, onFocusSupersetGroupingChange,
  onClose,
}) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "var(--bg)", zIndex: 50 }}>
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Close" onClick={onClose}><ArrowLeft size={17} /></IconBtn>
        <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>Preferences</h3>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5">
        <div className="mb-7">
          <div className="display text-[13px] mb-2 uppercase" style={{ color: "var(--text-dim)" }}>Units</div>
          <ColorSwitch value={unit} onChange={onUnitChange} options={[{ value: "lb", label: "LB" }, { value: "kg", label: "KG" }]} />
        </div>

        <div className="mb-7">
          <div className="display text-[13px] mb-2 uppercase" style={{ color: "var(--text-dim)" }}>Appearance</div>
          <ColorSwitch value={theme} onChange={onThemeChange} options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
        </div>

        <div className="mb-7">
          <div className="display text-[13px] mb-2 uppercase" style={{ color: "var(--text-dim)" }}>Workout view</div>
          <div className="flex flex-col gap-2">
            {WORKOUT_VIEW_OPTIONS.map((opt) => {
              const active = workoutView === opt.value;
              return (
                <div
                  key={opt.value}
                  className="card p-3"
                  style={active ? { boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.55), inset -1px -1px 2px rgba(255,255,255,0.04), inset 0 0 0 2px var(--accent)" } : undefined}
                >
                  <button onClick={() => onWorkoutViewChange(opt.value)} className="w-full text-left flex items-start gap-3">
                    <span
                      className="flex items-center justify-center flex-shrink-0 rounded-full"
                      style={{
                        width: 18,
                        height: 18,
                        marginTop: 1,
                        background: active ? "var(--accent)" : "transparent",
                        border: `1.5px solid ${active ? "var(--accent)" : "var(--line-strong)"}`,
                      }}
                    >
                      {active && <Check size={12} color="#121214" />}
                    </span>
                    <span>
                      <div className="text-[14px] font-medium" style={{ color: "var(--text)" }}>{opt.label}</div>
                      <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--text-dim)" }}>{opt.description}</div>
                    </span>
                  </button>

                  {opt.value === "focus" && active && (
                    <div className="mt-3 pt-3" style={{ borderTop: "1.5px solid var(--line)", paddingLeft: 30 }}>
                      <div className="text-[11px] mb-1.5" style={{ color: "var(--text-dim)" }}>
                        Supersets in focus view
                      </div>
                      <ColorSwitch
                        value={focusSupersetGrouping}
                        onChange={onFocusSupersetGroupingChange}
                        options={[{ value: "together", label: "Together" }, { value: "separate", label: "Separate" }]}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
