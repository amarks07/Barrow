import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { Card } from "../ui/Card";
import { FAB } from "../ui/FAB";
import { StretchRoutineModal } from "./StretchRoutineModal";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// The Stretches tab: browse/create home for stretch routines (a named,
// ordered list of poses each with its own hold time). Tapping a routine
// navigates into StretchRoutineDetailView to actually run its countdowns —
// editing happens from a pencil button there, not from tapping the card
// here. Kept off the regular Exercises tab and out of ExercisePicker
// entirely: a stretch routine isn't an exercise you pull into a workout.
export function StretchRoutinesView({ stretchRoutines, onCreate, onOpenRoutine, onDelete }) {
  const { tokens } = useTheme();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <View className="flex-1">
      <View className="px-5 pt-5 pb-3">
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Stretches</Text>
        <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 4, lineHeight: 16 }}>
          A stretch routine is a named list of poses, each with its own hold time — tap one to run through it and start
          the countdowns.
        </Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ gap: 8, paddingBottom: 88 }}>
        {stretchRoutines.length === 0 && (
          <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center" }} className="mt-10">
            No stretch routines yet. Tap + to build one.
          </Text>
        )}
        {stretchRoutines.map((r) => (
          <Pressable key={r.id} onPress={() => onOpenRoutine(r.id)}>
            <Card style={{ padding: 16, position: "relative" }}>
              <View style={{ paddingRight: 32 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} className="mb-1">
                  {r.name}
                </Text>
                <Text style={{ fontSize: 11, color: tokens.textDim, lineHeight: 16 }} numberOfLines={2}>
                  {r.stretches.length > 0 ? r.stretches.map((s) => s.name).join(" · ") : "No poses yet"}
                </Text>
              </View>
              <ConfirmDeleteIconButton
                onConfirm={() => onDelete(r.id)}
                label="Delete stretch routine"
                size={14}
                className="absolute top-3.5 right-3.5"
              />
            </Card>
          </Pressable>
        ))}
      </ScrollView>

      <FAB label="New stretch routine" onPress={() => setShowCreate(true)} />

      {showCreate && (
        <StretchRoutineModal
          onClose={() => setShowCreate(false)}
          onSave={(name, stretches) => {
            onCreate(name, stretches);
            setShowCreate(false);
          }}
        />
      )}
    </View>
  );
}
