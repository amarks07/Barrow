"use client";

import { useEffect, useRef } from "react";

// A real horizontal carousel between the top-level tabs — native scroll-snap,
// so a swipe tracks your finger continuously and settles with momentum,
// rather than a discrete gesture that hard-cuts to the next tab on release.
// `children` must be exactly one element per entry in `tabs`, in order.
export function TabPager({ tabs, activeTab, onChangeTab, children }) {
  const containerRef = useRef(null);
  const isSyncingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  // Tapping a tab button scrolls the carousel to it. Marked as a
  // programmatic sync so the scroll handler below doesn't fight it by
  // reporting intermediate tabs while the animation is still in flight.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const target = activeIndex * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) <= 2) return undefined;
    isSyncingRef.current = true;
    el.scrollTo({ left: target, behavior: "smooth" });
    const fallback = setTimeout(() => { isSyncingRef.current = false; }, 500);
    return () => clearTimeout(fallback);
  }, [activeIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onScrollEnd = () => { isSyncingRef.current = false; };
    el.addEventListener("scrollend", onScrollEnd);
    return () => el.removeEventListener("scrollend", onScrollEnd);
  }, []);

  // A user-driven swipe updates the active tab once scrolling settles, so
  // the tab bar and the rest of the app (e.g. the "Start a workout" pill)
  // stay in sync with whatever page is actually on screen.
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || isSyncingRef.current) return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const newIndex = Math.round(el.scrollLeft / el.clientWidth);
      const newTab = tabs[newIndex]?.id;
      if (newTab && newTab !== activeTab) onChangeTab(newTab);
    }, 100);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full flex no-scrollbar"
      style={{
        overflowX: "auto",
        overflowY: "hidden",
        scrollSnapType: "x mandatory",
        overscrollBehaviorX: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {children.map((child, i) => (
        <div key={tabs[i]?.id ?? i} className="h-full flex-shrink-0" style={{ width: "100%", scrollSnapAlign: "start" }}>
          {child}
        </div>
      ))}
    </div>
  );
}
