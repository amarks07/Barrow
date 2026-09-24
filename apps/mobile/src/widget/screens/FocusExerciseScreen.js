import { FlexWidget, TextWidget, ListWidget } from "react-native-android-widget";
import { buildFocusRows, FOCUS_SCROLL_PAGE_SIZE } from "@barrow/core";
import { NavButton, ScrollButton, ActionButton, RefreshSlot } from "./primitives";

// Renders the step-editor screen as native RemoteViews from a
// packages/core focusStorage.resolveWidgetState() "focus" result. Pure —
// the task handler (focusWidgetTaskHandler.js) does all the reading/
// mutating and just calls props.renderWidget(<FocusWidget state={...} />),
// which routes here once state.screen === "focus" (see ../FocusWidget.js).
//
// Every set row exposes its own reps/weight +/-, warmup toggle, and delete
// tap targets (clickActionData carries the setId) rather than acting on one
// implicit "active" set, since a resized widget can show every set on every
// exercise in the current step, not just one.
//
// Colors come from `tokens` (already resolved for "dark"/"light" + accent
// by the router) rather than being hardcoded, so the widget always matches
// whatever the app itself is showing.

// Small gap at the bottom of the (scrolling) sets list, inside the
// ListWidget's own children, so the last row doesn't sit flush against the
// Add Set footer below it — see the spacer FlexWidget below.
const LIST_BOTTOM_SPACER = 10;

// RemoteViews (what this whole tree compiles down to) can't host a text
// input — Android just doesn't support that on home-screen widgets, for any
// app. Tapping a set's weight/reps value instead opens Barrow straight to
// that field via an OPEN_URI click, which the native widget module turns
// into a plain ACTION_VIEW intent (see RNWidgetProvider#openUri) — the same
// "barrow://" scheme already registered for the app. useFocusWidgetDeepLink
// (apps/mobile/src/hooks) parses it back out on the receiving end and
// navigates to ExerciseFocusScreen with the keyboard ready.
function buildFocusDeepLink({ dateKey, workoutId, exerciseId, setId, field }) {
  const params = { dateKey, workoutId, exerciseId, setId, field };
  const query = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `barrow://focus?${query}`;
}

// Lives in its own footer row below the ListWidget (not floating over it —
// this library renders a ListWidget as a real, separately-layered native
// ListView that always sits above any clickable overlay placed over the same
// screen area, swallowing the touch before it reaches it) so it stays fixed
// at the bottom-right no matter how far the list is scrolled. Always acts on
// the current step's primary exercise, rather than needing per-exercise
// buttons for supersets.
function AddSetButton({ clickActionData, tokens }) {
  return <ActionButton label="+ Add set" clickAction="ADD_SET" clickActionData={clickActionData} tokens={tokens} />;
}

function Stepper({ label, value, onMinus, onPlus, minusData, plusData, tapUri, tokens }) {
  return (
    <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
      <FlexWidget
        clickAction={onMinus}
        clickActionData={minusData}
        style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface, borderRadius: 15 }}
      >
        <TextWidget text="–" style={{ fontSize: 19, color: tokens.text }} />
      </FlexWidget>
      {/* Tapping the value itself (rather than +/-) opens the app to type
          an exact number — see buildFocusDeepLink above. */}
      <TextWidget
        text={`${value}${label ? " " + label : ""}`}
        clickAction={tapUri ? "OPEN_URI" : undefined}
        clickActionData={tapUri ? { uri: tapUri } : undefined}
        style={{ fontSize: 16, color: tokens.text, marginHorizontal: 6, width: 70, textAlign: "center" }}
        truncate="END"
      />
      <FlexWidget
        clickAction={onPlus}
        clickActionData={plusData}
        style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface, borderRadius: 15 }}
      >
        <TextWidget text="+" style={{ fontSize: 19, color: tokens.text }} />
      </FlexWidget>
    </FlexWidget>
  );
}

