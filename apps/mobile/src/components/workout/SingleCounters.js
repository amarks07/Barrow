import { View } from "react-native";
import { FieldsRow } from "./FieldsRow";

// A "single" format exercise gets exactly one fixed row of counters — no
// sets, no warmup, no add/remove. The backing set record is created lazily
// on the first real edit rather than up front, so an exercise that's added
// but never touched still reads as "not logged" to History/WorkoutSummary/
// volume charts, which all key off entry.sets.length.
export function SingleCounters({ entry, ex, unit, plateCalculatorEnabled, onAddSet, onUpdateSet, autoFocusField }) {
  const set = entry.sets[0];

  const onUpdate = (field, value) => {
    if (set) onUpdateSet(entry.exerciseId, set.id, field, value);
    else onAddSet(entry.exerciseId, { [field]: value });
  };

  return (
    <View className="mb-3" style={{ gap: 8 }}>
      <FieldsRow
        fields={ex.fields}
        set={set || { unit }}
        unit={unit}
        plateCalculatorEnabled={plateCalculatorEnabled}
        onUpdate={onUpdate}
        autoFocusField={autoFocusField}
      />
    </View>
  );
}
