import { FlexWidget, TextWidget } from "react-native-android-widget";
import { toKey } from "@barrow/core";
import { NavButton, ActionButton, RefreshSlot } from "./primitives";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

// "Sep 7 – 13" style range for the header — purely presentational, so kept
// local rather than added to packages/core's date helpers.
function weekRangeLabel(weekCursor) {
  const [y, m, d] = weekCursor.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function DayCell({ dateKey, dots, isToday, tokens }) {
  const dayNum = Number(dateKey.split("-")[2]);
  return (
    // `gap` isn't translated by react-native-android-widget's RemoteViews
    // compiler (unlike the in-app RN CalendarGrid, which can rely on real
    // Yoga flexbox) — the container's measured height didn't account for
    // it, so the dots row clipped/overlapped into the next widget row.
    // Explicit margins on each spaced child are what the rest of this
    // widget already uses successfully (see NavButton/SetRow in
    // ./primitives.js and FocusExerciseScreen.js).
    <FlexWidget
      clickAction="SELECT_DAY"
      clickActionData={{ dateKey }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 }}
    >
      <FlexWidget
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: isToday ? 1.5 : 0,
          borderColor: tokens.accent,
        }}
      >
        <TextWidget
          text={String(dayNum)}
          style={{
            fontSize: 14,
            color: isToday ? tokens.accent : dots.length > 0 ? tokens.text : tokens.textDim,
            fontWeight: isToday ? "700" : "400",
          }}
        />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "row", height: 4, marginTop: 8 }}>
        {dots.map((status, i) => (
          <FlexWidget
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              marginLeft: i === 0 ? 0 : 2,
              backgroundColor: status === "done" ? tokens.accent : status === "empty" ? tokens.text : tokens.textDim,
            }}
          />
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

// The widget's new default/home screen — a 7-day strip for the week in
// `weekCursor`, replacing the old "open a workout in the app" empty state.
// Tapping a day goes to DayBrowseScreen; the Resume pill surfaces whenever
// barrow:focusPointer currently resolves (see resolveWidgetState/resumable
// in packages/core focusStorage.js), regardless of how the user navigated
// away from it.
export function WeekStripScreen({ weekCursor, days, resumable, refreshing, tokens }) {
  const todayKey = toKey(new Date());

  return (
    <FlexWidget style={{ width: "match_parent", height: "match_parent", backgroundColor: tokens.bg, padding: 16 }}>
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", paddingBottom: 8 }}>
        <FlexWidget style={{ width: 0, flex: 1 }}>
          <TextWidget
            text="Barrow"
            clickAction="OPEN_APP"
            style={{ fontSize: 19, fontWeight: "600", color: tokens.text }}
          />
        </FlexWidget>
        <TextWidget text={weekRangeLabel(weekCursor)} style={{ fontSize: 13, color: tokens.textDim }} />
        <FlexWidget style={{ width: 0, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
          <NavButton label="‹" clickAction="WEEK_PREV" tokens={tokens} />
          <NavButton label="›" clickAction="WEEK_NEXT" tokens={tokens} />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget style={{ width: "match_parent", flexDirection: "row" }}>
        {WEEKDAY_LETTERS.map((w, i) => (
          <FlexWidget key={i} style={{ flex: 1, alignItems: "center" }}>
            <TextWidget text={w} style={{ fontSize: 11, color: tokens.textDim }} />
          </FlexWidget>
        ))}
      </FlexWidget>

      <FlexWidget style={{ width: "match_parent", flexDirection: "row" }}>
        {days.map((day) => (
          <DayCell key={day.dateKey} dateKey={day.dateKey} dots={day.dots} isToday={day.dateKey === todayKey} tokens={tokens} />
        ))}
      </FlexWidget>

      {resumable && (
        <FlexWidget style={{ width: "match_parent", paddingTop: 12 }}>
          <ActionButton label={`Resume: ${resumable.title}`} clickAction="RESUME_WORKOUT" tokens={tokens} />
        </FlexWidget>
      )}

      {/* height: 0 + flex: 1 reserves the remaining space so the footer
          below always sits at the bottom regardless of whether the Resume
          pill is showing — same trick FocusExerciseScreen uses for its
          sets list. */}
      <FlexWidget style={{ width: "match_parent", height: 0, flex: 1 }} />

      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "flex-start" }}>
        <RefreshSlot refreshing={refreshing} tokens={tokens} />
      </FlexWidget>
    </FlexWidget>
  );
}
