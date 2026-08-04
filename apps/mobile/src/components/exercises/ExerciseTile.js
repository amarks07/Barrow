import { Pressable, Text } from "react-native";
import { exerciseMeta } from "@barrow/core";
import { Card } from "../ui/Card";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { useTheme } from "../../theme/ThemeProvider";

export function ExerciseTile({ ex, onOpen, onDelete, style }) {
  const { tokens } = useTheme();
  return (
    <Card style={[{ padding: 12, position: "relative" }, style]}>
      <Pressable onPress={() => onOpen(ex.id)}>
        <Text style={{ fontSize: 13, fontWeight: "500", color: tokens.text, paddingRight: 16 }} numberOfLines={2}>
          {ex.name}
        </Text>
        <Text style={{ fontSize: 10, color: tokens.textDim, marginTop: 4 }} numberOfLines={1}>
          {exerciseMeta(ex)}
        </Text>
      </Pressable>
      {ex.custom && (
        <ConfirmDeleteIconButton
          onConfirm={() => onDelete(ex.id)}
          label="Delete custom exercise"
          className="absolute top-2 right-2"
        />
      )}
    </Card>
  );
}
