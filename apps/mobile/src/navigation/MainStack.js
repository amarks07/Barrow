import { useEffect, useState } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppHeader } from "../components/layout/AppHeader";
import { SignInModal } from "../components/profile/SignInModal";
import { TabsNavigator } from "./TabsNavigator";
import { DayScreen } from "../screens/workout/DayScreen";
import { ExerciseFocusScreen } from "../screens/workout/ExerciseFocusScreen";
import { HistoryScreen } from "../screens/history/HistoryScreen";
import { TemplateDetailScreen } from "../screens/templates/TemplateDetailScreen";
import { useAppState } from "../state/AppStateProvider";
import { useTheme } from "../theme/ThemeProvider";

const Stack = createNativeStackNavigator();

// AppHeader renders once here, above a nested stack, so it stays visible
// across every screen in that stack — tabs and drill-downs alike — instead
// of disappearing when you push into Day/History/TemplateDetail/
// ExerciseFocus. Each of those screens keeps its own back-button-and-title
// row directly below it; this is the persistent app-level bar above that.
// Preferences/Profile live one level up (see RootNavigator) as modals over
// this whole stack, so opening them doesn't show this header a second time.
//
// Tapping the profile icon while signed out shows SignInModal as a local
// overlay (like the "New exercise"/"New template" popups) rather than
// navigating to the "Profile" route — routing there and then rendering
// SignInModal inside it stacked two separate modal transitions on top of
// each other, which was the white-flash "looks like a new page" bug.
export function MainStack({ navigation }) {
  const { profile, cloudSync } = useAppState();
  const { tokens } = useTheme();
  const [showSignIn, setShowSignIn] = useState(false);

  // A successful sign-in used to swap SignInModal for ProfileView in place
  // (same route, condition just re-evaluated). Now that the modal is a
  // separate overlay, it has to close itself once there's a real session —
  // then hand off to the Profile route so signing in still ends with the
  // profile screen open, same as before.
  useEffect(() => {
    if (cloudSync.session && showSignIn) {
      setShowSignIn(false);
      navigation.navigate("Profile");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSync.session]);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        profile={profile}
        onOpenProfile={() => (cloudSync.session ? navigation.navigate("Profile") : setShowSignIn(true))}
        onOpenPreferences={() => navigation.navigate("Preferences")}
      />
      {/* detachInactiveScreens=false: by default react-native-screens
          detaches Tabs' native view from the hierarchy while Day covers it,
          so the calendar has to be reattached and relaid-out in one go right
          as the close transition starts — that catch-up is what was reading
          as a hitch. Keeping it attached (a bit more memory/CPU held while
          Day is open) trades that for a smooth close. */}
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.bg } }}
        detachInactiveScreens={false}
      >
        <Stack.Screen name="Tabs" component={TabsNavigator} />
        {/* Modal presentation: Day slides up and sits on top of Tabs
            natively (react-native-screens handles it off the JS thread)
            instead of the default push/pop card transition. */}
        <Stack.Screen name="Day" component={DayScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
        <Stack.Screen name="ExerciseFocus" component={ExerciseFocusScreen} />
      </Stack.Navigator>

      {showSignIn && <SignInModal cloudSync={cloudSync} onClose={() => setShowSignIn(false)} />}
    </View>
  );
}
