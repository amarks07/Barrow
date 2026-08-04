import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, User } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Persistent top bar — stays put across calendar/exercises/templates.
// Profile sits far left, wordmark visually centered (both side buttons are
// the same 32x32 size, so justify-between centers it same as the web
// grid's `1fr auto 1fr`), preferences gear sits far right.
export function AppHeader({ profile, onOpenProfile, onOpenPreferences }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between px-5"
      style={{
        backgroundColor: tokens.header,
        borderBottomWidth: 1.5,
        borderBottomColor: tokens.line,
        paddingTop: insets.top + 24,
        paddingBottom: 16,
      }}
    >
      <Pressable
        onPress={onOpenProfile}
        accessibilityLabel="Profile"
        className="items-center justify-center overflow-hidden"
        style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
      >
        {profile?.pictureUrl ? (
          <Image source={{ uri: profile.pictureUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <User size={16} color={tokens.textDim} />
        )}
      </Pressable>

      <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: tokens.text }}>BARROW</Text>

      <Pressable
        onPress={onOpenPreferences}
        accessibilityLabel="Preferences"
        className="items-center justify-center"
        style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
      >
        <Settings size={16} color={tokens.textDim} />
      </Pressable>
    </View>
  );
}
