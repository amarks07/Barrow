"use client";

import { useState } from "react";
import { ColorSwitch } from "../ui/ColorSwitch";
import { CategoryFilterChips } from "../ui/CategoryFilterChips";
import { FAB } from "../ui/FAB";
import { ExerciseTile } from "./ExerciseTile";
import { ExerciseListRow } from "./ExerciseListRow";
import { AddCustomExerciseModal } from "./AddCustomExerciseModal";
import { CATEGORIES } from "../../lib/constants";

export function ExercisesView({ exercises, exerciseView, setExerciseView, onOpenHistory, onAddCustom, onDeleteExercise, active }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = exercises.filter(
    (e) => e.name.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === "all" || e.category === categoryFilter)
  );
  const grouped = CATEGORIES.map((cat) => ({ cat, items: filtered.filter((e) => e.category === cat) })).filter((g) => g.items.length);

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-5 pt-1 pb-3 flex items-center justify-between">
        <h2 className="display text-[19px]" style={{ color: "var(--text)" }}>Exercises</h2>
        <ColorSwitch value={exerciseView} onChange={setExerciseView} options={[{ value: "grouped", label: "Group" }, { value: "flat", label: "List" }]} />
      </div>
      <div className="px-5 pb-3">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search"
          className="w-full text-[16px] outline-none py-1.5"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
      </div>
      <CategoryFilterChips value={categoryFilter} onChange={setCategoryFilter} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5" style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
        {exerciseView === "flat" ? (
          <div className="flex flex-col gap-2">
            {filtered.map((ex) => (
              <ExerciseListRow key={ex.id} ex={ex} onOpen={onOpenHistory} onDelete={onDeleteExercise} />
            ))}
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.cat} className="mb-5">
              <div className="display text-[13px] mb-1.5 uppercase" style={{ color: "var(--text-dim)" }}>{g.cat}</div>
              <div className="grid grid-cols-2 gap-2">
                {g.items.map((ex) => (
                  <ExerciseTile key={ex.id} ex={ex} onOpen={onOpenHistory} onDelete={onDeleteExercise} />
                ))}
              </div>
            </div>
          ))
        )}
        {filtered.length === 0 && (
          <p className="text-[13px] mt-6 text-center" style={{ color: "var(--text-dim)" }}>
            No exercises match{query ? ` "${query}"` : ""}{categoryFilter !== "all" ? ` in ${categoryFilter}` : ""}.
          </p>
        )}
      </div>

      {active && <FAB label="Add custom exercise" onClick={() => setShowAdd(true)} />}

      {showAdd && (
        <AddCustomExerciseModal
          onClose={() => setShowAdd(false)}
          onSave={(name, category, muscle) => { onAddCustom(name, category, muscle); setShowAdd(false); }}
        />
      )}
    </div>
  );
}
