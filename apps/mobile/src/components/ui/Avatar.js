import { Image, Text, View } from "react-native";
import { User } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Read-only picture/initials/icon circle — same fallback ladder as
// EditableAvatar's inline version, minus the edit affordance, for
// contexts (friend rows, search results) that show someone else's picture
// rather than the signed-in user's own editable one.
export function Avatar({ pictureUrl, firstName, lastName, size = 40 }) {
  const { tokens } = useTheme();
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  return (
    <View
      className="items-center justify-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: 999, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
    >
      {pictureUrl ? (
        <Image source={{ uri: pictureUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : initials ? (
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: size * 0.32, color: tokens.textDim }}>{initials}</Text>
      ) : (
        <User size={size * 0.4} color={tokens.textDim} />
      )}
    </View>
  );
}
