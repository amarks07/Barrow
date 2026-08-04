import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { BottomNavBar } from "./BottomNavBar";
import { CalendarScreen } from "../screens/calendar/CalendarScreen";
import { ExercisesScreen } from "../screens/exercises/ExercisesScreen";
import { TemplatesScreen } from "../screens/templates/TemplatesScreen";
import { useTheme } from "../theme/ThemeProvider";

const Tab = createMaterialTopTabNavigator();

// The three top-level tabs, physically swipeable (react-native-tab-view
// under the hood) like the web app's scroll-snap TabPager, but with the tab
// bar rendered at the bottom instead of the top.
export function TabsNavigator() {
  const { tokens } = useTheme();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <BottomNavBar {...props} />}
      sceneContainerStyle={{ backgroundColor: tokens.bg }}
    >
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: "Calendar" }} />
      <Tab.Screen name="Exercises" component={ExercisesScreen} options={{ title: "Exercises" }} />
      <Tab.Screen name="Templates" component={TemplatesScreen} options={{ title: "Templates" }} />
    </Tab.Navigator>
  );
}
