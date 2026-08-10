import { useState } from "react";
import { convertWeight, roundHalf } from "@barrow/core";
import { Counter } from "./Counter";
import { WeightEditModal } from "./WeightEditModal";
import { CounterEditModal } from "./CounterEditModal";

export function StrengthFields({ set, unit, plateCalculatorEnabled, onUpdate, autoFocusField }) {
  const weightStep = unit === "kg" ? 2.5 : 5;
  const reps = parseFloat(set.reps) || 0;
  const weight = convertWeight(set.weight, set.unit, unit) || 0;

  // Each opens immediately when a deep link (the Focus widget's tiles)
  // lands here wanting that field focused, same as the inline TextInputs'
  // old autoFocus used to.
  const [weightModalOpen, setWeightModalOpen] = useState(autoFocusField === "weight");
  const [repsModalOpen, setRepsModalOpen] = useState(autoFocusField === "reps");

  return (
    <>
      <Counter
        label={unit.toUpperCase()}
        value={weight}
        onChangeValue={(v) => onUpdate("weight", v)}
        onInc={() => onUpdate("weight", roundHalf(weight + weightStep))}
        onDec={() => onUpdate("weight", roundHalf(Math.max(0, weight - weightStep)))}
        onPress={() => setWeightModalOpen(true)}
      />
      <Counter
        label="REPS"
        value={reps}
        onChangeValue={(v) => onUpdate("reps", v)}
        onInc={() => onUpdate("reps", reps + 1)}
        onDec={() => onUpdate("reps", Math.max(0, reps - 1))}
        onPress={() => setRepsModalOpen(true)}
      />
      {weightModalOpen && (
        <WeightEditModal
          weight={weight}
          unit={unit}
          showPlateCalculator={plateCalculatorEnabled}
          onChangeValue={(v) => onUpdate("weight", v)}
          onInc={() => onUpdate("weight", roundHalf(weight + weightStep))}
          onDec={() => onUpdate("weight", roundHalf(Math.max(0, weight - weightStep)))}
          onClose={() => setWeightModalOpen(false)}
        />
      )}
      {repsModalOpen && (
        <CounterEditModal
          title="Edit Reps"
          label="REPS"
          value={reps}
          onChangeValue={(v) => onUpdate("reps", v)}
          onInc={() => onUpdate("reps", reps + 1)}
          onDec={() => onUpdate("reps", Math.max(0, reps - 1))}
          onClose={() => setRepsModalOpen(false)}
        />
      )}
    </>
  );
}
