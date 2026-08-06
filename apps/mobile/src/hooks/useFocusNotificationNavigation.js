import { useEffect } from "react";
import notifee, { EventType } from "@notifee/react-native";
import { navigationRef } from "../navigation/navigationRef";

// Tapping the notification's body (as opposed to one of its 3 action
// buttons) opens the app — Notifee's default pressAction behavior — and
// should land the user back on the exact exercise it was showing, using
// the { dateKey, workoutId, exerciseId } stamped into the notification's
// `data` in focusNotification.js. Covers all three app states a press can
// happen from: already foregrounded (onForegroundEvent fires directly),
// backgrounded-but-alive (same listener, delivered once re-attached after
// resume — Notifee's documented behavior), and cold-started from killed
// (getInitialNotification on mount).
function navigateToFocus(data) {
  if (!data?.dateKey || !data?.workoutId) return;
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("Main", {
    screen: "ExerciseFocus",
    params: { dateKey: data.dateKey, workoutId: data.workoutId, exerciseId: data.exerciseId },
  });
}

export function useFocusNotificationNavigation() {
  useEffect(() => {
    notifee.getInitialNotification().then((initial) => {
      if (initial?.pressAction?.id === "open-focus") navigateToFocus(initial.notification?.data);
    });

    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.pressAction?.id === "open-focus") {
        navigateToFocus(detail.notification?.data);
      }
    });
  }, []);
}
