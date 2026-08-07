import { PreferencesView } from "../../components/preferences/PreferencesView";
import { useAppState } from "../../state/AppStateProvider";

export function PreferencesScreen({ navigation }) {
  const {
    unit, setUnit, theme, setTheme, accentColor, setAccentColor, workoutView, setWorkoutView,
    focusSupersetGrouping, setFocusSupersetGrouping,
    focusNotificationEnabled, setFocusNotificationEnabled,
  } = useAppState();

  // No OS notification tray on web (see focusNotification.web.js), so the
  // toggle just tracks the preference directly with no permission prompt.
  const onFocusNotificationToggle = async (value) => {
    setFocusNotificationEnabled(value);
  };

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
      focusNotificationEnabled={focusNotificationEnabled}
      onFocusNotificationToggle={onFocusNotificationToggle}
      onClose={() => navigation.goBack()}
    />
  );
}
