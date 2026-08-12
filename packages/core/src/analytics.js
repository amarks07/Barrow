import { convertSpeed, convertWeight, fmtNum, roundHalf } from "./units";
import { flattenWorkouts } from "./workouts";

export function getRepRange(exerciseId, workouts, excludeWorkoutId) {
  let max = 0;
  flattenWorkouts(workouts).forEach(({ workout }) => {
    if (workout.id === excludeWorkoutId) return;
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
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

export function getRecommendation(exerciseId, workouts, unit, excludeWorkoutId, repLow = 8, repHigh = 12) {
  const increment = unit === "kg" ? 2.5 : 5;
  const ordered = flattenWorkouts(workouts).filter(({ workout }) => workout.id !== excludeWorkoutId);

  for (const { dateKey, workout } of ordered) {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) continue;

    const firstSet = entry.sets[0];
    const firstReps = parseFloat(firstSet.reps) || 0;
    if (firstReps <= 0) continue;
    const firstWeight = convertWeight(firstSet.weight, firstSet.unit || unit, unit);
    const top = { weight: firstWeight === "" ? 0 : firstWeight, reps: firstReps };

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
    return {
      basedOn: dateKey,
      lastWeight: top.weight,
      lastReps: top.reps,
      recWeight,
      recReps,
      note,
      side: firstSet.side ?? "both",
      warmup: firstSet.warmup ?? false,
    };
  }
  return null;
}

// Total weight×reps for a given exercise on each day it was logged —
// the "volume" series the history chart plots, most recent 10 sessions.
// A day can hold more than one workout, so same-day volume is summed into
// one point rather than plotted twice (which would collide on the chart).
export function getVolumeSeries(exerciseId, workouts, unit) {
  const byDate = new Map();
  flattenWorkouts(workouts).forEach(({ dateKey, workout }) => {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) return;
    let volume = 0;
    entry.sets.forEach((s) => {
      if (s.warmup) return;
      const wConv = convertWeight(s.weight, s.unit, unit);
      const wNum = wConv === "" ? 0 : wConv;
      const reps = parseFloat(s.reps) || 0;
      volume += wNum * reps;
    });
    byDate.set(dateKey, (byDate.get(dateKey) || 0) + volume);
  });
  const rows = Array.from(byDate, ([dateKey, volume]) => ({ dateKey, volume }));
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}

// Personal-record weight for an exercise, plus the most sets ever done at
// that weight in a single workout — e.g. "225 lb PR · 3 sets (best)".
// `excludeWorkoutId` skips one workout's own entry while scanning — used by
// getWorkoutStats to check whether a session set a new PR against every
// *prior* session, not against itself.
export function getWeightPR(exerciseId, workouts, unit, excludeWorkoutId) {
  const sessions = flattenWorkouts(workouts)
    .filter(({ workout }) => workout.id !== excludeWorkoutId)
    .map(({ workout }) => workout.entries.find((e) => e.exerciseId === exerciseId))
    .filter((entry) => entry && entry.sets.length > 0);

  let maxWeight = 0;
  sessions.forEach((entry) => {
    entry.sets.forEach((s) => {
      if (s.warmup) return;
      const reps = parseFloat(s.reps) || 0;
      if (reps <= 0) return;
      const wConv = convertWeight(s.weight, s.unit, unit);
      const wNum = wConv === "" ? 0 : wConv;
      if (wNum > maxWeight) maxWeight = wNum;
    });
  });
  if (maxWeight <= 0) return null;

  let bestSetCount = 0;
  sessions.forEach((entry) => {
    const count = entry.sets.filter((s) => {
      if (s.warmup) return false;
      const reps = parseFloat(s.reps) || 0;
      if (reps <= 0) return false;
      const wConv = convertWeight(s.weight, s.unit, unit);
      return (wConv === "" ? 0 : wConv) === maxWeight;
    }).length;
    if (count > bestSetCount) bestSetCount = count;
  });

  return { weight: maxWeight, sets: bestSetCount };
}

// Cardio equivalent: total distance (time × speed) per day, most recent
// 10 sessions — the closest thing cardio has to "volume". Same-day workouts
// are summed into one point, as in getVolumeSeries above.
export function getCardioDistanceSeries(exerciseId, workouts, unit) {
  const byDate = new Map();
  flattenWorkouts(workouts).forEach(({ dateKey, workout }) => {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) return;
    let distance = 0;
    entry.sets.forEach((s) => {
      if (s.warmup) return;
      const speedConv = convertSpeed(s.speed, s.unit, unit);
      const speedNum = speedConv === "" ? 0 : speedConv;
      const timeMin = parseFloat(s.time) || 0;
      distance += (timeMin / 60) * speedNum;
    });
    byDate.set(dateKey, (byDate.get(dateKey) || 0) + distance);
  });
  const rows = Array.from(byDate, ([dateKey, volume]) => ({ dateKey, volume }));
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}

// Everything the workout summary screen renders — one pure calculation over
// a single workout (plus the full `workouts` history, needed to tell
// whether a set logged this session is a new PR) so the view component
// stays pure presentation.
export function getWorkoutStats(workout, workouts, exercises, unit) {
  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const entries = (workout?.entries || []).filter((e) => exMap[e.exerciseId]);

  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  let warmupSets = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  const categoryCounts = {};
  const exerciseVolumes = [];
  const prs = [];

  entries.forEach((entry) => {
    const ex = exMap[entry.exerciseId];
    const isStretch = ex.type === "stretch";
    const setCount = isStretch ? ex.stretches?.length || 0 : entry.sets.length;
    if (ex.category) categoryCounts[ex.category] = (categoryCounts[ex.category] || 0) + (setCount || 1);
    if (isStretch) return;

    let exVolume = 0;
    let bestWeight = 0;
    let bestReps = 0;
    entry.sets.forEach((s) => {
      totalSets += 1;
      if (s.warmup) {
        warmupSets += 1;
        return;
      }
      const reps = parseFloat(s.reps) || 0;
      const wConv = convertWeight(s.weight, s.unit, unit);
      const wNum = wConv === "" ? 0 : wConv;
      totalReps += reps;
      exVolume += wNum * reps;
      if (wNum > 0 && reps > 0 && (wNum > bestWeight || (wNum === bestWeight && reps > bestReps))) {
        bestWeight = wNum;
        bestReps = reps;
      }
      const rpe = parseFloat(s.rpe);
      if (!Number.isNaN(rpe)) {
        rpeSum += rpe;
        rpeCount += 1;
      }
    });
    totalVolume += exVolume;
    if (exVolume > 0) exerciseVolumes.push({ exerciseId: ex.id, name: ex.name, volume: exVolume });

    if (bestWeight > 0) {
      const priorPR = getWeightPR(ex.id, workouts, unit, workout.id);
      if (!priorPR || bestWeight > priorPR.weight) {
        prs.push({ exerciseId: ex.id, name: ex.name, weight: bestWeight, reps: bestReps, priorWeight: priorPR?.weight ?? null });
      }
    }
  });

  exerciseVolumes.sort((a, b) => b.volume - a.volume);
  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([category, sets]) => ({ category, sets }))
    .sort((a, b) => b.sets - a.sets);

  return {
    exerciseCount: entries.length,
    totalVolume,
    totalSets,
    totalReps,
    warmupSets,
    avgRpe: rpeCount > 0 ? rpeSum / rpeCount : null,
    durationMs: workout?.startedAt && workout?.endedAt ? Math.max(0, workout.endedAt - workout.startedAt) : null,
    exerciseVolumes,
    categoryBreakdown,
    prs,
  };
}
