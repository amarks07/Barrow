import { navigationRef } from "../navigation/navigationRef";
import { asyncStorageAdapter } from "./storage";
import { refreshFocusWidget } from "../widget/refreshFocusWidget";
import { refreshFocusNotification } from "../notification/focusNotification";

const FOCUS_POINTER_KEY = "barrow:focusPointer";

// Defends against barrow:focusPointer surviving past the workout it was
// pointing at. The common case (backing all the way out of Day/Focus) is
// handled by DayScreen/ExerciseFocusScreen clearing it on unmount, but that
// JS cleanup never runs if the app process is killed outright (swiped from
// recents, crashed) while either was open — the widget/notification would
// otherwise go on showing that workout indefinitely. Call this whenever
// the app finishes launching (NavigationContainer's onReady, for a cold
// start) or comes back to the foreground (AppStateProvider's AppState
// listener, for a relaunch after being killed): if the screen actually on
// top isn't Day or ExerciseFocus, any leftover pointer is stale. A relaunch
// that lands back on one of those (e.g. via an explicit deep link/
// notification tap) is a legitimate reason to keep it, so this only ever
// clears — it never fights a pointer that a real navigation just (re)wrote.
export async function clearStaleFocusPointer(focusNotificationEnabled) {
  if (!navigationRef.isReady()) return;
  const currentRoute = navigationRef.getCurrentRoute()?.name;
  if (currentRoute === "ExerciseFocus" || currentRoute === "Day") return;
  const raw = await asyncStorageAdapter.getItem(FOCUS_POINTER_KEY);
  if (!raw) return;
  await asyncStorageAdapter.removeItem(FOCUS_POINTER_KEY);
  refreshFocusWidget().catch((e) => console.error("Barrow: failed to refresh focus widget", e));
  if (focusNotificationEnabled === "on") {
    refreshFocusNotification().catch((e) => console.error("Barrow: failed to refresh focus notification", e));
  }
}
