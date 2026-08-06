import { FlexWidget, TextWidget, ListWidget } from "react-native-android-widget";

// Renders the Android home screen widget as native RemoteViews (via
// react-native-android-widget's JSX-to-RemoteViews compiler) from a
// packages/core focusStorage.readFocusSnapshot() result. Pure — the task
// handler (focusWidgetTaskHandler.js) does all the reading/mutating and
// just calls props.renderWidget(<FocusWidget snapshot={...} />).
//
// Every set row exposes its own reps/weight +/-, warmup toggle, and delete
// tap targets (clickActionData carries the setId) rather than acting on one
// implicit "active" set, since a resized widget can show every set on every
// exercise in the current step, not just one.

const BG = "#121214";
const SURFACE = "#1b1b1f";
const LINE = "#2a2a2e";
const TEXT = "#f4f4f5";
const TEXT_DIM = "#8b8b90";
const ACCENT = "#e8542a";

// Small gap at the bottom of the (scrolling) sets list, inside the
// ListWidget's own children, so the last row doesn't sit flush against the
// Add Set footer below it — see the spacer FlexWidget in FocusWidget.
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

function NavButton({ label, disabled, clickAction }) {
  return (
    <FlexWidget
      clickAction={disabled ? undefined : clickAction}
      style={{
        paddingHorizontal: 10,
        height: 28,
        backgroundColor: SURFACE,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
      }}
    >
      <TextWidget text={label} style={{ fontSize: 12, color: disabled ? TEXT_DIM : TEXT }} />
    </FlexWidget>
  );
}

// Lives in its own footer row below the ListWidget (not floating over it —
// this library renders a ListWidget as a real, separately-layered native
// ListView that always sits above any clickable overlay placed over the same
// screen area, swallowing the touch before it reaches it) so it stays fixed
// at the bottom-right no matter how far the list is scrolled. Always acts on
// the current step's primary exercise — same convention the notification's
// 3-button cap already uses (see focusNotification.js) — rather than needing
// per-exercise buttons for supersets.
function AddSetButton({ clickActionData }) {
  return (
    <FlexWidget
      clickAction="ADD_SET"
      clickActionData={clickActionData}
      style={{
        paddingHorizontal: 14,
        height: 40,
        backgroundColor: ACCENT,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TextWidget text="+ Add set" style={{ fontSize: 14, fontWeight: "600", color: TEXT }} />
    </FlexWidget>
  );
}

function Stepper({ label, value, onMinus, onPlus, minusData, plusData, tapUri }) {
  return (
    <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
      <FlexWidget
        clickAction={onMinus}
        clickActionData={minusData}
        style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: SURFACE, borderRadius: 15 }}
      >
        <TextWidget text="–" style={{ fontSize: 17, color: TEXT }} />
      </FlexWidget>
      {/* Tapping the value itself (rather than +/-) opens the app to type
          an exact number — see buildFocusDeepLink above. */}
      <TextWidget
        text={`${value}${label ? " " + label : ""}`}
        clickAction={tapUri ? "OPEN_URI" : undefined}
        clickActionData={tapUri ? { uri: tapUri } : undefined}
        style={{ fontSize: 14, color: TEXT, marginHorizontal: 6, width: 62, textAlign: "center" }}
        truncate="END"
      />
      <FlexWidget
        clickAction={onPlus}
        clickActionData={plusData}
        style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: SURFACE, borderRadius: 15 }}
      >
        <TextWidget text="+" style={{ fontSize: 17, color: TEXT }} />
      </FlexWidget>
    </FlexWidget>
  );
}

function WarmupToggle({ set }) {
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
        backgroundColor: set.warmup ? ACCENT : SURFACE,
        borderRadius: 12,
        marginRight: 4,
      }}
    >
      <TextWidget text="W" style={{ fontSize: 11, fontWeight: "700", color: set.warmup ? TEXT : TEXT_DIM }} />
    </FlexWidget>
  );
}

function SetRow({ set, unit, dateKey, workoutId, exerciseId }) {
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
        borderBottomColor: LINE,
        width: "match_parent",
      }}
    >
      <WarmupToggle set={set} />
      <Stepper value={set.weight || "0"} label={set.unit || unit} onMinus="WEIGHT_MINUS" onPlus="WEIGHT_PLUS" minusData={{ setId: set.id }} plusData={{ setId: set.id }} tapUri={weightUri} />
      <Stepper value={set.reps || "0"} label="reps" onMinus="REPS_MINUS" onPlus="REPS_PLUS" minusData={{ setId: set.id }} plusData={{ setId: set.id }} tapUri={repsUri} />
      <FlexWidget
        clickAction="REMOVE_SET"
        clickActionData={{ setId: set.id }}
        style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
      >
        <TextWidget text="✕" style={{ fontSize: 15, color: TEXT_DIM }} />
      </FlexWidget>
    </FlexWidget>
  );
}

