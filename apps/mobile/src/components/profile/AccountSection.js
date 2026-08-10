import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";

// Signed-in identity (username/email + sign out), split out from
// CloudBackupSection so "who am I signed in as" isn't tied to backup/
// premium/lock status — shown above CloudBackupSection whenever there's a
// session, regardless of which of CloudBackupSection's own states (locked,
// free, premium) applies.
export function AccountSection({ cloudSync, profile }) {
  const { tokens } = useTheme();
  const { session, signOut } = cloudSync;

  if (!session) return null;

  return (
    <View className="mt-6 pt-6 flex-row items-center justify-between" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
      <View style={{ flex: 1 }} className="pr-3">
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-1">
          Account
        </Text>
        <Text style={{ fontSize: 13, color: tokens.text }}>Signed in as {profile.username || session.user.email}</Text>
      </View>
      <Button label="Sign out" onPress={signOut} />
    </View>
  );
}
