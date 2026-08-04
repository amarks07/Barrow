import { Pressable, Text } from "react-native";
import { exerciseMeta } from "@barrow/core";
import { Card } from "../ui/Card";
import { ConfirmDeleteButton } from "../ui/ConfirmDeleteButton";
import { useTheme } from "../../theme/ThemeProvider";

export function ExerciseListRow({ ex, onOpen, onDelete }) {
  const { tokens } = useTheme();
  return (
    <Card style={{ padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Pressable onPress={() => onOpen(ex.id)} style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "500", color: tokens.text }} numberOfLines={1}>
          {ex.name}
        </Text>
        <Text style={{ fontSize: 10, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
          {exerciseMeta(ex)}
        </Text>
      </Pressable>
      {ex.custom && <ConfirmDeleteButton onConfirm={() => onDelete(ex.id)} />}
    </Card>
  );
}
