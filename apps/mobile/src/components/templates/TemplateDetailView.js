import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { groupIndexOf, runInfo, shortDayLabel } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { EditableTitle } from "../ui/EditableTitle";
import { Card } from "../ui/Card";
import { ExercisePicker } from "../exercises/ExercisePicker";
import { TemplateExerciseRow } from "./TemplateExerciseRow";
import { useDragReorderList } from "../../hooks/useDragReorderList";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function TemplateDetailView({
  template, exercises, workouts, onBack, onDelete, onRename, onSelectDate,
  onAddExercise, onRemoveExercise, onAddCustomExercise, onReorderExercise, onCreateSuperset, onUngroupSuperset,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [supersetMode, setSupersetMode] = useState(false);
  const [supersetSelection, setSupersetSelection] = useState([]);
  const [removeSupersetMode, setRemoveSupersetMode] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  const supersets = template.supersets || [];
  const hasAnyGroup = supersets.length > 0;

  const usedDates = useMemo(() => {
    return Object.entries(workouts)
      .filter(([, dayWorkouts]) => dayWorkouts.some((w) => (w.templateIds || []).includes(template.id)))
      .map(([dateKey]) => dateKey)
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 5);
  }, [workouts, template]);

  const rowRuns = useMemo(() => {
    const groupKey = (id) => {
      const gi = groupIndexOf(supersets, id);
      return gi === -1 ? null : gi;
    };
    return runInfo(template.exerciseIds, groupKey);
  }, [template.exerciseIds, supersets]);

  const { draggingGroupIds, dragOffsetY, shiftForIndex, refCallback, makeRowGesture } = useDragReorderList({
    ids: template.exerciseIds,
    groupOf: (id) => {
      const gi = groupIndexOf(supersets, id);
      return gi === -1 ? null : supersets[gi];
    },
    onReorder: onReorderExercise,
  });

  const cancelSuperset = () => {
    setSupersetMode(false);
    setSupersetSelection([]);
  };

  const saveSuperset = () => {
    if (supersetSelection.length >= 2) onCreateSuperset(supersetSelection);
    setSupersetMode(false);
    setSupersetSelection([]);
  };

  const handleRowTap = (exId) => {
    if (removeSupersetMode) {
      const gi = groupIndexOf(supersets, exId);
      if (gi !== -1) {
        onUngroupSuperset(gi);
        setRemoveSupersetMode(false);
      }
      return;
    }
    if (supersetMode) {
      setSupersetSelection((cur) => (cur.includes(exId) ? cur.filter((id) => id !== exId) : [...cur, exId]));
    }
  };

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

        {(template.exerciseIds.length >= 2 || supersetMode || removeSupersetMode) && (
          <View className="flex-row items-center justify-end gap-2 mb-2">
            {supersetMode ? (
              <>
                <Text style={{ fontSize: 11, color: tokens.textDim, flex: 1 }}>
                  {supersetSelection.length < 2 ? "Select 2+ exercises to group" : `${supersetSelection.length} selected`}
                </Text>
                <Button label="Cancel" onPress={cancelSuperset} />
                <Button label="Save" onPress={saveSuperset} disabled={supersetSelection.length < 2} variant="solid" />
              </>
            ) : removeSupersetMode ? (
              <>
                <Text style={{ fontSize: 11, color: tokens.textDim, flex: 1 }}>Tap an exercise in a superset to remove it</Text>
                <Button label="Cancel" onPress={() => setRemoveSupersetMode(false)} />
              </>
            ) : (
              <>
                <Button label="Create superset" onPress={() => setSupersetMode(true)} />
                {hasAnyGroup && <Button label="Remove superset" onPress={() => setRemoveSupersetMode(true)} />}
              </>
            )}
          </View>
        )}

        {template.exerciseIds.length === 0 ? (
          <Text style={{ fontSize: 13, color: tokens.textDim }} className="mb-6">
            No exercises yet — tap "Add exercise" above.
          </Text>
        ) : (
          <View className="mb-6">
            {template.exerciseIds.map((id, index) => {
              const ex = exMap[id];
              if (!ex) return null;
              return (
                <TemplateExerciseRow
                  key={id}
                  ex={ex}
                  tokens={tokens}
                  run={rowRuns[index]}
                  supersetMode={supersetMode}
                  removeSupersetMode={removeSupersetMode}
                  isSelected={supersetSelection.includes(id)}
                  isDragging={draggingGroupIds.has(id)}
                  dragOffsetY={dragOffsetY}
                  shiftY={shiftForIndex(index)}
                  refCallback={refCallback(id)}
                  gesture={makeRowGesture(id)}
                  onRowTap={() => handleRowTap(id)}
                  onRemove={() => onRemoveExercise(template.id, id)}
                />
              );
            })}
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
