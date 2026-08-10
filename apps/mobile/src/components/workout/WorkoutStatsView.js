import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Trophy } from "lucide-react-native";
import { dayLabel, fmtNum, getWorkoutStats } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { StatTile } from "../ui/StatTile";
import { Card } from "../ui/Card";
import { WorkoutEntriesRecap } from "./WorkoutEntriesRecap";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// "Xh Ym" / "Ym" — distinct from WorkoutTimerBadge's own formatElapsed
// (which renders a live "m:ss"/"h:mm:ss" countdisplay); a finished
// workout's duration reads better rounded to the minute.
function formatDuration(ms) {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function SectionLabel({ children }) {
  const { tokens } = useTheme();
  return (
    <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
      {children}
    </Text>
  );
}

// The stats-heavy workout recap: opened either via Day view's "Summary"
// button or automatically when "End workout" is confirmed (see
// WorkoutTimerBadge). All the numbers come from getWorkoutStats — this
// component is pure presentation over that one calculation.
export function WorkoutStatsView({ dateKey, dayWorkouts, activeWorkoutId, exercises, workouts, unit, onBack }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const workout = dayWorkouts.find((w) => w.id === activeWorkoutId);
  const entries = workout ? workout.entries : [];

  const stats = useMemo(() => getWorkoutStats(workout, workouts, exercises, unit), [workout, workouts, exercises, unit]);
  const topVolume = stats.exerciseVolumes[0]?.volume || 0;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-4" style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <View className="flex-1">
          <Text style={{ fontSize: 16, fontWeight: "600", color: tokens.text }} numberOfLines={1}>
            Workout Summary
          </Text>
          <Text style={{ fontSize: 11, color: tokens.textDim }} numberOfLines={1}>
            {dayLabel(dateKey)}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 + insets.bottom }}>
        {entries.length === 0 ? (
          <Text style={{ fontSize: 12, color: tokens.textDim }}>No exercises logged for this workout.</Text>
        ) : (
          <>
            <View className="flex-row mb-3" style={{ gap: 10 }}>
              <StatTile label="Duration" value={stats.durationMs != null ? formatDuration(stats.durationMs) : "—"} />
              <StatTile label="Volume" value={`${fmtNum(stats.totalVolume)} ${unit}`} />
              <StatTile label="Sets" value={stats.totalSets} />
            </View>
            <View className="flex-row mb-5" style={{ gap: 10 }}>
              <StatTile label="Reps" value={stats.totalReps} />
              <StatTile label="Exercises" value={stats.exerciseCount} />
              {stats.avgRpe != null && <StatTile label="Avg RPE" value={stats.avgRpe.toFixed(1)} />}
            </View>

            {stats.prs.length > 0 && (
              <View className="mb-5">
                <SectionLabel>New PRs</SectionLabel>
                <View style={{ gap: 8 }}>
                  {stats.prs.map((pr) => (
                    <Card key={pr.exerciseId} style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Trophy size={18} color={tokens.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: tokens.text }} numberOfLines={1}>
                          {pr.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: tokens.textDim }}>
                          {fmtNum(pr.weight)} {unit} × {pr.reps}
                          {pr.priorWeight != null ? ` · prev best ${fmtNum(pr.priorWeight)} ${unit}` : ""}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {stats.exerciseVolumes.length > 0 && (
              <View className="mb-5">
                <SectionLabel>Volume by exercise</SectionLabel>
                <View style={{ gap: 8 }}>
                  {stats.exerciseVolumes.map((ev) => (
                    <Card key={ev.exerciseId} style={{ padding: 0, overflow: "hidden" }}>
                      <View
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${Math.max(4, (ev.volume / topVolume) * 100)}%`,
                          backgroundColor: tokens.accent,
                          opacity: 0.15,
                        }}
                      />
                      <View className="flex-row items-center justify-between px-3 py-2.5">
                        <Text style={{ fontSize: 13, color: tokens.text, flex: 1 }} numberOfLines={1}>
                          {ev.name}
                        </Text>
                        <Text style={{ fontSize: 13, color: tokens.textDim, fontVariant: ["tabular-nums"] }}>
                          {fmtNum(ev.volume)} {unit}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {stats.categoryBreakdown.length > 0 && (
              <View className="mb-5">
                <SectionLabel>Sets by muscle group</SectionLabel>
                <View style={{ gap: 8 }}>
                  {stats.categoryBreakdown.map((c) => (
                    <Card key={c.category} style={{ padding: 12 }}>
                      <View className="flex-row items-center justify-between">
                        <Text style={{ fontSize: 13, color: tokens.text }}>{c.category}</Text>
                        <Text style={{ fontSize: 13, color: tokens.textDim, fontVariant: ["tabular-nums"] }}>{c.sets} sets</Text>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            <View>
              <SectionLabel>Exercises</SectionLabel>
              <WorkoutEntriesRecap entries={entries} exercises={exercises} unit={unit} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
