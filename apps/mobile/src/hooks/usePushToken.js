import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase-client";

// Foreground presentation: a friend-request push should still bump the
// system notification tray/banner even while Barrow is open, same as it
// would backgrounded — there's no in-app toast for this today, so
// suppressing it here would make it invisible until the next time someone
// opens the Notifications screen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushToken() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Permission itself is requested by the "Allow notifications" preference
  // toggle (PreferencesScreen's onNotificationsToggle) before this ever
  // runs — this only checks the current status rather than prompting again,
  // since a second, unexplained system prompt right after the user already
  // answered one would be confusing.
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

// Registers this device for push once signed in AND the user has opted in
// via the "Allow notifications" preference, and keeps `profiles.push_token`
// current for the friendships trigger (see notify_friendship in
// supabase/schema.sql) to send to. Re-runs whenever `session` or
// `notificationsEnabled` changes (covers switching accounts on the same
// device, or flipping the preference) — clearing the token on sign-out is
// handled separately, in useCloudSync's signOut, since by the time
// `session` here goes null the auth context needed to write the row (as
// that now-signed-out user) is already gone.
export function usePushToken(session, notificationsEnabled) {
  useEffect(() => {
    if (!supabase || !session || notificationsEnabled !== "on") return;
    let cancelled = false;

    registerForPushToken()
      .then((token) => {
        if (cancelled || !token) return;
        return supabase.from("profiles").update({ push_token: token }).eq("id", session.user.id);
      })
      .catch((e) => console.error("Barrow: failed to register push token", e));

    return () => {
      cancelled = true;
    };
  }, [session, notificationsEnabled]);
}
