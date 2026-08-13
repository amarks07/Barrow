import { requestWidgetUpdate } from "react-native-android-widget";
import { readFocusSnapshot } from "@barrow/core";
import { asyncStorageAdapter } from "../state/storage";
import { getActiveAccountId, withAccountNamespace } from "../state/accountNamespace";
import { readExercises, readUnit, readTheme, readAccentColor } from "../state/focusReaders";
import { FocusWidget } from "./FocusWidget";

// Called from the foregrounded app (AppStateProvider, after any workouts
// change) to redraw the widget right away instead of waiting on Android's
// own throttled periodic update cycle. requestWidgetUpdate re-invokes this
// render callback for every FocusWidget instance currently on a home
// screen — a no-op if none are added. Resolves the active account itself
// (rather than taking it as a param) so every call site — AppStateProvider,
// DayScreen/ExerciseFocusScreen's pointer effects, staleFocusPointer — stays
// as simple as it is today.
export async function refreshFocusWidget() {
  const storage = withAccountNamespace(asyncStorageAdapter, await getActiveAccountId());
  await requestWidgetUpdate({
    widgetName: "FocusWidget",
    renderWidget: async () => {
      const [exercises, unit, theme, accentColor] = await Promise.all([
        readExercises(storage),
        readUnit(storage),
        readTheme(storage),
        readAccentColor(storage),
      ]);
      const snapshot = await readFocusSnapshot(storage, exercises);
      return <FocusWidget snapshot={snapshot} unit={unit} theme={theme} accentColor={accentColor} />;
    },
  });
}
