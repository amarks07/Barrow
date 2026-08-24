import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useAppState } from "../state/AppStateProvider";
import { FONT_DISPLAY } from "../theme/fonts";

// Custom tabBar for the material-top-tabs Tabs navigator (rendered at the
// bottom via `tabBarPosition: "bottom"` — see TabsNavigator), reproducing
// the web app's BottomNav look. Automatically absent whenever a Day/
// History/RoutineDetail/ExerciseFocus screen is pushed on top in the root
// stack, since those cover the whole screen — no extra visibility prop
// needed the way the web version required.
export function BottomNavBar({ state, descriptors, navigation }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  // LastSyncedFooter (App.js) renders as a real sibling below the whole
  // navigator, not an overlay, so once it's showing it — not this bar — is
  // what's actually flush against the physical bottom edge and needs the
  // insets.bottom clearance. Adding insets.bottom here too would stack a
  // second device-safe-area gap on top of the footer's own, which is what
  // read as "a lot of padding" between the tabs and the sync readout.
  // Falls back to the old full clearance when nothing renders below (no
  // footer yet — e.g. a guest who's never synced), so the tab bar still
  // clears the home indicator/gesture bar on its own in that case.
  const { lastSyncedAt } = useAppState();
  const bottomPadding = lastSyncedAt ? 24 : 24 + insets.bottom;

  return (
    <View
      className="flex-row items-center justify-around"
      style={{ backgroundColor: tokens.bg, borderTopWidth: 1.5, borderTopColor: tokens.line, paddingTop: 12, paddingBottom: bottomPadding }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const active = state.index === index;
        return (
          <Pressable key={route.key} onPress={() => navigation.navigate(route.name)} className="items-center px-2" hitSlop={8}>
            <Text
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 13,
                lineHeight: 13,
                textTransform: "uppercase",
                color: active ? tokens.text : tokens.textDim,
                fontWeight: active ? "600" : "400",
                includeFontPadding: false,
                textAlignVertical: "center",
              }}
            >
              {label}
            </Text>
            {/* Reserved space always present (not just when active) so
                inactive tabs don't shift up/down as the active tab changes. */}
            <View
              style={{
                marginTop: 5,
                width: 18,
                height: 2.5,
                borderRadius: 999,
                backgroundColor: active ? tokens.accent : "transparent",
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
