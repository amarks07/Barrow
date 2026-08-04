import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainStack } from "./MainStack";
import { PreferencesScreen } from "../screens/preferences/PreferencesScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { useTheme } from "../theme/ThemeProvider";

const Stack = createNativeStackNavigator();

// "Main" holds AppHeader plus the nested stack for Tabs/Day/History/
// TemplateDetail/ExerciseFocus (see MainStack) — AppHeader is always
// visible across all of those. Preferences/Profile are a modal group
// presented over the whole Main stack, matching their always-on-top
// overlay behavior on web. ResetPasswordModal isn't a route at all: it's
// rendered globally from App.js whenever cloudSync.recoveryMode is true,
// since on web it overrides whatever else is open regardless of
// navigation state.
export function RootNavigator() {
  const { tokens } = useTheme();

  return (
    // contentStyle sets the native screen container's own background —
    // without it, native-stack's underlying platform view defaults to
    // white, which flashes briefly during a push/pop transition before the
    // JS-rendered (dark) content paints on top.
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.bg } }}>
      <Stack.Screen name="Main" component={MainStack} />
      <Stack.Group screenOptions={{ presentation: "modal" }}>
        <Stack.Screen name="Preferences" component={PreferencesScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
