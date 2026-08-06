import { convertWeight, roundHalf } from "@barrow/core";
import { Counter } from "./Counter";

export function StrengthFields({ set, unit, onUpdate, autoFocusField }) {
  const weightStep = unit === "kg" ? 2.5 : 5;
  const reps = parseFloat(set.reps) || 0;
  const weight = convertWeight(set.weight, set.unit, unit) || 0;

  return (
    <>
      <Counter
        label={unit.toUpperCase()}
        value={weight}
        onChangeValue={(v) => onUpdate("weight", v)}
        onInc={() => onUpdate("weight", roundHalf(weight + weightStep))}
        onDec={() => onUpdate("weight", roundHalf(Math.max(0, weight - weightStep)))}
        autoFocus={autoFocusField === "weight"}
      />
      <Counter
        label="REPS"
        value={reps}
        onChangeValue={(v) => onUpdate("reps", v)}
        onInc={() => onUpdate("reps", reps + 1)}
        onDec={() => onUpdate("reps", Math.max(0, reps - 1))}
        autoFocus={autoFocusField === "reps"}
      />
    </>
  );
}
