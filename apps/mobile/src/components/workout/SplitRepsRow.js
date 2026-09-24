import { useState } from "react";
import { View } from "react-native";
import { Counter } from "./Counter";
import { CounterEditModal } from "./CounterEditModal";

// See StrengthFields' matching comment: "" (blank input) or NaN (unparseable)
// both mean "blank", kept distinct from a real 0.
const isBlank = (v) => v === "" || Number.isNaN(v);

const SIDES = [
  { field: "repsLeft", label: "L REPS", title: "Edit Left Reps" },
  { field: "repsRight", label: "R REPS", title: "Edit Right Reps" },
];

// The "separate" half of a set (see SideToggle): reps tracked independently
// per side instead of shared, rendered as two half-width counters sharing
// one row — unlike every other field, which is its own full-width row (see
// FieldsRow) — since together they're still one rep count conceptually.
// Weight (and any other field) stays a single shared full-width Counter
// above this, rendered separately by SetCounters via FieldsRow.
// workoutMutations' updateSet keeps the set's plain `reps` field synced to
// repsLeft + repsRight on every change here, so volume/PR/history
// calculations elsewhere never need to know about the split.
export function SplitRepsRow({ set, onUpdate, autoFocusField }) {
  const [openField, setOpenField] = useState(SIDES.some((s) => s.field === autoFocusField) ? autoFocusField : null);

  const values = Object.fromEntries(
    SIDES.map(({ field }) => {
      const parsed = parseFloat(set[field]);
      return [field, parsed];
    })
  );

  const closeField = (field) => {
    if (isBlank(values[field])) onUpdate(field, 0);
    setOpenField(null);
  };

  const openSide = SIDES.find((s) => s.field === openField);

  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {SIDES.map(({ field, label }) => {
          const numeric = isBlank(values[field]) ? 0 : values[field];
          return (
            <View key={field} style={{ flex: 1 }}>
              <Counter
                label={label}
                value={numeric}
                onChangeValue={(v) => onUpdate(field, v)}
                onInc={() => onUpdate(field, numeric + 1)}
                onDec={() => onUpdate(field, Math.max(0, numeric - 1))}
                onPress={() => setOpenField(field)}
              />
            </View>
          );
        })}
      </View>
      {openSide &&
        (() => {
          const numeric = isBlank(values[openSide.field]) ? 0 : values[openSide.field];
          return (
            <CounterEditModal
              title={openSide.title}
              label={openSide.label}
              value={values[openSide.field]}
              onChangeValue={(v) => onUpdate(openSide.field, v)}
              onInc={() => onUpdate(openSide.field, numeric + 1)}
              onDec={() => onUpdate(openSide.field, Math.max(0, numeric - 1))}
              onClose={() => closeField(openSide.field)}
            />
          );
        })()}
    </>
  );
}
