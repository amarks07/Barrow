import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { BottomNavBar } from "./BottomNavBar";
import { CalendarScreen } from "../screens/calendar/CalendarScreen";
import { ExercisesScreen } from "../screens/exercises/ExercisesScreen";
import { RoutinesScreen } from "../screens/routines/RoutinesScreen";
import { StretchesScreen } from "../screens/stretches/StretchesScreen";
import { withKeyboardAvoiding } from "./withKeyboardAvoiding";
import { useAppState } from "../state/AppStateProvider";
import { useTheme } from "../theme/ThemeProvider";

const Tab = createMaterialTopTabNavigator();
const KeyboardAvoidingCalendar = withKeyboardAvoiding(CalendarScreen);
const KeyboardAvoidingExercises = withKeyboardAvoiding(ExercisesScreen);
const KeyboardAvoidingRoutines = withKeyboardAvoiding(RoutinesScreen);
const KeyboardAvoidingStretches = withKeyboardAvoiding(StretchesScreen);

// The top-level tabs, physically swipeable (react-native-tab-view under the
// hood) like the web app's scroll-snap TabPager, but with the tab bar
// rendered at the bottom instead of the top. Stretches only shows up once
// the "Enable stretch routines" preference is on (see PreferencesView) —
// react-navigation supports conditionally rendered Tab.Screen children, so
// toggling it just adds/removes this tab on the next render.
export function TabsNavigator() {
  const { tokens } = useTheme();
  const { stretchRoutinesEnabled } = useAppState();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <BottomNavBar {...props} />}
      sceneContainerStyle={{ backgroundColor: tokens.bg }}
    >
      <Tab.Screen name="Calendar" component={KeyboardAvoidingCalendar} options={{ title: "Calendar" }} />
      <Tab.Screen name="Exercises" component={KeyboardAvoidingExercises} options={{ title: "Exercises" }} />
      <Tab.Screen name="Routines" component={KeyboardAvoidingRoutines} options={{ title: "Routines" }} />
      {stretchRoutinesEnabled && (
        <Tab.Screen name="Stretches" component={KeyboardAvoidingStretches} options={{ title: "Stretches" }} />
      )}
    </Tab.Navigator>
  );
}
