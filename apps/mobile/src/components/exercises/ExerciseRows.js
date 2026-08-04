import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { exerciseMeta } from "@barrow/core";
import { useTheme } from "../../theme/ThemeProvider";

export function ExerciseRows({ items, onPick, onUnpick, alreadyPicked }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((ex) => {
        const picked = alreadyPicked.includes(ex.id);
        return (
          <Pressable
            key={ex.id}
            onPress={() => (picked && onUnpick ? onUnpick(ex) : onPick(ex))}
            style={{
              width: "48.5%",
              padding: 12,
              borderRadius: 10,
              backgroundColor: tokens.surface,
              borderWidth: 1.5,
              borderColor: picked ? tokens.accent : "rgba(0,0,0,0.3)",
              opacity: picked ? 0.7 : 1,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "500", color: tokens.text, paddingRight: 16 }} numberOfLines={2}>
              {ex.name}
            </Text>
            <Text style={{ fontSize: 10, color: tokens.textDim, marginTop: 4 }} numberOfLines={1}>
              {exerciseMeta(ex)}
            </Text>
            {picked && <Check size={13} color={tokens.accent} style={{ position: "absolute", top: 10, right: 10 }} />}
          </Pressable>
        );
      })}
    </View>
  );
}
