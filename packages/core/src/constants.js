import { slug } from "./slug";

export const CATEGORIES = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Full Body", "Stretching"];

// Angle variants (flat/incline/decline) of the same lift are one exercise
// with a toggle — see ANGLE_VARIANTS below — rather than separate entries.
const RAW_EXERCISES = [
  ["Bench Press","Chest"],["Dumbbell Bench Press","Chest"],
  ["Push-Up","Chest"],["Cable Fly","Chest"],["Pec Deck","Chest"],["Chest Dip","Chest"],
  ["Machine Chest Press","Chest"],["Dumbbell Pullover","Chest"],

  ["Deadlift","Back"],["Sumo Deadlift","Back"],["Rack Pull","Back"],["Barbell Row","Back"],
  ["Pendlay Row","Back"],["T-Bar Row","Back"],["Seated Cable Row","Back"],["Lat Pulldown","Back"],
  ["Pull-Up","Back"],["Chin-Up","Back"],["Single-Arm Dumbbell Row","Back"],["Straight-Arm Pulldown","Back"],
  ["Back Extension","Back"],["Shrug","Back"],

  ["Back Squat","Legs"],["Front Squat","Legs"],["Goblet Squat","Legs"],["Hack Squat","Legs"],
  ["Leg Press","Legs"],["Romanian Deadlift","Legs"],["Stiff-Leg Deadlift","Legs"],["Walking Lunge","Legs"],
  ["Reverse Lunge","Legs"],["Bulgarian Split Squat","Legs"],["Leg Curl","Legs"],["Leg Extension","Legs"],
  ["Hip Thrust","Legs"],["Glute Bridge","Legs"],["Calf Raise","Legs"],["Seated Calf Raise","Legs"],
  ["Step-Up","Legs"],["Sissy Squat","Legs"],["Hip Adductor Machine","Legs"],["Hip Abductor Machine","Legs"],

  ["Overhead Press","Shoulders"],["Seated Dumbbell Press","Shoulders"],["Arnold Press","Shoulders"],
  ["Lateral Raise","Shoulders"],["Cable Lateral Raise","Shoulders"],["Front Raise","Shoulders"],
  ["Rear Delt Fly","Shoulders"],["Face Pull","Shoulders"],["Upright Row","Shoulders"],
  ["Shoulder Press Machine","Shoulders"],["Landmine Press","Shoulders"],

  ["Barbell Curl","Arms"],["EZ-Bar Curl","Arms"],["Dumbbell Curl","Arms"],["Hammer Curl","Arms"],
  ["Preacher Curl","Arms"],["Concentration Curl","Arms"],["Cable Curl","Arms"],["Tricep Pushdown","Arms"],
  ["Overhead Tricep Extension","Arms"],["Skull Crusher","Arms"],["Close-Grip Bench Press","Arms"],
  ["Tricep Dip","Arms"],["Cable Kickback","Arms"],

  ["Plank","Core"],["Side Plank","Core"],["Hanging Leg Raise","Core"],["Cable Crunch","Core"],
  ["Sit-Up","Core"],["Crunch","Core"],["Russian Twist","Core"],["Bicycle Crunch","Core"],
  ["Ab Wheel Rollout","Core"],["Mountain Climber","Core"],["Woodchopper","Core"],["Dead Bug","Core"],["V-Up","Core"],

  ["Treadmill Run","Cardio"],["Treadmill Incline Walk","Cardio"],["Rowing Machine","Cardio"],
  ["Assault Bike","Cardio"],["Stationary Bike","Cardio"],["Elliptical","Cardio"],["Stair Climber","Cardio"],
  ["Jump Rope","Cardio"],["Swimming","Cardio"],["Sprint Intervals","Cardio"],
  // Conditioning movements — high-intensity and full-body, so they belong
  // with cardio rather than the strength-focused Full Body bucket.
  ["Kettlebell Swing","Cardio"],["Burpee","Cardio"],["Man Maker","Cardio"],
  ["Wall Ball","Cardio"],["Battle Ropes","Cardio"],

  ["Clean and Jerk","Full Body"],["Snatch","Full Body"],["Thruster","Full Body"],
  ["Turkish Get-Up","Full Body"],["Farmer's Carry","Full Body"],
];

// Exercises where the bench angle is a per-workout choice rather than a
// separate exercise. `angles[0]` is the default a freshly-added entry gets.
const ANGLE_VARIANTS = {
  "bench-press": ["Flat", "Incline", "Decline"],
  "dumbbell-bench-press": ["Flat", "Incline", "Decline"],
};

// Every built-in exercise gets a fields/setFormat pair derived from its
// category — Cardio tracks minutes+speed as a single lazy-created entry,
// everything else tracks weight+reps as a numbered, add/remove-able set
// list. This is the same split the app has always drawn along `category
// === "Cardio"`; custom exercises (see AddCustomExerciseModal) are the only
// ones that can deviate from it.
export const SEED_EXERCISES = RAW_EXERCISES.map(([name, category]) => {
  const id = slug(name);
  const isCardio = category === "Cardio";
  return {
    id,
    name,
    category,
    custom: false,
    angles: ANGLE_VARIANTS[id],
    fields: isCardio ? ["time", "speed"] : ["weight", "reps"],
    setFormat: isCardio ? "single" : "sets",
  };
});

// Built-in exercises are never edited in place — only added to or
// recategorized in source — so a saved exercise list can always be
// resynced to the current seed data. This is what lets changes here reach
// browsers that already have an older exercise list saved. Only
// user-added custom exercises survive from what was saved.
export function reconcileExercises(saved) {
  const custom = saved.filter((e) => e.custom).map(backfillFields);
  return [...SEED_EXERCISES, ...custom];
}

// Custom exercises saved before fields/setFormat existed on the shape (or
// stretch routines, which never carry them) are missing the properties
// HistoryView and the workout screens now key off of. Backfill from
// category using the same split the seed data and AddCustomExerciseModal
// use, so old saved data doesn't crash on render.
function backfillFields(e) {
  if (e.fields || e.type === "stretch") return e;
  const isCardio = e.category === "Cardio";
  return { ...e, fields: isCardio ? ["time", "speed"] : ["weight", "reps"], setFormat: isCardio ? "single" : "sets" };
}
