import { PreferencesView } from "../../components/preferences/PreferencesView";
import { useAppState } from "../../state/AppStateProvider";

export function PreferencesScreen({ navigation }) {
  const {
    unit, setUnit, theme, setTheme, accentColor, setAccentColor, workoutView, setWorkoutView,
    focusSupersetGrouping, setFocusSupersetGrouping,
    plateCalculatorEnabled, setPlateCalculatorEnabled,
    stretchRoutinesEnabled, setStretchRoutinesEnabled,
  } = useAppState();

  return (
    <PreferencesView
      unit={unit}
      onUnitChange={setUnit}
      theme={theme}
      onThemeChange={setTheme}
      accentColor={accentColor}
      onAccentColorChange={setAccentColor}
      workoutView={workoutView}
      onWorkoutViewChange={setWorkoutView}
      focusSupersetGrouping={focusSupersetGrouping}
      onFocusSupersetGroupingChange={setFocusSupersetGrouping}
      plateCalculatorEnabled={plateCalculatorEnabled}
      onPlateCalculatorEnabledChange={setPlateCalculatorEnabled}
      stretchRoutinesEnabled={stretchRoutinesEnabled}
      onStretchRoutinesEnabledChange={setStretchRoutinesEnabled}
      onClose={() => navigation.goBack()}
    />
  );
}
