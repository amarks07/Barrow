import { Appearance } from "react-native";
import { SEED_EXERCISES, reconcileExercises } from "@barrow/core";
import { asyncStorageAdapter } from "./storage";
import { resolveTheme } from "../theme/resolveTheme";
import { DEFAULT_ACCENT } from "../theme/accentPalette";

// Small shared reads used by every headless/background context that needs
// exercises/unit alongside a focusStorage snapshot (the widget task
// handler, the notification builder, the notification background
// handler) — kept in one place instead of copy-pasted three times.
export async function readExercises() {
  const raw = await asyncStorageAdapter.getItem("barrow:exercises");
  return raw ? reconcileExercises(JSON.parse(raw)) : SEED_EXERCISES;
}

export async function readUnit() {
  const raw = await asyncStorageAdapter.getItem("barrow:unit");
  return raw || "lb";
}

// Resolves "barrow:theme" the same way ThemeProvider does, except via
// Appearance.getColorScheme() — the imperative equivalent of useColorScheme
// — since this runs headless, with no component tree to hook into.
export async function readTheme() {
  const raw = await asyncStorageAdapter.getItem("barrow:theme");
  return resolveTheme(raw || "system", Appearance.getColorScheme());
}

export async function readAccentColor() {
  const raw = await asyncStorageAdapter.getItem("barrow:accentColor");
  return raw || DEFAULT_ACCENT;
}
