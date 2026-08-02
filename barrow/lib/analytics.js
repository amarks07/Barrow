import { convertSpeed, convertWeight, fmtNum, roundHalf } from "./units";

export function getRepRange(exerciseId, workouts, excludeDateKey) {
  let max = 0;
  Object.entries(workouts).forEach(([dateKey, w]) => {
    if (dateKey === excludeDateKey) return;
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) return;
    entry.sets.forEach((s) => {
      const r = parseFloat(s.reps);
      if (!Number.isNaN(r) && r > max) max = r;
    });
  });
  const fromHistory = max > 0;
  const repHigh = fromHistory ? max : 12;
  const repLow = Math.max(repHigh - 4, 1);
  return { repLow, repHigh, fromHistory };
}

export function getRecommendation(exerciseId, workouts, unit, excludeDateKey, repLow = 8, repHigh = 12) {
  const increment = unit === "kg" ? 2.5 : 5;
  const dateKeys = Object.keys(workouts).filter((k) => k !== excludeDateKey).sort((a, b) => (a < b ? 1 : -1));

  for (const dateKey of dateKeys) {
    const entry = workouts[dateKey].entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) continue;

    let top = null;
    entry.sets.forEach((s) => {
      const w = convertWeight(s.weight, s.unit || unit, unit);
      const wNum = w === "" ? 0 : w;
      const repsNum = parseFloat(s.reps) || 0;
      if (repsNum <= 0) return;
      if (!top || wNum > top.weight || (wNum === top.weight && repsNum > top.reps)) {
        top = { weight: wNum, reps: repsNum };
      }
    });
    if (!top) continue;

    let recWeight, recReps, note;
    if (top.reps >= repHigh) {
      recWeight = roundHalf(top.weight + increment);
      recReps = repLow;
      note = `+${fmtNum(increment)} ${unit} · reset reps`;
    } else {
      recWeight = top.weight;
      recReps = Math.min(top.reps + 1, repHigh);
      note = recReps > top.reps ? "+1 rep" : "hold steady";
    }
    return { basedOn: dateKey, lastWeight: top.weight, lastReps: top.reps, recWeight, recReps, note };
  }
  return null;
}

// Total weight×reps for a given exercise on each day it was logged —
// the "volume" series the history chart plots, most recent 10 sessions.
export function getVolumeSeries(exerciseId, workouts, unit) {
  const rows = [];
  Object.entries(workouts).forEach(([dateKey, w]) => {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) return;
    let volume = 0;
    entry.sets.forEach((s) => {
      const wConv = convertWeight(s.weight, s.unit, unit);
      const wNum = wConv === "" ? 0 : wConv;
      const reps = parseFloat(s.reps) || 0;
      volume += wNum * reps;
    });
    rows.push({ dateKey, volume });
  });
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}

// Cardio equivalent: total distance (time × speed) per session, most recent
// 10 sessions — the closest thing cardio has to "volume".
export function getCardioDistanceSeries(exerciseId, workouts, unit) {
  const rows = [];
  Object.entries(workouts).forEach(([dateKey, w]) => {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) return;
    let distance = 0;
    entry.sets.forEach((s) => {
      const speedConv = convertSpeed(s.speed, s.unit, unit);
      const speedNum = speedConv === "" ? 0 : speedConv;
      const timeMin = parseFloat(s.time) || 0;
      distance += (timeMin / 60) * speedNum;
    });
    rows.push({ dateKey, volume: distance });
  });
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}
