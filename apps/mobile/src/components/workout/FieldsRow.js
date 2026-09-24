import { useState } from "react";
import { convertDistance, convertSpeed, convertWeight, roundHalf } from "@barrow/core";
import { Counter } from "./Counter";
import { WeightEditModal } from "./WeightEditModal";
import { CounterEditModal } from "./CounterEditModal";

const roundTenth = (n) => Math.round(n * 10) / 10;
const identity = (n) => n;

// A field's config `value` is left blank ("" or NaN, depending on the
// source — convertWeight/convertSpeed/convertDistance return "" for an
// empty/unparseable input, parseFloat returns NaN) rather than coerced to 0
// here, so the Counter rendered inside the open edit modal can tell "the
// user cleared this and is still typing" apart from a real 0 and keep the
// input blank instead of snapping to "0" mid-edit. Anything that needs a
// real number (the +/- step math below, the inline row's display-only
// Counter) coerces blank -> 0 itself via `isBlank`.
const isBlank = (v) => v === "" || Number.isNaN(v);

function getFieldConfig(key, set, unit) {
  switch (key) {
    case "weight":
      return { label: unit.toUpperCase(), value: convertWeight(set.weight, set.unit, unit), step: unit === "kg" ? 2.5 : 5, round: roundHalf };
    case "reps":
      return { label: "REPS", value: parseFloat(set.reps), step: 1, round: identity };
    case "time":
      return { label: "MIN", value: parseFloat(set.time), step: 1, round: roundHalf };
    case "speed":
      return { label: unit === "kg" ? "KM/H" : "MPH", value: convertSpeed(set.speed, set.unit, unit), step: unit === "kg" ? 1 : 0.5, round: roundHalf };
    case "distance":
      return { label: unit === "kg" ? "KM" : "MI", value: convertDistance(set.distance, set.unit, unit), step: 0.1, round: roundTenth };
    case "calories":
      return { label: "CAL", value: parseFloat(set.calories), step: 5, round: identity };
    case "rpe":
      return { label: "RPE", value: parseFloat(set.rpe), step: 0.5, round: roundHalf };
    default:
      return null;
  }
}

const EDIT_TITLES = {
  weight: "Edit Weight",
  reps: "Edit Reps",
  time: "Edit Time",
  speed: "Edit Speed",
  distance: "Edit Distance",
  calories: "Edit Calories",
  rpe: "Edit RPE",
};

// Renders one Counter per exercise field (see @barrow/core's FIELD_DEFS) —
// the generalized replacement for the old fixed strength (weight/reps) and
// cardio (time/speed) pairs, now driven by ex.fields so a custom exercise
// can track any combination. Weight keeps its dedicated edit modal (plate
// calculator); every other field shares the generic CounterEditModal.
export function FieldsRow({ fields, set, unit, plateCalculatorEnabled, onUpdate, autoFocusField }) {
  const [openField, setOpenField] = useState(fields.includes(autoFocusField) ? autoFocusField : null);
  const configs = Object.fromEntries(fields.map((key) => [key, getFieldConfig(key, set, unit)]));

  const incDec = (key) => {
    const { value, step, round } = configs[key];
    const numeric = isBlank(value) ? 0 : value;
    return {
      onInc: () => onUpdate(key, round(numeric + step)),
      onDec: () => onUpdate(key, round(Math.max(0, numeric - step))),
    };
  };

  const openConfig = openField ? configs[openField] : null;

  // Closing the modal is when a still-blank field is finally forced to 0 —
  // while the modal's open, blank stays blank (see getFieldConfig's
  // comment) so the user can keep typing a fresh number.
  const closeField = (key) => {
    if (isBlank(configs[key]?.value)) onUpdate(key, 0);
    setOpenField(null);
  };

  return (
    <>
      {fields.map((key) => (
        <Counter
          key={key}
          label={configs[key].label}
          value={isBlank(configs[key].value) ? 0 : configs[key].value}
          onChangeValue={(v) => onUpdate(key, v)}
          {...incDec(key)}
          onPress={() => setOpenField(key)}
        />
      ))}
      {openField === "weight" && openConfig && (
        <WeightEditModal
          weight={openConfig.value}
          unit={unit}
          showPlateCalculator={plateCalculatorEnabled}
          onChangeValue={(v) => onUpdate("weight", v)}
          {...incDec("weight")}
          onClose={() => closeField("weight")}
        />
      )}
      {openField && openField !== "weight" && openConfig && (
        <CounterEditModal
          title={EDIT_TITLES[openField]}
          label={openConfig.label}
          value={openConfig.value}
          onChangeValue={(v) => onUpdate(openField, v)}
          {...incDec(openField)}
          onClose={() => closeField(openField)}
        />
      )}
    </>
  );
}
