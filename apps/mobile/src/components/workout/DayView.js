import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ArrowLeft, ChartColumn, Check, ChevronRight, GripVertical, X } from "lucide-react-native";
import {
  convertWeight,
  dayLabel,
  exerciseMeta,
  fmtNum,
  getRecommendation,
  getRepRange,
  runInfo,
} from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { NoteButton, NoteModal } from "../ui/NoteField";
import { Card } from "../ui/Card";
import { ExercisePicker } from "../exercises/ExercisePicker";
import { SetCounters } from "./SetCounters";
import { SingleCounters } from "./SingleCounters";
import { StretchPanel } from "../stretch/StretchPanel";
import { SaveAsRoutineModal } from "./SaveAsRoutineModal";
import { UpdateRoutineModal } from "./UpdateRoutineModal";
import { ExerciseActionsMenu } from "./ExerciseActionsMenu";
import { AngleToggle } from "./AngleToggle";
import { WorkoutTabs } from "./WorkoutTabs";
import { WorkoutTimerControl } from "./WorkoutTimerControl";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

const LONG_PRESS_MS = 350;
const SHIFT_ANIM_MS = 180;
const DROP_AT_END = "__drop-at-end__";

// One exercise row. Split out from DayView's render loop so it can own its
// own Animated.Value for the "make room" slide — that has to be a real
// per-instance hook, and hooks can't be called a variable number of times
// inside a .map() in the parent.
function WorkoutEntryRow({
  entry, ex, isSingle, isOpen, rec, prefill, unit, workoutView, plateCalculatorEnabled, supersetMode, isSelected,
  isDragging, dragOffsetY, shiftY, run, tokens,
  refCallback, gesture, onRowTap, onOpenHistory, onSwap, onRemoveExercise, onSetAngle, onAddSet, onUpdateSet, onRemoveSet, onSetEntryNote,
}) {
  const shiftShared = useSharedValue(0);
  const [noteOpen, setNoteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isStretch = ex.type === "stretch";

  useEffect(() => {
    if (isDragging) return;
    shiftShared.value = withTiming(shiftY, { duration: SHIFT_ANIM_MS });
  }, [shiftY, isDragging, shiftShared]);

  // dragOffsetY is a shared value driven directly from the UI-thread pan
  // worklet (see makeDragGesture) — reading it here keeps the dragged row's
  // position a pure UI-thread computation, so it tracks the finger every
  // frame with no JS round-trip to introduce lag.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isDragging ? dragOffsetY.value : shiftShared.value }],
    zIndex: isDragging ? 10 : 0,
    elevation: isDragging ? 6 : 0,
    opacity: isDragging ? 0.97 : 1,
    backgroundColor: isDragging ? tokens.surface : "transparent",
  }));

  return (
    <Animated.View ref={refCallback} style={animatedStyle}>
      {/* Border and the connecting-line rail are both children of this SAME
          row — not spread across siblings reaching into each other's space
          with negative offsets — so the line is guaranteed to paint on top
          of this row's own border (children always paint after their
          parent's border), and padding lives on the content column so the
          rail (no padding of its own) stretches via flexbox to match the
          content's exact full height. That means top:0/bottom:0 on the rail
          land exactly on this row's own edges — precisely where the
          previous/next row's edges are too — so consecutive segments meet
          with zero gap instead of relying on padding-reaching tricks to
          bridge them. */}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1.5,
          borderTopColor: "transparent",
          borderBottomWidth: 1.5,
          borderBottomColor: tokens.line,
        }}
      >
        <View className="flex-row items-center justify-between gap-2" style={{ flex: 1, paddingTop: 16, paddingBottom: 16 }}>
          <View className="flex-1">
            {supersetMode ? (
              <Pressable onPress={onRowTap} className="flex-row items-center gap-1.5" hitSlop={8}>
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    backgroundColor: isSelected ? tokens.accent : "transparent",
                    borderWidth: 1.5,
                    borderColor: isSelected ? tokens.accent : tokens.lineStrong,
                  }}
                >
                  {isSelected && <Check size={12} color="#121214" />}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    {ex.angles && <Text style={{ fontSize: 11, color: tokens.accent }}>· {entry.angle || ex.angles[0]}</Text>}
                    {!isOpen && isStretch && (
                      <Text style={{ fontSize: 11, color: tokens.textDim }}>
                        · {ex.stretches.length} pose{ex.stretches.length === 1 ? "" : "s"}
                      </Text>
                    )}
                    {!isOpen && !isSingle && !isStretch && entry.sets.length > 0 && (
                      <Text style={{ fontSize: 11, color: tokens.textDim }}>
                        · {entry.sets.length} set{entry.sets.length > 1 ? "s" : ""}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 10, color: tokens.textDim }} numberOfLines={1}>
                    {exerciseMeta(ex)}
                  </Text>
                </View>
              </Pressable>
            ) : (
              // Drag (long-press-and-hold) and tap (expand/open focus) race
              // on this one gesture over the whole row — whichever activates
              // first wins and cancels the other — so a long hold anywhere
              // here starts a drag while a quick tap still opens the row,
              // instead of drag being confined to the tiny grip icon.
              <GestureDetector gesture={gesture}>
                <View className="flex-row items-center gap-1.5">
                  <GripVertical size={14} color={tokens.textDim} />
                  {workoutView !== "focus" && (
                    // Rotating a plain wrapping View instead of the SVG icon
                    // itself — react-native-svg icons don't reliably honor a
                    // `transform` passed straight into their own `style` on
                    // Android (it was rendering blank instead of rotated),
                    // so the transform lives on an ordinary native View one
                    // level up, which does not have that problem.
                    <View
                      key={String(isOpen)}
                      style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
                    >
                      <ChevronRight size={15} color={tokens.textDim} />
                    </View>
                  )}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      {ex.angles && <Text style={{ fontSize: 11, color: tokens.accent }}>· {entry.angle || ex.angles[0]}</Text>}
                      {!isOpen && isStretch && (
                        <Text style={{ fontSize: 11, color: tokens.textDim }}>
                          · {ex.stretches.length} pose{ex.stretches.length === 1 ? "" : "s"}
                        </Text>
                      )}
                      {!isOpen && !isStretch && entry.sets.length > 0 && (
                        <Text style={{ fontSize: 11, color: tokens.textDim }}>
                          · {entry.sets.length} set{entry.sets.length > 1 ? "s" : ""}
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 10, color: tokens.textDim }} numberOfLines={1}>
                      {exerciseMeta(ex)}
                    </Text>
                  </View>
                </View>
              </GestureDetector>
            )}
          </View>

          {!supersetMode && (
            <View className="flex-row items-center gap-1.5">
              <Button label="Actions" onPress={() => setMenuOpen(true)} />
            </View>
          )}
        </View>

        {/* Always reserved at 12px wide (not just for grouped rows) so
            ungrouped and grouped rows still line up their action buttons at
            the same right edge. */}
        <View style={{ position: "relative", width: 12 }}>
          {run.isGrouped && (
            <>
              {!run.isFirst && (
                // top: -1.5, not 0 — the rail is stretched to the row's
                // content box, which sits *inside* the row's own 1.5px
                // border-top (borders are outside a flex child's stretch
                // area), so top: 0 stopped the line right at the edge of
                // that content box, leaving this row's own border-top band
                // uncovered. -1.5 reaches through it to this row's true top
                // edge, where the previous row's bottom segment ends.
                <View style={{ position: "absolute", right: 3, top: -1.5, bottom: "50%", width: 1.5, backgroundColor: tokens.accent }} />
              )}
              {!run.isLast && (
                // bottom: -1.5, not 0, for the same reason: reach through
                // this row's own border-bottom band to its true bottom edge.
                // Deliberately not -3 (reaching into the next row's border-top
                // band too) — each row is its own composited Animated.View,
                // so overflow into a sibling's box gets painted over by that
                // sibling instead of showing through. Each row only ever
                // covers its own border bands; they meet exactly at the
                // shared edge.
                <View style={{ position: "absolute", right: 3, top: "50%", bottom: -1.5, width: 1.5, backgroundColor: tokens.accent }} />
              )}
              <View
                style={{
                  position: "absolute",
                  right: 0.5,
                  top: "50%",
                  marginTop: -3,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: tokens.accent,
                }}
              />
            </>
          )}
        </View>
      </View>

      {noteOpen && (
        <NoteModal
          title={`${ex.name} note`}
          value={entry.note}
          onChange={(note) => onSetEntryNote(entry.exerciseId, note)}
          placeholder="Add exercise note"
          onClose={() => setNoteOpen(false)}
        />
      )}

      {menuOpen && (
        <ExerciseActionsMenu
          title={ex.name}
          onHistory={onOpenHistory}
          onNote={() => setNoteOpen(true)}
          onSwap={onSwap}
          onRemove={onRemoveExercise}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {isOpen && (
        <View className="mt-3">
          {ex.angles && (
            <View className="mb-3 items-end">
              <AngleToggle
                value={entry.angle || ex.angles[0]}
                onChange={(angle) => onSetAngle(entry.exerciseId, angle)}
                options={ex.angles.map((a) => ({ value: a, label: a }))}
              />
            </View>
          )}

          {isStretch ? (
            <StretchPanel ex={ex} />
          ) : isSingle ? (
            <SingleCounters entry={entry} ex={ex} unit={unit} plateCalculatorEnabled={plateCalculatorEnabled} onAddSet={onAddSet} onUpdateSet={onUpdateSet} />
          ) : (
            <>
              {entry.sets.length === 0 && rec && (
                <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-3">
                  Last: {fmtNum(rec.lastWeight)} {unit} × {fmtNum(rec.lastReps)} · {rec.note}
                </Text>
              )}

              {entry.sets.map((set) => (
                <SetCounters
                  key={set.id}
                  sets={entry.sets}
                  set={set}
                  unit={unit}
                  plateCalculatorEnabled={plateCalculatorEnabled}
                  onUpdate={(field, value) => onUpdateSet(entry.exerciseId, set.id, field, value)}
                  onRemove={() => onRemoveSet(entry.exerciseId, set.id)}
                />
              ))}

              <Pressable
                onPress={() => onAddSet(entry.exerciseId, prefill || undefined)}
                className="w-full mt-2 py-2.5 rounded-full items-center"
                style={{ backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
              >
                <Text
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 13,
                    lineHeight: 13,
                    textTransform: "uppercase",
                    includeFontPadding: false,
                    textAlignVertical: "center",
                    color: tokens.textDim,
                  }}
                >
                  {entry.sets.length === 0 && prefill
                    ? `+ Add set · ${fmtNum(prefill.reps)} × ${fmtNum(prefill.weight)} ${unit}`
                    : "+ Add set"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </Animated.View>
  );
}

export function DayView({
  dateKey, dayWorkouts, activeWorkoutId, exercises, routines, unit, workouts,
  onBack, onSelectWorkout, onCreateWorkout, onDeleteWorkout,
  onSetNote, onAddExercise, onRemoveExercise, onSwapExercise,
  onAddSet, onUpdateSet, onRemoveSet, onSetEntryNote, onApplyRoutine, onOpenHistory, onSaveAsRoutine, onUpdateRoutine, onSetAngle,
  onAddCustomExercise, onReorderExercise, onCreateSuperset, onUngroupSuperset, workoutView, plateCalculatorEnabled, onOpenExerciseFocus,
  onOpenSummary,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [showRoutines, setShowRoutines] = useState(false);
  const [showSaveRoutine, setShowSaveRoutine] = useState(false);
  const [showUpdateRoutine, setShowUpdateRoutine] = useState(false);
  const [swapExId, setSwapExId] = useState(null);
  const [workoutNoteOpen, setWorkoutNoteOpen] = useState(false);
  const [openExerciseId, setOpenExerciseId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [supersetsMenuOpen, setSupersetsMenuOpen] = useState(false);
  const [supersetMode, setSupersetMode] = useState(false);
  const [supersetSelection, setSupersetSelection] = useState([]);
  const [removeSupersetMode, setRemoveSupersetMode] = useState(false);
  const rowRefs = useRef({});
  const rowBoundsRef = useRef([]);
  // Live, unanimated, driven directly from the UI thread (see
  // makeDragGesture) — tracks the finger 1:1 every frame with no JS
  // round-trip, so the dragged row feels attached to the touch instead of
  // lagging behind it. Shared by every row in the dragged group (a superset
  // moves as one block).
  const dragOffsetY = useSharedValue(0);

  const workout = dayWorkouts.find((w) => w.id === activeWorkoutId) || dayWorkouts[0];
  const entries = workout ? workout.entries : [];
  const linkedRoutineIds = workout?.routineIds || [];
  const usedRoutine = linkedRoutineIds.length > 0;
  const linkedRoutines = useMemo(
    () => routines.filter((r) => linkedRoutineIds.includes(r.id)),
    [routines, linkedRoutineIds]
  );
  // A routine's own target rep range (set in RoutineDetailView/RoutineBuilder)
  // takes priority over the history-derived range below — first linked
  // routine that defines one for this exercise wins.
  const routineRepRange = (exId) => {
    for (const r of linkedRoutines) {
      const rr = r.repRanges?.[exId];
      if (rr) return rr;
    }
    return null;
  };
  const hasAnyGroup = entries.some((e) => e.supersetId);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  // Group membership only counts entries that actually render — an entry
  // whose exercise was deleted from the library still occupies a slot in
  // `entries` but is skipped below, so without this a lone surviving
  // partner would still show as "grouped" with no visible other half.
  const rowRuns = useMemo(() => {
    const counts = {};
    entries.forEach((e) => {
      if (e.supersetId && exMap[e.exerciseId]) counts[e.supersetId] = (counts[e.supersetId] || 0) + 1;
    });
    return runInfo(entries, (e) => (e.supersetId && exMap[e.exerciseId] && counts[e.supersetId] >= 2 ? e.supersetId : null));
  }, [entries, exMap]);
  const draggingGroupIds = useMemo(() => {
    if (!dragId) return new Set();
    const dragged = entries.find((e) => e.exerciseId === dragId);
    if (dragged?.supersetId) return new Set(entries.filter((e) => e.supersetId === dragged.supersetId).map((e) => e.exerciseId));
    return new Set([dragId]);
  }, [dragId, entries]);

  // Everything below drives the "other rows slide out of the way" illusion:
  // rows stay in their normal flow (nothing is actually reordered until
  // drop), each one just gets a translateY nudge sized to the dragged
  // block's height, in whichever direction closes the gap it would leave
  // once dropped at dragOverId — matching onReorderExercise's actual
  // insert-before-target semantics exactly, so nothing jumps on release.
  const orderedIds = entries.map((e) => e.exerciseId);
  const groupIndices = dragId ? orderedIds.map((id, i) => (draggingGroupIds.has(id) ? i : -1)).filter((i) => i !== -1) : [];
  const groupStart = groupIndices.length ? Math.min(...groupIndices) : -1;
  const groupEnd = groupIndices.length ? Math.max(...groupIndices) : -1;
  // Not a real exerciseId — onReorderExercise treats any unmatched target as
  // "insert at the end" (its own insertAt-not-found fallback), so this just
  // needs to never collide with a real id.
  const overIndex = dragId && dragOverId ? (dragOverId === DROP_AT_END ? entries.length : orderedIds.indexOf(dragOverId)) : -1;
  const blockHeight = dragId
    ? rowBoundsRef.current.filter((r) => draggingGroupIds.has(r.id)).reduce((sum, r) => sum + (r.bottom - r.top), 0)
    : 0;

  const cancelSuperset = () => {
    setSupersetMode(false);
    setSupersetSelection([]);
  };

  const saveSuperset = () => {
    if (supersetSelection.length >= 2) onCreateSuperset(supersetSelection);
    setSupersetMode(false);
    setSupersetSelection([]);
  };

  // Measures every row's on-screen bounds once, at drag start, so the pan
  // gesture's later updates can cheaply look up "which row is my finger
  // over" without re-measuring every frame.
  const captureRowBounds = (onDone) => {
    const ids = entries.map((e) => e.exerciseId);
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

  // A row that's the middle or last member of a superset would let the
  // dragged block land inside that group (splitting it) if used as-is — an
  // id belonging to a group always resolves to that group's first member
  // instead, so the block can only ever land before the whole group, never
  // inside it.
  const snapToDropTarget = (exId) => {
    const entry = entries.find((e) => e.exerciseId === exId);
    if (!entry?.supersetId) return exId;
    const first = entries.find((e) => e.supersetId === entry.supersetId);
    return first ? first.exerciseId : exId;
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

  const handleRowTap = (exId) => {
    if (removeSupersetMode) {
      const entry = entries.find((e) => e.exerciseId === exId);
      if (entry?.supersetId) {
        onUngroupSuperset(entry.supersetId);
        setRemoveSupersetMode(false);
      }
      return;
    }
    if (supersetMode) {
      setSupersetSelection((cur) => (cur.includes(exId) ? cur.filter((id) => id !== exId) : [...cur, exId]));
      return;
    }
    if (workoutView === "focus") onOpenExerciseFocus(exId);
    else setOpenExerciseId((cur) => (cur === exId ? null : exId));
  };

  // JS-thread work the gesture worklets below hand off via runOnJS — state
  // setters, expo-haptics, and View.measure() can't run as UI-thread
  // worklets. Defined fresh each render (closing over current dragId/
  // dragOverId/entries) and reassigned into the gesture on every render;
  // RNGH updates an in-progress gesture's callback references without
  // interrupting it, so this stays correct mid-drag.
  const handleDragStart = (exId) => {
    setDragId(exId);
    setDragOverId(exId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    captureRowBounds(() => {});
  };

  const handleDragUpdate = (absoluteY) => {
    const overId = findRowAtY(absoluteY);
    if (overId) setDragOverId(overId);
  };

  const handleDragEnd = () => {
    if (dragId && dragOverId && dragId !== dragOverId) {
      onReorderExercise(dragId, dragOverId);
    }
    setDragId(null);
    setDragOverId(null);
  };

  // Runs as a UI-thread worklet (no .runOnJS(true) on the whole gesture) so
  // dragOffsetY.value updates every frame with zero JS round-trip — that
  // round-trip, under this screen's already-heavy JS thread, is what made
  // the dragged row lag behind the finger instead of tracking it. Only the
  // bits that genuinely need JS (state, haptics, measure) hop over via
  // runOnJS individually.
  const makeDragGesture = (exId) =>
    Gesture.Pan()
      .enabled(!removeSupersetMode)
      .activateAfterLongPress(LONG_PRESS_MS)
      .onStart(() => {
        dragOffsetY.value = 0;
        runOnJS(handleDragStart)(exId);
      })
      .onUpdate((e) => {
        dragOffsetY.value = e.translationY;
        runOnJS(handleDragUpdate)(e.absoluteY);
      })
      .onEnd(() => {
        dragOffsetY.value = 0;
        runOnJS(handleDragEnd)();
      });

  // Tap races the drag on the same gesture region (see WorkoutEntryRow):
  // whichever recognizes first wins and cancels the other, so a long hold
  // anywhere on the row starts a drag while a quick tap still opens it.
  const makeTapGesture = (exId) =>
    Gesture.Tap().onEnd((_e, success) => {
      if (success) runOnJS(handleRowTap)(exId);
    });

  const makeRowGesture = (exId) => Gesture.Race(makeDragGesture(exId), makeTapGesture(exId));

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
      >
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: tokens.text }} numberOfLines={1}>
            {dayLabel(dateKey)}
          </Text>
        </View>
      </View>

      <WorkoutTabs workouts={dayWorkouts} activeId={workout?.id} onSelect={onSelectWorkout} onCreate={onCreateWorkout} />

      <View style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }} />

      {workout && !supersetMode && !removeSupersetMode && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 4,
          }}
        >
          {supersetsMenuOpen ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
              <Button
                label="Create superset"
                onPress={() => {
                  setSupersetMode(true);
                  setOpenExerciseId(null);
                  setSupersetsMenuOpen(false);
                }}
              />
              <Button
                label="Delete superset"
                disabled={!hasAnyGroup}
                onPress={() => {
                  setRemoveSupersetMode(true);
                  setOpenExerciseId(null);
                  setSupersetsMenuOpen(false);
                }}
              />
              <Button label="Cancel" onPress={() => setSupersetsMenuOpen(false)} />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
                {entries.length > 0 && !usedRoutine && <Button label="Save as routine" onPress={() => setShowSaveRoutine(true)} />}
                {entries.length > 0 && usedRoutine && linkedRoutines.length > 0 && (
                  <Button label="Update routine" onPress={() => setShowUpdateRoutine(true)} />
                )}
                {entries.length >= 2 && (
                  <Button label="Supersets" onPress={() => setSupersetsMenuOpen(true)} />
                )}
                <NoteButton onToggle={() => setWorkoutNoteOpen(true)} label="Notes" />
                {entries.length > 0 && (
                  <Button label="Summary" onPress={() => onOpenSummary(workout.id)} icon={<ChartColumn size={12} color={tokens.textDim} />} />
                )}
              </View>
              {dayWorkouts.length > 1 && (
                <ConfirmDeleteIconButton onConfirm={() => onDeleteWorkout(workout.id)} label="Delete workout" size={18} standardSize />
              )}
            </>
          )}
        </View>
      )}

      {workout && workoutNoteOpen && (
        <NoteModal
          title="Workout note"
          value={workout.note}
          onChange={onSetNote}
          placeholder="Add workout note"
          onClose={() => setWorkoutNoteOpen(false)}
        />
      )}

      {(supersetMode || removeSupersetMode) && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingHorizontal: 20, paddingTop: 8 }}>
          {supersetMode ? (
            <>
              <Text style={{ fontSize: 11, color: tokens.textDim, flex: 1 }}>
                {supersetSelection.length < 2 ? "Select 2+ exercises to group" : `${supersetSelection.length} selected`}
              </Text>
              <Button label="Cancel" onPress={cancelSuperset} />
              <Button label="Save" onPress={saveSuperset} disabled={supersetSelection.length < 2} variant="solid" />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 11, color: tokens.textDim, flex: 1 }}>Tap an exercise in a superset to remove it</Text>
              <Button label="Cancel" onPress={() => setRemoveSupersetMode(false)} />
            </>
          )}
        </View>
      )}

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 88 + insets.bottom }}
      >
        {entries.length === 0 && (
          <Text style={{ fontSize: 12, color: tokens.textDim }} className="py-3">
            Tap "+ Add exercise" below, or "Load routine" to get started.
          </Text>
        )}
        {entries.map((entry, entryIndex) => {
          const ex = exMap[entry.exerciseId];
          if (!ex) return null;
          const isSingle = ex.setFormat === "single";
          const isOpen = workoutView !== "focus" && openExerciseId === entry.exerciseId;
          const lastSet = entry.sets[entry.sets.length - 1];
          const routineRange = routineRepRange(entry.exerciseId);
          const { repLow, repHigh } = routineRange
            ? { repLow: routineRange.min, repHigh: routineRange.max }
            : getRepRange(entry.exerciseId, workouts, workout.id);
          const rec = !isSingle && entry.sets.length === 0 ? getRecommendation(entry.exerciseId, workouts, unit, workout.id, repLow, repHigh) : null;
          // The very first set of an entry is left blank rather than
          // auto-filled from `rec` — only a same-session prior set (lastSet)
          // prefills the next one. `rec` is still computed above so the
          // "Last: ..." reference line in WorkoutEntryRow has something to show.
          const prefill = lastSet
            ? { reps: lastSet.reps, weight: convertWeight(lastSet.weight, lastSet.unit, unit) }
            : null;

          const isDragging = draggingGroupIds.has(entry.exerciseId);
          const isSelected = supersetSelection.includes(entry.exerciseId);
          const run = rowRuns[entryIndex];

          let shiftY = 0;
          if (dragId && !isDragging && overIndex !== -1) {
            if (overIndex > groupEnd) {
              shiftY = entryIndex > groupEnd && entryIndex < overIndex ? -blockHeight : 0;
            } else if (overIndex < groupStart) {
              shiftY = entryIndex >= overIndex && entryIndex < groupStart ? blockHeight : 0;
            }
          }

          return (
            <WorkoutEntryRow
              key={entry.exerciseId}
              entry={entry}
              ex={ex}
              isSingle={isSingle}
              isOpen={isOpen}
              rec={rec}
              prefill={prefill}
              unit={unit}
              workoutView={workoutView}
              plateCalculatorEnabled={plateCalculatorEnabled}
              supersetMode={supersetMode}
              isSelected={isSelected}
              isDragging={isDragging}
              dragOffsetY={dragOffsetY}
              shiftY={shiftY}
              run={run}
              tokens={tokens}
              refCallback={(node) => {
                rowRefs.current[entry.exerciseId] = node;
              }}
              gesture={makeRowGesture(entry.exerciseId)}
              onRowTap={() => handleRowTap(entry.exerciseId)}
              onOpenHistory={() => onOpenHistory(entry.exerciseId)}
              onSwap={() => setSwapExId(entry.exerciseId)}
              onRemoveExercise={() => onRemoveExercise(entry.exerciseId)}
              onUngroupSuperset={() => onUngroupSuperset(entry.supersetId)}
              onSetAngle={onSetAngle}
              onAddSet={onAddSet}
              onUpdateSet={onUpdateSet}
              onRemoveSet={onRemoveSet}
              onSetEntryNote={onSetEntryNote}
            />
          );
        })}

        <Pressable
          onPress={() => setShowPicker(true)}
          className="w-full mt-2 py-2.5 rounded-lg items-center"
          style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: tokens.lineStrong }}
        >
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 13,
              lineHeight: 13,
              textTransform: "uppercase",
              includeFontPadding: false,
              textAlignVertical: "center",
              color: tokens.accent,
            }}
          >
            + Add exercise
          </Text>
        </Pressable>
      </ScrollView>

      <Button
        label="Load routine"
        onPress={() => setShowRoutines(true)}
        variant="solid"
        size="medium"
        style={{ position: "absolute", right: 20, bottom: 20 + insets.bottom, zIndex: 25 }}
      />

      <View style={{ position: "absolute", left: 20, bottom: 20 + insets.bottom, zIndex: 25 }}>
        <WorkoutTimerControl dateKey={dateKey} workoutId={workout?.id} />
      </View>

      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          exerciseView="grouped"
          setExerciseView={() => {}}
          alreadyPicked={entries.map((e) => e.exerciseId)}
          onPick={(ex) => {
            onAddExercise(ex.id);
            setOpenExerciseId(ex.id);
          }}
          onUnpick={(ex) => {
            onRemoveExercise(ex.id);
            setOpenExerciseId((cur) => (cur === ex.id ? null : cur));
          }}
          onClose={() => setShowPicker(false)}
          onAddCustom={onAddCustomExercise}
          doneLabel="Add"
        />
      )}

      {swapExId && (
        <ExercisePicker
          title="Swap exercise"
          exercises={exercises}
          exerciseView="grouped"
          setExerciseView={() => {}}
          alreadyPicked={entries.map((e) => e.exerciseId).filter((id) => id !== swapExId)}
          onPick={(ex) => {
            onSwapExercise(swapExId, ex.id);
            setSwapExId(null);
          }}
          onClose={() => setSwapExId(null)}
          onAddCustom={onAddCustomExercise}
        />
      )}

      {showSaveRoutine && (
        <SaveAsRoutineModal
          onClose={() => setShowSaveRoutine(false)}
          onSave={(name) => {
            onSaveAsRoutine(dateKey, workout.id, name);
            setShowSaveRoutine(false);
          }}
        />
      )}

      {showUpdateRoutine && (
        <UpdateRoutineModal
          routines={linkedRoutines}
          onClose={() => setShowUpdateRoutine(false)}
          onConfirm={(routineId) => {
            onUpdateRoutine(dateKey, workout.id, routineId);
            setShowUpdateRoutine(false);
          }}
        />
      )}

      {showRoutines && (
        <View className="absolute" style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 30, backgroundColor: tokens.bg }}>
          <View
            className="flex-row items-center gap-3 px-5 pt-4 pb-4"
            style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
          >
            <IconBtn label="Close" onPress={() => setShowRoutines(false)}>
              <X size={17} color={tokens.text} />
            </IconBtn>
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Pull in a routine</Text>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 8 }}>
            {routines.length === 0 && (
              <Text style={{ fontSize: 13, color: tokens.textDim }}>
                No routines yet — close this and add exercises directly, or build a routine from the Routines tab.
              </Text>
            )}
            {routines.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  onApplyRoutine(r.id);
                  setShowRoutines(false);
                }}
              >
                <Card style={{ padding: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }}>{r.name}</Text>
                  <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2 }}>{r.exerciseIds.length} exercises</Text>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
