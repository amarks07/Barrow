import { useState } from "react";
import { ScrollView, View } from "react-native";
import { toKey } from "@barrow/core";
import { CalendarGrid } from "../../components/calendar/CalendarGrid";
import { StartWorkoutPill } from "../../navigation/StartWorkoutPill";
import { useAppState } from "../../state/AppStateProvider";
import { useTheme } from "../../theme/ThemeProvider";

export function CalendarScreen({ navigation }) {
  const { tokens } = useTheme();
  const { workouts, getOrCreateWorkoutForDate, dayWorkoutsActions } = useAppState();
  const [monthCursor, setMonthCursor] = useState(new Date());

  const openDate = (dateKey) => {
    const workoutId = getOrCreateWorkoutForDate(dateKey);
    navigation.navigate("Day", { dateKey, workoutId });
  };

  // Unlike tapping a calendar day (which resumes that day's existing
  // workout), the pill is an explicit "start a workout" action — it should
  // always create a fresh workout for today, even if one already exists.
  const startNewWorkout = () => {
    const dateKey = toKey(new Date());
    const workoutId = dayWorkoutsActions.createWorkout(dateKey);
    navigation.navigate("Day", { dateKey, workoutId });
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        // Clears the StartWorkoutPill (a small flat 16px above the screen
        // edge — see StartWorkoutPill) plus its own height and a little air.
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 90 }}
      >
        <CalendarGrid monthCursor={monthCursor} setMonthCursor={setMonthCursor} workouts={workouts} onSelectDay={openDate} />
      </ScrollView>
      <StartWorkoutPill onPress={startNewWorkout} />
    </View>
  );
}