function ExerciseBlock({ entry, unit, showName, dateKey, workoutId }) {
  return (
    <FlexWidget style={{ width: "match_parent", paddingVertical: 6 }}>
      {showName && (
        <TextWidget text={entry.name} style={{ fontSize: 15, fontWeight: "600", color: TEXT, marginBottom: 4 }} truncate="END" maxLines={1} />
      )}
      {entry.sets.length === 0 && <TextWidget text="No sets yet" style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 4 }} />}
      {entry.sets.map((set) => (
        <SetRow key={set.id} set={set} unit={unit} dateKey={dateKey} workoutId={workoutId} exerciseId={entry.exerciseId} />
      ))}
    </FlexWidget>
  );
}

function RefreshButton() {
  return (
    <FlexWidget
      clickAction="REFRESH_WIDGET"
      accessibilityLabel="Refresh"
      style={{
        width: 40,
        height: 40,
        backgroundColor: SURFACE,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TextWidget text="⟳" style={{ fontSize: 19, color: TEXT }} />
    </FlexWidget>
  );
}

function EmptyState() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ width: "match_parent", height: "match_parent", backgroundColor: BG, padding: 16 }}
    >
      <FlexWidget style={{ width: "match_parent", alignItems: "center", paddingBottom: 10 }}>
        <TextWidget text="Barrow" style={{ fontSize: 18, fontWeight: "600", color: TEXT }} />
      </FlexWidget>

      {/* height: 0 + flex: 1, same trick as the sets list below — centers
          the helper text in the remaining space under the title row. */}
      <FlexWidget style={{ width: "match_parent", height: 0, flex: 1, alignItems: "center", justifyContent: "center" }}>
        <TextWidget
          text="Open a workout in the app to manage a session in this widget."
          style={{ fontSize: 14, color: TEXT_DIM, textAlign: "center" }}
          maxLines={3}
        />
      </FlexWidget>

      {/* Refresh has to work from here too — this is the view a stale
          widget gets stuck showing, so it can't depend on already being in
          the (only reachable from) workout view to escape a bad read. Its
          own clickAction claims its bounds before the root's OPEN_APP does,
          same as the title/nav buttons layered over the root in the
          workout view below. */}
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "flex-start", paddingTop: 10 }}>
        <RefreshButton />
      </FlexWidget>
    </FlexWidget>
  );
}

export function FocusWidget({ snapshot, unit }) {
  if (!snapshot) return <EmptyState />;

  const primaryEntry = snapshot.entries[0];

  return (
    <FlexWidget style={{ width: "match_parent", height: "match_parent", backgroundColor: BG, padding: 16 }}>
      {/* Left/right columns both start from a 0-width base with equal flex
          weight, so they split the row's leftover space exactly evenly —
          that's what puts the counter at the true horizontal center
          regardless of title or button width, not just "space-between". */}
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", paddingBottom: 10 }}>
        <FlexWidget style={{ width: 0, flex: 1 }}>
          <TextWidget
            text={snapshot.title}
            clickAction="OPEN_APP"
            style={{ fontSize: 17, fontWeight: "600", color: TEXT }}
            truncate="END"
            maxLines={1}
          />
        </FlexWidget>

        <TextWidget
          text={`${snapshot.stepIndex + 1}/${snapshot.stepCount}`}
          style={{ fontSize: 13, color: ACCENT }}
        />

        <FlexWidget style={{ width: 0, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
          <NavButton label="Previous" disabled={snapshot.stepIndex === 0} clickAction="PREV_STEP" />
          <NavButton label="Next" disabled={snapshot.stepIndex === snapshot.stepCount - 1} clickAction="NEXT_STEP" />
        </FlexWidget>
      </FlexWidget>

      {/* height: 0 + flex: 1 (not height: "match_parent") is what actually
          reserves space correctly for the footer below — a match_parent
          middle child measures itself against the FULL remaining height
          with no notion of trailing siblings, pushing the footer past the
          widget's bottom edge where it's clipped and invisible. */}
      <FlexWidget style={{ width: "match_parent", height: 0, flex: 1 }}>
        <ListWidget style={{ width: "match_parent", height: "match_parent" }}>
          {snapshot.entries.map((entry) => (
            <ExerciseBlock
              key={entry.exerciseId}
              entry={entry}
              unit={unit}
              showName={snapshot.isSuperset}
              dateKey={snapshot.dateKey}
              workoutId={snapshot.workoutId}
            />
          ))}
          <FlexWidget style={{ width: "match_parent", height: LIST_BOTTOM_SPACER }} />
        </ListWidget>
      </FlexWidget>

      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
        <RefreshButton />
        <AddSetButton clickActionData={{ exerciseId: primaryEntry?.exerciseId || "" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
