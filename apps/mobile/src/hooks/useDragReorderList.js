import { useMemo, useRef, useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const LONG_PRESS_MS = 350;
export const DROP_AT_END = "__drop-at-end__";

// Generic long-press-and-drag reordering for a flat list of ids with
// contiguous-group semantics (a dragged item that belongs to a group moves
// its whole group as one block). Ported from the drag mechanics DayView.js
// built for reordering workout entries — kept here as a standalone hook
// (not a shared refactor of DayView.js, which stays untouched) so any list
// of ids can reuse the same interaction without carrying workout-specific
// concerns like sets/angles.
//
// `groupOf(id)` returns the group's array of member ids if `id` belongs to
// one, or null/undefined otherwise. `onReorder(draggedId, targetId)` is
// called on drop with the same insert-before-target semantics used
// everywhere else in the app (an unmatched targetId means "insert at end").
export function useDragReorderList({ ids, groupOf, onReorder }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const rowRefs = useRef({});
  const rowBoundsRef = useRef([]);
  // Live, unanimated, driven directly from the UI thread — tracks the
  // finger 1:1 every frame with no JS round-trip, so the dragged row feels
  // attached to the touch instead of lagging behind it. Shared by every row
  // in the dragged group (a superset moves as one block).
  const dragOffsetY = useSharedValue(0);

  const draggingGroupIds = useMemo(() => {
    if (!dragId) return new Set();
    const group = groupOf(dragId);
    return new Set(group && group.length >= 2 ? group : [dragId]);
  }, [dragId, groupOf]);

  const groupIndices = dragId ? ids.map((id, i) => (draggingGroupIds.has(id) ? i : -1)).filter((i) => i !== -1) : [];
  const groupStart = groupIndices.length ? Math.min(...groupIndices) : -1;
  const groupEnd = groupIndices.length ? Math.max(...groupIndices) : -1;
  const overIndex = dragId && dragOverId ? (dragOverId === DROP_AT_END ? ids.length : ids.indexOf(dragOverId)) : -1;
  const blockHeight = dragId
    ? rowBoundsRef.current.filter((r) => draggingGroupIds.has(r.id)).reduce((sum, r) => sum + (r.bottom - r.top), 0)
    : 0;

  // Everything below drives the "other rows slide out of the way" illusion:
  // rows stay in their normal flow (nothing is actually reordered until
  // drop), each one just gets a translateY nudge sized to the dragged
  // block's height, in whichever direction closes the gap it would leave
  // once dropped at dragOverId — matching onReorder's actual
  // insert-before-target semantics exactly, so nothing jumps on release.
  const shiftForIndex = (index) => {
    if (!dragId || draggingGroupIds.has(ids[index]) || overIndex === -1) return 0;
    if (overIndex > groupEnd) return index > groupEnd && index < overIndex ? -blockHeight : 0;
    if (overIndex < groupStart) return index >= overIndex && index < groupStart ? blockHeight : 0;
    return 0;
  };

  // Measures every row's on-screen bounds once, at drag start, so the pan
  // gesture's later updates can cheaply look up "which row is my finger
  // over" without re-measuring every frame.
  const captureRowBounds = (onDone) => {
    const results = [];
    let remaining = ids.length;
    if (remaining === 0) {
      rowBoundsRef.current = [];
      onDone();
      return;
    }
    ids.forEach((id) => {
      const node = rowRefs.current[id];
      if (!node || !node.measure) {
        remaining -= 1;
        if (remaining === 0) {
          rowBoundsRef.current = results;
          onDone();
        }
        return;
      }
      node.measure((x, y, width, height, pageX, pageY) => {
        results.push({ id, top: pageY, bottom: pageY + height });
        remaining -= 1;
        if (remaining === 0) {
          rowBoundsRef.current = results;
          onDone();
        }
      });
    });
  };

  // A row that's the middle or last member of a group would let the
  // dragged block land inside that group (splitting it) if used as-is — an
  // id belonging to a group always resolves to that group's first member
  // instead, so the block can only ever land before the whole group, never
  // inside it.
  const snapToDropTarget = (id) => {
    const group = groupOf(id);
    if (!group || group.length < 2) return id;
    const first = ids.find((candidate) => group.includes(candidate));
    return first || id;
  };

  const findRowAtY = (absoluteY) => {
    const bounds = rowBoundsRef.current;
    if (bounds.length === 0) return null;
    const hit = bounds.find((r) => absoluteY >= r.top && absoluteY <= r.bottom);
    if (hit) return snapToDropTarget(hit.id);
    // Below/above every measured row (dragged past the last or first item) —
    // bounds aren't necessarily captured in list order (each row measures
    // asynchronously), so find the true extremes rather than assuming
    // bounds[0]/bounds[bounds.length - 1] are the first/last row.
    const lowest = bounds.reduce((a, b) => (b.bottom > a.bottom ? b : a));
    if (absoluteY > lowest.bottom) return DROP_AT_END;
    const highest = bounds.reduce((a, b) => (b.top < a.top ? b : a));
    if (absoluteY < highest.top) return snapToDropTarget(highest.id);
    return null;
  };

  // JS-thread work the gesture worklets below hand off via runOnJS — state
  // setters, expo-haptics, and View.measure() can't run as UI-thread
  // worklets. Defined fresh each render (closing over current ids) and
  // reassigned into the gesture on every render; RNGH updates an
  // in-progress gesture's callback references without interrupting it, so
  // this stays correct mid-drag.
  const handleDragStart = (id) => {
    setDragId(id);
    setDragOverId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    captureRowBounds(() => {});
  };

  const handleDragUpdate = (absoluteY) => {
    const overId = findRowAtY(absoluteY);
    if (overId) setDragOverId(overId);
  };

  const handleDragEnd = () => {
    if (dragId && dragOverId && dragId !== dragOverId) onReorder(dragId, dragOverId);
    setDragId(null);
    setDragOverId(null);
  };

  // Runs as a UI-thread worklet (no .runOnJS(true) on the whole gesture) so
  // dragOffsetY.value updates every frame with zero JS round-trip. Only the
  // bits that genuinely need JS (state, haptics, measure) hop over via
  // runOnJS individually.
  const makeDragGesture = (id) =>
    Gesture.Pan()
      .activateAfterLongPress(LONG_PRESS_MS)
      .onStart(() => {
        dragOffsetY.value = 0;
        runOnJS(handleDragStart)(id);
      })
      .onUpdate((e) => {
        dragOffsetY.value = e.translationY;
        runOnJS(handleDragUpdate)(e.absoluteY);
      })
      .onEnd(() => {
        dragOffsetY.value = 0;
        runOnJS(handleDragEnd)();
      });

  // Tap can race the drag on the same gesture region so a long hold starts
  // a drag while a quick tap still fires onTap, instead of drag being
  // confined to a tiny grip icon. onTap is optional — pass none to make the
  // row drag-only.
  const makeRowGesture = (id, onTap) => {
    const drag = makeDragGesture(id);
    if (!onTap) return drag;
    const tap = Gesture.Tap().onEnd((_e, success) => {
      if (success) runOnJS(onTap)();
    });
    return Gesture.Race(drag, tap);
  };

  return {
    dragId,
    dragOverId,
    dragOffsetY,
    draggingGroupIds,
    shiftForIndex,
    refCallback: (id) => (node) => {
      rowRefs.current[id] = node;
    },
    makeRowGesture,
  };
}
