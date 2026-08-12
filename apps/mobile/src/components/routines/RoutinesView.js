import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { FAB } from "../ui/FAB";
import { RoutineBuilder } from "./RoutineBuilder";
import { ImportRoutineModal } from "./ImportRoutineModal";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function RoutinesView({
  routines, exercises, onCreate, onDelete, onOpenRoutine, onAddCustomExercise, onImportRoutine,
}) {
  const { tokens } = useTheme();
  const [showBuilder, setShowBuilder] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  return (
    <View className="flex-1">
      <View className="px-5 pt-5 pb-3">
        <View className="flex-row items-center justify-between">
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Routines</Text>
          <Button label="Import" onPress={() => setShowImport(true)} />
        </View>
        <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 4, lineHeight: 16 }}>
          A routine is a saved list of exercises — like "Push Day" or "Leg Day" — that you can pull into any workout in one tap
          instead of re-adding each exercise by hand.
        </Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ gap: 8, paddingBottom: 88 }}>
        {routines.length === 0 && (
          <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center" }} className="mt-10">
            No routines yet. Tap + to build one.
          </Text>
        )}
        {routines.map((r) => (
          <Pressable key={r.id} onPress={() => onOpenRoutine(r.id)}>
            <Card style={{ padding: 16, position: "relative" }}>
              <View style={{ paddingRight: 32 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} className="mb-1">
                  {r.name}
                </Text>
                <Text style={{ fontSize: 11, color: tokens.textDim, lineHeight: 16 }}>
                  {r.exerciseIds.length > 0
                    ? r.exerciseIds.map((id) => exMap[id]?.name).filter(Boolean).join(" · ")
                    : "No exercises yet"}
                </Text>
              </View>
              <ConfirmDeleteIconButton onConfirm={() => onDelete(r.id)} label="Delete routine" size={14} className="absolute top-3.5 right-3.5" />
            </Card>
          </Pressable>
        ))}
      </ScrollView>

      <FAB label="New routine" onPress={() => setShowBuilder(true)} />

      {showBuilder && (
        <RoutineBuilder
          exercises={exercises}
          onClose={() => setShowBuilder(false)}
          onSave={(name, ids, supersets) => {
            onCreate(name, ids, supersets);
            setShowBuilder(false);
          }}
          onAddCustomExercise={onAddCustomExercise}
        />
      )}

      {showImport && (
        <ImportRoutineModal
          exercises={exercises}
          onClose={() => setShowImport(false)}
          onImport={(resolved) => {
            onImportRoutine(resolved);
            setShowImport(false);
          }}
        />
      )}
    </View>
  );
}
