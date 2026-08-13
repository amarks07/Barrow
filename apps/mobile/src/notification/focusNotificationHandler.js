import { EventType } from "@notifee/react-native";
import { focusNavigateStep } from "@barrow/core";
import { asyncStorageAdapter } from "../state/storage";
import { getActiveAccountId, withAccountNamespace } from "../state/accountNamespace";
import { readExercises } from "../state/focusReaders";
import { refreshFocusNotification } from "./focusNotification";

// Registered via notifee.onBackgroundEvent in index.js — runs headless,
// same as the widget's task handler, with no AppStateProvider. Only 2
// action ids exist (see focusNotification.js), so this is a flat switch
// rather than the wider click-action set the widget handles.

export async function focusNotificationBackgroundHandler({ type, detail }) {
  if (type !== EventType.ACTION_PRESS) return;

  const actionId = detail.pressAction?.id;
  const storage = withAccountNamespace(asyncStorageAdapter, await getActiveAccountId());
  const exercises = await readExercises(storage);

  if (actionId === "PREV_STEP") {
    await focusNavigateStep(storage, exercises, -1);
  } else if (actionId === "NEXT_STEP") {
    await focusNavigateStep(storage, exercises, 1);
  } else {
    return;
  }

  await refreshFocusNotification();
}
