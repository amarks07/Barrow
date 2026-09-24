import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Card } from "./Card";
import { useTheme } from "../../theme/ThemeProvider";

// A tappable row that drills into a sub-screen — label (+ optional
// subtitle) on the left, chevron on the right. Used by Profile's hub screen
// to link out to Profile settings / Biometrics / Notifications. `badge`
// (unread state) is shown by outlining the row in the accent color, same
// as Card's `selected` treatment, rather than a separate dot.
export function MenuRow({ label, subtitle, badge, onPress }) {
  const { tokens } = useTheme();
  return (
    <Card style={{ padding: 14 }} selected={badge}>
      <Pressable onPress={onPress} accessibilityRole="button" className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text style={{ fontSize: 15, fontWeight: "500", color: tokens.text }}>{label}</Text>
          {subtitle ? <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        <ChevronRight size={16} color={tokens.textDim} />
      </Pressable>
    </Card>
  );
}
