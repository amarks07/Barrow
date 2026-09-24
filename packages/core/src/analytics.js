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

// Double-progression recommendation: within a rep range, you climb reps at
// the same weight until every working set reaches the top of the range,
// then add weight and drop back to the bottom of the range and repeat.
// "Working sets" excludes warmups; the weight compared against the range is
// the heaviest one actually trained last session (ignoring lighter
// back-off/pyramid sets below it) — only sets done AT that top weight are
// checked against repHigh, so a session with a heavy top set plus lighter
// back-off sets is judged on the top set alone, same as most progressive-
// overload programs define "did you hit the top of the range."
export function getRecommendation(exerciseId, workouts, unit, excludeWorkoutId, repLow = 8, repHigh = 12) {
  const increment = unit === "kg" ? 2.5 : 5;
  const ordered = flattenWorkouts(workouts).filter(({ workout }) => workout.id !== excludeWorkoutId);

  for (const { dateKey, workout } of ordered) {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) continue;

    const workingSets = entry.sets
      .filter((s) => !s.warmup)
      .map((s) => {
        const wConv = convertWeight(s.weight, s.unit || unit, unit);
        return { reps: parseFloat(s.reps) || 0, weight: wConv === "" ? 0 : wConv, side: s.side };
      })
      .filter((s) => s.reps > 0);
    if (workingSets.length === 0) continue;

    const topWeight = Math.max(...workingSets.map((s) => s.weight));
    const setsAtTopWeight = workingSets.filter((s) => s.weight === topWeight);
    // The limiting set: the fewest reps done at the top weight — every set
    // at that weight has to clear repHigh before weight goes up, so this is
    // the one still holding the exercise back.
    const minRepsAtTopWeight = Math.min(...setsAtTopWeight.map((s) => s.reps));
    const limitingSet = setsAtTopWeight.find((s) => s.reps === minRepsAtTopWeight);

    let recWeight, recReps, note;
    if (minRepsAtTopWeight >= repHigh) {
      // Every set at the top weight already hit the top of the range — add
      // weight and reset to the bottom of the range.
      recWeight = roundHalf(topWeight + increment);
      recReps = repLow;
      note = `+${fmtNum(increment)} ${unit} · reset to ${repLow} reps`;
    } else {
      // Not every set has reached the top of the range yet — hold the same
      // (top) weight from last time and push the limiting set one rep
      // further, never past the top of the range.
      recWeight = topWeight;
      recReps = Math.min(minRepsAtTopWeight + 1, repHigh);
      note = recReps > minRepsAtTopWeight ? "+1 rep · same weight" : "hold steady";
    }

    return {
      basedOn: dateKey,
      lastWeight: topWeight,
      lastReps: minRepsAtTopWeight,
      recWeight,
      recReps,
      note,
      side: limitingSet?.side ?? "together",
      warmup: false,
    };
  }
  return null;
}

// Reference lines for the exercise-in-progress: the first-logged and
// heaviest (max weight, ties broken by more reps) non-warmup set from the
// most recent PRIOR session that logged this exercise (excludeWorkoutId
// skips the current in-progress workout, same convention as
// getRecommendation/getWeightPR).
export function getPreviousSessionSets(exerciseId, workouts, unit, excludeWorkoutId) {
  const ordered = flattenWorkouts(workouts).filter(({ workout }) => workout.id !== excludeWorkoutId);

  for (const { dateKey, workout } of ordered) {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) continue;

    const firstSet = entry.sets[0];
    const firstWeight = convertWeight(firstSet.weight, firstSet.unit || unit, unit);
    const first = { weight: firstWeight === "" ? 0 : firstWeight, reps: parseFloat(firstSet.reps) || 0 };

    let max = null;
    entry.sets.forEach((s) => {
      if (s.warmup) return;
      const reps = parseFloat(s.reps) || 0;
      if (reps <= 0) return;
      const wConv = convertWeight(s.weight, s.unit || unit, unit);
      const wNum = wConv === "" ? 0 : wConv;
      if (wNum <= 0) return;
      if (!max || wNum > max.weight || (wNum === max.weight && reps > max.reps)) {
        max = { weight: wNum, reps };
      }
    });

    return { basedOn: dateKey, first, max };
  }
  return null;
}

// Every warmup set, in original order, from the most recent PRIOR session
// that logged this exercise with at least one warmup set — for the Focus
// view's "copy warmups" button. Empty array if there's no such session.
export function getPreviousWarmupSets(exerciseId, workouts, unit, excludeWorkoutId) {
  const ordered = flattenWorkouts(workouts).filter(({ workout }) => workout.id !== excludeWorkoutId);

  for (const { workout } of ordered) {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || !entry.sets.some((s) => s.warmup)) continue;
    return entry.sets
      .filter((s) => s.warmup)
      .map((s) => ({
        weight: convertWeight(s.weight, s.unit || unit, unit),
        reps: s.reps,
        side: s.side ?? "together",
        warmup: true,
      }));
  }
  return [];
}

