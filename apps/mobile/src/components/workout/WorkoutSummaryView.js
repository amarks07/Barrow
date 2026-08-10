import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Pencil } from "lucide-react-native";
import { dayLabel } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { WorkoutTabs } from "./WorkoutTabs";
import { WorkoutEntriesRecap } from "./WorkoutEntriesRecap";
import { useTheme } from "../../theme/ThemeProvider";

// Read-only recap of a past day's workout(s) — editing a workout you already
// finished is rare, so this avoids surfacing all the day-of logging controls
// by default. Tapping "Edit" drops into the normal DayView for full control.
export function WorkoutSummaryView({ dateKey, dayWorkouts, activeWorkoutId, exercises, unit, onBack, onSelectWorkout, onEdit }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const workout = dayWorkouts.find((w) => w.id === activeWorkoutId) || dayWorkouts[0];
  const entries = workout ? workout.entries : [];
  // Read-only recap, so the workout-level note still stays behind a tap —
  // per-exercise note toggling lives inside WorkoutEntriesRecap now, this is
  // just the one workout-level note above the entries list.
  const [workoutNoteOpen, setWorkoutNoteOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View
        className="flex-row items-center gap-3 px-5 pt-4"
        style={{ paddingBottom: dayWorkouts.length > 1 ? 0 : 16 }}
      >
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <View className="flex-1">
          <Text style={{ fontSize: 16, fontWeight: "600", color: tokens.text }} numberOfLines={1}>
            {dayLabel(dateKey)}
          </Text>
        </View>
        <Button label="Edit" onPress={onEdit} icon={<Pencil size={12} color={tokens.textDim} />} />
      </View>

      {dayWorkouts.length > 1 && <WorkoutTabs workouts={dayWorkouts} activeId={workout?.id} onSelect={onSelectWorkout} />}

      <View style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }} />

      {workout?.note && (
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
          <Button label="Notes" onPress={() => setWorkoutNoteOpen((cur) => !cur)} />
          {workoutNoteOpen && <Text style={{ fontSize: 12, color: tokens.textDim, marginTop: 8 }}>{workout.note}</Text>}
        </View>
      )}

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 + insets.bottom }}>
        <WorkoutEntriesRecap entries={entries} exercises={exercises} unit={unit} />
      </ScrollView>
    </View>
  );
}
