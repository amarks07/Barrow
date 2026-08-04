import { PreferencesView } from "../../components/preferences/PreferencesView";
import { useAppState } from "../../state/AppStateProvider";

export function PreferencesScreen({ navigation }) {
  const { unit, setUnit, theme, setTheme, workoutView, setWorkoutView, focusSupersetGrouping, setFocusSupersetGrouping } = useAppState();

  return (
    <PreferencesView
      unit={unit}
      onUnitChange={setUnit}
      theme={theme}
      onThemeChange={setTheme}
      workoutView={workoutView}
      onWorkoutViewChange={setWorkoutView}
      focusSupersetGrouping={focusSupersetGrouping}
      onFocusSupersetGroupingChange={setFocusSupersetGrouping}
      onClose={() => navigation.goBack()}
    />
  );
}
