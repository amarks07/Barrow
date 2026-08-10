import { View } from "react-native";
import { StretchRoutinesView } from "../../components/stretch/StretchRoutinesView";
import { useAppState } from "../../state/AppStateProvider";
import { useTheme } from "../../theme/ThemeProvider";

export function StretchesScreen() {
  const { tokens } = useTheme();
  const { exercises, exerciseActions } = useAppState();
  const stretchRoutines = exercises.filter((e) => e.type === "stretch");

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <StretchRoutinesView
        stretchRoutines={stretchRoutines}
        onCreate={exerciseActions.addStretchRoutine}
        onUpdate={exerciseActions.updateStretchRoutine}
        onDelete={exerciseActions.deleteExercise}
      />
    </View>
  );
}
