import { Alert } from "react-native";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { PreferencesView } from "../../components/preferences/PreferencesView";
import { useAppState } from "../../state/AppStateProvider";

// Notifications.requestPermissionsAsync() has no built-in timeout — if the
// native promise never settles, the toggle would otherwise hang forever
// with zero feedback, which is indistinguishable from the OS just not
// showing a dialog because permission was already granted/denied. Racing
// it against a timeout turns that silent hang into a visible, reportable
// error instead.
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
    notificationsEnabled, setNotificationsEnabled,
    plateCalculatorEnabled, setPlateCalculatorEnabled,
    stretchRoutinesEnabled, setStretchRoutinesEnabled,
    workoutTimerEnabled, setWorkoutTimerEnabled,
    workoutTimerAutoOpenSummary, setWorkoutTimerAutoOpenSummary,
    cloudSync,
  } = useAppState();

  // Turning notifications on requests the OS notification permission (on
  // Android 13+, POST_NOTIFICATIONS) the first time — the preference only
  // actually flips to "on" if the user grants it, so the toggle never shows
  // "on" for notifications that can't display, and usePushToken only
  // registers this device for push once this is granted. Logged and
  // alerted on failure (instead of left as an unhandled rejection) so a
  // denied/blocked permission or a native-side hang shows up as something
  // visible and reportable rather than the toggle just silently doing
  // nothing.
  const onNotificationsToggle = async (value) => {
    if (value === "off") {
      setNotificationsEnabled("off");
      return;
    }
    try {
      const settings = await withTimeout(
        Notifications.requestPermissionsAsync(),
        10000,
        "Notifications.requestPermissionsAsync()"
      );
      console.log("Barrow: Notifications.requestPermissionsAsync() resolved with status", settings.status);
      const granted = settings.granted || settings.status === "granted";
      setNotificationsEnabled(granted ? "on" : "off");
      if (!granted) {
        Alert.alert(
          "Notifications blocked",
          "Barrow doesn't have permission to show notifications. Enable it for Barrow in your device's notification settings, then try the toggle again.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open settings", onPress: () => Linking.openSettings().catch((e) => console.error("Barrow: failed to open notification settings", e)) },
          ]
        );
      }
    } catch (e) {
      console.error("Barrow: Notifications.requestPermissionsAsync() failed", e);
      setNotificationsEnabled("off");
      Alert.alert("Couldn't enable notifications", e.message || "Something went wrong requesting notification permission.");
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
      notificationsEnabled={notificationsEnabled}
      onNotificationsToggle={onNotificationsToggle}
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
