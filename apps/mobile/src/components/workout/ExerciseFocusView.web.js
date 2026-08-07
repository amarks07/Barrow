import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react-native";
import { buildSteps, convertWeight, fmtNum, getRecommendation, getRepRange } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { SetCounters } from "./SetCounters";
import { CardioCounters } from "./CardioCounters";
import { AngleToggle } from "./AngleToggle";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Web has no react-native-pager-view (it imports native-only RN internals
// that don't bundle for web — see PagerViewNativeComponent.ts), so this
// mirrors ExerciseFocusView.js but renders only the active step instead of
// a swipeable pager. Prev/Next already covered step navigation on native;
// here they're the only way to move between steps.
function ExercisePanel({ entry, ex, unit, workouts, workoutId, onSetAngle, onAddSet, onUpdateSet, onRemoveSet, showName, focusSetId, focusField }) {
  const { tokens } = useTheme();
  const isCardio = ex.category === "Cardio";
  const lastSet = entry.sets[entry.sets.length - 1];
  const { repLow, repHigh } = getRepRange(entry.exerciseId, workouts, workoutId);
  const rec = !isCardio && entry.sets.length === 0 ? getRecommendation(entry.exerciseId, workouts, unit, workoutId, repLow, repHigh) : null;
  const prefill = lastSet
    ? { reps: lastSet.reps, weight: convertWeight(lastSet.weight, lastSet.unit, unit) }
    : rec
    ? { reps: rec.recReps, weight: rec.recWeight }
    : null;
  const cardioSet = isCardio ? entry.sets[0] : null;

  return (
    <View className="py-4" style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
      {showName && (
        <View className="flex-row items-center gap-1.5 mb-3">
          <Text style={{ fontSize: 15, fontWeight: "600", color: tokens.text }} numberOfLines={1}>
            {ex.name}
          </Text>
          {ex.angles && <Text style={{ fontSize: 11, color: tokens.accent }}>· {entry.angle || ex.angles[0]}</Text>}
        </View>
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

      {isCardio ? (
        <CardioCounters
          entry={entry}
          unit={unit}
          onAddSet={onAddSet}
          onUpdateSet={onUpdateSet}
          autoFocusField={cardioSet && cardioSet.id === focusSetId ? focusField : undefined}
        />
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
  dayWorkouts, activeWorkoutId, initialExerciseId, exercises, unit, workouts,
  onBack, onSetAngle, onAddSet, onUpdateSet, onRemoveSet,
  groupSupersets = true,
  onStepChange,
  focusSetId, focusField,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const workout = dayWorkouts.find((w) => w.id === activeWorkoutId) || dayWorkouts[0];
  const entries = workout ? workout.entries : [];
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  const steps = useMemo(() => buildSteps(entries, groupSupersets), [entries, groupSupersets]);

  const initialIndex = Math.max(0, steps.findIndex((step) => step.some((e) => e.exerciseId === initialExerciseId)));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const clampedIndex = Math.min(activeIndex, Math.max(0, steps.length - 1));
  const activeStep = steps[clampedIndex];

  useEffect(() => {
    if (activeStep) onStepChange?.(activeStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id, clampedIndex, activeStep]);

  const goTo = (index) => setActiveIndex(index);

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
          <Text style={{ fontSize: 16, fontWeight: "600", color: tokens.text }} numberOfLines={1}>
            {title || "Exercise"}
          </Text>
          <Text style={{ fontSize: 11, color: tokens.textDim }}>
            {clampedIndex + 1} of {steps.length}
            {activeStep.length > 1 ? " · Superset" : ""}
          </Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        key={clampedIndex}
        bottomOffset={24}
        style={{ paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 104 + insets.bottom }}
      >
        {activeStep.map((entry) => {
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
              onSetAngle={onSetAngle}
              onAddSet={onAddSet}
              onUpdateSet={onUpdateSet}
              onRemoveSet={onRemoveSet}
              showName={activeStep.length > 1}
              focusSetId={focusSetId}
              focusField={focusField}
            />
          );
        })}
      </KeyboardAwareScrollView>

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
    </View>
  );
}
