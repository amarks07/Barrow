"use client";

import { Settings, User } from "lucide-react";

// Persistent top bar — stays put across every view (calendar, exercises,
// templates, a day's workout, exercise history, template detail). Profile
// sits far left, the wordmark stays visually centered regardless of icon
// sizes on either side, and preferences (gear) sits far right.
export function AppHeader({ profile, onOpenProfile, onOpenPreferences }) {
  return (
    <div
      className="flex-shrink-0 grid items-center px-5"
      style={{
        gridTemplateColumns: "1fr auto 1fr",
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "1rem",
        background: "var(--header-bg)",
        borderBottom: "1.5px solid var(--line)",
      }}
    >
      <button
        onClick={onOpenProfile}
        aria-label="Profile"
        className="justify-self-start flex-shrink-0 flex items-center justify-center active:opacity-60"
        style={{ width: 32, height: 32, borderRadius: 999, background: "var(--surface)", border: "1.5px solid var(--line-strong)", overflow: "hidden" }}
      >
        {profile.pictureUrl ? (
          <img src={profile.pictureUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <User size={16} color="var(--text-dim)" />
        )}
      </button>

      <span className="justify-self-center display text-[22px]" style={{ color: "var(--text)" }}>BARROW</span>

      <button
        onClick={onOpenPreferences}
        aria-label="Preferences"
        className="justify-self-end flex-shrink-0 flex items-center justify-center active:opacity-60"
        style={{ width: 32, height: 32, borderRadius: 999, background: "var(--surface)", border: "1.5px solid var(--line-strong)" }}
      >
        <Settings size={16} color="var(--text-dim)" />
      </button>
    </div>
  );
}
