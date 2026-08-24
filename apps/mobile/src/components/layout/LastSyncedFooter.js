import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "../../state/AppStateProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_SANS } from "../../theme/fonts";

function formatLastSynced(ts) {
  const d = new Date(ts);
  const datePart = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

// Mounted once in App.js, as a normal (non-absolute) sibling below the flex:1
// View holding navigation/modals/WorkoutTimerBadge — see App.js's own
// comment for why. Being a real flow element, not a floating overlay, means
// it occupies its own row and everything else is laid out above it, so
// nothing (tab bar, scroll content, modals) ever renders underneath/behind
// it. Visible across every route — tabs, Day/History/RoutineDetail, and the
// Profile/Preferences modals alike — without needing to be threaded into
// each screen individually. Renders nothing (and reserves no space) until
// the first successful cloud push/pull has actually stamped lastSyncedAt
// (see useCloudSync's setLastSyncedAt), e.g. a guest who's never signed in.
export function LastSyncedFooter() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { lastSyncedAt } = useAppState();

  if (!lastSyncedAt) return null;

  return (
    <View
      style={{
        alignItems: "center",
        paddingTop: 4,
        paddingBottom: Math.max(insets.bottom, 6),
        backgroundColor: tokens.bg,
        borderTopWidth: 1,
        borderTopColor: tokens.line,
      }}
    >
      <Text style={{ fontFamily: FONT_SANS, fontSize: 10, color: tokens.textDim }}>
        Last synced at {formatLastSynced(lastSyncedAt)}
      </Text>
    </View>
  );
}
