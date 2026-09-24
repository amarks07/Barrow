import { Appearance } from "react-native";
import { SEED_EXERCISES, reconcileExercises } from "@barrow/core";
import { resolveTheme } from "../theme/resolveTheme";
import { DEFAULT_ACCENT } from "../theme/accentPalette";

// Small shared reads used by every headless/background context that needs
// exercises/unit alongside a focusStorage snapshot (the widget task
// handler, the notification builder, the notification background
// handler) — kept in one place instead of copy-pasted three times. `storage`
// is passed in (rather than importing asyncStorageAdapter directly) so
// every call site can hand these the same account-namespaced adapter
// (see accountNamespace.withAccountNamespace) it already resolved once for
// its own focusStorage.js calls, instead of each of these four functions
// re-resolving the active account on its own.
export async function readExercises(storage) {
  const raw = await storage.getItem("barrow:exercises");
  return raw ? reconcileExercises(JSON.parse(raw)) : SEED_EXERCISES;
}

export async function readUnit(storage) {
  const raw = await storage.getItem("barrow:unit");
  return raw || "lb";
}

// Resolves "barrow:theme" the same way ThemeProvider does, except via
// Appearance.getColorScheme() — the imperative equivalent of useColorScheme
// — since this runs headless, with no component tree to hook into.
export async function readTheme(storage) {
  const raw = await storage.getItem("barrow:theme");
  return resolveTheme(raw || "system", Appearance.getColorScheme());
}

export async function readAccentColor(storage) {
  const raw = await storage.getItem("barrow:accentColor");
  return raw || DEFAULT_ACCENT;
}

// Gates the widget's Start/End workout controls the same way
// WorkoutTimerControl/WorkoutTimerBadge gate their in-app equivalents.
export async function readWorkoutTimerEnabled(storage) {
  const raw = await storage.getItem("barrow:workoutTimerEnabled");
  return raw ? JSON.parse(raw) : false;
}
