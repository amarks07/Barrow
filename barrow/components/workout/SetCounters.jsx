"use client";

import { useRef, useState } from "react";
import { ConfirmDeleteButton } from "../ui/ConfirmDeleteButton";
import { StrengthFields } from "./StrengthFields";
import { CardioFields } from "./CardioFields";

export function SetCounters({ index, set, unit, isCardio, onUpdate, onRemove }) {
  const [swipeArmed, setSwipeArmed] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const armedTimeout = useRef(null);

  const disarm = () => {
    setSwipeArmed(false);
    if (armedTimeout.current) clearTimeout(armedTimeout.current);
  };

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    // Left swipe, clearly more horizontal than vertical, past a real threshold
    // — so an ordinary vertical scroll never gets mistaken for a swipe.
    const isLeftSwipe = dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5;
    if (!isLeftSwipe) return;

    if (swipeArmed) {
      disarm();
      onRemove();
    } else {
      setSwipeArmed(true);
      if (armedTimeout.current) clearTimeout(armedTimeout.current);
      armedTimeout.current = setTimeout(() => setSwipeArmed(false), 3000);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="mb-3 p-3 rounded-lg transition-colors"
      style={{
        border: `1.5px solid ${swipeArmed ? "var(--danger)" : "var(--line-strong)"}`,
        background: swipeArmed ? "rgba(216,50,47,0.08)" : "transparent",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="display text-[14px] uppercase truncate" style={{ color: swipeArmed ? "var(--danger)" : "var(--text-dim)" }}>
          Set {index + 1}{swipeArmed ? " · swipe again to delete" : ""}
        </div>
        <ConfirmDeleteButton
          onConfirm={onRemove}
          className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full text-center"
        />
      </div>
      <div className="flex flex-col gap-2">
        {isCardio ? <CardioFields set={set} unit={unit} onUpdate={onUpdate} /> : <StrengthFields set={set} unit={unit} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}
