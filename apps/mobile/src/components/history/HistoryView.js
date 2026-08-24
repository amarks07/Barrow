import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { exerciseMeta, fmtNum, formatSetLine, getCardioDistanceSeries, getVolumeSeries, getWeightPR, shortDayLabel } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { StatTile } from "../ui/StatTile";
import { VolumeChart } from "./VolumeChart";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function HistoryView({ exercise, workouts, unit, onBack, onOpenFocus }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const isSingle = exercise.setFormat === "single";
  // Which analytics apply is driven by which fields the exercise tracks,
  // not by its category or set format — e.g. a "single" custom exercise
  // that tracks weight+reps still gets a PR tile, and an exercise tracking
  // all four gets both charts.
  const showStrength = exercise.fields.includes("weight") && exercise.fields.includes("reps");
  const showCardio = exercise.fields.includes("time") && exercise.fields.includes("speed");
  const distanceLabel = unit === "kg" ? "km" : "mi";

  // A day can hold more than one workout — keep each workout's sets in its
  // own group (rather than flattening them together) so the "Set 1, 2, 3…"
  // numbering and the day's visual layout both reflect separate sessions.
  const records = useMemo(() => {
    const out = [];
    Object.entries(workouts).forEach(([dateKey, dayWorkouts]) => {
      const groups = dayWorkouts
        .map((w, i) => ({ workoutId: w.id, name: `Workout ${i + 1}`, sets: w.entries.find((e) => e.exerciseId === exercise.id)?.sets || [] }))
        .filter((g) => g.sets.length > 0);
      if (groups.length) out.push({ dateKey, groups });
    });
    return out.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  }, [workouts, exercise]);

  const volumeSeries = useMemo(
    () => (showStrength ? getVolumeSeries(exercise.id, workouts, unit) : []),
    [workouts, exercise, unit, showStrength]
  );

  const distanceSeries = useMemo(
    () => (showCardio ? getCardioDistanceSeries(exercise.id, workouts, unit) : []),
    [workouts, exercise, unit, showCardio]
  );

  const weightPR = useMemo(
    () => (showStrength ? getWeightPR(exercise.id, workouts, unit) : null),
    [workouts, exercise, unit, showStrength]
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
        <View>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>{exercise.name}</Text>
          <Text style={{ fontSize: 11, color: tokens.textDim }}>{exerciseMeta(exercise)}</Text>
        </View>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 + insets.bottom }}>
        {weightPR && (
          <View className="flex-row mb-5" style={{ gap: 10 }}>
            <StatTile label="PR Weight" value={`${fmtNum(weightPR.weight)} ${unit}`} />
            <StatTile label="Best Sets @ PR" value={weightPR.sets} />
          </View>
        )}
        {volumeSeries.length > 0 && (
          <View className="mb-5">
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-1">
              Volume · last {volumeSeries.length} session{volumeSeries.length > 1 ? "s" : ""}
            </Text>
            <VolumeChart data={volumeSeries} />
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
        {records.map(({ dateKey, groups }) => (
          <View key={dateKey} className="py-3" style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
            <Text style={{ fontSize: 11, fontWeight: "500", color: tokens.textDim }} className="mb-1.5">
              {shortDayLabel(dateKey)}
            </Text>
            <View style={{ gap: 12 }}>
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
                      <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 10, textTransform: "uppercase", color: tokens.textDim }} className="mb-1">
                        {g.name}
                      </Text>
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
        ))}
      </ScrollView>
    </View>
  );
}
