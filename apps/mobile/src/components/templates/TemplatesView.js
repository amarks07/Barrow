import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { Card } from "../ui/Card";
import { FAB } from "../ui/FAB";
import { TemplateBuilder } from "./TemplateBuilder";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function TemplatesView({ templates, exercises, onCreate, onDelete, onOpenTemplate, onAddCustomExercise }) {
  const { tokens } = useTheme();
  const [showBuilder, setShowBuilder] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  return (
    <View className="flex-1">
      <View className="px-5 pt-5 pb-3">
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Templates</Text>
        <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 4, lineHeight: 16 }}>
          A template is a saved list of exercises — like "Push Day" or "Leg Day" — that you can pull into any workout in one tap
          instead of re-adding each exercise by hand.
        </Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ gap: 8, paddingBottom: 88 }}>
        {templates.length === 0 && (
          <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center" }} className="mt-10">
            No templates yet. Tap + to build one.
          </Text>
        )}
        {templates.map((t) => (
          <Pressable key={t.id} onPress={() => onOpenTemplate(t.id)}>
            <Card style={{ padding: 16, position: "relative" }}>
              <View style={{ paddingRight: 32 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} className="mb-1">
                  {t.name}
                </Text>
                <Text style={{ fontSize: 11, color: tokens.textDim, lineHeight: 16 }}>
                  {t.exerciseIds.length > 0
                    ? t.exerciseIds.map((id) => exMap[id]?.name).filter(Boolean).join(" · ")
                    : "No exercises yet"}
                </Text>
              </View>
              <ConfirmDeleteIconButton onConfirm={() => onDelete(t.id)} label="Delete template" size={14} className="absolute top-3.5 right-3.5" />
            </Card>
          </Pressable>
        ))}
      </ScrollView>

      <FAB label="New template" onPress={() => setShowBuilder(true)} />

      {showBuilder && (
        <TemplateBuilder
          exercises={exercises}
          onClose={() => setShowBuilder(false)}
          onSave={(name, ids, supersets) => {
            onCreate(name, ids, supersets);
            setShowBuilder(false);
          }}
          onAddCustomExercise={onAddCustomExercise}
        />
      )}
    </View>
  );
}