function WarmupToggle({ set, tokens }) {
  return (
    <FlexWidget
      clickAction="TOGGLE_WARMUP"
      clickActionData={{ setId: set.id }}
      accessibilityLabel={set.warmup ? "Unmark warmup set" : "Mark as warmup set"}
      style={{
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: set.warmup ? tokens.accent : tokens.surface,
        borderRadius: 12,
        marginRight: 4,
      }}
    >
      <TextWidget text="W" style={{ fontSize: 13, fontWeight: "700", color: set.warmup ? tokens.onAccent : tokens.textDim }} />
    </FlexWidget>
  );
}

function SetRow({ set, unit, dateKey, workoutId, exerciseId, tokens }) {
  const weightUri = buildFocusDeepLink({ dateKey, workoutId, exerciseId, setId: set.id, field: "weight" });
  const repsUri = buildFocusDeepLink({ dateKey, workoutId, exerciseId, setId: set.id, field: "reps" });
  return (
    <FlexWidget
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: tokens.line,
        width: "match_parent",
      }}
    >
      <WarmupToggle set={set} tokens={tokens} />
      <Stepper value={set.weight || "0"} label={set.unit || unit} onMinus="WEIGHT_MINUS" onPlus="WEIGHT_PLUS" minusData={{ setId: set.id }} plusData={{ setId: set.id }} tapUri={weightUri} tokens={tokens} />
      <Stepper value={set.reps || "0"} label="reps" onMinus="REPS_MINUS" onPlus="REPS_PLUS" minusData={{ setId: set.id }} plusData={{ setId: set.id }} tapUri={repsUri} tokens={tokens} />
      <FlexWidget
        clickAction="REMOVE_SET"
        clickActionData={{ setId: set.id }}
        style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
      >
        <TextWidget text="✕" style={{ fontSize: 17, color: tokens.textDim }} />
      </FlexWidget>
    </FlexWidget>
  );
}

// Renders one row out of buildFocusRows — the flat, sliceable unit
// snapshot.scrollOffset windows into (see ScrollButton in ./primitives).
// Each row carries its own top padding (via firstOfEntry) rather than a
// shared per-entry wrapper, since a superset's header can be scrolled out
// of the visible window while its sets stay in it.
function FocusRow({ row, entryMap, unit, dateKey, workoutId, tokens }) {
  const entry = entryMap[row.exerciseId];
  return (
    <FlexWidget style={{ width: "match_parent", paddingTop: row.firstOfEntry ? 6 : 0 }}>
      {row.type === "header" && (
        <TextWidget text={entry.name} style={{ fontSize: 17, fontWeight: "600", color: tokens.text, marginBottom: 4 }} truncate="END" maxLines={1} />
      )}
      {row.type === "empty" && <TextWidget text="No sets yet" style={{ fontSize: 15, color: tokens.textDim, marginBottom: 4 }} />}
      {row.type === "set" && (
        <SetRow set={row.set} unit={unit} dateKey={dateKey} workoutId={workoutId} exerciseId={row.exerciseId} tokens={tokens} />
      )}
    </FlexWidget>
  );
}

