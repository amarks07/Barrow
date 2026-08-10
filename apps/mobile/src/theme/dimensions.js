// Shared sizing for pill-shaped controls, kept as named constants so every
// instance of a given kind reads as one consistent size instead of each
// picking its own padding/line-height combination.

// "Chips": category filters and the workout-name tabs.
export const CHIP_HEIGHT = 28;

// "Switches": the unit/theme/exercise-view/superset-grouping toggle and the
// angle switch — a distinct (slightly larger) family from chips, since
// these read as a single control with a few positions rather than a list
// of independent selectable items.
export const SWITCH_HEIGHT = 32;

// The Features section's on/off rockers (see components/ui/Switch.js) —
// kept apart from SWITCH_HEIGHT since these are boolean toggles, not
// multi-option pickers.
export const TOGGLE_WIDTH = 44;
export const TOGGLE_HEIGHT = 26;
export const TOGGLE_THUMB = 20;
export const TOGGLE_PADDING = 2;

// Action buttons (see components/ui/Button.js) — everything from "History"/
// "Swap"/"Save as routine" up through most modal "Cancel"/"Save" is
// `small`; `medium` is for a screen/modal's one primary action that still
// sits alongside other controls (Focus mode Prev/Next, New exercise/New
// routine Save, Sign in/Create account); `large` is reserved for the one
// or two prominent, stand-alone CTAs per screen (Calendar's "Start a
// workout"). Font size scales roughly with height so text doesn't look
// starved on the bigger sizes.
export const BUTTON_HEIGHT = { small: 30, medium: 42, large: 54 };
export const BUTTON_FONT_SIZE = { small: 12, medium: 14, large: 21 };
export const BUTTON_PADDING_H = { small: 12, medium: 18, large: 22 };

// Reps/weight steppers (see components/workout/Counter.js) — `default` is
// the big Focus/Day view stepper; `small` is for compact inline use (e.g.
// the two-up feet/inches entry in Profile).
export const COUNTER_HEIGHT = { default: 64, small: 40 };
export const COUNTER_GAP = { default: 12, small: 6 };
export const COUNTER_BUTTON_WIDTH = { default: 44, small: 28 };
export const COUNTER_VALUE_FONT_SIZE = { default: 34, small: 18 };
export const COUNTER_LABEL_FONT_SIZE = { default: 13, small: 10 };
export const COUNTER_SYMBOL_FONT_SIZE = { default: 24, small: 16 };
