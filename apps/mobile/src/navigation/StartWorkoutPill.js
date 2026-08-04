import { View } from "react-native";
import { Button } from "../components/ui/Button";

// The floating "Start a workout" pill — calendar tab only, and the
// reference example for Button's "large" size. Rendered by CalendarScreen
// itself (like the FAB, it positions itself independently of the tab bar)
// rather than threaded through the tabBar's props.
//
// `bottom` is a small flat margin, not BOTTOM_NAV_HEIGHT + inset: this pill
// lives inside the Calendar tab screen, and material-top-tabs lays the tab
// bar out as a sibling below the scene (not an overlay), so the scene
// already stops right above it — adding the tab bar's own height again on
// top of that pushed this pill much higher than intended.
export function StartWorkoutPill({ onPress }) {
  return (
    <View className="absolute left-5 right-5" style={{ bottom: 16, zIndex: 25 }}>
      <Button label="Start a workout" onPress={onPress} size="large" variant="solid" fullWidth />
    </View>
  );
}