// The step editor — reached either by opening/starting a workout from
// DayBrowseScreen, or (unchanged from before this feature) whenever the app
// itself points barrow:focusPointer here while a workout is being timed.
// Back clears the pointer only if no timer is running (widgetBackFromFocus
// mirrors DayScreen.js's own unmount cleanup), so leaving mid-timed-workout
// never drops it — see BACK_TO_DAY in focusWidgetTaskHandler.js.
export function FocusExerciseScreen({ snapshot, unit, workoutTimerEnabled, workoutTimerStartedAt, confirmingEnd, refreshing, tokens }) {
  const primaryEntry = snapshot.entries[0];
  const entryMap = Object.fromEntries(snapshot.entries.map((entry) => [entry.exerciseId, entry]));
  const rows = buildFocusRows(snapshot.entries, snapshot.isSuperset);
  const visibleRows = rows.slice(snapshot.scrollOffset, snapshot.scrollOffset + FOCUS_SCROLL_PAGE_SIZE);
  const showEndControl = workoutTimerEnabled && workoutTimerStartedAt;

  return (
    <FlexWidget style={{ width: "match_parent", height: "match_parent", backgroundColor: tokens.bg, padding: 16 }}>
      {/* Left column carries Back + title as a row of its own, still inside
          the same 0-width/flex:1 column the center counter's math depends
          on — see the equal-flex-weight comment below. */}
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", paddingBottom: 10 }}>
        <FlexWidget style={{ width: 0, flex: 1, flexDirection: "row", alignItems: "center" }}>
          <NavButton label="‹" clickAction="BACK_TO_DAY" tokens={tokens} />
          <FlexWidget style={{ width: 0, flex: 1, marginLeft: 6 }}>
            <TextWidget
              text={snapshot.title}
              clickAction="OPEN_APP"
              style={{ fontSize: 18, fontWeight: "600", color: tokens.text }}
              truncate="END"
              maxLines={1}
            />
          </FlexWidget>
        </FlexWidget>

        <TextWidget
          text={`${snapshot.stepIndex + 1}/${snapshot.stepCount}`}
          style={{ fontSize: 15, color: tokens.accent }}
        />

        <FlexWidget style={{ width: 0, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
          <NavButton label="Previous" disabled={snapshot.stepIndex === 0} clickAction="PREV_STEP" tokens={tokens} />
          <NavButton label="Next" disabled={snapshot.stepIndex === snapshot.stepCount - 1} clickAction="NEXT_STEP" tokens={tokens} />
        </FlexWidget>
      </FlexWidget>

      {/* height: 0 + flex: 1 (not height: "match_parent") is what actually
          reserves space correctly for the footer below — a match_parent
          middle child measures itself against the FULL remaining height
          with no notion of trailing siblings, pushing the footer past the
          widget's bottom edge where it's clipped and invisible. */}
      <FlexWidget style={{ width: "match_parent", height: 0, flex: 1 }}>
        <ListWidget style={{ width: "match_parent", height: "match_parent" }}>
          {visibleRows.map((row, i) => (
            <FocusRow
              key={row.type === "set" ? row.set.id : `${row.exerciseId}-${row.type}-${i}`}
              row={row}
              entryMap={entryMap}
              unit={unit}
              dateKey={snapshot.dateKey}
              workoutId={snapshot.workoutId}
              tokens={tokens}
            />
          ))}
          <FlexWidget style={{ width: "match_parent", height: LIST_BOTTOM_SPACER }} />
        </ListWidget>
      </FlexWidget>

      {/* Same equal-flex-weight centering trick as the header row above —
          keeps the scroll buttons dead center regardless of the Refresh/Add
          Set buttons' widths, rather than "space-between" which would only
          center them by coincidence. */}
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", paddingTop: 10 }}>
        <FlexWidget style={{ width: 0, flex: 1 }}>
          <RefreshSlot refreshing={refreshing} tokens={tokens} />
        </FlexWidget>

        {rows.length > 1 && (
          <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
            <ScrollButton label="▲" disabled={snapshot.scrollOffset === 0} clickAction="SCROLL_UP" tokens={tokens} />
            <ScrollButton label="▼" disabled={snapshot.scrollOffset >= rows.length - 1} clickAction="SCROLL_DOWN" tokens={tokens} />
          </FlexWidget>
        )}

        <FlexWidget style={{ width: 0, flex: 1, alignItems: "flex-end" }}>
          <AddSetButton clickActionData={{ exerciseId: primaryEntry?.exerciseId || "" }} tokens={tokens} />
        </FlexWidget>
      </FlexWidget>

      {showEndControl && (
        <FlexWidget style={{ width: "match_parent", paddingTop: 10 }}>
          <ActionButton label={confirmingEnd ? "End workout?" : "End workout"} clickAction="END_WORKOUT" tokens={tokens} tone="danger" />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
