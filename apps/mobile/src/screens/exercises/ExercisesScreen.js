import { useState } from "react";
import { View } from "react-native";
import { ExercisesView } from "../../components/exercises/ExercisesView";
import { useAppState } from "../../state/AppStateProvider";
import { useTheme } from "../../theme/ThemeProvider";

export function ExercisesScreen({ navigation }) {
  const { tokens } = useTheme();
  const { exercises, exerciseActions } = useAppState();
  const [exerciseView, setExerciseView] = useState("grouped");

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ExercisesView
        exercises={exercises}
        exerciseView={exerciseView}
        setExerciseView={setExerciseView}
        onOpenHistory={(exerciseId) => navigation.navigate("History", { exerciseId })}
        onAddCustom={exerciseActions.addCustomExercise}
        onDeleteExercise={exerciseActions.deleteExercise}
      />
    </View>
  );
}
