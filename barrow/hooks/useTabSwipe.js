"use client";

import { useRef } from "react";

// Swipe left/right between tabs, only when the bottom nav is actually
// showing (not mid-workout, mid-history, etc). A real horizontal swipe,
// clearly more horizontal than vertical, past a real threshold — so an
// ordinary vertical scroll never gets mistaken for a swipe.
export function useTabSwipe({ enabled, tabs, activeTab, onChangeTab }) {
  const touchStart = useRef({ x: 0, y: 0 });

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e) => {
    if (!enabled) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = tabs.findIndex((tb) => tb.id === activeTab);
    if (dx < 0 && idx < tabs.length - 1) onChangeTab(tabs[idx + 1].id);
    else if (dx > 0 && idx > 0) onChangeTab(tabs[idx - 1].id);
  };

  return { onTouchStart, onTouchEnd };
}
