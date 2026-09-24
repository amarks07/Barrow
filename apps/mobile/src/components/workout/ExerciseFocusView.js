import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PagerView from "react-native-pager-view";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react-native";
import {
  buildSteps,
  convertWeight,
  fmtNum,
  getPreviousSessionSets,
  getPreviousWarmupSets,
  getRecommendation,
  getRepRange,
} from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { ExerciseNotesModal } from "../ui/ExerciseNotesModal";
import { SetCounters } from "./SetCounters";
import { SingleCounters } from "./SingleCounters";
import { StretchPanel } from "../stretch/StretchPanel";
import { AngleToggle } from "./AngleToggle";
import { WorkoutTimerControl } from "./WorkoutTimerControl";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { BUTTON_HEIGHT } from "../../theme/dimensions";

// Height of the bottom Prev/Next bar below (pt-4 padding + medium button +
// its own bottom padding) — used to float WorkoutTimerControl just above
// it instead of overlapping, without restructuring that bar itself.
const NAV_BAR_HEIGHT = 16 + BUTTON_HEIGHT.medium;

function ExercisePanel({ entry, ex, unit, workouts, workoutId, routineRepRange, plateCalculatorEnabled, onSetAngle, onAddSet, onUpdateSet, onRemoveSet, onSetEntryNote, onOpenHistory, showName, focusSetId, focusField, dateKey, exerciseNotes, onChangeExerciseNote }) {
  const { tokens } = useTheme();
  const [noteOpen, setNoteOpen] = useState(false);
  const isStretch = ex.type === "stretch";
  const isSingle = ex.setFormat === "single";
  const lastSet = entry.sets[entry.sets.length - 1];
  const routineRange = routineRepRange(entry.exerciseId);
  // getRepRange's history-derived range (and its made-up 8-12 fallback when
  // there's no history either) both feed getRecommendation a sane rep
  // ceiling/floor for the progression math below, but only a routine-defined
  // range is an actual target worth showing the user as one.
  const { repLow, repHigh } = routineRange
    ? { repLow: routineRange.min, repHigh: routineRange.max }
    : getRepRange(entry.exerciseId, workouts, workoutId);
  const hasTarget = !!routineRange;
  // Suggested next weight/reps is progression math against a target range,
  // so it's gated on the same routine-defined range as the Target line
  // above rather than showing for every exercise with logged history.
  const rec = !isSingle && entry.sets.length === 0 && hasTarget ? getRecommendation(entry.exerciseId, workouts, unit, workoutId, repLow, repHigh) : null;
  // First set of an entry is left blank rather than auto-filled from `rec`
  // — see DayView's WorkoutEntryRow for the matching comment.
  const prefill = lastSet
    ? { reps: lastSet.reps, weight: convertWeight(lastSet.weight, lastSet.unit, unit) }
    : null;
  const singleSet = isSingle ? entry.sets[0] : null;
  // Previous-session reference lines and the "copy warmups" preset list are
  // only meaningful for the sets-array branch (plain exercises, not single-
  // counter or stretch exercises) — computed here rather than inline in the
  // JSX so the spacing logic below can see all three lines' presence at once.
  const prevSession = !isSingle && !isStretch ? getPreviousSessionSets(entry.exerciseId, workouts, unit, workoutId) : null;
  const prevWarmups = !isSingle && !isStretch ? getPreviousWarmupSets(entry.exerciseId, workouts, unit, workoutId) : [];
  const hasSuggestion = entry.sets.length === 0 && !!rec;
  const copyWarmups = () => prevWarmups.forEach((preset) => onAddSet(entry.exerciseId, preset));

  return (
    <View className="py-4" style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
      {showName && (
        <View className="flex-row items-center justify-between gap-1.5 mb-3">
          <View className="flex-row items-center gap-1.5 flex-1">
            <Text style={{ fontSize: 15, fontWeight: "600", color: tokens.text }} numberOfLines={1}>
              {ex.name}
            </Text>
            {ex.angles && <Text style={{ fontSize: 11, color: tokens.accent }}>· {entry.angle || ex.angles[0]}</Text>}
          </View>
          {/* Only shown here for a superset's multiple panels — a single
              exercise has just one note/history, so these buttons live in
              the header instead (see ExerciseFocusView), next to the back
              button and title that already identify it. */}
          <View className="flex-row items-center gap-2">
            <Button label="History" size="small" onPress={() => onOpenHistory(entry.exerciseId)} />
            <Button label="Notes" size="small" onPress={() => setNoteOpen(true)} />
          </View>
        </View>
      )}

      {noteOpen && (
        <ExerciseNotesModal
          exerciseName={ex.name}
          dateKey={dateKey}
          exerciseNote={exerciseNotes[entry.exerciseId]}
          onChangeExerciseNote={(note) => onChangeExerciseNote(entry.exerciseId, note)}
          dayNote={entry.note}
          onChangeDayNote={(note) => onSetEntryNote(entry.exerciseId, note)}
          onClose={() => setNoteOpen(false)}
        />
      )}

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
        <SingleCounters
          entry={entry}
          ex={ex}
          unit={unit}
          plateCalculatorEnabled={plateCalculatorEnabled}
          onAddSet={onAddSet}
          onUpdateSet={onUpdateSet}
          autoFocusField={singleSet && singleSet.id === focusSetId ? focusField : undefined}
        />
      ) : (
        <>
          {(hasTarget || hasSuggestion || prevSession) && (
            <View className="flex-row items-start justify-between mb-3" style={{ gap: 12 }}>
              <View>
                {hasTarget && (
                  <Text style={{ fontSize: 11, color: tokens.textDim }}>
                    Target: {repLow}–{repHigh} reps
                  </Text>
                )}
                {hasSuggestion && (
                  <Text style={{ fontSize: 11, color: tokens.textDim }}>
                    Suggested: {fmtNum(rec.recWeight)} {unit} × {fmtNum(rec.recReps)} · {rec.note}
                  </Text>
                )}
              </View>

              {prevSession && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 11, color: tokens.textDim, textAlign: "right" }}>
                    Previous 1st set: {fmtNum(prevSession.first.weight)} {unit} × {fmtNum(prevSession.first.reps)}
                  </Text>
                  {prevSession.max && (
                    <Text style={{ fontSize: 11, color: tokens.textDim, textAlign: "right" }}>
                      Previous max set: {fmtNum(prevSession.max.weight)} {unit} × {fmtNum(prevSession.max.reps)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {entry.sets.length === 0 && prevWarmups.length > 0 && (
            <Button label="Copy warmups" size="small" onPress={copyWarmups} style={{ marginBottom: 12 }} />
          )}

          {entry.sets.map((set) => (
            <SetCounters
              key={set.id}
              fields={ex.fields}
              sets={entry.sets}
              set={set}
              unit={unit}
              plateCalculatorEnabled={plateCalculatorEnabled}
              onUpdate={(field, value) => onUpdateSet(entry.exerciseId, set.id, field, value)}
              onRemove={() => onRemoveSet(entry.exerciseId, set.id)}
              autoFocusField={set.id === focusSetId ? focusField : undefined}
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
  );
}

export function ExerciseFocusView({
  dateKey, dayWorkouts, activeWorkoutId, initialExerciseId, exercises, routines, unit, workouts, plateCalculatorEnabled,
  onBack, onSetAngle, onAddSet, onUpdateSet, onRemoveSet, onSetEntryNote, onOpenHistory,
  groupSupersets = true,
  onStepChange,
  focusSetId, focusField,
  exerciseNotes, onChangeExerciseNote,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const workout = dayWorkouts.find((w) => w.id === activeWorkoutId) || dayWorkouts[0];
  const entries = workout ? workout.entries : [];
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  const steps = useMemo(() => buildSteps(entries, groupSupersets), [entries, groupSupersets]);
  // Same priority as DayView: a linked routine's own target rep range for
  // this exercise wins over the history-derived one.
  const linkedRoutineIds = workout?.routineIds || [];
  const routineRepRange = (exId) => {
    for (const rid of linkedRoutineIds) {
      const rr = routines.find((r) => r.id === rid)?.repRanges?.[exId];
      if (rr) return rr;
    }
    return null;
  };

  const initialIndex = Math.max(0, steps.findIndex((step) => step.some((e) => e.exerciseId === initialExerciseId)));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const clampedIndex = Math.min(activeIndex, Math.max(0, steps.length - 1));
  const activeStep = steps[clampedIndex];

  // Lets the screen persist "what's currently open in Focus flow" (the
  // barrow:focusPointer AsyncStorage key the widget/notification read) —
  // fires on mount and on every step change, not just explicit Prev/Next
  // taps, since the pager can also be swiped directly.
  useEffect(() => {
    if (activeStep) onStepChange?.(activeStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id, clampedIndex, activeStep]);

  const goTo = (index) => {
    setActiveIndex(index);
    pagerRef.current?.setPage(index);
  };

  if (!workout || steps.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        <View
          className="flex-row items-center gap-3 px-5 pt-4 pb-4"
          style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
        >
          <IconBtn label="Back" onPress={onBack}>
            <ArrowLeft size={17} color={tokens.text} />
          </IconBtn>
          <Text style={{ fontSize: 19, color: tokens.text }}>
            Workout
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center" }} className="mt-10">
          No exercises left in this workout.
        </Text>
      </View>
    );
  }

  const title = activeStep.map((e) => exMap[e.exerciseId]?.name).filter(Boolean).join(" + ");
  // A superset step holds one note per exercise — each gets its own button
  // in its own panel (see ExercisePanel) instead of one ambiguous button up
  // here. Only a single-exercise step has one unambiguous note to show.
  const primaryEntry = activeStep.length === 1 ? activeStep[0] : null;
  const primaryEx = primaryEntry ? exMap[primaryEntry.exerciseId] : null;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View
        className="flex-row items-center gap-3 px-5 pt-4 pb-4"
        style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
      >
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text style={{ fontSize: 16, fontWeight: "600", color: tokens.text }} numberOfLines={1}>
              {title || "Exercise"}
            </Text>
            {primaryEx?.angles && (
              <Text style={{ fontSize: 11, color: tokens.accent }}>· {primaryEntry.angle || primaryEx.angles[0]}</Text>
            )}
          </View>
          <Text style={{ fontSize: 11, color: tokens.textDim }}>
            {clampedIndex + 1} of {steps.length}
            {activeStep.length > 1 ? " · Superset" : ""}
          </Text>
        </View>
        {primaryEntry && primaryEx && (
          <View className="flex-row items-center gap-2">
            <Button label="History" size="small" onPress={() => onOpenHistory(primaryEntry.exerciseId)} />
            <Button label="Notes" size="small" onPress={() => setNotesOpen(true)} />
          </View>
        )}
      </View>

      {primaryEntry && primaryEx && notesOpen && (
        <ExerciseNotesModal
          exerciseName={primaryEx.name}
          dateKey={dateKey}
          exerciseNote={exerciseNotes[primaryEntry.exerciseId]}
          onChangeExerciseNote={(note) => onChangeExerciseNote(primaryEntry.exerciseId, note)}
          dayNote={primaryEntry.note}
          onChangeDayNote={(note) => onSetEntryNote(primaryEntry.exerciseId, note)}
          onClose={() => setNotesOpen(false)}
        />
      )}

      <PagerView ref={pagerRef} style={{ flex: 1 }} initialPage={clampedIndex} onPageSelected={(e) => setActiveIndex(e.nativeEvent.position)}>
        {steps.map((step, stepIndex) => (
          <KeyboardAwareScrollView
            key={stepIndex}
            bottomOffset={24}
            style={{ paddingHorizontal: 20 }}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 104 + insets.bottom }}
          >
            {step.map((entry) => {
              const ex = exMap[entry.exerciseId];
              if (!ex) return null;
              return (
                <ExercisePanel
                  key={entry.exerciseId}
                  entry={entry}
                  ex={ex}
                  unit={unit}
                  workouts={workouts}
                  workoutId={workout.id}
                  routineRepRange={routineRepRange}
                  plateCalculatorEnabled={plateCalculatorEnabled}
                  onSetAngle={onSetAngle}
                  onAddSet={onAddSet}
                  onUpdateSet={onUpdateSet}
                  onRemoveSet={onRemoveSet}
                  onSetEntryNote={onSetEntryNote}
                  onOpenHistory={onOpenHistory}
                  showName={step.length > 1}
                  focusSetId={focusSetId}
                  focusField={focusField}
                  dateKey={dateKey}
                  exerciseNotes={exerciseNotes}
                  onChangeExerciseNote={onChangeExerciseNote}
                />
              );
            })}
          </KeyboardAwareScrollView>
        ))}
      </PagerView>

      <View
        className="flex-row items-center justify-between px-5 pt-4"
        style={{ backgroundColor: tokens.bg, borderTopWidth: 1.5, borderTopColor: tokens.line, paddingBottom: Math.max(16, insets.bottom) }}
      >
        <Button
          label="Prev"
          onPress={() => goTo(Math.max(0, clampedIndex - 1))}
          disabled={clampedIndex === 0}
          variant="solid"
          size="medium"
          icon={<ChevronLeft size={16} color={clampedIndex === 0 ? tokens.textDim : "#121214"} />}
        />
        <Button
          label="Next"
          onPress={() => goTo(Math.min(steps.length - 1, clampedIndex + 1))}
          disabled={clampedIndex === steps.length - 1}
          variant="solid"
          size="medium"
          trailingIcon={<ChevronRight size={16} color={clampedIndex === steps.length - 1 ? tokens.textDim : "#121214"} />}
        />
      </View>

      <View
        style={{
          position: "absolute",
          left: 20,
          bottom: NAV_BAR_HEIGHT + Math.max(16, insets.bottom) + 12,
          zIndex: 25,
        }}
      >
        <WorkoutTimerControl dateKey={dateKey} workoutId={workout?.id} />
      </View>
    </View>
  );
}
