import notifee, { AndroidImportance, AndroidVisibility, AndroidStyle } from "@notifee/react-native";
import { readFocusSnapshot, fmtNum } from "@barrow/core";
import { asyncStorageAdapter } from "../state/storage";
import { readExercises, readUnit } from "../state/focusReaders";

// A plain (dismissable) ongoing notification, not a foreground service —
// re-postable any time the underlying data changes, but the user can swipe
// it away. AndroidVisibility.PUBLIC requests lock-screen display; the
// user's own device privacy setting for lock-screen notification content
// still ultimately governs what's actually shown there — this can request,
// not force, that.
export const FOCUS_NOTIFICATION_ID = "barrow-focus";
export const FOCUS_CHANNEL_ID = "barrow-focus";

let channelReady = false;
async function ensureChannel() {
  if (channelReady) return;
  await notifee.createChannel({
    id: FOCUS_CHANNEL_ID,
    name: "Active workout",
    // LOW: no sound/heads-up popup for what's really a re-postable status
    // display, not an alert.
    importance: AndroidImportance.LOW,
    visibility: AndroidVisibility.PUBLIC,
  });
  channelReady = true;
}

// Only Prev/Next — Android's notification action row can't host the
// widget's per-set steppers/delete (no custom RemoteViews layout, no
// MediaStyle, in notifee's Android API), so editing stays widget-only.
// The expanded (Inbox) body instead lists every set for the current step
// read-only, one per line, since there's headroom for it with just 2 actions.
function buildSetsLines(entries, unit) {
  const lines = [];
  const prefix = (entry, text) => (entries.length > 1 ? `${entry.name}: ${text}` : text);
  entries.forEach((entry) => {
    if (entry.sets.length === 0) {
      lines.push(prefix(entry, "No sets yet"));
      return;
    }
    entry.sets.forEach((s) => {
      lines.push(prefix(entry, `${fmtNum(s.reps)} × ${fmtNum(s.weight)} ${s.unit || unit}`));
    });
  });
  return lines;
}

function buildNotification(snapshot, unit) {
  if (!snapshot) return null;
  const primaryEntry = snapshot.entries[0];
  const setCount = snapshot.entries.reduce((n, e) => n + e.sets.length, 0);
  const summary = setCount > 0 ? `${setCount} set${setCount === 1 ? "" : "s"} logged` : "No sets yet";
  return {
    id: FOCUS_NOTIFICATION_ID,
    title: `${snapshot.title} · ${snapshot.stepIndex + 1}/${snapshot.stepCount}`,
    body: summary,
    data: {
      dateKey: snapshot.dateKey,
      workoutId: snapshot.workoutId,
      exerciseId: primaryEntry?.exerciseId || "",
    },
    android: {
      channelId: FOCUS_CHANNEL_ID,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: true,
      visibility: AndroidVisibility.PUBLIC,
      pressAction: { id: "open-focus" },
      style: {
        type: AndroidStyle.INBOX,
        lines: buildSetsLines(snapshot.entries, unit),
        summary,
      },
      actions: [
        { title: "Previous", pressAction: { id: "PREV_STEP" } },
        { title: "Next", pressAction: { id: "NEXT_STEP" } },
      ],
    },
  };
}

// Called after any focus-relevant mutation (in-app or from the widget's/
// notification's own background handlers) to redraw the notification from
// current AsyncStorage state. Cancels it outright if nothing's focused
// (no workout open in Focus flow) rather than showing a stale/empty shell.
export async function refreshFocusNotification() {
  await ensureChannel();
  const [exercises, unit] = await Promise.all([readExercises(), readUnit()]);
  const snapshot = await readFocusSnapshot(asyncStorageAdapter, exercises);
  const notification = buildNotification(snapshot, unit);
  if (!notification) {
    await notifee.cancelNotification(FOCUS_NOTIFICATION_ID).catch(() => {});
    return;
  }
  await notifee.displayNotification(notification);
}

export async function cancelFocusNotification() {
  await notifee.cancelNotification(FOCUS_NOTIFICATION_ID).catch(() => {});
}
