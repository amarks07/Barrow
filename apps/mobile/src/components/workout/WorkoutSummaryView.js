import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Pencil } from "lucide-react-native";
import { convertSpeed, convertWeight, dayLabel, exerciseMeta, fmtNum, runInfo } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { WorkoutTabs } from "./WorkoutTabs";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Read-only recap of a past day's workout(s) — editing a workout you already
// finished is rare, so this avoids surfacing all the day-of logging controls
// by default. Tapping "Edit" drops into the normal DayView for full control.
// Not a real exerciseId — just a distinct key for the workout-level note
// inside the same "which notes are expanded" set the entries use.
const WORKOUT_NOTE_KEY = "__workout-note__";

export function WorkoutSummaryView({ dateKey, dayWorkouts, activeWorkoutId, exercises, unit, onBack, onSelectWorkout, onEdit }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const workout = dayWorkouts.find((w) => w.id === activeWorkoutId) || dayWorkouts[0];
  const entries = workout ? workout.entries : [];
  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const speedLabel = unit === "kg" ? "km/h" : "mph";
  // Read-only recap, so notes still stay behind a tap — nothing here shows
  // note content until its own button is pressed, same as the editor.
  const [openNotes, setOpenNotes] = useState(() => new Set());
  const toggleNote = (key) =>
    setOpenNotes((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
            {workout ? workout.name : "Workout"}
          </Text>
          <Text style={{ fontSize: 11, color: tokens.textDim }}>{dayLabel(dateKey)}</Text>
        </View>
        <Button label="Edit" onPress={onEdit} icon={<Pencil size={12} color={tokens.textDim} />} />
      </View>

      {workout?.note && (
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
          <Button label="Notes" onPress={() => toggleNote(WORKOUT_NOTE_KEY)} />
          {openNotes.has(WORKOUT_NOTE_KEY) && (
            <Text style={{ fontSize: 12, color: tokens.textDim, marginTop: 8 }}>{workout.note}</Text>
          )}
        </View>
      )}

      {dayWorkouts.length > 1 && <WorkoutTabs workouts={dayWorkouts} activeId={workout?.id} onSelect={onSelectWorkout} />}

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 + insets.bottom }}>
        {entries.length === 0 && <Text style={{ fontSize: 12, color: tokens.textDim }}>No exercises logged for this workout.</Text>}
        {entries.map((entry, entryIndex) => {
          const ex = exMap[entry.exerciseId];
          if (!ex) return null;
          const isCardio = ex.category === "Cardio";
          const run = rowRuns[entryIndex];

          // Fixed offset (not "50%") for the dot: this entry's total height
          // varies with how many sets it has, but the dot always marks the
          // exercise name specifically, so it stays pinned near the top
          // regardless of what's rendered below it.
          const dotOffset = 16 + 8;

          return (
            // Border lives on this same row as the rail below (not a
            // sibling reaching into padding with negative offsets), so the
            // line is guaranteed to paint on top of the border, and the
            // padding lives on the content column so the rail (no padding
            // of its own) stretches via flexbox to exactly match the
            // content's full height, including the variable-length sets
            // list — top:0/bottom:0 then land exactly on this row's real
            // edges, meeting the neighboring row's segments with no gap.
            <View key={entry.exerciseId} style={{ flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
              <View style={{ flex: 1, paddingTop: 16, paddingBottom: 16 }}>
                <View className="flex-row items-center gap-1.5">
                  <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  {ex.angles && <Text style={{ fontSize: 11, color: tokens.accent }}>· {entry.angle || ex.angles[0]}</Text>}
                </View>
                <Text style={{ fontSize: 10, color: tokens.textDim, marginBottom: 8 }} numberOfLines={1}>
                  {exerciseMeta(ex)}
                </Text>

                {entry.note && (
                  <View style={{ marginBottom: 8 }}>
                    <Button label="Notes" onPress={() => toggleNote(entry.exerciseId)} />
                    {openNotes.has(entry.exerciseId) && (
                      <Text style={{ fontSize: 12, color: tokens.textDim, marginTop: 8 }}>{entry.note}</Text>
                    )}
                  </View>
                )}

                {entry.sets.length === 0 ? (
                  <Text style={{ fontSize: 12, color: tokens.textDim }}>{isCardio ? "Not logged" : "No sets logged"}</Text>
                ) : (
                  <View style={{ gap: 4 }}>
                    {entry.sets.map((set, i) => (
                      <View key={set.id} className="flex-row items-center gap-1.5">
                        <Text style={{ fontSize: 13, color: tokens.text }}>
                          {isCardio
                            ? `${fmtNum(set.time)} min @ ${fmtNum(convertSpeed(set.speed, set.unit, unit))} ${speedLabel}`
                            : `Set ${i + 1} · ${fmtNum(convertWeight(set.weight, set.unit, unit))} ${unit} × ${fmtNum(set.reps)} reps`}
                        </Text>
                        {set.warmup && (
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
                    ))}
                  </View>
                )}
              </View>

              {/* Always reserved at 12px wide so ungrouped and grouped rows
                  still line up. */}
              <View style={{ position: "relative", width: 12 }}>
                {run.isGrouped && (
                  <>
                    {!run.isFirst && (
                      <View style={{ position: "absolute", right: 3, top: 0, height: dotOffset, width: 1.5, backgroundColor: tokens.accent }} />
                    )}
                    {!run.isLast && (
                      <View style={{ position: "absolute", right: 3, top: dotOffset, bottom: 0, width: 1.5, backgroundColor: tokens.accent }} />
                    )}
                    <View
                      style={{
                        position: "absolute",
                        right: 0.5,
                        top: dotOffset - 3,
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
          );
        })}
      </ScrollView>
    </View>
  );
}
