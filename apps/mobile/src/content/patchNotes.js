import appJson from "../../app.json";

// Release notes for the "what's new" popup (see usePatchNotes/PatchNotesModal)
// and the "Patch notes" button in Preferences, which shows this whole list.
// Newest first. Add a new entry — keyed by the exact app.json `expo.version`
// string — on any release with user-facing changes; usePatchNotes diffs
// CURRENT_VERSION against the last version a user dismissed the popup for
// to decide whether to show it. A version bump with no matching entry here
// just won't trigger the popup, rather than showing something stale or blank.
// Each entry's `notes` is grouped by category — see PATCH_NOTE_CATEGORIES
// below for section labels/order. Omit a category key entirely (rather than
// leaving it an empty array) when an entry has nothing for it. `features` is
// further broken into named sections ({ section, items }) since it tends to
// be the longest list; other categories are just flat string arrays.
export const PATCH_NOTES = [
  {
    version: "1.2.1",
    title: "Cloud backup fix",
    notes: {
      fixes: ["Fixed cloud backup not working in installed builds (it only worked in local dev).", "Fixed an issue where the user could not sign in to their account."],
    },
  },
  {
    version: "1.2.0",
    title: "Routines, stretching, and profile pictures",
    notes: {
      features: [
        {
          section: "Routines",
          items: [
            "Templates are now Routines, and can be shared with a QR code or file — import one from someone else the same way.",
            "Added stretch routines: build a named list of poses with hold times, and add one to the end of a workout.",
          ],
        },
        {
          section: "Navigation",
          items: ["You can now swipe left/right between days instead of only using the calendar."],
        },
        {
          section: "Sign in & account",
          items: [
            "Added a profile picture you can set and edit.",
            "Added optional Face ID/fingerprint unlock for cloud sync, and a one-time prompt to fill in missing profile details after signing in.",
            "Premium status now gates cloud backup.",
          ],
        },
      ],
      styling: [
        "Profile screen reworked: account, biometrics (birthday, gender, height, weight), and cloud backup now live in their own sections.",
      ],
      fixes: [
        "Sign-in, account deletion, and cloud sync were reworked for reliability.",
        "Reworked how numeric fields (reps, weight, etc.) handle typing for fewer stuck or unexpected values.",
      ],
    },
  },
  {
    version: "1.1.0",
    title: "Widgets, history charts, and workout notes",
    notes: {
      features: [
        {
          section: "Home screen & widgets",
          items: [
            "Added an Android home screen widget for your active workout — view and log the current exercise's sets without opening the app.",
            "Added a persistent workout notification with quick previous/next controls and a running set tally.",
            "Added basic support for installing Barrow to an iOS home screen.",
          ],
        },
        {
          section: "Exercises & history",
          items: [
            "Exercise history charts now show a trend line and each session as its own point, plus a personal-record callout.",
            "Per-exercise actions (History, Notes, Swap, Remove) are now tucked into one Actions menu, with a new Notes button for jotting notes on any exercise.",
            "Exercises (and whole supersets) can now be reordered by press-and-drag.",
            "Cardio exercises get a simpler, dedicated minutes + speed input.",
          ],
        },
      ],
      styling: [
        "Sets are now clearly labeled Warmup or Working, each with their own numbering.",
        "More accent color choices, plus an Auto theme option alongside Dark/Light.",
      ],
    },
  },
  {
    version: "1.0.0",
    title: "Welcome to Barrow",
    notes: {
      features: [
        {
          section: "Workouts",
          items: [
            "Log workouts day by day — reps and weight for strength exercises, time and speed for cardio — with warmup sets alongside working sets.",
          ],
        },
        {
          section: "Templates",
          items: [
            "Build reusable workout templates, and start a workout from one with a tap.",
            "Group exercises into supersets, in a template or a live workout.",
          ],
        },
        {
          section: "Exercises",
          items: [
            "Browse an exercise library with category filters, or add your own custom exercises.",
            "Toggle incline/decline angle on exercises like bench press.",
          ],
        },
        {
          section: "History",
          items: ["See workout history per exercise, with a volume chart over time and a calendar of workout days."],
        },
        {
          section: "Sign in & account",
          items: ["Sign in and back up your data to the cloud, with password reset support."],
        },
        {
          section: "Preferences",
          items: ["A preferences screen for theme and workout view options."],
        },
      ],
    },
  },
];

// Section order + labels shared by PatchNotesView and PatchNotesModal.
export const PATCH_NOTE_CATEGORIES = [
  { key: "features", label: "New features" },
  { key: "styling", label: "Styling" },
  { key: "fixes", label: "Bug fixes" },
];

export const CURRENT_VERSION = appJson.expo.version;

export const CURRENT_PATCH_NOTES = PATCH_NOTES.find((entry) => entry.version === CURRENT_VERSION) || null;
