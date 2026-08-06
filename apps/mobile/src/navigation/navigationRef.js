import { createNavigationContainerRef } from "@react-navigation/native";

// Lets code outside the component tree (the notification-press handler,
// which fires from a notifee event listener rather than a screen) navigate
// without needing a navigation prop threaded down to it.
export const navigationRef = createNavigationContainerRef();
