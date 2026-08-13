import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, User } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { CountdownButton } from "./CountdownButton";

// Persistent top bar — stays put across calendar/exercises/routines.
// Profile sits far left, wordmark in the middle, preferences gear (plus the
// countdown timer button beside it) sits far right — all three still plain
// flex-row siblings under justify-between. Absolute positioning was tried
// for the wordmark (to keep it pixel-centered even once the countdown pill
// widens the right side) but behaved unreliably across RN/react-native-web,
// so this trades perfect centering for a layout that's guaranteed to render
// as one row everywhere: the wordmark drifts slightly left of true-center
// while a countdown is running, which is preferable to it landing on its
// own line.
export function AppHeader({ profile, signedIn, onOpenProfile, onOpenPreferences }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  // Only shown once signed in — a signed-out session can still have a
  // locally-edited name/leftover picture cached from before signing out,
  // and the generic icon is the clearer "this isn't really you" signal then.
  const initials = signedIn ? `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase() : "";

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
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          backgroundColor: tokens.surface,
          borderWidth: 1.5,
          borderColor: signedIn ? tokens.accent : tokens.lineStrong,
        }}
      >
        {signedIn && profile?.pictureUrl ? (
          <Image source={{ uri: profile.pictureUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : initials ? (
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 12, color: tokens.accent }}>{initials}</Text>
        ) : (
          <User size={16} color={signedIn ? tokens.accent : tokens.textDim} />
        )}
      </Pressable>

      <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: tokens.text }}>BARROW</Text>

      {/* Plain inline style, not className="flex-row" — same reasoning as
          IconBtn: RN's default flexDirection is "column", so if Nativewind's
          class compilation hiccups (see ThemeProvider's own note on that),
          this would silently stack instead of sitting beside Settings. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <CountdownButton />
        <Pressable
          onPress={onOpenPreferences}
          accessibilityLabel="Preferences"
          className="items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
        >
          <Settings size={16} color={tokens.textDim} />
        </Pressable>
      </View>
    </View>
  );
}
