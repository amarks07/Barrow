"use client";

import { Counter } from "./Counter";
import { convertSpeed, roundHalf } from "../../lib/units";

export function CardioFields({ set, unit, onUpdate }) {
  const speedStep = unit === "kg" ? 1 : 0.5;
  const time = parseFloat(set.time) || 0;
  const speed = convertSpeed(set.speed, set.unit, unit) || 0;
  const speedLabel = unit === "kg" ? "KM/H" : "MPH";

  return (
    <>
      <Counter
        label="MIN"
        value={time}
        onChange={(e) => onUpdate("time", e.target.value)}
        onDec={() => onUpdate("time", roundHalf(Math.max(0, time - 1)))}
        plusButtons={[
          { label: "+5", onClick: () => onUpdate("time", roundHalf(time + 5)) },
          { label: "+1", onClick: () => onUpdate("time", roundHalf(time + 1)) },
        ]}
      />
      <Counter
        label={speedLabel}
        value={speed}
        onChange={(e) => onUpdate("speed", e.target.value)}
        onInc={() => onUpdate("speed", roundHalf(speed + speedStep))}
        onDec={() => onUpdate("speed", roundHalf(Math.max(0, speed - speedStep)))}
      />
    </>
  );
}
