import { Alert } from "react-native";
import notifee, { AuthorizationStatus } from "@notifee/react-native";
import { PreferencesView } from "../../components/preferences/PreferencesView";
import { useAppState } from "../../state/AppStateProvider";

// notifee.requestPermission() has no built-in timeout — if the native
// promise never settles (e.g. the RN permission-callback chain misfires),
// the toggle would otherwise hang forever with zero feedback, which is
// indistinguishable from the OS just not showing a dialog because
// permission was already granted/denied. Racing it against a timeout turns
// that silent hang into a visible, reportable error instead.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

export function PreferencesScreen({ navigation }) {
  const {
    unit, setUnit, theme, setTheme, accentColor, setAccentColor, workoutView, setWorkoutView,
    focusSupersetGrouping, setFocusSupersetGrouping,
    focusNotificationEnabled, setFocusNotificationEnabled,
    plateCalculatorEnabled, setPlateCalculatorEnabled,
    stretchRoutinesEnabled, setStretchRoutinesEnabled,
    workoutTimerEnabled, setWorkoutTimerEnabled,
    workoutTimerAutoOpenSummary, setWorkoutTimerAutoOpenSummary,
    cloudSync,
  } = useAppState();

  // Turning the notification on requests Android 13+'s POST_NOTIFICATIONS
  // permission the first time — the preference only actually flips to "on"
  // if the user grants it, so the toggle never shows "on" for a
  // notification that can't display. Logged and alerted on failure (instead
  // of left as an unhandled rejection) so a denied/blocked permission or a
  // native-side hang shows up as something visible and reportable rather
  // than the toggle just silently doing nothing.
  const onFocusNotificationToggle = async (value) => {
    if (value === "off") {
      setFocusNotificationEnabled("off");
      return;
    }
    try {
      const settings = await withTimeout(notifee.requestPermission(), 10000, "notifee.requestPermission()");
      console.log("Barrow: notifee.requestPermission() resolved with authorizationStatus", settings.authorizationStatus);
      const granted = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
      setFocusNotificationEnabled(granted ? "on" : "off");
      if (!granted) {
        Alert.alert(
          "Notifications blocked",
          "Barrow doesn't have permission to show notifications. Enable it for Barrow in your device's notification settings, then try the toggle again.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open settings", onPress: () => notifee.openNotificationSettings().catch((e) => console.error("Barrow: failed to open notification settings", e)) },
          ]
        );
      }
    } catch (e) {
      console.error("Barrow: notifee.requestPermission() failed", e);
      setFocusNotificationEnabled("off");
      Alert.alert("Couldn't enable notification", e.message || "Something went wrong requesting notification permission.");
    }
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
      plateCalculatorEnabled={plateCalculatorEnabled}
      onPlateCalculatorEnabledChange={setPlateCalculatorEnabled}
      stretchRoutinesEnabled={stretchRoutinesEnabled}
      onStretchRoutinesEnabledChange={setStretchRoutinesEnabled}
      workoutTimerEnabled={workoutTimerEnabled}
      onWorkoutTimerEnabledChange={setWorkoutTimerEnabled}
      workoutTimerAutoOpenSummary={workoutTimerAutoOpenSummary}
      onWorkoutTimerAutoOpenSummaryChange={setWorkoutTimerAutoOpenSummary}
      signedIn={!!cloudSync.session}
      biometricEnabled={cloudSync.biometricEnabled}
      onEnableBiometric={cloudSync.enableBiometric}
      onDisableBiometric={cloudSync.disableBiometric}
      onClose={() => navigation.goBack()}
    />
  );
}
