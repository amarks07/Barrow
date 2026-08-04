import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

const STATUS_LABEL = {
  syncing: "Syncing…",
  synced: "Backed up",
  error: "Backup error",
};

// The profile screen is only reachable once signed in (see SignInModal /
// ProfileScreen), so this just shows sync status and a way to sign out.
export function CloudBackupSection({ cloudSync }) {
  const { tokens } = useTheme();
  const { session, status, error, signOut } = cloudSync;
  if (!session) return null;

  return (
    <View className="mt-6 pt-6" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
      <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-3">
        Cloud backup
      </Text>
      <Text style={{ fontSize: 13, color: tokens.text }} className="mb-1">
        Signed in as {session.user.email}
      </Text>
      <Text style={{ fontSize: 11, color: status === "error" ? tokens.danger : tokens.textDim }} className="mb-4">
        {status === "error" && error ? `Backup error: ${error}` : STATUS_LABEL[status] || "Idle"}
      </Text>
      <Button label="Sign out" onPress={signOut} />
    </View>
  );
}
