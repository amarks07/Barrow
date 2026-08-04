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

// Action buttons (see components/ui/Button.js) — everything from "History"/
// "Swap"/"Save as template" up through modal "Cancel"/"Save" is `small`;
// `large` is reserved for the one or two prominent, stand-alone CTAs per
// screen (Calendar's "Start a workout").
export const BUTTON_HEIGHT = { small: 30, large: 48 };
export const BUTTON_FONT_SIZE = { small: 12, large: 14 };
export const BUTTON_PADDING_H = { small: 12, large: 20 };
