import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { BUTTON_HEIGHT } from "../../theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ChevronRight, Eye, EyeOff, SlidersHorizontal } from "lucide-react-native";
import {
  exerciseMeta,
  fmtNum,
  formatSetLine,
  getBestSetVolumeSeries,
  getCardioDistanceSeries,
  getEstimatedOneRepMaxSeries,
  getMaxWeightSeries,
  getTotalRepsSeries,
  getTotalSetsSeries,
  getVolumeSeries,
  getWeightPR,
  shortDayLabel,
} from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { StatTile } from "../ui/StatTile";
import { Button } from "../ui/Button";
import { ColorSwitch } from "../ui/ColorSwitch";
import { Dropdown } from "../ui/Dropdown";
import { ExerciseNotesModal } from "../ui/ExerciseNotesModal";
import { EditExerciseFieldsModal } from "../exercises/EditExerciseFieldsModal";
import { VolumeChart } from "./VolumeChart";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function HistoryView({
  exercise,
  workouts,
  unit,
  exerciseNote,
  onChangeExerciseNote,
  onChangeEntryNote,
  onToggleExcluded,
  onSaveFields,
  onBack,
  onOpenFocus,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  // Which (dateKey, workoutId) the notes modal is currently open for, or
  // null when closed — deliberately holds just the identity, not a
  // snapshotted note value, so the modal always reads the live note straight
  // out of `records` below and never goes stale relative to onChangeEntryNote.
  const [notesTarget, setNotesTarget] = useState(null);
  const [showEditFields, setShowEditFields] = useState(false);
  // "all" (the default) shows every logged session regardless of angle;
  // otherwise one of exercise.angles. Local to this view and reset for free
  // on every exercise since HistoryView remounts per exercise.
  const [angleFilter, setAngleFilter] = useState("all");
  // Which per-day metric the strength chart plots — "Volume" (weight × reps,
  // the long-standing default) is one lens on progress, but a lifter adding
  // reps at the same weight or grinding out a heavier single both show
  // nothing on a volume-only chart, so these give alternative angles on the
  // same underlying sets.
  const [strengthMetric, setStrengthMetric] = useState("volume");
  const isSingle = exercise.setFormat === "single";
  // Which analytics apply is driven by which fields the exercise tracks,
  // not by its category or set format — e.g. a "single" custom exercise
  // that tracks weight+reps still gets a PR tile, and an exercise tracking
  // all four gets both charts.
  const showStrength = exercise.fields.includes("weight") && exercise.fields.includes("reps");
  const showCardio = exercise.fields.includes("time") && exercise.fields.includes("speed");
  const distanceLabel = unit === "kg" ? "km" : "mi";

  // When an angle filter is active, drop whole entries (not individual
  // sets — angle is a per-entry choice) that don't match the selected
  // angle, for this exercise only. Everything downstream — the session
  // list below plus the PR/volume/distance stats above it — reads from
  // this instead of the raw `workouts` prop, so the whole view stays in
  // sync with the filter. Left as the original `workouts` reference when
  // there's nothing to filter, so unrelated exercises (and the "all" /
  // no-angles case) render identically to before this filter existed.
  const filteredWorkouts = useMemo(() => {
    if (!exercise.angles || angleFilter === "all") return workouts;
    const out = {};
    Object.entries(workouts).forEach(([dateKey, dayWorkouts]) => {
      out[dateKey] = dayWorkouts.map((w) => ({
        ...w,
        entries: w.entries.filter((e) => e.exerciseId !== exercise.id || (e.angle ?? exercise.angles[0]) === angleFilter),
      }));
    });
    return out;
  }, [workouts, exercise, angleFilter]);

  // A day can hold more than one workout — keep each workout's sets in its
  // own group (rather than flattening them together) so the "Set 1, 2, 3…"
  // numbering and the day's visual layout both reflect separate sessions.
  const records = useMemo(() => {
    const out = [];
    Object.entries(filteredWorkouts).forEach(([dateKey, dayWorkouts]) => {
      const groups = dayWorkouts
        .map((w, i) => {
          const entry = w.entries.find((e) => e.exerciseId === exercise.id);
          return {
            workoutId: w.id,
            name: `Workout ${i + 1}`,
            sets: entry?.sets || [],
            note: entry?.note,
            angle: exercise.angles ? entry?.angle ?? exercise.angles[0] : undefined,
            excluded: entry?.excluded ?? false,
          };
        })
        .filter((g) => g.sets.length > 0);
      if (groups.length) out.push({ dateKey, groups });
    });
    return out.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  }, [filteredWorkouts, exercise]);

  // Looked up fresh on every render (rather than snapshotted into
  // notesTarget) so the modal's day-note field reflects onChangeEntryNote's
  // effect on `workouts` the instant it lands.
  const notesTargetGroup = notesTarget
    ? records.find((r) => r.dateKey === notesTarget.dateKey)?.groups.find((g) => g.workoutId === notesTarget.workoutId)
    : null;

  const strengthMetrics = useMemo(
    () => [
      { value: "volume", label: "Volume", getSeries: getVolumeSeries },
      { value: "maxWeight", label: `Max Weight (${unit})`, getSeries: getMaxWeightSeries },
      { value: "oneRm", label: `Est. 1RM (${unit})`, getSeries: getEstimatedOneRepMaxSeries },
      { value: "bestSetVolume", label: "Best Set Volume", getSeries: getBestSetVolumeSeries },
      { value: "totalReps", label: "Total Reps", getSeries: getTotalRepsSeries },
      { value: "totalSets", label: "Total Sets", getSeries: getTotalSetsSeries },
    ],
    [unit]
  );

  const strengthMetricDef = strengthMetrics.find((m) => m.value === strengthMetric) || strengthMetrics[0];

  const strengthSeries = useMemo(() => {
    if (!showStrength) return [];
    return strengthMetricDef.getSeries(exercise.id, filteredWorkouts, unit);
  }, [filteredWorkouts, exercise, unit, showStrength, strengthMetricDef]);

  const distanceSeries = useMemo(
    () => (showCardio ? getCardioDistanceSeries(exercise.id, filteredWorkouts, unit) : []),
    [filteredWorkouts, exercise, unit, showCardio]
  );

  const weightPR = useMemo(
    () => (showStrength ? getWeightPR(exercise.id, filteredWorkouts, unit) : null),
    [filteredWorkouts, exercise, unit, showStrength]
  );

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
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>{exercise.name}</Text>
          <Text style={{ fontSize: 11, color: tokens.textDim }}>{exerciseMeta(exercise)}</Text>
        </View>
        <IconBtn label="Edit fields" onPress={() => setShowEditFields(true)}>
          <SlidersHorizontal size={17} color={tokens.text} />
        </IconBtn>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 + insets.bottom }}>
        {exercise.angles && (
          <View className="mb-5">
            <ColorSwitch
              value={angleFilter}
              onChange={setAngleFilter}
              options={[{ value: "all", label: "All" }, ...exercise.angles.map((a) => ({ value: a, label: a }))]}
            />
          </View>
        )}
        {weightPR && (
          <View className="flex-row mb-5" style={{ gap: 10 }}>
            <StatTile label="PR Weight" value={`${fmtNum(weightPR.weight)} ${unit}`} />
            <StatTile label="Best Sets @ PR" value={weightPR.sets} />
          </View>
        )}
        {showStrength && (
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Dropdown
                title="Chart metric"
                value={strengthMetric}
                onChange={setStrengthMetric}
                options={strengthMetrics.map(({ value, label }) => ({ value, label }))}
              />
              {strengthSeries.length > 0 && (
                <Text style={{ fontSize: 11, color: tokens.textDim }}>
                  last {strengthSeries.length} session{strengthSeries.length > 1 ? "s" : ""}
                </Text>
              )}
            </View>
            {strengthSeries.length > 0 ? (
              <VolumeChart data={strengthSeries} />
            ) : (
              <Text style={{ fontSize: 12, color: tokens.textDim }}>No data logged for this metric yet.</Text>
            )}
          </View>
        )}
        {distanceSeries.length > 0 && (
          <View className="mb-5">
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-1">
              Distance ({distanceLabel}) · last {distanceSeries.length} session{distanceSeries.length > 1 ? "s" : ""}
            </Text>
            <VolumeChart data={distanceSeries} />
          </View>
        )}
        {records.length === 0 && (
          <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center" }} className="mt-10">
            No sets logged for this exercise yet.
          </Text>
        )}
        {records.map(({ dateKey, groups }) => {
          const dayExcluded = groups.every((g) => g.excluded);
          return (
            <View key={dateKey} className="py-3" style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text style={{ fontSize: 11, fontWeight: "500", color: tokens.textDim }}>{shortDayLabel(dateKey)}</Text>
                <View className="flex-row items-center">
                  {(showStrength || showCardio) && (
                    <Pressable
                      onPress={() => onToggleExcluded(dateKey, !dayExcluded)}
                      accessibilityLabel={dayExcluded ? "Include this day in the progress graph" : "Exclude this day from the progress graph"}
                      hitSlop={8}
                      focusable={false}
                      className="mr-1.5"
                      style={{
                        width: BUTTON_HEIGHT.small,
                        height: BUTTON_HEIGHT.small,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: tokens.lineStrong,
                        backgroundColor: tokens.surface,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {dayExcluded ? <EyeOff size={15} color={tokens.textDim} /> : <Eye size={15} color={tokens.textDim} />}
                    </Pressable>
                  )}
                  {groups.length === 1 && (
                    <Button label="Notes" onPress={() => setNotesTarget({ dateKey, workoutId: groups[0].workoutId })} />
                  )}
                </View>
              </View>
              <View style={{ gap: 12, opacity: dayExcluded ? 0.5 : 1 }}>
                {groups.map((g, gi) => (
                  <Pressable
                    key={g.workoutId}
                    onPress={onOpenFocus ? () => onOpenFocus(dateKey, g.workoutId) : undefined}
                    className="flex-row items-start"
                    style={[
                      { gap: 6 },
                      groups.length > 1 ? { paddingLeft: 8, borderLeftWidth: 1.5, borderLeftColor: tokens.lineStrong } : undefined,
                    ]}
                  >
                    <View className="flex-1">
                      {groups.length > 1 && (
                        <View className="flex-row items-center justify-between mb-1">
                          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 10, textTransform: "uppercase", color: tokens.textDim }}>
                            {g.name}
                          </Text>
                          <Button label="Notes" onPress={() => setNotesTarget({ dateKey, workoutId: g.workoutId })} />
                        </View>
                      )}
                      {g.sets.map((s, i) =>
                        isSingle ? (
                          <View key={s.id} className="py-0.5">
                            <Text style={{ fontSize: 13, color: tokens.text, fontVariant: ["tabular-nums"] }}>
                              {formatSetLine(s, exercise, unit)}
                            </Text>
                          </View>
                        ) : (
                          <View key={s.id} className="flex-row items-center justify-between py-0.5">
                            <View className="flex-row items-center gap-1.5">
                              <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 14, textTransform: "uppercase", color: tokens.textDim }}>
                                Set {i + 1}
                              </Text>
                              {s.warmup && (
                                <View
                                  className="rounded-full px-1.5 py-0.5"
                                  style={{ backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: FONT_DISPLAY,
                                      fontSize: 9,
                                      lineHeight: 9,
                                      textTransform: "uppercase",
                                      includeFontPadding: false,
                                      textAlignVertical: "center",
                                      color: tokens.textDim,
                                    }}
                                  >
                                    Warmup
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize: 13, color: tokens.text, fontVariant: ["tabular-nums"] }}>
                              {formatSetLine(s, exercise, unit)}
                            </Text>
                          </View>
                        )
                      )}
                    </View>
                    {onOpenFocus && <ChevronRight size={15} color={tokens.textDim} style={{ marginTop: 2 }} />}
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {notesTarget && (
        <ExerciseNotesModal
          exerciseName={exercise.name}
          dateKey={notesTarget.dateKey}
          exerciseNote={exerciseNote}
          onChangeExerciseNote={onChangeExerciseNote}
          dayNote={notesTargetGroup?.note}
          onChangeDayNote={(note) => onChangeEntryNote(notesTarget.dateKey, notesTarget.workoutId, note)}
          onClose={() => setNotesTarget(null)}
        />
      )}

      {showEditFields && (
        <EditExerciseFieldsModal
          exercise={exercise}
          workouts={workouts}
          onClose={() => setShowEditFields(false)}
          onSave={(fields, fieldMap) => {
            onSaveFields(fields, fieldMap);
            setShowEditFields(false);
          }}
        />
      )}
    </View>
  );
}
