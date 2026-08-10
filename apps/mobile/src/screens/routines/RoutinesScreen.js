import { View } from "react-native";
import { RoutinesView } from "../../components/routines/RoutinesView";
import { useAppState } from "../../state/AppStateProvider";
import { useTheme } from "../../theme/ThemeProvider";

export function RoutinesScreen({ navigation }) {
  const { tokens } = useTheme();
  const { routines, exercises, setExercises, routineActions, exerciseActions, stretchRoutinesEnabled } = useAppState();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <RoutinesView
        routines={routines}
        exercises={exercises}
        onCreate={routineActions.createRoutine}
        onDelete={routineActions.deleteRoutine}
        onOpenRoutine={(routineId) => navigation.navigate("RoutineDetail", { routineId })}
        onAddCustomExercise={exerciseActions.addCustomExercise}
        stretchRoutinesEnabled={stretchRoutinesEnabled}
        onImportRoutine={({ name, exerciseIds, supersets, newExercises }) => {
          if (newExercises.length > 0) setExercises((prev) => [...prev, ...newExercises]);
          routineActions.createRoutine(name, exerciseIds, supersets);
        }}
      />
    </View>
  );
}