// Total weight×reps for a given exercise on each day it was logged —
// the "volume" series the history chart plots, most recent 10 sessions.
// A day can hold more than one workout, so same-day volume is summed into
// one point rather than plotted twice (which would collide on the chart).
export function getVolumeSeries(exerciseId, workouts, unit) {
  const byDate = new Map();
  flattenWorkouts(workouts).forEach(({ dateKey, workout }) => {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0 || entry.excluded) return;
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

// Heaviest non-warmup set lifted for a given exercise on each day — an
// alternative lens to total volume, since pushing max weight up doesn't
// require also holding or growing reps. Same same-day-dedup/sort/slice
// convention as getVolumeSeries.
export function getMaxWeightSeries(exerciseId, workouts, unit) {
  const byDate = new Map();
  flattenWorkouts(workouts).forEach(({ dateKey, workout }) => {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0 || entry.excluded) return;
    let dayMax = 0;
    entry.sets.forEach((s) => {
      if (s.warmup) return;
      const reps = parseFloat(s.reps) || 0;
      if (reps <= 0) return;
      const wConv = convertWeight(s.weight, s.unit, unit);
      const wNum = wConv === "" ? 0 : wConv;
      if (wNum > dayMax) dayMax = wNum;
    });
    if (dayMax <= 0) return;
    byDate.set(dateKey, Math.max(byDate.get(dateKey) || 0, dayMax));
  });
  const rows = Array.from(byDate, ([dateKey, volume]) => ({ dateKey, volume }));
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}

// Estimated one-rep max (Epley: weight × (1 + reps/30)) from the best
// non-warmup set for a given exercise on each day — catches strength gains
// that trade reps against weight session to session, which raw volume or
// max weight alone can miss.
export function getEstimatedOneRepMaxSeries(exerciseId, workouts, unit) {
  const byDate = new Map();
  flattenWorkouts(workouts).forEach(({ dateKey, workout }) => {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0 || entry.excluded) return;
    let dayBest = 0;
    entry.sets.forEach((s) => {
      if (s.warmup) return;
      const reps = parseFloat(s.reps) || 0;
      if (reps <= 0) return;
      const wConv = convertWeight(s.weight, s.unit, unit);
      const wNum = wConv === "" ? 0 : wConv;
      if (wNum <= 0) return;
      const oneRm = wNum * (1 + reps / 30);
      if (oneRm > dayBest) dayBest = oneRm;
    });
    if (dayBest <= 0) return;
    byDate.set(dateKey, Math.max(byDate.get(dateKey) || 0, dayBest));
  });
  const rows = Array.from(byDate, ([dateKey, volume]) => ({ dateKey, volume }));
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}

// Total non-warmup reps performed for a given exercise on each day.
export function getTotalRepsSeries(exerciseId, workouts) {
  const byDate = new Map();
  flattenWorkouts(workouts).forEach(({ dateKey, workout }) => {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0 || entry.excluded) return;
    let dayReps = 0;
    entry.sets.forEach((s) => {
      if (s.warmup) return;
      dayReps += parseFloat(s.reps) || 0;
    });
    if (dayReps <= 0) return;
    byDate.set(dateKey, (byDate.get(dateKey) || 0) + dayReps);
  });
  const rows = Array.from(byDate, ([dateKey, volume]) => ({ dateKey, volume }));
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}

// Working (non-warmup) sets logged for a given exercise on each day —
// tracks how much work capacity is being built independent of the weight or
// reps used on any single set.
export function getTotalSetsSeries(exerciseId, workouts) {
  const byDate = new Map();
  flattenWorkouts(workouts).forEach(({ dateKey, workout }) => {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0 || entry.excluded) return;
    const daySets = entry.sets.filter((s) => !s.warmup).length;
    if (daySets <= 0) return;
    byDate.set(dateKey, (byDate.get(dateKey) || 0) + daySets);
  });
  const rows = Array.from(byDate, ([dateKey, volume]) => ({ dateKey, volume }));
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}

// Best single set's weight×reps for a given exercise on each day — distinct
// from getVolumeSeries (which sums every set): this isolates the top
// individual effort from a session, so it doesn't rise just because more
// sets were added at a lighter weight.
export function getBestSetVolumeSeries(exerciseId, workouts, unit) {
  const byDate = new Map();
  flattenWorkouts(workouts).forEach(({ dateKey, workout }) => {
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0 || entry.excluded) return;
    let dayBest = 0;
    entry.sets.forEach((s) => {
      if (s.warmup) return;
      const reps = parseFloat(s.reps) || 0;
      if (reps <= 0) return;
      const wConv = convertWeight(s.weight, s.unit, unit);
      const wNum = wConv === "" ? 0 : wConv;
      const setVolume = wNum * reps;
      if (setVolume > dayBest) dayBest = setVolume;
    });
    if (dayBest <= 0) return;
    byDate.set(dateKey, Math.max(byDate.get(dateKey) || 0, dayBest));
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
    if (!entry || entry.sets.length === 0 || entry.excluded) return;
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
