import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppHeader } from "../components/layout/AppHeader";
import { TabsNavigator } from "./TabsNavigator";
import { DayScreen } from "../screens/workout/DayScreen";
import { ExerciseFocusScreen } from "../screens/workout/ExerciseFocusScreen";
import { WorkoutSummaryScreen } from "../screens/workout/WorkoutSummaryScreen";
import { HistoryScreen } from "../screens/history/HistoryScreen";
import { RoutineDetailScreen } from "../screens/routines/RoutineDetailScreen";
import { withKeyboardAvoiding } from "./withKeyboardAvoiding";
import { useAppState } from "../state/AppStateProvider";
import { useTheme } from "../theme/ThemeProvider";

const Stack = createNativeStackNavigator();
const KeyboardAvoidingDay = withKeyboardAvoiding(DayScreen);
const KeyboardAvoidingHistory = withKeyboardAvoiding(HistoryScreen);
const KeyboardAvoidingRoutineDetail = withKeyboardAvoiding(RoutineDetailScreen);

// AppHeader renders once here, above a nested stack, so it stays visible
// across every screen in that stack — tabs and drill-downs alike — instead
// of disappearing when you push into Day/History/RoutineDetail/
// ExerciseFocus. Each of those screens keeps its own back-button-and-title
// row directly below it; this is the persistent app-level bar above that.
// Preferences/Profile live one level up (see RootNavigator) as modals over
// this whole stack, so opening them doesn't show this header a second time.
//
// Tapping the profile icon always navigates straight to the "Profile"
// route, signed in or not and with no authentication prompt of any kind —
// ProfileView handles the signed-out case by showing a "Sign in/up" CTA
// instead of sync status, and the mandatory
// cloud-sync re-auth gate (see useCloudSync's syncLocked) only ever
// triggers from the explicit "Unlock to sync" button inside that screen,
// never from opening it.
export function MainStack({ navigation }) {
  const { profile, cloudSync } = useAppState();
  const { tokens } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        profile={profile}
        signedIn={!!cloudSync.session}
        onOpenProfile={() => navigation.navigate("Profile")}
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
        <Stack.Screen name="Day" component={KeyboardAvoidingDay} options={{ presentation: "modal" }} />
        <Stack.Screen name="History" component={KeyboardAvoidingHistory} />
        <Stack.Screen name="RoutineDetail" component={KeyboardAvoidingRoutineDetail} />
        {/* Read-only recap, no text inputs — no withKeyboardAvoiding needed
            (same reasoning as ExerciseFocus below). Modal presentation so it
            reads as a "workout finished" moment whether it's pushed from
            Day's own "Summary" button or opened by WorkoutTimerBadge's
            global "End workout" action, which has no Day screen underneath
            it to slide up from. */}
        <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ presentation: "modal" }} />
        {/* No withKeyboardAvoiding here: ExerciseFocusView's pager pages are
            each their own KeyboardAwareScrollView, which already scrolls the
            focused Counter field above the keyboard. Wrapping the whole
            screen in KeyboardAvoidingView too would double up — both trying
            to resize/pad for the same keyboard at once. */}
        <Stack.Screen name="ExerciseFocus" component={ExerciseFocusScreen} />
      </Stack.Navigator>
    </View>
  );
}
