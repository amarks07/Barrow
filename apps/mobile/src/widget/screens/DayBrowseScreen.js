import { FlexWidget, TextWidget } from "react-native-android-widget";
import { dayLabel } from "@barrow/core";
import { NavButton, ActionButton, RefreshSlot } from "./primitives";

// A workout with entries but not currently running/ended jumps straight
// into the step editor (OPEN_WORKOUT, resetting to its first step); one
// that's actively running instead resumes exactly where it was left
// (RESUME_WORKOUT, which doesn't touch the pointer) — see
// widgetOpenWorkout/widgetResumeWorkout in packages/core focusStorage.js.
function WorkoutRow({ workout, dateKey, confirmingEnd, workoutTimerEnabled, tokens }) {
  const label =
    workout.entryCount > 0
      ? `${workout.entryCount} exercise${workout.entryCount === 1 ? "" : "s"} · ${workout.setCount} set${workout.setCount === 1 ? "" : "s"}`
      : "No exercises yet";
  const statusLabel = workout.endedAt ? "Done" : workout.isRunning ? "In progress" : workout.entryCount > 0 ? "Not started" : null;
  const clickAction = workout.entryCount === 0 ? undefined : workout.isRunning ? "RESUME_WORKOUT" : "OPEN_WORKOUT";
  const clickActionData = clickAction === "OPEN_WORKOUT" ? { dateKey, workoutId: workout.id } : undefined;

  return (
    <FlexWidget
      style={{
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: tokens.line,
      }}
    >
      <FlexWidget clickAction={clickAction} clickActionData={clickActionData} style={{ width: 0, flex: 1 }}>
        <TextWidget text={label} style={{ fontSize: 15, color: tokens.text }} truncate="END" maxLines={1} />
        {statusLabel && (
          <TextWidget
            text={statusLabel}
            style={{ fontSize: 12, color: workout.isRunning ? tokens.accent : tokens.textDim, marginTop: 2 }}
          />
        )}
      </FlexWidget>

      {workoutTimerEnabled && workout.isRunning && (
        <ActionButton label={confirmingEnd ? "End?" : "End"} clickAction="END_WORKOUT" tokens={tokens} tone="danger" />
      )}
      {workoutTimerEnabled && !workout.isRunning && !workout.endedAt && (
        <ActionButton label="Start" clickAction="START_WORKOUT" clickActionData={{ dateKey }} tokens={tokens} />
      )}
    </FlexWidget>
  );
}

function EmptyDayRow({ dateKey, workoutTimerEnabled, tokens }) {
  return (
    // See WeekStripScreen's DayCell comment — `gap` isn't translated by
    // react-native-android-widget's RemoteViews compiler, so spacing here
    // is an explicit marginTop instead.
    <FlexWidget style={{ width: "match_parent", alignItems: "center", justifyContent: "center", paddingVertical: 16 }}>
      <TextWidget text="No workout yet" style={{ fontSize: 15, color: tokens.textDim }} />
      {workoutTimerEnabled && (
        <FlexWidget style={{ marginTop: 10 }}>
          <ActionButton label="Start a workout" clickAction="START_WORKOUT" clickActionData={{ dateKey }} tokens={tokens} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

// One date's workouts — reached by tapping a day in WeekStripScreen. Also
// where Start/End workout live (gated on the workoutTimerEnabled
// preference, same gate WorkoutTimerControl/WorkoutTimerBadge use in-app).
export function DayBrowseScreen({ dateKey, workouts, resumable, confirmingEnd, refreshing, workoutTimerEnabled, tokens }) {
  return (
    <FlexWidget style={{ width: "match_parent", height: "match_parent", backgroundColor: tokens.bg, padding: 16 }}>
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", paddingBottom: 10 }}>
        <NavButton label="‹ Week" clickAction="BACK_TO_WEEK" tokens={tokens} />
        <FlexWidget style={{ width: 0, flex: 1, paddingHorizontal: 8 }}>
          <TextWidget text={dayLabel(dateKey)} style={{ fontSize: 15, fontWeight: "600", color: tokens.text }} truncate="END" maxLines={1} />
        </FlexWidget>
        <NavButton label="‹" clickAction="DAY_PREV" tokens={tokens} />
        <NavButton label="›" clickAction="DAY_NEXT" tokens={tokens} />
      </FlexWidget>

      <FlexWidget style={{ width: "match_parent", height: 0, flex: 1 }}>
        {workouts.length === 0 ? (
          <EmptyDayRow dateKey={dateKey} workoutTimerEnabled={workoutTimerEnabled} tokens={tokens} />
        ) : (
          workouts.map((w) => (
            <WorkoutRow
              key={w.id}
              workout={w}
              dateKey={dateKey}
              confirmingEnd={confirmingEnd}
              workoutTimerEnabled={workoutTimerEnabled}
              tokens={tokens}
            />
          ))
        )}
      </FlexWidget>

      {/* Only surfaced here when it points at a *different* day — this
          day's own running workout already has its End control on its row
          above, and its row is itself the way back into the editor. */}
      {resumable && resumable.dateKey !== dateKey && (
        <FlexWidget style={{ width: "match_parent", paddingTop: 8 }}>
          <ActionButton label={`Resume: ${resumable.title}`} clickAction="RESUME_WORKOUT" tokens={tokens} />
        </FlexWidget>
      )}

      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "flex-start", paddingTop: 10 }}>
        <RefreshSlot refreshing={refreshing} tokens={tokens} />
      </FlexWidget>
    </FlexWidget>
  );
}
