"use client";

import { User } from "lucide-react";
import { ColorSwitch } from "../ui/ColorSwitch";

// Persistent top bar — stays put across every view (calendar, exercises,
// templates, a day's workout, exercise history, template detail).
export function AppHeader({ unit, onUnitChange, profile, onOpenProfile }) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-5" style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))", paddingBottom: "1rem" }}>
      <span className="display text-[22px]" style={{ color: "var(--text)" }}>BARROW</span>
      <div className="flex items-center gap-2.5">
        <ColorSwitch value={unit} onChange={onUnitChange} options={[{ value: "lb", label: "LB" }, { value: "kg", label: "KG" }]} />
        <button
          onClick={onOpenProfile}
          aria-label="Profile"
          className="flex-shrink-0 flex items-center justify-center active:opacity-60"
          style={{ width: 32, height: 32, borderRadius: 999, background: "var(--surface)", border: "1.5px solid var(--line-strong)", overflow: "hidden" }}
        >
          {profile.pictureUrl ? (
            <img src={profile.pictureUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <User size={16} color="var(--text-dim)" />
          )}
        </button>
      </div>
    </div>
  );
}
