import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

// Small unread-indicator dot — no count number, since the 32px header
// avatar it sits on is too small for digits to read cleanly. `borderColor`
// should match the surface behind it (the header bar behind the avatar)
// so the dot reads as a cutout rather than a square edge.
export function NotificationBadge({ size = 10, borderColor, style }) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tokens.danger,
          borderWidth: 1.5,
          borderColor: borderColor || tokens.header,
        },
        style,
      ]}
    />
  );
}
