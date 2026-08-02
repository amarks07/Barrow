"use client";

import { useMemo, useState } from "react";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { FAB } from "../ui/FAB";
import { TemplateBuilder } from "./TemplateBuilder";

export function TemplatesView({ templates, exercises, onCreate, onDelete, onOpenTemplate }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-5 pt-1 pb-3">
        <h2 className="display text-[19px]" style={{ color: "var(--text)" }}>Templates</h2>
        <p className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>
          A template is a saved list of exercises — like "Push Day" or "Leg Day" — that you can pull into any workout in one tap instead of re-adding each exercise by hand.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 flex flex-col gap-2" style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
        {templates.length === 0 && (
          <p className="text-[13px] text-center mt-10" style={{ color: "var(--text-dim)" }}>
            No templates yet. Tap + to build one.
          </p>
        )}
        {templates.map((t) => (
          <button key={t.id} onClick={() => onOpenTemplate(t.id)} className="text-left card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[14px] font-medium" style={{ color: "var(--text)" }}>{t.name}</span>
              <ConfirmDeleteIconButton onConfirm={() => onDelete(t.id)} ariaLabel="Delete template" size={14} />
            </div>
            <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
              {t.exerciseIds.map((id) => exMap[id]?.name).filter(Boolean).join(" · ")}
            </div>
          </button>
        ))}
      </div>

      <FAB label="New template" onClick={() => setShowBuilder(true)} />

      {showBuilder && (
        <TemplateBuilder
          exercises={exercises}
          onClose={() => setShowBuilder(false)}
          onSave={(name, ids) => { onCreate(name, ids); setShowBuilder(false); }}
        />
      )}
    </div>
  );
}
