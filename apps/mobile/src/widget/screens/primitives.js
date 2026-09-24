import { FlexWidget, TextWidget } from "react-native-android-widget";

// Small pieces shared across the widget's three screens (week strip, day
// browse, focus editor) so each one doesn't reimplement its own nav
// button/refresh affordance.

export function NavButton({ label, disabled, clickAction, clickActionData, tokens }) {
  return (
    <FlexWidget
      clickAction={disabled ? undefined : clickAction}
      clickActionData={disabled ? undefined : clickActionData}
      style={{
        paddingHorizontal: 10,
        height: 32,
        backgroundColor: tokens.surface,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
      }}
    >
      <TextWidget text={label} style={{ fontSize: 14, color: disabled ? tokens.textDim : tokens.text }} />
    </FlexWidget>
  );
}

// A real ListView backs ListWidget (see the library's ListWidget.java —
// isCollection() true), but swiping it on an actual placed home-screen
// widget is unreliable: the gesture competes with the launcher's own swipe
// handling and often loses, moving the whole widget instead of scrolling
// the list — a known, unfixed upstream limitation
// (sAleksovski/react-native-android-widget#78, #49). These buttons page
// through rows explicitly instead of depending on that swipe ever landing.
export function ScrollButton({ label, disabled, clickAction, tokens }) {
  return (
    <FlexWidget
      clickAction={disabled ? undefined : clickAction}
      style={{
        width: 32,
        height: 32,
        backgroundColor: tokens.surface,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 4,
      }}
    >
      <TextWidget text={label} style={{ fontSize: 15, color: disabled ? tokens.textDim : tokens.text }} />
    </FlexWidget>
  );
}

// Generic pill used for Start/Resume/End/Add-set style actions across all
// three screens, so each one only picks a label/action/tone rather than
// reimplementing the same pill styling three times.
export function ActionButton({ label, clickAction, clickActionData, tokens, tone = "accent" }) {
  const backgroundColor = tone === "danger" ? tokens.danger : tone === "surface" ? tokens.surface : tokens.accent;
  const color = tone === "danger" ? "#FFFFFF" : tone === "surface" ? tokens.text : tokens.onAccent;
  return (
    <FlexWidget
      clickAction={clickAction}
      clickActionData={clickActionData}
      style={{ paddingHorizontal: 14, height: 40, backgroundColor, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
    >
      <TextWidget text={label} style={{ fontSize: 16, fontWeight: "600", color }} truncate="END" maxLines={1} />
    </FlexWidget>
  );
}

function RefreshButton({ tokens }) {
  return (
    <FlexWidget
      clickAction="REFRESH_WIDGET"
      accessibilityLabel="Refresh"
      style={{
        width: 40,
        height: 40,
        backgroundColor: tokens.surface,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TextWidget text="⟳" style={{ fontSize: 22, color: tokens.text }} />
    </FlexWidget>
  );
}

function RefreshingIndicator({ tokens }) {
  return (
    <FlexWidget
      style={{
        height: 40,
        paddingHorizontal: 12,
        backgroundColor: tokens.surface,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TextWidget text="Refreshing…" style={{ fontSize: 14, fontWeight: "600", color: tokens.text }} maxLines={1} />
    </FlexWidget>
  );
}

export function RefreshSlot({ refreshing, tokens }) {
  return refreshing ? <RefreshingIndicator tokens={tokens} /> : <RefreshButton tokens={tokens} />;
}
