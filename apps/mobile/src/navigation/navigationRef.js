import { createNavigationContainerRef } from "@react-navigation/native";

// Lets code outside the component tree (the push-notification-press
// handler, which fires from an expo-notifications listener rather than a
// screen) navigate without needing a navigation prop threaded down to it.
export const navigationRef = createNavigationContainerRef();
