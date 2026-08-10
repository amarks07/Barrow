import appJson from "../../app.json";

// Release notes for the "what's new" popup (see usePatchNotes/PatchNotesModal)
// and the "Patch notes" button in Preferences, which shows this whole list.
// Newest first. Add a new entry — keyed by the exact app.json `expo.version`
// string — on any release with user-facing changes; usePatchNotes diffs
// CURRENT_VERSION against the last version a user dismissed the popup for
// to decide whether to show it. A version bump with no matching entry here
// just won't trigger the popup, rather than showing something stale or blank.
export const PATCH_NOTES = [
  {
    version: "1.1.0",
    title: "Widgets, history charts, and workout notes",
    notes: [
      "Added an Android home screen widget for your active workout — view and log the current exercise's sets without opening the app.",
      "Added a persistent workout notification with quick previous/next controls and a running set tally.",
      "Exercise history charts now show a trend line and each session as its own point, plus a personal-record callout.",
      "Per-exercise actions (History, Notes, Swap, Remove) are now tucked into one Actions menu, with a new Notes button for jotting notes on any exercise.",
      "Sets are now clearly labeled Warmup or Working, each with their own numbering.",
      "Exercises (and whole supersets) can now be reordered by press-and-drag.",
      "Cardio exercises get a simpler, dedicated minutes + speed input.",
      "More accent color choices, plus an Auto theme option alongside Dark/Light.",
      "Added basic support for installing Barrow to an iOS home screen.",
    ],
  },
  {
    version: "1.0.0",
    title: "Welcome to Barrow",
    notes: [
      "Log workouts day by day — reps and weight for strength exercises, time and speed for cardio — with warmup sets alongside working sets.",
      "Build reusable workout templates, and start a workout from one with a tap.",
      "Group exercises into supersets, in a template or a live workout.",
      "Browse an exercise library with category filters, or add your own custom exercises.",
      "Toggle incline/decline angle on exercises like bench press.",
      "See workout history per exercise, with a volume chart over time and a calendar of workout days.",
      "Sign in and back up your data to the cloud, with password reset support.",
      "A preferences screen for theme and workout view options.",
    ],
  },
];

export const CURRENT_VERSION = appJson.expo.version;

export const CURRENT_PATCH_NOTES = PATCH_NOTES.find((entry) => entry.version === CURRENT_VERSION) || null;
