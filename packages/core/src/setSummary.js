import { convertDistance, convertSpeed, convertWeight, fmtNum } from "./units";
import { FIELD_DEFS } from "./fieldDefs";

function fieldText(key, set, unit) {
  switch (key) {
    case "weight":
      return `${fmtNum(convertWeight(set.weight, set.unit, unit))} ${unit}`;
    case "reps":
      return `${fmtNum(set.reps)} reps`;
    case "time":
      return `${fmtNum(set.time)} min`;
    case "speed":
      return `${fmtNum(convertSpeed(set.speed, set.unit, unit))} ${unit === "kg" ? "km/h" : "mph"}`;
    case "distance":
      return `${fmtNum(convertDistance(set.distance, set.unit, unit))} ${unit === "kg" ? "km" : "mi"}`;
    case "calories":
      return `${fmtNum(set.calories)} cal`;
    case "rpe":
      return `${fmtNum(set.rpe)} RPE`;
    default:
      return null;
  }
}

// Builds the compact per-set summary line shown in History/WorkoutSummary,
// driven by which fields the exercise tracks. Reps+weight pair up as
// "12 reps × 135 lb" and time+speed as "20 min @ 6 km/h" — the two familiar
// phrasings from when strength/cardio were hardcoded — with any other
// tracked field (or combination) falling back to a generic " · " join.
export function formatSetLine(set, ex, unit) {
  const remaining = ex.fields.filter((key) => fieldText(key, set, unit) !== null);
  const parts = [];

  if (remaining.includes("reps") && remaining.includes("weight")) {
    parts.push(`${fieldText("reps", set, unit)} × ${fieldText("weight", set, unit)}`);
    remaining.splice(remaining.indexOf("reps"), 1);
    remaining.splice(remaining.indexOf("weight"), 1);
  }
  if (remaining.includes("time") && remaining.includes("speed")) {
    parts.push(`${fieldText("time", set, unit)} @ ${fieldText("speed", set, unit)}`);
    remaining.splice(remaining.indexOf("time"), 1);
    remaining.splice(remaining.indexOf("speed"), 1);
  }
  FIELD_DEFS.forEach(({ key }) => {
    if (remaining.includes(key)) parts.push(fieldText(key, set, unit));
  });

  return parts.join(" · ");
}
