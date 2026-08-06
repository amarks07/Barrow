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
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import { AppStateProvider, useAppState } from "./src/state/AppStateProvider";
import { ResetPasswordModal } from "./src/components/profile/ResetPasswordModal";
import { useFocusNotificationNavigation } from "./src/hooks/useFocusNotificationNavigation";
import { useFocusWidgetDeepLink } from "./src/hooks/useFocusWidgetDeepLink";
import { clearStaleFocusPointer } from "./src/state/staleFocusPointer";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Reads the persisted theme preference from AppStateProvider once it's
// mounted (ThemeProvider itself is theme-agnostic — it just applies
// whatever token set it's handed). ResetPasswordModal renders here, outside
// RootNavigator, so it appears above whatever screen is on the stack
// whenever a password-recovery deep link lands — same always-on-top
// behavior as the web app's z-50 overlay.
function ThemedApp() {
  const { theme, cloudSync, focusNotificationEnabled } = useAppState();
  useFocusNotificationNavigation();
  useFocusWidgetDeepLink();
  return (
    <ThemeProvider theme={theme}>
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
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const onLayout = useCallback(async () => {
    if (fontsLoaded || fontError) await SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayout();
  }, [onLayout]);

  if (!fontsLoaded && !fontError) return null;

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
