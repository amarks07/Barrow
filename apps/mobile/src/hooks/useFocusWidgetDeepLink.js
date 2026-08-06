import { useEffect } from "react";
import * as Linking from "expo-linking";
import { navigationRef } from "../navigation/navigationRef";

// Receiving end of FocusWidget's "tap a value to type it" links (built by
// buildFocusDeepLink in src/widget/FocusWidget.js). Mirrors
// useFocusNotificationNavigation's cold-start + foreground pattern, and
// useCloudSync's existing Linking.getInitialURL/addEventListener usage for
// the password-reset deep link — same expo-linking APIs, just a different
// scheme host ("focus" instead of a Supabase redirect).
function navigateToFocusField(url) {
  if (!url) return;
  const { hostname, queryParams } = Linking.parse(url);
  if (hostname !== "focus") return;
  const { dateKey, workoutId, exerciseId, setId, field } = queryParams || {};
  if (!dateKey || !workoutId || !navigationRef.isReady()) return;
  navigationRef.navigate("Main", {
    screen: "ExerciseFocus",
    params: { dateKey, workoutId, exerciseId, focusSetId: setId, focusField: field },
  });
}

export function useFocusWidgetDeepLink() {
  useEffect(() => {
    Linking.getInitialURL().then(navigateToFocusField);
    const sub = Linking.addEventListener("url", ({ url }) => navigateToFocusField(url));
    return () => sub.remove();
  }, []);
}
