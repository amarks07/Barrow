import { requestWidgetUpdate } from "react-native-android-widget";
import { readFocusSnapshot } from "@barrow/core";
import { asyncStorageAdapter } from "../state/storage";
import { readExercises, readUnit, readTheme, readAccentColor } from "../state/focusReaders";
import { FocusWidget } from "./FocusWidget";

// Called from the foregrounded app (AppStateProvider, after any workouts
// change) to redraw the widget right away instead of waiting on Android's
// own throttled periodic update cycle. requestWidgetUpdate re-invokes this
// render callback for every FocusWidget instance currently on a home
// screen — a no-op if none are added.
export async function refreshFocusWidget() {
  await requestWidgetUpdate({
    widgetName: "FocusWidget",
    renderWidget: async () => {
      const [exercises, unit, theme, accentColor] = await Promise.all([readExercises(), readUnit(), readTheme(), readAccentColor()]);
      const snapshot = await readFocusSnapshot(asyncStorageAdapter, exercises);
      return <FocusWidget snapshot={snapshot} unit={unit} theme={theme} accentColor={accentColor} />;
    },
  });
}
