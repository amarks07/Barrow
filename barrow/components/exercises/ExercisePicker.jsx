"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { ColorSwitch } from "../ui/ColorSwitch";
import { CategoryFilterChips } from "../ui/CategoryFilterChips";
import { FAB } from "../ui/FAB";
import { ExerciseRows } from "./ExerciseRows";
import { AddCustomExerciseModal } from "./AddCustomExerciseModal";
import { CATEGORIES } from "../../lib/constants";

// Used by both the day view (add/swap an exercise) and the template builder.
// `onAddCustom`, when passed, shows a button to define and immediately pick
// a custom exercise without leaving the picker.
export function ExercisePicker({ exercises, exerciseView, setExerciseView, onPick, onClose, onAddCustom, alreadyPicked = [], title = "Choose exercise", doneLabel }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const filtered = exercises.filter(
    (e) => e.name.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === "all" || e.category === categoryFilter)
  );
  const grouped = CATEGORIES.map((cat) => ({ cat, items: filtered.filter((e) => e.category === cat) })).filter((g) => g.items.length);

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Close" onClick={onClose}><X size={17} /></IconBtn>
        <h3 className="display text-[19px] flex-1" style={{ color: "var(--text)" }}>{title}</h3>
        <ColorSwitch value={exerciseView} onChange={setExerciseView} options={[{ value: "grouped", label: "Group" }, { value: "flat", label: "List" }]} />
      </div>
      <div className="px-5 pt-4 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full text-[16px] outline-none py-1.5"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
      </div>
      <CategoryFilterChips value={categoryFilter} onChange={setCategoryFilter} />
      <div
        className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6"
        style={doneLabel ? { paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" } : undefined}
      >
        {exerciseView === "flat" ? (
          <ExerciseRows items={filtered} onPick={onPick} alreadyPicked={alreadyPicked} />
        ) : (
          grouped.map((g) => (
            <div key={g.cat} className="mb-5">
              <div className="display text-[13px] mb-1.5 uppercase" style={{ color: "var(--text-dim)" }}>{g.cat}</div>
              <ExerciseRows items={g.items} onPick={onPick} alreadyPicked={alreadyPicked} />
            </div>
          ))
        )}
        {filtered.length === 0 && (
          <p className="text-[13px] mt-6 text-center" style={{ color: "var(--text-dim)" }}>
            No exercises match{query ? ` "${query}"` : ""}{categoryFilter !== "all" ? ` in ${categoryFilter}` : ""}.
          </p>
        )}
      </div>

      {doneLabel && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 0,
            width: "100%",
            maxWidth: 420,
            padding: "1rem 1.25rem",
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            background: "var(--bg)",
            borderTop: "1.5px solid var(--line)",
            zIndex: 31,
          }}
        >
          <button
            onClick={onClose}
            className="w-full pill py-3 text-[14px] font-bold"
            style={{ background: "var(--accent)", color: "#121214" }}
          >
            {doneLabel}
          </button>
        </div>
      )}

      {onAddCustom && (
        <FAB
          label="Add custom exercise"
          onClick={() => setShowAddCustom(true)}
          bottom={doneLabel ? "calc(5.5rem + env(safe-area-inset-bottom))" : "calc(1.25rem + env(safe-area-inset-bottom))"}
        />
      )}

      {showAddCustom && (
        <AddCustomExerciseModal
          onClose={() => setShowAddCustom(false)}
          onSave={(name, category, muscle) => {
            onPick(onAddCustom(name, category, muscle));
            setShowAddCustom(false);
          }}
        />
      )}
    </div>
  );
}
