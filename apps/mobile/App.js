import "./global.css";
import "react-native-url-polyfill/auto";
import { useCallback, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import { AppStateProvider, useAppState } from "./src/state/AppStateProvider";
import { ResetPasswordModal } from "./src/components/profile/ResetPasswordModal";
import { BiometricPromptModal } from "./src/components/profile/BiometricPromptModal";
import { ReauthModal } from "./src/components/profile/ReauthModal";
import { ProfileOnboardingModal } from "./src/components/profile/ProfileOnboardingModal";
import { PatchNotesModal } from "./src/components/patchnotes/PatchNotesModal";
import { WorkoutTimerBadge } from "./src/components/workout/WorkoutTimerBadge";
import { useFocusNotificationNavigation } from "./src/hooks/useFocusNotificationNavigation";
import { useFocusWidgetDeepLink } from "./src/hooks/useFocusWidgetDeepLink";
import { useProfileOnboarding } from "./src/hooks/useProfileOnboarding";
import { usePatchNotes } from "./src/hooks/usePatchNotes";
import { clearStaleFocusPointer } from "./src/state/staleFocusPointer";
import { CURRENT_PATCH_NOTES } from "./src/content/patchNotes";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Reads the OS-resolved theme from ThemeProvider's context, since the raw
// AppStateProvider preference can be "system" — StatusBar needs an actual
// light/dark answer.
function AppStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === "dark" ? "light" : "dark"} />;
}

// Reads the persisted theme preference from AppStateProvider once it's
// mounted (ThemeProvider itself is theme-agnostic — it just applies
// whatever token set it's handed). ResetPasswordModal/BiometricPromptModal/
// ReauthModal/ProfileOnboardingModal/PatchNotesModal render here, outside
// RootNavigator, so each appears above whatever screen is on the stack
// whenever its trigger fires (a password-recovery deep link, a first
// sign-in, unlockSync() falling back to ReauthModal, a cold start with
// birthday/gender/height/weight still missing, or a cold start after an
// update that shipped a new patchNotes.js entry) — same always-on-top
// behavior as the web app's z-50 overlay.
function ThemedApp() {
  const { theme, accentColor, cloudSync, focusNotificationEnabled, profile, profileHydrated, updateProfile } =
    useAppState();
  useFocusNotificationNavigation();
  useFocusWidgetDeepLink();
  const profileOnboarding = useProfileOnboarding(profile, profileHydrated);
  const patchNotes = usePatchNotes();
  return (
    <ThemeProvider theme={theme} accent={accentColor}>
      <NavigationContainer
        ref={navigationRef}
        // The cold-start half of the stale-focusPointer guard (see
        // clearStaleFocusPointer) — fires once navigation has actually
        // initialized, which AppStateProvider's AppState listener can't
        // catch on its own since a fresh launch has no prior state to
        // transition from.
        onReady={() => {
          clearStaleFocusPointer(focusNotificationEnabled).catch((e) =>
            console.error("Barrow: failed to clear stale barrow:focusPointer", e)
          );
        }}
      >
        <RootNavigator />
      </NavigationContainer>
      {cloudSync.recoveryMode && <ResetPasswordModal cloudSync={cloudSync} />}
      {cloudSync.biometricPromptVisible && <BiometricPromptModal cloudSync={cloudSync} />}
      {cloudSync.reauthPromptVisible && <ReauthModal cloudSync={cloudSync} />}
      {profileOnboarding.visible && (
        <ProfileOnboardingModal
          profile={profile}
          onUpdate={updateProfile}
          onClose={profileOnboarding.dismiss}
          onPersistAsked={profileOnboarding.persistAsked}
        />
      )}
      {patchNotes.visible && <PatchNotesModal entry={CURRENT_PATCH_NOTES} onClose={patchNotes.dismiss} />}
      <WorkoutTimerBadge />
      <AppStatusBar />
    </ThemeProvider>
  );
}

export default function App() {
  console.log("Barrow DEBUG: App() render start");
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  console.log("Barrow DEBUG: fontsLoaded =", fontsLoaded, "fontError =", fontError);

  const onLayout = useCallback(async () => {
    if (fontsLoaded || fontError) await SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayout();
  }, [onLayout]);

  if (!fontsLoaded && !fontError) {
    console.log("Barrow DEBUG: returning null (waiting on fonts)");
    return null;
  }
  console.log("Barrow DEBUG: proceeding past font gate");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AppStateProvider>
            <ThemedApp />
          </AppStateProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
