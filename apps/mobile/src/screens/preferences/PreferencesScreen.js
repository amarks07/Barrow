import notifee, { AuthorizationStatus } from "@notifee/react-native";
import { PreferencesView } from "../../components/preferences/PreferencesView";
import { useAppState } from "../../state/AppStateProvider";

export function PreferencesScreen({ navigation }) {
  const {
    unit, setUnit, theme, setTheme, workoutView, setWorkoutView,
    focusSupersetGrouping, setFocusSupersetGrouping,
    focusNotificationEnabled, setFocusNotificationEnabled,
  } = useAppState();

  // Turning the notification on requests Android 13+'s POST_NOTIFICATIONS
  // permission the first time — the preference only actually flips to "on"
  // if the user grants it, so the toggle never shows "on" for a
  // notification that can't display.
  const onFocusNotificationToggle = async (value) => {
    if (value === "off") {
      setFocusNotificationEnabled("off");
      return;
    }
    const settings = await notifee.requestPermission();
    setFocusNotificationEnabled(settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED ? "on" : "off");
  };

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
      focusNotificationEnabled={focusNotificationEnabled}
      onFocusNotificationToggle={onFocusNotificationToggle}
      onClose={() => navigation.goBack()}
    />
  );
}
