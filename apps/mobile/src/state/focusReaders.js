import { SEED_EXERCISES, reconcileExercises } from "@barrow/core";
import { asyncStorageAdapter } from "./storage";

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
