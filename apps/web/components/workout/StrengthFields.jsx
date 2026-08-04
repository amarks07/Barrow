"use client";

import { Counter } from "./Counter";
import { convertWeight, roundHalf } from "../../lib/units";

export function StrengthFields({ set, unit, onUpdate }) {
  const weightStep = unit === "kg" ? 2.5 : 5;
  const reps = parseFloat(set.reps) || 0;
  const weight = convertWeight(set.weight, set.unit, unit) || 0;

  return (
    <>
      <Counter
        label={unit.toUpperCase()}
        value={weight}
        onChange={(e) => onUpdate("weight", e.target.value)}
        onInc={() => onUpdate("weight", roundHalf(weight + weightStep))}
        onDec={() => onUpdate("weight", roundHalf(Math.max(0, weight - weightStep)))}
      />
      <Counter
        label="REPS"
        value={reps}
        onChange={(e) => onUpdate("reps", e.target.value)}
        onInc={() => onUpdate("reps", reps + 1)}
        onDec={() => onUpdate("reps", Math.max(0, reps - 1))}
      />
    </>
  );
}
