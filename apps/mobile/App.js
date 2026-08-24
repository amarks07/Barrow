import "./global.css";
import "react-native-url-polyfill/auto";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
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
import { IncomingFriendShareModal } from "./src/components/profile/IncomingFriendShareModal";
import { ConfirmActionModal } from "./src/components/ui/ConfirmActionModal";
import { ErrorModal } from "./src/components/ui/ErrorModal";
import { ProfileOnboardingModal } from "./src/components/profile/ProfileOnboardingModal";
import { PatchNotesModal } from "./src/components/patchnotes/PatchNotesModal";
import { ImportRoutineModal } from "./src/components/routines/ImportRoutineModal";
import { WorkoutTimerBadge } from "./src/components/workout/WorkoutTimerBadge";
import { LastSyncedFooter } from "./src/components/layout/LastSyncedFooter";
import { useFocusNotificationNavigation } from "./src/hooks/useFocusNotificationNavigation";
import { useFocusWidgetDeepLink } from "./src/hooks/useFocusWidgetDeepLink";
import { useShareDeepLink } from "./src/hooks/useShareDeepLink";
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
  const {
    theme, accentColor, cloudSync, focusNotificationEnabled, profile, profileHydrated, updateProfile, activeAccountId,
    exercises, setExercises, routineActions,
  } = useAppState();
  useFocusNotificationNavigation();
  useFocusWidgetDeepLink();
  // A friend/routine QR code scanned by the phone's own camera app (rather
  // than Barrow's in-app scanner) opens the app via a barrow:// link instead
  // of mounting ScanFriendQRModal/ImportRoutineModal directly — those live
  // deep inside Profile > Friends / the Routines tab's local state, not as
  // navigator routes, so the resulting UI renders here instead, same
  // always-on-top pattern as ResetPasswordModal etc. below.
  const [incomingShare, setIncomingShare] = useState(null);
  useShareDeepLink(setIncomingShare);
  const profileOnboarding = useProfileOnboarding(profile, profileHydrated, cloudSync);
  const patchNotes = usePatchNotes();
  return (
    <ThemeProvider theme={theme} accent={accentColor}>
      {/* Navigation and the workout timer badge are scoped to this flex:1
          View rather than directly to ThemeProvider's own flex:1 wrapper, so
          LastSyncedFooter below can sit as a true sibling that reserves its
          own row at the bottom of the screen — this View then gets only the
          space left over, instead of the footer floating on top of (and
          being overlapped by) the tab bar/screen content rendered here. The
          modals grouped in here still use React Native's own <Modal>, which
          presents through a separate native layer above everything
          regardless of where it's declared — nesting them here doesn't
          change that, it's just where they're conditionally mounted. */}
      <View style={{ flex: 1 }}>
        <NavigationContainer
          ref={navigationRef}
          // The cold-start half of the stale-focusPointer guard (see
          // clearStaleFocusPointer) — fires once navigation has actually
          // initialized, which AppStateProvider's AppState listener can't
          // catch on its own since a fresh launch has no prior state to
          // transition from.
          onReady={() => {
            clearStaleFocusPointer(focusNotificationEnabled, activeAccountId).catch((e) =>
              console.error("Barrow: failed to clear stale barrow:focusPointer", e)
            );
          }}
        >
          <RootNavigator />
        </NavigationContainer>
        {cloudSync.recoveryMode && <ResetPasswordModal cloudSync={cloudSync} />}
        {cloudSync.biometricPromptVisible && <BiometricPromptModal cloudSync={cloudSync} />}
        {cloudSync.reauthPromptVisible && <ReauthModal cloudSync={cloudSync} />}
        {cloudSync.accountConflictVisible && (
          <ConfirmActionModal
            title="Data on this device"
            message={`This device has workout data that isn't saved to any account. ${
              cloudSync.conflictAccountEmail ? `Signing in as ${cloudSync.conflictAccountEmail}` : "Signing in"
            } will replace it with that account's own data — or merge the two together instead. Keep this data instead by cancelling and creating an account for it. Either way, this doesn't back anything up to the cloud — it just assigns the data to an account on this device. You can upgrade to premium anytime to back it up.`}
            confirmLabel="Replace"
            cancelLabel="Keep my data"
            extraLabel="Merge"
            onConfirm={() => cloudSync.resolveAccountConflict("replace")}
            onExtra={() => cloudSync.resolveAccountConflict("merge")}
            onClose={() => cloudSync.resolveAccountConflict("cancel")}
          />
        )}
        {profileOnboarding.visible && (
          <ProfileOnboardingModal
            profile={profile}
            onUpdate={updateProfile}
            onClose={profileOnboarding.dismiss}
            onPersistAsked={profileOnboarding.persistAsked}
          />
        )}
        {patchNotes.visible && <PatchNotesModal entry={CURRENT_PATCH_NOTES} onClose={patchNotes.dismiss} />}
        {incomingShare?.type === "friend" &&
          (cloudSync.session ? (
            <IncomingFriendShareModal session={cloudSync.session} data={incomingShare.data} onClose={() => setIncomingShare(null)} />
          ) : (
            <ErrorModal
              title="Sign in required"
              message="Sign in from the Profile tab, then scan that QR code again to add this friend."
              onClose={() => setIncomingShare(null)}
            />
          ))}
        {incomingShare?.type === "routine" && (
          <ImportRoutineModal
            exercises={exercises}
            initialData={incomingShare.data}
            onClose={() => setIncomingShare(null)}
            onImport={(resolved) => {
              if (resolved.newExercises.length > 0) setExercises((prev) => [...prev, ...resolved.newExercises]);
              routineActions.createRoutine(resolved.name, resolved.exerciseIds, resolved.supersets);
              setIncomingShare(null);
            }}
          />
        )}
        <WorkoutTimerBadge />
        <AppStatusBar />
      </View>
      <LastSyncedFooter />
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
