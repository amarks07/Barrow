import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { navigationRef } from "../navigation/navigationRef";

// Tapping a friend-request push (see notify_friendship in supabase/schema.sql)
// should land the user straight on the Notifications list rather than the
// Profile hub — "Profile" is a top-level modal route (see RootNavigator),
// and ProfileScreen/ProfileView read this same `initialPage` param to open
// there directly. Covers all three app states a tap can happen from:
// already foregrounded/backgrounded-but-alive (the listener below) and
// cold-started from killed (getLastNotificationResponseAsync on mount).
function navigateToNotifications() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("Profile", { initialPage: "notifications" });
}

export function usePushNotificationNavigation() {
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) navigateToNotifications();
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      navigateToNotifications();
    });
    return () => subscription.remove();
  }, []);
}
