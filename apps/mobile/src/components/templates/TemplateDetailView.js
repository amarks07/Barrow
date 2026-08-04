import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, X } from "lucide-react-native";
import { exerciseMeta, shortDayLabel } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { EditableTitle } from "../ui/EditableTitle";
import { Card } from "../ui/Card";
import { ExercisePicker } from "../exercises/ExercisePicker";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function TemplateDetailView({
  template, exercises, workouts, onBack, onDelete, onRename, onSelectDate, onAddExercise, onRemoveExercise, onAddCustomExercise,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  const usedDates = useMemo(() => {
    return Object.entries(workouts)
      .filter(([, dayWorkouts]) => dayWorkouts.some((w) => (w.templateIds || []).includes(template.id)))
      .map(([dateKey]) => dateKey)
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 5);
  }, [workouts, template]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View
        className="flex-row items-center gap-3 px-5 pt-4 pb-4"
        style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
      >
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <View className="flex-1">
          <EditableTitle
            value={template.name}
            onChange={(name) => onRename(template.id, name)}
            textStyle={{ fontFamily: FONT_DISPLAY, fontSize: 19 }}
          />
        </View>
        <ConfirmDeleteIconButton onConfirm={onDelete} label="Delete template" size={16} />
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 + insets.bottom }}>
        <View className="flex-row items-center justify-between mb-2">
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }}>Exercises</Text>
          <Button label="+ Add exercise" onPress={() => setShowPicker(true)} variant="accentOutline" />
        </View>
        {template.exerciseIds.length === 0 ? (
          <Text style={{ fontSize: 13, color: tokens.textDim }} className="mb-6">
            No exercises yet — tap "Add exercise" above.
          </Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} className="mb-6">
            {template.exerciseIds
              .map((id) => exMap[id])
              .filter(Boolean)
              .map((ex) => (
                <Card key={ex.id} style={{ padding: 12, position: "relative", width: "48.5%" }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: tokens.text, paddingRight: 16 }} numberOfLines={2}>
                    {ex.name}
                  </Text>
                  <Text style={{ fontSize: 10, color: tokens.textDim, marginTop: 4 }} numberOfLines={1}>
                    {exerciseMeta(ex)}
                  </Text>
                  <Pressable
                    onPress={() => onRemoveExercise(template.id, ex.id)}
                    accessibilityLabel={`Remove ${ex.name} from template`}
                    hitSlop={8}
                    className="absolute"
                    style={{ top: 4, right: 4, padding: 6 }}
                  >
                    <X size={13} color={tokens.textDim} />
                  </Pressable>
                </Card>
              ))}
          </View>
        )}

        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
          Recent uses
        </Text>
        {usedDates.length === 0 ? (
          <Text style={{ fontSize: 13, color: tokens.textDim }}>Not used yet — pull it into a workout day to get started.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {usedDates.map((dateKey) => (
              <Pressable key={dateKey} onPress={() => onSelectDate(dateKey)}>
                <Card style={{ padding: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: tokens.text }}>{shortDayLabel(dateKey)}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {showPicker && (
        <ExercisePicker
          title="Add to template"
          exercises={exercises}
          exerciseView="grouped"
          setExerciseView={() => {}}
          alreadyPicked={template.exerciseIds}
          onPick={(ex) => onAddExercise(template.id, ex.id)}
          onUnpick={(ex) => onRemoveExercise(template.id, ex.id)}
          onClose={() => setShowPicker(false)}
          onAddCustom={onAddCustomExercise}
          doneLabel="Done"
        />
      )}
    </View>
  );
}
