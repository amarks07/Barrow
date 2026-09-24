import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, User } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { CountdownButton } from "./CountdownButton";
import { NotificationBadge } from "../ui/NotificationBadge";

// Persistent top bar — stays put across calendar/exercises/routines.
// Profile sits far left, wordmark in the middle, preferences gear (plus the
// countdown timer button beside it) sits far right. Absolute positioning was
// tried for the wordmark but behaved unreliably across RN/react-native-web.
// Instead the row is split into three equal flex:1 regions (left-aligned,
// centered, right-aligned) — since the outer regions always match width,
// the wordmark stays pixel-centered no matter how wide the countdown pill
// on the right gets.
export function AppHeader({ profile, signedIn, unreadCount, onOpenProfile, onOpenPreferences }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  // Only shown once signed in — a signed-out session can still have a
  // locally-edited name/leftover picture cached from before signing out,
  // and the generic icon is the clearer "this isn't really you" signal then.
  const initials = signedIn ? `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase() : "";

  return (
    <View
      className="flex-row items-center px-5"
      style={{
        backgroundColor: tokens.header,
        borderBottomWidth: 1.5,
        borderBottomColor: tokens.line,
        paddingTop: insets.top + 24,
        paddingBottom: 16,
      }}
    >
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-start" }}>
        <View style={{ width: 32, height: 32 }}>
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
          {unreadCount > 0 && <NotificationBadge style={{ position: "absolute", top: -1, right: -1 }} />}
        </View>
      </View>

      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: tokens.text }}>BARROW</Text>
      </View>

      {/* Plain inline style, not className="flex-row" — same reasoning as
          IconBtn: RN's default flexDirection is "column", so if Nativewind's
          class compilation hiccups (see ThemeProvider's own note on that),
          this would silently stack instead of sitting beside Settings. */}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
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
