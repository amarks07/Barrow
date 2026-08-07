import { convertSpeed, roundHalf } from "@barrow/core";
import { Counter } from "./Counter";

export function CardioFields({ set, unit, onUpdate, autoFocusField }) {
  const speedStep = unit === "kg" ? 1 : 0.5;
  const time = parseFloat(set.time) || 0;
  const speed = convertSpeed(set.speed, set.unit, unit) || 0;
  const speedLabel = unit === "kg" ? "KM/H" : "MPH";

  return (
    <>
      <Counter
        label="MIN"
        value={time}
        onChangeValue={(v) => onUpdate("time", v)}
        onInc={() => onUpdate("time", roundHalf(time + 1))}
        onDec={() => onUpdate("time", roundHalf(Math.max(0, time - 1)))}
        autoFocus={autoFocusField === "time"}
      />
      <Counter
        label={speedLabel}
        value={speed}
        onChangeValue={(v) => onUpdate("speed", v)}
        onInc={() => onUpdate("speed", roundHalf(speed + speedStep))}
        onDec={() => onUpdate("speed", roundHalf(Math.max(0, speed - speedStep)))}
        autoFocus={autoFocusField === "speed"}
      />
    </>
  );
}
